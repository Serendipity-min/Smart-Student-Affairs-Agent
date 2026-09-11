#!/usr/bin/env python3
"""
tests/supplementary/test_layer_b_consistency.py
Layer B: Cross-layer semantic consistency check between Database V1.0, Node runtime, and Python rules.
"""

from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = REPO_ROOT / "database" / "student_affairs_v1.0.sqlite3"
sys.path.insert(0, str(REPO_ROOT / "mock_api"))
from leave_rules import calculate_leave_route as py_calculate_leave_route


def eval_node_route(payload: Dict[str, Any]) -> Dict[str, Any]:
    js_code = f"""
    import {{ calculateLeaveRoute }} from './external_mock_api/src/rules.mjs';
    const payload = {json.dumps(payload)};
    console.log(JSON.stringify(calculateLeaveRoute(payload)));
    """
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", js_code],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return json.loads(proc.stdout.strip())


def run_layer_b_tests() -> Dict[str, Any]:
    results = {
        "layer": "Layer B — Cross-Layer Consistency",
        "checks": [],
        "passed": 0,
        "total": 0,
        "status": "PASS",
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

    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Load DB Demo routes
        cursor.execute("SELECT route_id, approver_sequence, terminal_action FROM approval_route WHERE scope = 'DEMO_WORKFLOW';")
        db_routes = {row["route_id"]: row for row in cursor.fetchall()}

        # ---------------------------------------------------------------------
        # B1: Normal <= 3 days (e.g. 2 days)
        # ---------------------------------------------------------------------
        b1_payload = {"start_at": "2026-09-01", "end_at": "2026-09-02", "leave_type": "personal", "off_campus_internship": False}
        py_b1 = py_calculate_leave_route(b1_payload)
        node_b1 = eval_node_route(b1_payload)
        db_b1_seq = db_routes.get("ROUTE-DEMO-LE3-NORMAL", {})["approver_sequence"] if "ROUTE-DEMO-LE3-NORMAL" in db_routes else ""

        b1_ok = (
            db_b1_seq == "counselor"
            and py_b1["route_id"] == "ROUTE-LE3-NORMAL"
            and py_b1["approver_sequence"] == ["counselor"]
            and node_b1["route_id"] == "ROUTE-LE3-NORMAL"
            and node_b1["approver_sequence"] == ["counselor"]
        )
        record_check("B1: Normal <= 3 days (counselor)", b1_ok, "counselor across DB/Node/Python", f"DB={db_b1_seq}, Node={node_b1['approver_sequence']}, Py={py_b1['approver_sequence']}")

        # ---------------------------------------------------------------------
        # B2: Normal > 3 days and <= 1 calendar month (e.g. 4 days)
        # ---------------------------------------------------------------------
        b2_payload = {"start_at": "2026-09-01", "end_at": "2026-09-04", "leave_type": "personal", "off_campus_internship": False}
        py_b2 = py_calculate_leave_route(b2_payload)
        node_b2 = eval_node_route(b2_payload)
        db_b2_seq = db_routes.get("ROUTE-DEMO-GT3-LE1M", {})["approver_sequence"] if "ROUTE-DEMO-GT3-LE1M" in db_routes else ""

        b2_ok = (
            db_b2_seq == "counselor > teaching_vice_dean"
            and py_b2["route_id"] == "ROUTE-GT3-LE1M"
            and py_b2["approver_sequence"] == ["counselor", "teaching_vice_dean"]
            and node_b2["route_id"] == "ROUTE-GT3-LE1M"
            and node_b2["approver_sequence"] == ["counselor", "teaching_vice_dean"]
        )
        record_check("B2: Normal > 3 days & <= 1 Month (2 levels)", b2_ok, "counselor > teaching_vice_dean across DB/Node/Python", f"DB={db_b2_seq}, Node={node_b2['approver_sequence']}, Py={py_b2['approver_sequence']}")

        # ---------------------------------------------------------------------
        # B3: Normal > 1 calendar month (e.g. 40 days)
        # ---------------------------------------------------------------------
        b3_payload = {"start_at": "2026-09-01", "end_at": "2026-10-10", "leave_type": "personal", "off_campus_internship": False}
        py_b3 = py_calculate_leave_route(b3_payload)
        node_b3 = eval_node_route(b3_payload)
        db_b3_act = db_routes.get("ROUTE-DEMO-GT1M-SUSPENSION", {})["terminal_action"] if "ROUTE-DEMO-GT1M-SUSPENSION" in db_routes else ""

        b3_ok = (
            db_b3_act == "suspension_handoff"
            and py_b3["route_id"] == "ROUTE-GT1M-SUSPENSION"
            and py_b3["ready_to_submit"] is False
            and node_b3["route_id"] == "ROUTE-GT1M-SUSPENSION"
            and node_b3["ready_to_submit"] is False
        )
        record_check("B3: Normal > 1 Month (suspension handoff)", b3_ok, "ROUTE-GT1M-SUSPENSION / not ready_to_submit", f"DB={db_b3_act}, Node={node_b3['route_id']}, Py={py_b3['route_id']}")

        # ---------------------------------------------------------------------
        # B4: Off-campus internship (3 levels, priority > duration)
        # ---------------------------------------------------------------------
        b4_payload_short = {"start_at": "2026-09-01", "end_at": "2026-09-02", "leave_type": "personal", "off_campus_internship": True}
        b4_payload_long = {"start_at": "2026-09-01", "end_at": "2026-10-20", "leave_type": "personal", "off_campus_internship": True}
        py_b4_short = py_calculate_leave_route(b4_payload_short)
        node_b4_short = eval_node_route(b4_payload_short)
        py_b4_long = py_calculate_leave_route(b4_payload_long)
        node_b4_long = eval_node_route(b4_payload_long)
        db_b4_seq = db_routes.get("ROUTE-DEMO-INTERNSHIP-3LEVEL", {})["approver_sequence"] if "ROUTE-DEMO-INTERNSHIP-3LEVEL" in db_routes else ""

        expected_3level = ["counselor", "teaching_vice_dean", "academic_affairs"]
        b4_ok = (
            db_b4_seq == "counselor > teaching_vice_dean > academic_affairs"
            and py_b4_short["route_id"] == "ROUTE-INTERNSHIP-3LEVEL"
            and py_b4_short["approver_sequence"] == expected_3level
            and node_b4_short["route_id"] == "ROUTE-INTERNSHIP-3LEVEL"
            and node_b4_short["approver_sequence"] == expected_3level
            and py_b4_long["route_id"] == "ROUTE-INTERNSHIP-3LEVEL"
            and node_b4_long["route_id"] == "ROUTE-INTERNSHIP-3LEVEL"
        )
        record_check("B4: Off-campus internship priority (3 levels)", b4_ok, "3 levels priority across DB/Node/Python", f"DB={db_b4_seq}, Node(40d)={node_b4_long['route_id']}, Py(40d)={py_b4_long['route_id']}")

        # ---------------------------------------------------------------------
        # B5: Leave types: 'internship' is NOT a valid leave_type
        # ---------------------------------------------------------------------
        b5_payload = {"start_at": "2026-09-01", "end_at": "2026-09-02", "leave_type": "internship", "off_campus_internship": False}
        py_b5 = py_calculate_leave_route(b5_payload)
        node_b5 = eval_node_route(b5_payload)
        cursor.execute("SELECT COUNT(*) FROM leave_application WHERE leave_type = 'internship';")
        db_internship_apps = cursor.fetchone()[0]

        b5_ok = (
            db_internship_apps == 0
            and py_b5["valid"] is False
            and "假别" in "".join(py_b5["errors"])
            and node_b5["valid"] is False
            and "假别" in "".join(node_b5["errors"])
        )
        record_check("B5: Disallow 'internship' as leave_type", b5_ok, "valid=False & error across DB/Node/Python", f"DB count={db_internship_apps}, Node valid={node_b5['valid']}, Py valid={py_b5['valid']}")

        # ---------------------------------------------------------------------
        # B6: Sick leave hospital cert is optional declaration
        # ---------------------------------------------------------------------
        b6_payload = {"start_at": "2026-09-01", "end_at": "2026-09-02", "leave_type": "sick", "has_hospital_certificate": False}
        py_b6 = py_calculate_leave_route(b6_payload)
        node_b6 = eval_node_route(b6_payload)

        cursor.execute("SELECT answer_summary FROM knowledge_item WHERE knowledge_id = 'KI-DEMO-SICK';")
        db_sick_demo = cursor.fetchone()[0]

        b6_ok = (
            "可选" in db_sick_demo
            and py_b6["valid"] is True
            and py_b6["ready_to_submit"] is True
            and any("审核环节要求补充" in w for w in py_b6["warnings"])
            and node_b6["valid"] is True
            and node_b6["ready_to_submit"] is True
            and any("审核环节要求补充" in w for w in node_b6["warnings"])
        )
        record_check("B6: Sick leave proof optional in DEMO", b6_ok, "valid=True, ready_to_submit=True, warning across DB/Node/Python", f"Node ready={node_b6['ready_to_submit']}, Py ready={py_b6['ready_to_submit']}")

    finally:
        conn.close()

    return results


if __name__ == "__main__":
    res = run_layer_b_tests()
    print(f"Layer B Result: {res['status']} ({res['passed']}/{res['total']})")
    for chk in res["checks"]:
        print(f"  [{'PASS' if chk['passed'] else 'FAIL'}] {chk['name']}: actual={chk['actual']}, expected={chk['expected']}")
