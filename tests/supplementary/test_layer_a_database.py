#!/usr/bin/env python3
"""
tests/supplementary/test_layer_a_database.py
Layer A: Database V1.0 reproducibility, schema integrity, and coverage verification.
"""

from __future__ import annotations

import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = REPO_ROOT / "database" / "student_affairs_v1.0.sqlite3"
BUILD_SCRIPT = REPO_ROOT / "database" / "build_database.py"
VERIFY_SCRIPT = REPO_ROOT / "database" / "verify_database.py"


def run_layer_a_tests() -> Dict[str, Any]:
    results = {
        "layer": "Layer A — Database V1.0",
        "db_path": str(DB_PATH),
        "checks": [],
        "passed": 0,
        "total": 0,
        "status": "PASS",
        "stats": {},
    }

    def record_check(name: str, passed: bool, expected: Any, actual: Any, detail: str = ""):
        results["total"] += 1
        if passed:
            results["passed"] += 1
        else:
            results["status"] = "FAIL"
        results["checks"].append({
            "name": name,
            "passed": passed,
            "expected": str(expected),
            "actual": str(actual),
            "detail": detail,
        })

    # 1. Verify verify_database.py script execution
    try:
        proc = subprocess.run(
            [sys.executable, str(VERIFY_SCRIPT)],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            check=True,
        )
        record_check("verify_database.py script execution", True, "exit code 0", f"exit code {proc.returncode}")
    except subprocess.CalledProcessError as exc:
        record_check("verify_database.py script execution", False, "exit code 0", f"exit code {exc.returncode}\n{exc.stderr}")

    if not DB_PATH.exists():
        record_check("Database File Exists", False, "file exists", "file not found", str(DB_PATH))
        return results

    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # 2. PRAGMA integrity_check
        cursor.execute("PRAGMA integrity_check;")
        integrity_rows = [r[0] for r in cursor.fetchall()]
        integrity_ok = len(integrity_rows) == 1 and integrity_rows[0] == "ok"
        record_check("PRAGMA integrity_check", integrity_ok, "ok", integrity_rows[0] if integrity_rows else "empty")
        results["stats"]["integrity"] = integrity_rows[0] if integrity_rows else "unknown"

        # 3. PRAGMA foreign_key_check
        cursor.execute("PRAGMA foreign_key_check;")
        fk_errors = cursor.fetchall()
        record_check("PRAGMA foreign_key_check", len(fk_errors) == 0, 0, len(fk_errors))
        results["stats"]["foreign_key_errors"] = len(fk_errors)

        # 4. system_metadata
        cursor.execute("SELECT meta_key, meta_value FROM system_metadata;")
        metadata = dict(cursor.fetchall())
        version = metadata.get("database_version")
        record_check("database_version", version == "1.0.0", "1.0.0", version)
        results["stats"]["database_version"] = version

        # 5. Entity Counts
        cursor.execute("SELECT COUNT(*) FROM source_document;")
        source_docs = cursor.fetchone()[0]
        record_check("source_document count", source_docs == 15, 15, source_docs)
        results["stats"]["source_documents"] = source_docs

        cursor.execute("SELECT COUNT(*) FROM policy_document WHERE effective_status = 'current_public';")
        official_policy_docs = cursor.fetchone()[0]
        record_check("official policy_document count", official_policy_docs == 1, 1, official_policy_docs)
        results["stats"]["official_policy_docs"] = official_policy_docs

        cursor.execute("SELECT COUNT(*) FROM policy_rule;")
        policy_rules = cursor.fetchone()[0]
        record_check("policy_rule count", policy_rules == 16, 16, policy_rules)
        results["stats"]["policy_rules"] = policy_rules

        cursor.execute("SELECT COUNT(*) FROM approval_route WHERE is_official = 1;")
        official_routes = cursor.fetchone()[0]
        record_check("official approval_route count", official_routes == 5, 5, official_routes)
        results["stats"]["official_routes"] = official_routes

        cursor.execute("SELECT COUNT(*) FROM approval_route WHERE is_official = 0;")
        demo_routes = cursor.fetchone()[0]
        record_check("demo approval_route count", demo_routes == 4, 4, demo_routes)
        results["stats"]["demo_routes"] = demo_routes

        cursor.execute("SELECT COUNT(*) FROM knowledge_item;")
        knowledge_items = cursor.fetchone()[0]
        record_check("knowledge_item count", knowledge_items == 26, 26, knowledge_items)
        results["stats"]["knowledge_items"] = knowledge_items

        cursor.execute("SELECT COUNT(*) FROM knowledge_alias;")
        knowledge_aliases = cursor.fetchone()[0]
        record_check("knowledge_alias count", knowledge_aliases == 31, 31, knowledge_aliases)
        results["stats"]["knowledge_aliases"] = knowledge_aliases

        cursor.execute("SELECT COUNT(*) FROM public_contact;")
        public_services = cursor.fetchone()[0]
        record_check("public_contact count", public_services == 17, 17, public_services)
        results["stats"]["public_services"] = public_services

        cursor.execute("SELECT COUNT(*) FROM demo_user WHERE role = 'student';")
        synthetic_students = cursor.fetchone()[0]
        record_check("synthetic students count", synthetic_students == 12, 12, synthetic_students)
        results["stats"]["synthetic_students"] = synthetic_students

        cursor.execute("SELECT COUNT(*) FROM leave_application;")
        synthetic_applications = cursor.fetchone()[0]
        record_check("synthetic applications count", synthetic_applications == 14, 14, synthetic_applications)
        results["stats"]["synthetic_applications"] = synthetic_applications

        # 6. Views
        cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type = 'view';")
        views_count = cursor.fetchone()[0]
        record_check("views count", views_count == 4, 4, views_count)
        results["stats"]["views"] = views_count

        # 7. Non-system Indexes
        cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%';")
        indexes_count = cursor.fetchone()[0]
        record_check("non-system indexes count", indexes_count == 10, 10, indexes_count)
        results["stats"]["indexes"] = indexes_count

        # 8. Unindexed official rules
        cursor.execute("""
            SELECT pr.rule_id
            FROM policy_rule AS pr
            LEFT JOIN knowledge_item AS ki ON ki.rule_id = pr.rule_id
            WHERE pr.scope = 'OFFICIAL_POLICY'
            GROUP BY pr.rule_id
            HAVING COUNT(ki.knowledge_id) = 0
        """)
        unindexed_official = cursor.fetchall()
        record_check("unindexed official rules", len(unindexed_official) == 0, 0, len(unindexed_official))
        results["stats"]["unindexed_official_rules"] = len(unindexed_official)

        # 9. Scopes validation
        cursor.execute("SELECT COUNT(*) FROM policy_document WHERE scope NOT IN ('OFFICIAL_POLICY', 'DEMO_WORKFLOW');")
        invalid_doc_scope = cursor.fetchone()[0]
        record_check("valid policy_document scopes", invalid_doc_scope == 0, 0, invalid_doc_scope)

        cursor.execute("SELECT COUNT(*) FROM policy_rule WHERE scope NOT IN ('OFFICIAL_POLICY', 'DEMO_WORKFLOW');")
        invalid_rule_scope = cursor.fetchone()[0]
        record_check("valid policy_rule scopes", invalid_rule_scope == 0, 0, invalid_rule_scope)

        cursor.execute("SELECT COUNT(*) FROM approval_route WHERE scope NOT IN ('OFFICIAL_POLICY', 'DEMO_WORKFLOW');")
        invalid_route_scope = cursor.fetchone()[0]
        record_check("valid approval_route scopes", invalid_route_scope == 0, 0, invalid_route_scope)

        cursor.execute("SELECT COUNT(*) FROM knowledge_item WHERE scope NOT IN ('OFFICIAL_POLICY', 'DEMO_WORKFLOW', 'PUBLIC_SERVICE', 'SYNTHETIC_DEMO');")
        invalid_ki_scope = cursor.fetchone()[0]
        record_check("valid knowledge_item scopes", invalid_ki_scope == 0, 0, invalid_ki_scope)

    finally:
        conn.close()

    return results


if __name__ == "__main__":
    res = run_layer_a_tests()
    print(f"Layer A Result: {res['status']} ({res['passed']}/{res['total']})")
    for chk in res["checks"]:
        print(f"  [{'PASS' if chk['passed'] else 'FAIL'}] {chk['name']}: actual={chk['actual']}, expected={chk['expected']}")
