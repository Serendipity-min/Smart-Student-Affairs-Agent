#!/usr/bin/env python3
"""
tests/supplementary/test_layer_f_repeatability.py
Layer F: Deterministic Repeatability Tests (140+ route calculations, 0 inconsistent outputs).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "tests" / "supplementary" / "helpers"))
from api_server import MockApiServer


def run_layer_f_tests(server: MockApiServer | None = None, repetitions: int = 20) -> Dict[str, Any]:
    manage_server = server is None
    if manage_server:
        server = MockApiServer(port=0)
        server.start()

    results = {
        "layer": "Layer F — Deterministic Repeatability",
        "repetitions_per_case": repetitions,
        "total_calculations": 0,
        "inconsistent_count": 0,
        "cases": [],
        "passed": 0,
        "total": 0,
        "status": "PASS",
    }

    test_cases = [
        {
            "case_id": "R01",
            "name": "普通 1 天请假 (R01)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-09-01", "off_campus_internship": False},
        },
        {
            "case_id": "R03",
            "name": "普通 4 天请假 (R03)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-09-04", "off_campus_internship": False},
        },
        {
            "case_id": "R05",
            "name": "普通超过一个自然月 (R05)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-10-02", "off_campus_internship": False},
        },
        {
            "case_id": "R06",
            "name": "校外实习 2 天 (R06)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-09-02", "off_campus_internship": True},
        },
        {
            "case_id": "R07",
            "name": "校外实习 40 天 (R07)",
            "payload": {"leave_type": "personal", "start_at": "2026-09-01", "end_at": "2026-10-10", "off_campus_internship": True},
        },
        {
            "case_id": "R08",
            "name": "病假无证明 (R08)",
            "payload": {"leave_type": "sick", "start_at": "2026-09-01", "end_at": "2026-09-02", "has_hospital_certificate": False},
        },
        {
            "case_id": "R12a",
            "name": "自然月边界: 1月31日~2月28日 (R12a)",
            "payload": {"leave_type": "personal", "start_at": "2027-01-31", "end_at": "2027-02-28", "off_campus_internship": False},
        },
    ]

    try:
        for tcase in test_cases:
            results["total"] += 1
            case_id = tcase["case_id"]
            name = tcase["name"]
            payload = tcase["payload"]

            distinct_outputs = set()
            sample_output = None
            case_calc_count = 0

            for i in range(repetitions):
                case_calc_count += 1
                results["total_calculations"] += 1
                status_code, body = server.post("/v1/route/calculate", payload=payload)

                output_signature = (
                    status_code,
                    body.get("route_id"),
                    tuple(body.get("approver_sequence", [])),
                    body.get("ready_to_submit"),
                    tuple(body.get("warnings", [])),
                    tuple(body.get("errors", [])),
                )
                distinct_outputs.add(output_signature)
                if sample_output is None:
                    sample_output = body

            is_consistent = len(distinct_outputs) == 1
            if is_consistent:
                results["passed"] += 1
            else:
                results["inconsistent_count"] += 1
                results["status"] = "FAIL"

            results["cases"].append({
                "case_id": case_id,
                "name": name,
                "repetitions": case_calc_count,
                "distinct_outputs_count": len(distinct_outputs),
                "is_consistent": is_consistent,
                "route_id": sample_output.get("route_id") if sample_output else None,
                "approvers": sample_output.get("approver_sequence") if sample_output else None,
                "ready_to_submit": sample_output.get("ready_to_submit") if sample_output else None,
            })

    finally:
        if manage_server:
            server.stop()

    return results


if __name__ == "__main__":
    res = run_layer_f_tests(repetitions=20)
    print(f"Layer F Result: {res['status']} ({res['passed']}/{res['total']}) - {res['total_calculations']} calculations, {res['inconsistent_count']} inconsistent")
    for c in res["cases"]:
        print(f"  [{'PASS' if c['is_consistent'] else 'FAIL'}] {c['case_id']} ({c['repetitions']} runs) -> distinct={c['distinct_outputs_count']}, route={c['route_id']}")
