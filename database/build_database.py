#!/usr/bin/env python3
"""构建“学事智办”初版 SQLite 数据库。"""

from __future__ import annotations

import argparse
import csv
import os
import sqlite3
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_OUTPUT = SCRIPT_DIR / "student_affairs_v0.1.sqlite3"
TEST_CASE_CSV = PROJECT_ROOT / "tests" / "fixtures" / "golden_cases_v0.1.csv"
SQL_FILES = (
    SCRIPT_DIR / "schema.sql",
    SCRIPT_DIR / "seed_official.sql",
    SCRIPT_DIR / "seed_demo.sql",
    SCRIPT_DIR / "views.sql",
)


def execute_sql_file(connection: sqlite3.Connection, sql_path: Path) -> None:
    """以 UTF-8 执行受版本控制的 SQL，避免依赖系统默认编码。"""
    connection.executescript(sql_path.read_text(encoding="utf-8"))


def load_test_cases(connection: sqlite3.Connection, csv_path: Path) -> int:
    """导入黄金用例；列名由固定白名单映射，防止 CSV 结构静默漂移。"""
    expected_columns = [
        "case_id",
        "category",
        "user_input",
        "expected_intent",
        "expected_next_action",
        "expected_rule_code",
        "expected_tool",
        "security_expectation",
        "source_ids",
        "notes",
    ]
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != expected_columns:
            raise ValueError(
                f"测试用例列不符合预期：{reader.fieldnames!r}，应为 {expected_columns!r}"
            )
        rows = [tuple(row[column] or None for column in expected_columns) for row in reader]

    connection.executemany(
        """
        INSERT INTO test_case (
            case_id, category, user_input, expected_intent, expected_next_action,
            expected_rule_code, expected_tool, security_expectation, source_ids, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    return len(rows)


def build_database(output_path: Path) -> tuple[Path, int]:
    """先在同目录临时文件构建，通过完整性检查后再原子替换目标文件。"""
    output_path = output_path.resolve()
    if output_path.suffix.lower() != ".sqlite3":
        raise ValueError("为避免误覆盖其他文件，输出文件必须使用 .sqlite3 后缀")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")

    # 只清理与目标数据库同名的临时普通文件；符号链接需要人工核验，避免越界覆盖。
    if temp_path.exists():
        if temp_path.is_symlink() or not temp_path.is_file():
            raise ValueError(f"临时路径不是可安全覆盖的普通文件：{temp_path}")
        temp_path.unlink()

    connection: sqlite3.Connection | None = None
    try:
        connection = sqlite3.connect(temp_path)
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = DELETE")
        for sql_path in SQL_FILES:
            execute_sql_file(connection, sql_path)
        with connection:
            test_count = load_test_cases(connection, TEST_CASE_CSV)

        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        foreign_key_errors = connection.execute("PRAGMA foreign_key_check").fetchall()
        if integrity != "ok" or foreign_key_errors:
            raise RuntimeError(
                f"数据库检查失败：integrity={integrity!r}, foreign_keys={foreign_key_errors!r}"
            )
        connection.close()
        connection = None

        # 已存在的目标必须是 SQLite 文件；显式拒绝误把文档或其他资产当成数据库覆盖。
        if output_path.exists():
            if output_path.is_symlink() or not output_path.is_file():
                raise ValueError(f"目标路径不是可安全覆盖的普通文件：{output_path}")
            with output_path.open("rb") as existing:
                if existing.read(16) != b"SQLite format 3\x00":
                    raise ValueError(f"目标文件不是 SQLite 数据库，拒绝覆盖：{output_path}")
        os.replace(temp_path, output_path)
        return output_path, test_count
    except Exception:
        if connection is not None:
            connection.close()
        if temp_path.exists():
            temp_path.unlink()
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="构建学事智办初版 SQLite 数据库")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"输出路径（默认：{DEFAULT_OUTPUT}）",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path, test_count = build_database(args.output)
    print(f"数据库已生成：{output_path}")
    print(f"已导入黄金测试用例：{test_count} 条")


if __name__ == "__main__":
    main()
