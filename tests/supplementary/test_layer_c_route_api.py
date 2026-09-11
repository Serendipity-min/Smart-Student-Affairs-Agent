#!/usr/bin/env python3
"""
tests/supplementary/test_layer_c_route_api.py
Layer C: Deterministic Route API automated tests (Cases R01~R12).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "tests" / "supplementary" / "helpers"))
from api_server import MockApiServer


def run_layer_c_tests(server: MockApiServer | None = None) -> Dict[str, Any]:
    manage_server = server is None
    if manage_server:
        server = MockApiServer(port=3199)
        server.start()

    results = {
        "layer": "Layer C — Route API",
        "cases": [],
        "passed": 0,
        "total": 0,
        "status": "PASS",
    }

    test_definitions = [
        {
            "case_id": "R01",
            "name": "普通 1 天请假",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-09-01", "off_campus_internship": False},
            "expected_route_id": "ROUTE-LE3-NORMAL",
            "expected_approvers": ["counselor"],
            "expected_ready": True,
            "expected_duration": 1,
        },
        {
            "case_id": "R02",
            "name": "普通 3 天请假",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-09-03", "off_campus_internship": False},
            "expected_route_id": "ROUTE-LE3-NORMAL",
            "expected_approvers": ["counselor"],
            "expected_ready": True,
            "expected_duration": 3,
        },
        {
            "case_id": "R03",
            "name": "普通 4 天请假",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-09-04", "off_campus_internship": False},
            "expected_route_id": "ROUTE-GT3-LE1M",
            "expected_approvers": ["counselor", "teaching_vice_dean"],
            "expected_ready": True,
            "expected_duration": 4,
        },
        {
            "case_id": "R04",
            "name": "普通 >3天且在1自然月内 (15天)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-09-15", "off_campus_internship": False},
            "expected_route_id": "ROUTE-GT3-LE1M",
            "expected_approvers": ["counselor", "teaching_vice_dean"],
            "expected_ready": True,
            "expected_duration": 15,
        },
        {
            "case_id": "R05",
            "name": "普通超过一个自然月 (32天)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-10-02", "off_campus_internship": False},
            "expected_route_id": "ROUTE-GT1M-SUSPENSION",
            "expected_approvers": [],
            "expected_ready": False,
            "expected_duration": 32,
        },
        {
            "case_id": "R06",
            "name": "校外实习 2 天 (三级审批)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-09-02", "off_campus_internship": True},
            "expected_route_id": "ROUTE-INTERNSHIP-3LEVEL",
            "expected_approvers": ["counselor", "teaching_vice_dean", "academic_affairs"],
            "expected_ready": True,
            "expected_duration": 2,
        },
        {
            "case_id": "R07",
            "name": "校外实习 40 天 (实习优先于时长)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-10-10", "off_campus_internship": True},
            "expected_route_id": "ROUTE-INTERNSHIP-3LEVEL",
            "expected_approvers": ["counselor", "teaching_vice_dean", "academic_affairs"],
            "expected_ready": True,
            "expected_duration": 40,
        },
        {
            "case_id": "R08",
            "name": "病假无证明 (可提交不硬阻断)",
            "payload": {"leave_type": "sick", "start_at": "2026-09-01", "end_at": "2026-09-02", "has_hospital_certificate": False},
            "expected_route_id": "ROUTE-LE3-NORMAL",
            "expected_approvers": ["counselor"],
            "expected_ready": True,
            "expected_warning": "未声明已准备医院证明",
        },
        {
            "case_id": "R09",
            "name": "病假有证明 (正常通过)",
            "payload": {"leave_type": "sick", "start_at": "2026-09-01", "end_at": "2026-09-02", "has_hospital_certificate": True},
            "expected_route_id": "ROUTE-LE3-NORMAL",
            "expected_approvers": ["counselor"],
            "expected_ready": True,
        },
        {
            "case_id": "R10",
            "name": "公务假 (official_activity)",
            "payload": {"leave_type": "official_activity", "start_at": "2026-09-01", "end_at": "2026-09-02"},
            "expected_route_id": "ROUTE-LE3-NORMAL",
            "expected_approvers": ["counselor"],
            "expected_ready": True,
        },
        {
            "case_id": "R11",
            "name": "其他假 (other)",
            "payload": {"leave_type": "other", "start_at": "2026-09-01", "end_at": "2026-09-02"},
            "expected_route_id": "ROUTE-LE3-NORMAL",
            "expected_approvers": ["counselor"],
            "expected_ready": True,
        },
        {
            "case_id": "R12a",
            "name": "自然月边界: 1月31日~2月28日 (刚好处在一个自然月内)",
            "payload": {"leave_type": "personal", "start_at": "2027-01-31", "end_at": "2027-02-28", "off_campus_internship": False},
            "expected_route_id": "ROUTE-GT3-LE1M",
            "expected_approvers": ["counselor", "teaching_vice_dean"],
            "expected_ready": True,
            "expected_duration": 29,
        },
        {
            "case_id": "R12b",
            "name": "自然月边界: 1月31日~3月1日 (跨越自然月转休学)",
            "payload": {"leave_type": "personal", "start_at": "2027-01-31", "end_at": "2027-03-01", "off_campus_internship": False},
            "expected_route_id": "ROUTE-GT1M-SUSPENSION",
            "expected_approvers": [],
            "expected_ready": False,
            "expected_duration": 30,
        },
    ]

    try:
        for tdef in test_definitions:
            results["total"] += 1
            status_code, body = server.post("/v1/route/calculate", payload=tdef["payload"])

            route_id = body.get("route_id")
            approvers = body.get("approver_sequence", [])
            ready = body.get("ready_to_submit")
            duration = body.get("duration_days")
            warnings = body.get("warnings", [])

            passed = (
                status_code == 200
                and route_id == tdef["expected_route_id"]
                and approvers == tdef["expected_approvers"]
                and ready == tdef["expected_ready"]
            )
            if "expected_duration" in tdef:
                passed = passed and (duration == tdef["expected_duration"])
            if "expected_warning" in tdef:
                passed = passed and any(tdef["expected_warning"] in w for w in warnings)

            if passed:
                results["passed"] += 1
            else:
                results["status"] = "FAIL"

            results["cases"].append({
                "case_id": tdef["case_id"],
                "name": tdef["name"],
                "payload": tdef["payload"],
                "status_code": status_code,
                "route_id": route_id,
                "approvers": approvers,
                "ready_to_submit": ready,
                "duration_days": duration,
                "warnings": warnings,
                "passed": passed,
            })
    finally:
        if manage_server:
            server.stop()

    return results


if __name__ == "__main__":
    res = run_layer_c_tests()
    print(f"Layer C Result: {res['status']} ({res['passed']}/{res['total']})")
    for c in res["cases"]:
        print(f"  [{'PASS' if c['passed'] else 'FAIL'}] {c['case_id']} {c['name']} -> route_id={c['route_id']}, approvers={c['approvers']}, ready={c['ready_to_submit']}")
