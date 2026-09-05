#!/usr/bin/env python3
"""学事智办本地备用工具 API；仅用于比赛演示和超星插件能力验证。"""

from __future__ import annotations

import argparse
import hmac
import importlib.util
import json
import os
import shutil
import sqlite3
import sys
import traceback
import uuid
from contextlib import contextmanager
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


PROJECT_ROOT = Path(__file__).resolve().parent.parent
BASELINE_DATABASE = PROJECT_ROOT / "database" / "student_affairs_v0.1.sqlite3"
DEFAULT_RUNTIME_DATABASE = Path(__file__).resolve().parent / "runtime" / "student_affairs_demo.sqlite3"
LOCAL_RULES_PATH = Path(__file__).resolve().parent / "leave_rules.py"
RULES_PATH = (
    LOCAL_RULES_PATH if LOCAL_RULES_PATH.exists() else (
        PROJECT_ROOT
        / "chaoxing_package"
        / "02_任务流配置"
        / "code_nodes"
        / "leave_rules.py"
    )
)
MAX_BODY_BYTES = 64 * 1024
REVIEW_ROLES = {"counselor", "internship_leader", "teaching_vice_dean", "academic_affairs"}


def load_route_calculator():
    """从本地或项目路径加载唯一规则实现，避免 API 与代码节点逻辑漂移。"""
    spec = importlib.util.spec_from_file_location("student_affairs_leave_rules", RULES_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"无法加载规则模块：{RULES_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.calculate_leave_route


calculate_leave_route = load_route_calculator()


def utc_now_text() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat(sep=" ")


def prepare_runtime_database(target: Path, baseline: Path = BASELINE_DATABASE) -> Path:
    """首次启动复制基线到运行库，确保所有接口写入均不污染权威种子库。"""
    target = target.resolve()
    baseline = baseline.resolve()
    if target == baseline:
        raise ValueError("运行数据库不能指向只读基线库")
    if not baseline.is_file():
        raise FileNotFoundError(f"基线数据库不存在：{baseline}")
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copy2(baseline, target)
    with target.open("rb") as handle:
        if handle.read(16) != b"SQLite format 3\x00":
            raise ValueError(f"运行数据库不是 SQLite 文件：{target}")
    return target


def connect_database(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path, timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


@contextmanager
def database_session(path: Path):
    """事务结束后显式关闭连接；Windows 不允许删除仍被 SQLite 句柄占用的文件。"""
    connection = connect_database(path)
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def generate_id(prefix: str) -> str:
    return f"DEMO-{prefix}-{uuid.uuid4().hex[:12].upper()}"


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


class StudentAffairsHandler(BaseHTTPRequestHandler):
    """最小化 JSON API；身份头只可由受信任的超星插件配置注入。"""

    server_version = "StudentAffairsDemo/0.2"
    protocol_version = "HTTP/1.1"

    @property
    def app_server(self) -> "StudentAffairsServer":
        return self.server  # type: ignore[return-value]

    def log_message(self, fmt: str, *args: Any) -> None:
        # 日志只记录方法、路径和状态，不写请求正文或病假原因。
        sys.stderr.write(f"[{self.log_date_time_string()}] {fmt % args}\n")

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        # 每次响应后关闭连接，避免鉴权在读取正文前失败时残留正文被当成下一条请求。
        self.close_connection = True
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(encoded)

    def require_auth(self) -> None:
        if self.app_server.unsafe_no_auth:
            return
        supplied = self.headers.get("Authorization", "")
        expected = f"Bearer {self.app_server.token}"
        if not hmac.compare_digest(supplied, expected):
            raise ApiError(HTTPStatus.UNAUTHORIZED, "UNAUTHORIZED", "认证失败")

    def identity(self) -> tuple[str, str]:
        user_id = self.headers.get("X-Demo-User-Id", "").strip()
        role = self.headers.get("X-Demo-User-Role", "").strip()
        if not user_id.startswith("DEMO-") or not role:
            raise ApiError(HTTPStatus.UNAUTHORIZED, "IDENTITY_REQUIRED", "缺少受信任的演示身份头")
        with database_session(self.app_server.database) as connection:
            row = connection.execute(
                "SELECT role, active FROM demo_user WHERE user_id = ?", (user_id,)
            ).fetchone()
        if row is None or row["active"] != 1 or row["role"] != role:
            raise ApiError(HTTPStatus.FORBIDDEN, "IDENTITY_MISMATCH", "演示身份无效或角色不匹配")
        return user_id, role

    def read_json(self) -> dict[str, Any]:
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            raise ApiError(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "JSON_REQUIRED", "请求必须使用 application/json")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ApiError(HTTPStatus.BAD_REQUEST, "INVALID_LENGTH", "Content-Length 无效") from exc
        if length <= 0 or length > MAX_BODY_BYTES:
            raise ApiError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "BODY_SIZE_INVALID", "请求正文为空或超过64KB")
        try:
            value = json.loads(self.rfile.read(length))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ApiError(HTTPStatus.BAD_REQUEST, "INVALID_JSON", "JSON 格式无效") from exc
        if not isinstance(value, dict):
            raise ApiError(HTTPStatus.BAD_REQUEST, "OBJECT_REQUIRED", "JSON 顶层必须是对象")
        return value

    def dispatch(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        if self.command == "GET" and path == "/health":
            self.send_json(HTTPStatus.OK, {"status": "ok", "version": "0.2-local"})
            return

        self.require_auth()
        if self.command == "POST" and path == "/v1/route/calculate":
            self.send_json(HTTPStatus.OK, calculate_leave_route(self.read_json()))
            return
        if self.command == "POST" and path == "/v1/leave/draft":
            self.create_draft(self.read_json())
            return

        if self.command == "GET" and path == "/v1/leave":
            query = parse_qs(parsed.query)
            app_id_list = query.get("application_id", [])
            if not app_id_list or not app_id_list[0].startswith("DEMO-APP-"):
                raise ApiError(HTTPStatus.BAD_REQUEST, "INVALID_ID", "申请编号格式无效")
            self.get_leave(app_id_list[0])
            return

        if self.command == "POST" and path in {"/v1/leave/submit", "/v1/leave/withdraw", "/v1/leave/cancel"}:
            payload = self.read_json()
            application_id = str(payload.get("application_id", "")).strip()
            if not application_id.startswith("DEMO-APP-"):
                raise ApiError(HTTPStatus.BAD_REQUEST, "INVALID_ID", "申请编号格式无效")
            action = path.split("/")[3]
            if action == "submit":
                self.submit_leave(application_id, payload)
                return
            if action in {"withdraw", "cancel"}:
                self.lifecycle_update(application_id, action, payload)
                return

        parts = [part for part in path.split("/") if part]
        if len(parts) >= 3 and parts[:2] == ["v1", "leave"]:
            application_id = parts[2]
            if not application_id.startswith("DEMO-APP-"):
                raise ApiError(HTTPStatus.BAD_REQUEST, "INVALID_ID", "申请编号格式无效")
            if self.command == "GET" and len(parts) == 3:
                self.get_leave(application_id)
                return
            if self.command == "POST" and len(parts) == 4:
                payload = self.read_json()
                if parts[3] == "submit":
                    self.submit_leave(application_id, payload)
                    return
                if parts[3] in {"withdraw", "cancel"}:
                    self.lifecycle_update(application_id, parts[3], payload)
                    return

        raise ApiError(HTTPStatus.NOT_FOUND, "NOT_FOUND", "接口不存在")

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler 固定接口名
        self.handle_safely()

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler 固定接口名
        self.handle_safely()

    def handle_safely(self) -> None:
        try:
            self.dispatch()
        except ApiError as exc:
            self.send_json(exc.status, {"error": {"code": exc.code, "message": exc.message}})
        except Exception:
            # 未知错误不向客户端泄漏路径、SQL 或堆栈，仅在本机标准错误中记录。
            traceback.print_exc(file=sys.stderr)
            self.send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": {"code": "INTERNAL_ERROR", "message": "服务内部错误，本次操作未确认成功"}},
            )

    def create_draft(self, payload: dict[str, Any]) -> None:
        user_id, role = self.identity()
        if role != "student":
            raise ApiError(HTTPStatus.FORBIDDEN, "STUDENT_ONLY", "只有学生身份可创建请假草稿")
        required = ["leave_type", "reason_category", "reason_summary", "start_at", "end_at"]
        missing = [field for field in required if not str(payload.get(field, "")).strip()]
        if missing:
            raise ApiError(HTTPStatus.BAD_REQUEST, "MISSING_FIELDS", f"缺少字段：{','.join(missing)}")
        if len(str(payload["reason_summary"])) > 200:
            raise ApiError(HTTPStatus.BAD_REQUEST, "REASON_TOO_LONG", "原因摘要不能超过200字符")

        route = calculate_leave_route(payload)
        if not route["valid"]:
            raise ApiError(HTTPStatus.BAD_REQUEST, "INVALID_LEAVE", "；".join(route["errors"]))
        if route["route_id"] == "ROUTE-GT1M-SUSPENSION":
            raise ApiError(HTTPStatus.CONFLICT, "SUSPENSION_REQUIRED", "超过一个自然月，应转休学流程")

        now = utc_now_text()
        application_id = generate_id("APP")
        request_id = generate_id("REQ")
        action_id = generate_id("ACTION")
        with database_session(self.app_server.database) as connection:
            # 事务同时写主记录和审计记录，任一步失败都会整体回滚。
            connection.execute(
                """
                INSERT INTO leave_application (
                    application_id, request_id, student_id, leave_type,
                    reason_category, reason_summary, start_at, end_at,
                    duration_days, off_campus_internship, retroactive, status,
                    matched_route_id, current_assignee_role, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_confirmation', ?, NULL, ?, ?)
                """,
                (
                    application_id,
                    request_id,
                    user_id,
                    payload["leave_type"],
                    payload["reason_category"],
                    payload["reason_summary"],
                    payload["start_at"],
                    payload["end_at"],
                    route["duration_days"],
                    int(bool(payload.get("off_campus_internship", False))),
                    int(bool(payload.get("retroactive", False))),
                    route["route_id"],
                    now,
                    now,
                ),
            )
            connection.execute(
                """
                INSERT INTO approval_action (
                    action_id, application_id, actor_user_id, actor_role,
                    action_type, from_status, to_status, comment_text, action_at
                ) VALUES (?, ?, ?, ?, 'create_draft', NULL, 'pending_confirmation', ?, ?)
                """,
                (action_id, application_id, user_id, role, "通过备用API创建演示草稿", now),
            )
        self.send_json(
            HTTPStatus.CREATED,
            {"application_id": application_id, "status": "pending_confirmation", "route": route},
        )

    def fetch_authorized_leave(self, application_id: str) -> tuple[dict[str, Any], str, str]:
        user_id, role = self.identity()
        with database_session(self.app_server.database) as connection:
            row = connection.execute(
                "SELECT * FROM leave_application WHERE application_id = ?", (application_id,)
            ).fetchone()
        if row is None:
            raise ApiError(HTTPStatus.NOT_FOUND, "LEAVE_NOT_FOUND", "未找到申请")
        record = dict(row)
        if role == "student" and record["student_id"] != user_id:
            raise ApiError(HTTPStatus.FORBIDDEN, "NOT_OWNER", "无权访问他人申请")
        if role in REVIEW_ROLES and record["current_assignee_role"] != role:
            raise ApiError(HTTPStatus.FORBIDDEN, "NOT_ASSIGNEE", "不在当前审核权限范围")
        if role != "student" and role not in REVIEW_ROLES:
            raise ApiError(HTTPStatus.FORBIDDEN, "ROLE_FORBIDDEN", "当前角色无权访问")
        return record, user_id, role

    def get_leave(self, application_id: str) -> None:
        record, _, _ = self.fetch_authorized_leave(application_id)
        self.send_json(HTTPStatus.OK, {"leave": record})

    def submit_leave(self, application_id: str, payload: dict[str, Any]) -> None:
        record, user_id, role = self.fetch_authorized_leave(application_id)
        if role != "student" or record["student_id"] != user_id:
            raise ApiError(HTTPStatus.FORBIDDEN, "OWNER_ONLY", "仅申请人本人可提交")
        if payload.get("confirmed") is not True:
            raise ApiError(HTTPStatus.BAD_REQUEST, "CONFIRMATION_REQUIRED", "必须明确确认后提交")
        if record["status"] not in {"draft", "pending_confirmation"}:
            raise ApiError(HTTPStatus.CONFLICT, "INVALID_STATUS", "当前状态不能提交")
        route_payload = dict(record)
        with database_session(self.app_server.database) as connection:
            proof_count = connection.execute(
                """
                SELECT COUNT(*) FROM leave_attachment
                WHERE application_id = ? AND attachment_type = 'hospital_certificate'
                  AND verification_status IN ('pending', 'verified_demo')
                """,
                (application_id,),
            ).fetchone()[0]
        route_payload["has_hospital_certificate"] = proof_count > 0
        route = calculate_leave_route(route_payload)
        if not route["ready_to_submit"]:
            raise ApiError(HTTPStatus.CONFLICT, "NOT_READY", "材料或规则条件未满足，不能提交")
        now = utc_now_text()
        action_id = generate_id("ACTION")
        assignee = route["approver_sequence"][0]
        with database_session(self.app_server.database) as connection:
            cursor = connection.execute(
                """
                UPDATE leave_application
                SET status = 'submitted', current_assignee_role = ?, submitted_at = ?, updated_at = ?
                WHERE application_id = ? AND student_id = ? AND status IN ('draft', 'pending_confirmation')
                """,
                (assignee, now, now, application_id, user_id),
            )
            if cursor.rowcount != 1:
                raise ApiError(HTTPStatus.CONFLICT, "CONCURRENT_UPDATE", "申请状态已变化，请重新查询")
            connection.execute(
                """
                INSERT INTO approval_action (
                    action_id, application_id, actor_user_id, actor_role,
                    action_type, from_status, to_status, comment_text, action_at
                ) VALUES (?, ?, ?, ?, 'submit', ?, 'submitted', ?, ?)
                """,
                (action_id, application_id, user_id, role, record["status"], "本人确认后提交", now),
            )
        self.send_json(HTTPStatus.OK, {"application_id": application_id, "status": "submitted", "current_assignee_role": assignee})

    def lifecycle_update(self, application_id: str, action: str, payload: dict[str, Any]) -> None:
        record, user_id, role = self.fetch_authorized_leave(application_id)
        if role != "student" or record["student_id"] != user_id:
            raise ApiError(HTTPStatus.FORBIDDEN, "OWNER_ONLY", "仅申请人本人可操作")
        if payload.get("confirmed") is not True:
            raise ApiError(HTTPStatus.BAD_REQUEST, "CONFIRMATION_REQUIRED", "必须明确确认后操作")

        if action == "withdraw":
            allowed = {"draft", "pending_confirmation", "submitted", "under_review", "need_more_info"}
            target_status = "withdrawn"
        else:
            allowed = {"approved"}
            target_status = "cancelled"
            if payload.get("returned_to_campus") is not True:
                raise ApiError(HTTPStatus.BAD_REQUEST, "RETURN_CONFIRMATION_REQUIRED", "销假前必须确认已经返校")
        if record["status"] not in allowed:
            raise ApiError(HTTPStatus.CONFLICT, "INVALID_STATUS", "当前状态不允许该操作")

        now = utc_now_text()
        action_id = generate_id("ACTION")
        with database_session(self.app_server.database) as connection:
            cursor = connection.execute(
                "UPDATE leave_application SET status = ?, current_assignee_role = NULL, updated_at = ? WHERE application_id = ? AND student_id = ? AND status = ?",
                (target_status, now, application_id, user_id, record["status"]),
            )
            if cursor.rowcount != 1:
                raise ApiError(HTTPStatus.CONFLICT, "CONCURRENT_UPDATE", "申请状态已变化，请重新查询")
            connection.execute(
                """
                INSERT INTO approval_action (
                    action_id, application_id, actor_user_id, actor_role,
                    action_type, from_status, to_status, comment_text, action_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (action_id, application_id, user_id, role, action, record["status"], target_status, "本人确认操作", now),
            )
        self.send_json(HTTPStatus.OK, {"application_id": application_id, "status": target_status})


class StudentAffairsServer(ThreadingHTTPServer):
    # 关闭服务时等待请求线程释放 SQLite 句柄，避免 Windows 上运行库被继续占用。
    daemon_threads = False
    block_on_close = True

    def __init__(self, address: tuple[str, int], database: Path, token: str, unsafe_no_auth: bool) -> None:
        super().__init__(address, StudentAffairsHandler)
        self.database = database
        self.token = token
        self.unsafe_no_auth = unsafe_no_auth


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="启动学事智办本地备用 API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument("--database", type=Path, default=DEFAULT_RUNTIME_DATABASE)
    parser.add_argument(
        "--unsafe-local-no-auth",
        action="store_true",
        help="仅限127.0.0.1临时调试；禁用Bearer认证",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.unsafe_local_no_auth and args.host not in {"127.0.0.1", "localhost", "::1"}:
        raise SystemExit("无认证模式只能绑定回环地址")
    token = os.environ.get("STUDENT_AFFAIRS_DEMO_TOKEN", "")
    if not token and not args.unsafe_local_no_auth:
        raise SystemExit("请设置 STUDENT_AFFAIRS_DEMO_TOKEN，或仅在本机使用 --unsafe-local-no-auth")
    database = prepare_runtime_database(args.database)
    server = StudentAffairsServer((args.host, args.port), database, token, args.unsafe_local_no_auth)
    print(f"备用API已启动：http://{args.host}:{args.port}（数据库：{database}）")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
