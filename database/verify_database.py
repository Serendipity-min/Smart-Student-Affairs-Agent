#!/usr/bin/env python3
"""验证初版数据库的结构、来源完整性和合成数据边界。"""

from __future__ import annotations

import argparse
import hashlib
import re
import sqlite3
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_DATABASE = SCRIPT_DIR / "student_affairs_v0.1.sqlite3"


def scalar(connection: sqlite3.Connection, query: str, parameters: tuple = ()) -> int | str:
    row = connection.execute(query, parameters).fetchone()
    if row is None:
        raise AssertionError(f"查询未返回结果：{query}")
    return row[0]


def verify_hashes(connection: sqlite3.Connection) -> int:
    """仅对来源台账声明的相对路径计算哈希，并约束其必须位于项目目录内。"""
    checked = 0
    project_root = PROJECT_ROOT.resolve()
    rows = connection.execute(
        "SELECT source_id, local_path, sha256 FROM source_document WHERE local_path IS NOT NULL"
    ).fetchall()
    for source_id, local_path, expected_hash in rows:
        candidate = (project_root / local_path).resolve()
        if project_root not in candidate.parents:
            raise AssertionError(f"{source_id} 的本地路径越出项目目录：{candidate}")
        if not candidate.is_file():
            raise AssertionError(f"{source_id} 的本地附件不存在：{candidate}")
        actual_hash = hashlib.sha256(candidate.read_bytes()).hexdigest().upper()
        if actual_hash != expected_hash.upper():
            raise AssertionError(
                f"{source_id} 的 SHA256 不匹配：{actual_hash} != {expected_hash}"
            )
        checked += 1
    return checked


def verify_database(database_path: Path) -> dict[str, int | str]:
    database_path = database_path.resolve()
    if not database_path.is_file():
        raise FileNotFoundError(f"数据库文件不存在：{database_path}")
    # as_uri 会对空格、问号等路径字符编码，避免它们被 SQLite URI 误解释为查询参数。
    connection = sqlite3.connect(f"{database_path.as_uri()}?mode=ro", uri=True)
    try:
        integrity = scalar(connection, "PRAGMA integrity_check")
        if integrity != "ok":
            raise AssertionError(f"SQLite 完整性检查失败：{integrity}")

        foreign_key_errors = connection.execute("PRAGMA foreign_key_check").fetchall()
        if foreign_key_errors:
            raise AssertionError(f"外键检查失败：{foreign_key_errors}")

        counts = {
            "sources": scalar(connection, "SELECT COUNT(*) FROM source_document"),
            "campuses": scalar(connection, "SELECT COUNT(*) FROM campus"),
            "organizations": scalar(connection, "SELECT COUNT(*) FROM organization_unit"),
            "policy_rules": scalar(connection, "SELECT COUNT(*) FROM policy_rule"),
            "approval_routes": scalar(connection, "SELECT COUNT(*) FROM approval_route"),
            "public_contacts": scalar(connection, "SELECT COUNT(*) FROM public_contact"),
            "demo_students": scalar(connection, "SELECT COUNT(*) FROM demo_student_profile"),
            "demo_courses": scalar(connection, "SELECT COUNT(*) FROM demo_course"),
            "leave_applications": scalar(connection, "SELECT COUNT(*) FROM leave_application"),
            "test_cases": scalar(connection, "SELECT COUNT(*) FROM test_case"),
        }
        expected_minimums = {
            "sources": 15,
            "campuses": 2,
            "organizations": 23,
            "policy_rules": 11,
            "approval_routes": 5,
            "public_contacts": 17,
            "demo_students": 12,
            "demo_courses": 12,
            "leave_applications": 14,
            "test_cases": 50,
        }
        for name, minimum in expected_minimums.items():
            if int(counts[name]) < minimum:
                raise AssertionError(f"{name} 数量不足：{counts[name]} < {minimum}")

        invalid_users = connection.execute(
            """
            SELECT user_id, display_name FROM demo_user
            WHERE user_id NOT LIKE 'DEMO-%'
               OR is_synthetic <> 1
               OR display_name NOT LIKE '演示%'
            """
        ).fetchall()
        if invalid_users:
            raise AssertionError(f"发现未明确标识的合成用户：{invalid_users}")

        invalid_business_ids = connection.execute(
            """
            SELECT application_id FROM leave_application WHERE application_id NOT LIKE 'DEMO-%'
            UNION ALL
            SELECT request_id FROM leave_application WHERE request_id NOT LIKE 'DEMO-%'
            """
        ).fetchall()
        if invalid_business_ids:
            raise AssertionError(f"发现非 DEMO 业务编号：{invalid_business_ids}")

        # 合成身份表不应出现手机号、身份证号或邮箱，避免测试数据被误当成真实信息。
        demo_text = "\n".join(
            " ".join(str(value) for value in row if value is not None)
            for row in connection.execute(
                """
                SELECT user_id, display_name, synthetic_student_no, major_name, class_name
                FROM demo_student_profile
                JOIN demo_user ON demo_user.user_id = demo_student_profile.student_id
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

        official_routes = scalar(
            connection, "SELECT COUNT(*) FROM approval_route WHERE is_official = 1"
        )
        if official_routes != 5:
            raise AssertionError(f"官方路由应为5条，实际为{official_routes}")

        hash_count = verify_hashes(connection)
        counts["verified_local_files"] = hash_count
        counts["integrity"] = str(integrity)
        return counts
    finally:
        connection.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="验证学事智办初版 SQLite 数据库")
    parser.add_argument(
        "--database",
        type=Path,
        default=DEFAULT_DATABASE,
        help=f"数据库路径（默认：{DEFAULT_DATABASE}）",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    results = verify_database(args.database)
    print("验证通过：")
    for name, value in results.items():
        print(f"  {name}: {value}")


if __name__ == "__main__":
    main()
