#!/usr/bin/env python3
"""验证学事智办数据库 V1 的来源边界、检索对齐和 DEMO 语义。"""

from __future__ import annotations

import argparse
import re
import sqlite3
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DATABASE = SCRIPT_DIR / "student_affairs_v1.0.sqlite3"

REQUIRED_SCOPES = {
    "OFFICIAL_POLICY",
    "DEMO_WORKFLOW",
    "PUBLIC_SERVICE",
    "SYNTHETIC_DEMO",
}
REQUIRED_DEMO_ROUTES = {
    "ROUTE-DEMO-LE3-NORMAL": "counselor",
    "ROUTE-DEMO-GT3-LE1M": "counselor > teaching_vice_dean",
    "ROUTE-DEMO-INTERNSHIP-3LEVEL": "counselor > teaching_vice_dean > academic_affairs",
    "ROUTE-DEMO-GT1M-SUSPENSION": "manual_handoff",
}


def scalar(connection: sqlite3.Connection, query: str, parameters: tuple = ()) -> int | str:
    """读取单值并将空结果视为结构或种子数据缺失。"""
    row = connection.execute(query, parameters).fetchone()
    if row is None:
        raise AssertionError(f"查询未返回结果：{query}")
    return row[0]


def require_count(connection: sqlite3.Connection, query: str, expected: int, label: str) -> None:
    """要求精确命中，避免宽松的最小值掩盖分层或路由回归。"""
    actual = int(scalar(connection, query))
    if actual != expected:
        raise AssertionError(f"{label}不符合预期：{actual} != {expected}")


def verify_schema_contract(connection: sqlite3.Connection) -> None:
    """确认 V1 检索表和范围字段真实存在，而非仅由说明文档声明。"""
    required_columns = {
        "policy_document": {"scope"},
        "policy_rule": {"scope"},
        "approval_route": {"scope"},
        "knowledge_item": {"scope", "source_id", "canonical_question", "answer_summary"},
        "knowledge_alias": {"knowledge_id", "alias_text", "alias_type"},
    }
    for table, columns in required_columns.items():
        actual = {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}
        missing = columns - actual
        if missing:
            raise AssertionError(f"{table} 缺少 V1 字段：{sorted(missing)}")

    view_columns = {row[1] for row in connection.execute("PRAGMA table_info(v_knowledge_retrieval)")}
    required_view_columns = {
        "knowledge_id", "scope", "canonical_question", "answer_summary", "aliases", "source_id"
    }
    if required_view_columns - view_columns:
        raise AssertionError("v_knowledge_retrieval 未暴露完整检索字段")


def verify_scope_and_source_boundary(connection: sqlite3.Connection) -> None:
    """限制官方事实、DEMO 流程和公开服务的来源边界，防止互相污染。"""
    actual_scopes = {row[0] for row in connection.execute("SELECT DISTINCT scope FROM knowledge_item")}
    if actual_scopes != REQUIRED_SCOPES:
        raise AssertionError(f"知识 scope 不完整或存在未知值：{sorted(actual_scopes)}")

    missing_sources = connection.execute(
        "SELECT knowledge_id FROM knowledge_item "
        "WHERE scope = 'OFFICIAL_POLICY' AND source_id IS NULL"
    ).fetchall()
    if missing_sources:
        raise AssertionError(f"官方知识缺少 source_id：{missing_sources}")

    invalid_demo_routes = connection.execute(
        "SELECT route_id FROM approval_route "
        "WHERE scope = 'DEMO_WORKFLOW' AND is_official <> 0"
    ).fetchall()
    if invalid_demo_routes:
        raise AssertionError(f"DEMO 路由被错误标记为官方：{invalid_demo_routes}")

    invalid_official_routes = connection.execute(
        "SELECT route_id FROM approval_route "
        "WHERE scope = 'OFFICIAL_POLICY' AND is_official <> 1"
    ).fetchall()
    if invalid_official_routes:
        raise AssertionError(f"官方路由 scope/is_official 不一致：{invalid_official_routes}")

    demo_app_on_official_route = connection.execute(
        """
        SELECT la.application_id
        FROM leave_application AS la
        JOIN approval_route AS ar ON ar.route_id = la.matched_route_id
        WHERE ar.scope <> 'DEMO_WORKFLOW'
        """
    ).fetchall()
    if demo_app_on_official_route:
        raise AssertionError(f"合成申请误用了官方路由：{demo_app_on_official_route}")


def verify_demo_route_contract(connection: sqlite3.Connection) -> None:
    """按比赛 DEMO 配置逐条验证确定性路由，不把它们解释为校方制度。"""
    for route_id, sequence in REQUIRED_DEMO_ROUTES.items():
        row = connection.execute(
            "SELECT scope, is_official, approver_sequence FROM approval_route WHERE route_id = ?",
            (route_id,),
        ).fetchone()
        if row != ("DEMO_WORKFLOW", 0, sequence):
            raise AssertionError(f"{route_id} 的 DEMO 路由契约不匹配：{row}")

    require_count(
        connection,
        "SELECT COUNT(*) FROM approval_route WHERE scope = 'DEMO_WORKFLOW'",
        len(REQUIRED_DEMO_ROUTES),
        "DEMO 审批路由数",
    )
    require_count(
        connection,
        "SELECT COUNT(*) FROM leave_application WHERE leave_type = 'internship'",
        0,
        "非法 internship 假别",
    )
    schema_sql = str(
        scalar(connection, "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'leave_application'")
    )
    if "'internship'" in schema_sql:
        raise AssertionError("leave_application 仍将 internship 作为假别")


def verify_sick_leave_semantics(connection: sqlite3.Connection) -> None:
    """同时验证官方病假材料要求和 DEMO 可选材料演示，不允许互相替代。"""
    official = str(
        scalar(connection, "SELECT answer_summary FROM knowledge_item WHERE knowledge_id = 'KI-OFF-LEAVE-SICK'")
    )
    demo = str(
        scalar(connection, "SELECT answer_summary FROM knowledge_item WHERE knowledge_id = 'KI-DEMO-SICK'")
    )
    if "医院证明" not in official or "可选" not in demo or "要求补充" not in demo:
        raise AssertionError("病假官方要求与 DEMO 可选材料语义未同时保留")


def verify_retrieval_coverage(connection: sqlite3.Connection) -> None:
    """检查高频问法确有别名映射，避免只建立条目却无法被自然语言检索。"""
    required_aliases = {
        "病假单", "续假", "销假", "忘记请假", "请假四天谁审批", "实习请假",
        "心理预约", "保卫处电话", "医院电话", "报修",
    }
    aliases = {row[0] for row in connection.execute("SELECT alias_text FROM knowledge_alias")}
    missing = required_aliases - aliases
    if missing:
        raise AssertionError(f"缺少高频检索别名：{sorted(missing)}")
    unindexed_rules = connection.execute(
        """
        SELECT pr.rule_id
        FROM policy_rule AS pr
        LEFT JOIN knowledge_item AS ki ON ki.rule_id = pr.rule_id
        WHERE pr.scope = 'OFFICIAL_POLICY'
        GROUP BY pr.rule_id
        HAVING COUNT(ki.knowledge_id) = 0
        """
    ).fetchall()
    if unindexed_rules:
        raise AssertionError(f"当前官方制度规则缺少检索入口：{unindexed_rules}")
    require_count(connection, "SELECT COUNT(*) FROM v_knowledge_retrieval", 26, "检索视图条目数")


def verify_demo_privacy_boundary(connection: sqlite3.Connection) -> None:
    """演示库只允许 DEMO 编号与合成身份，阻止真实联系方式进入学生身份表。"""
    invalid_users = connection.execute(
        """
        SELECT user_id, display_name FROM demo_user
        WHERE user_id NOT LIKE 'DEMO-%' OR is_synthetic <> 1 OR display_name NOT LIKE '演示%'
        """
    ).fetchall()
    if invalid_users:
        raise AssertionError(f"发现未明确标识的合成用户：{invalid_users}")

    invalid_business_ids = connection.execute(
        "SELECT application_id FROM leave_application WHERE application_id NOT LIKE 'DEMO-%' "
        "UNION ALL SELECT request_id FROM leave_application WHERE request_id NOT LIKE 'DEMO-%'"
    ).fetchall()
    if invalid_business_ids:
        raise AssertionError(f"发现非 DEMO 业务编号：{invalid_business_ids}")

    demo_text = "\n".join(
        " ".join(str(value) for value in row if value is not None)
        for row in connection.execute(
            """
            SELECT user_id, display_name, synthetic_student_no, major_name, class_name
            FROM demo_student_profile JOIN demo_user ON demo_user.user_id = demo_student_profile.student_id
            """
        )
    )
    sensitive_patterns = {
        "中国大陆手机号": r"(?<!\d)1[3-9]\d{9}(?!\d)",
        "身份证号": r"(?<!\d)\d{17}[\dXx](?!\w)",
        "电子邮箱": r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}",
    }
    for label, pattern in sensitive_patterns.items():
        if re.search(pattern, demo_text):
            raise AssertionError(f"合成身份中疑似出现{label}")


def verify_database(database_path: Path) -> dict[str, int | str]:
    """运行全部数据库验收，并仅返回可公开的计数与完整性结果。"""
    database_path = database_path.resolve()
    if not database_path.is_file():
        raise FileNotFoundError(f"数据库文件不存在：{database_path}")
    connection = sqlite3.connect(f"{database_path.as_uri()}?mode=ro", uri=True)
    try:
        integrity = scalar(connection, "PRAGMA integrity_check")
        if integrity != "ok":
            raise AssertionError(f"SQLite 完整性检查失败：{integrity}")
        foreign_key_errors = connection.execute("PRAGMA foreign_key_check").fetchall()
        if foreign_key_errors:
            raise AssertionError(f"外键检查失败：{foreign_key_errors}")
        if scalar(connection, "SELECT meta_value FROM system_metadata WHERE meta_key = 'database_version'") != "1.0.0":
            raise AssertionError("database_version 必须为 1.0.0")

        verify_schema_contract(connection)
        verify_scope_and_source_boundary(connection)
        verify_demo_route_contract(connection)
        verify_sick_leave_semantics(connection)
        verify_retrieval_coverage(connection)
        verify_demo_privacy_boundary(connection)

        return {
            "integrity": str(integrity),
            "sources": int(scalar(connection, "SELECT COUNT(*) FROM source_document")),
            "knowledge_items": int(scalar(connection, "SELECT COUNT(*) FROM knowledge_item")),
            "knowledge_aliases": int(scalar(connection, "SELECT COUNT(*) FROM knowledge_alias")),
            "demo_routes": int(scalar(connection, "SELECT COUNT(*) FROM approval_route WHERE scope = 'DEMO_WORKFLOW'")),
            "demo_applications": int(scalar(connection, "SELECT COUNT(*) FROM leave_application")),
        }
    finally:
        connection.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="验证学事智办数据库 V1")
    parser.add_argument(
        "--database", type=Path, default=DEFAULT_DATABASE,
        help=f"数据库路径（默认：{DEFAULT_DATABASE}）",
    )
    return parser.parse_args()


def main() -> None:
    results = verify_database(parse_args().database)
    print("验证通过：")
    for name, value in results.items():
        print(f"  {name}: {value}")


if __name__ == "__main__":
    main()
