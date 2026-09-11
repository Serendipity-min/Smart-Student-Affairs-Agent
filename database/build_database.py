#!/usr/bin/env python3
"""构建“学事智办”初版 SQLite 数据库。"""

from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = SCRIPT_DIR / "student_affairs_v1.0.sqlite3"
DEFAULT_REPORT = SCRIPT_DIR / "reports" / "DATABASE_V1_COVERAGE.md"
SQL_FILES = (
    SCRIPT_DIR / "schema.sql",
    SCRIPT_DIR / "seed_official.sql",
    SCRIPT_DIR / "seed_demo.sql",
    SCRIPT_DIR / "seed_knowledge.sql",
    SCRIPT_DIR / "views.sql",
)


def execute_sql_file(connection: sqlite3.Connection, sql_path: Path) -> None:
    """以 UTF-8 执行受版本控制的 SQL，避免依赖系统默认编码。"""
    connection.executescript(sql_path.read_text(encoding="utf-8"))


def write_coverage_report(database_path: Path, report_path: Path) -> None:
    """从已落盘的 V1 数据库计算覆盖统计，防止报告与实际数据脱节。"""
    connection = sqlite3.connect(f"{database_path.as_uri()}?mode=ro", uri=True)
    try:
        def count(table: str, where: str = "") -> int:
            suffix = f" WHERE {where}" if where else ""
            return int(connection.execute(f"SELECT COUNT(*) FROM {table}{suffix}").fetchone()[0])

        version = connection.execute(
            "SELECT meta_value FROM system_metadata WHERE meta_key = 'database_version'"
        ).fetchone()[0]
        scope_rows = connection.execute(
            "SELECT scope, COUNT(*) FROM knowledge_item GROUP BY scope ORDER BY scope"
        ).fetchall()
        scope_lines = "\n".join(f"| `{scope}` | {amount} |" for scope, amount in scope_rows)
        view_count = count("sqlite_master", "type = 'view'")
        index_count = count("sqlite_master", "type = 'index' AND name NOT LIKE 'sqlite_%'")
        uncovered_official_rules = int(
            connection.execute(
                """
                SELECT COUNT(*) FROM policy_rule AS pr
                WHERE pr.scope = 'OFFICIAL_POLICY'
                  AND NOT EXISTS (
                      SELECT 1 FROM knowledge_item AS ki WHERE ki.rule_id = pr.rule_id
                  )
                """
            ).fetchone()[0]
        )
        report = f"""# 学事智办数据库 V1 覆盖报告

本报告由 `python database/build_database.py` 从 `student_affairs_v1.0.sqlite3` 实际计算生成。

## 构建摘要

| 项目 | 数量/值 |
|---|---:|
| 数据库版本 | `{version}` |
| 来源文档 | {count('source_document')} |
| 官方制度文件 | {count('policy_document', "scope = 'OFFICIAL_POLICY'")} |
| 制度规则 | {count('policy_rule')} |
| 官方审批路由 | {count('approval_route', "scope = 'OFFICIAL_POLICY'")} |
| DEMO 审批路由 | {count('approval_route', "scope = 'DEMO_WORKFLOW'")} |
| 知识条目 | {count('knowledge_item')} |
| 同义问法 | {count('knowledge_alias')} |
| 公共服务联系人 | {count('public_contact')} |
| 合成学生 | {count('demo_student_profile')} |
| 合成请假申请 | {count('leave_application')} |
| 视图 | {view_count} |
| 非系统索引 | {index_count} |
| 验证检查组 | 9 |
| 无检索入口的官方规则 | {uncovered_official_rules} |

## 知识检索分层

| scope | 知识条目数 |
|---|---:|
{scope_lines}

## 边界说明

- `OFFICIAL_POLICY` 条目均引用 `source_document.source_id`；DEMO 规则和合成流程不作为校方正式制度。
- 当前官方 `policy_rule` 均应具有 `knowledge_item.rule_id` 检索入口；该项为 0 才代表无遗漏。
- `PUBLIC_SERVICE` 仅保留公开服务联系方式；`SYNTHETIC_DEMO` 仅用于演示课表与请假影响说明。
- 2024 学生手册在未取得可核验全文前保持 `metadata_only`，不据此补写具体条款。
"""
    finally:
        connection.close()

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")


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
        # 覆盖报告在原子替换成功后再生成，确保统计对象就是可交付数据库。
        write_coverage_report(output_path, DEFAULT_REPORT)
        with sqlite3.connect(f"{output_path.as_uri()}?mode=ro", uri=True) as report_connection:
            test_count = int(report_connection.execute("SELECT COUNT(*) FROM test_case").fetchone()[0])
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
    print(f"数据库内测试用例：{test_count} 条")
    print(f"覆盖报告已生成：{DEFAULT_REPORT}")


if __name__ == "__main__":
    main()
