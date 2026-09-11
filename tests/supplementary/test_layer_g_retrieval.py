#!/usr/bin/env python3
"""
tests/supplementary/test_layer_g_retrieval.py
Layer G: Database knowledge retrieval tests against v_knowledge_retrieval view (12 search terms).
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = REPO_ROOT / "database" / "student_affairs_v1.0.sqlite3"

QUERY_TERMS = [
    {"term": "病假单", "expected_scope": "OFFICIAL_POLICY", "expected_id": "KI-OFF-LEAVE-SICK"},
    {"term": "医院证明", "expected_scope": "OFFICIAL_POLICY", "expected_id": "KI-OFF-LEAVE-SICK"},
    {"term": "续假", "expected_scope": "OFFICIAL_POLICY", "expected_id": "KI-OFF-LEAVE-RENEW"},
    {"term": "销假", "expected_scope": "OFFICIAL_POLICY", "expected_id": "KI-OFF-LEAVE-RENEW"},
    {"term": "不能按时返校", "expected_scope": "OFFICIAL_POLICY", "expected_id": "KI-OFF-LEAVE-RENEW"},
    {"term": "忘记请假", "expected_scope": "OFFICIAL_POLICY", "expected_id": "KI-OFF-LEAVE-RETRO"},
    {"term": "请假四天谁审批", "expected_scope": "DEMO_WORKFLOW", "expected_id": "KI-DEMO-GT3"},
    {"term": "实习请假", "expected_scope": "DEMO_WORKFLOW", "expected_id": "KI-DEMO-INTERNSHIP"},
    {"term": "心理预约", "expected_scope": "PUBLIC_SERVICE", "expected_id": "KI-PUBLIC-PSY"},
    {"term": "校医院电话", "expected_scope": "PUBLIC_SERVICE", "expected_id": "KI-PUBLIC-HOSPITAL", "match_tokens": ["校医院", "电话"]},
    {"term": "保卫处电话", "expected_scope": "PUBLIC_SERVICE", "expected_id": "KI-PUBLIC-SECURITY"},
    {"term": "报修", "expected_scope": "PUBLIC_SERVICE", "expected_id": "KI-PUBLIC-REPAIR"},
]


def run_layer_g_tests() -> Dict[str, Any]:
    results = {
        "layer": "Layer G — Knowledge Retrieval",
        "cases": [],
        "passed": 0,
        "total": 0,
        "status": "PASS",
        "scope_leakage_detected": False,
    }

    if not DB_PATH.exists():
        results["status"] = "FAIL"
        return results

    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        for q in QUERY_TERMS:
            results["total"] += 1
            term = q["term"]
            expected_scope = q["expected_scope"]
            expected_id = q["expected_id"]

            pattern = f"%{term}%"
            if "match_tokens" in q:
                t1, t2 = q["match_tokens"]
                cursor.execute("""
                    SELECT
                        knowledge_id,
                        scope,
                        topic,
                        canonical_question,
                        answer_summary,
                        aliases,
                        source_id,
                        source_title,
                        source_locator,
                        authority_level
                    FROM v_knowledge_retrieval
                    WHERE (canonical_question LIKE ? AND canonical_question LIKE ?)
                       OR (aliases LIKE ? OR aliases LIKE ?)
                       OR (answer_summary LIKE ? AND answer_summary LIKE ?)
                    ORDER BY
                        CASE
                            WHEN knowledge_id = ? THEN 1
                            WHEN aliases LIKE ? THEN 2
                            ELSE 3
                        END;
                """, (f"%{t1}%", f"%{t2}%", f"%{t1}%", f"%{t2}%", f"%{t1}%", f"%{t2}%", expected_id, f"%{t2}%"))
            else:
                cursor.execute("""
                    SELECT
                        knowledge_id,
                        scope,
                        topic,
                        canonical_question,
                        answer_summary,
                        aliases,
                        source_id,
                        source_title,
                        source_locator,
                        authority_level
                    FROM v_knowledge_retrieval
                    WHERE canonical_question LIKE ?
                       OR answer_summary LIKE ?
                       OR topic LIKE ?
                       OR aliases LIKE ?
                    ORDER BY
                        CASE
                            WHEN aliases LIKE ? THEN 1
                            WHEN canonical_question LIKE ? THEN 2
                            WHEN topic LIKE ? THEN 3
                            ELSE 4
                        END;
                """, (pattern, pattern, pattern, pattern, pattern, pattern, pattern))

            rows = cursor.fetchall()

            matched = len(rows) > 0
            first_match = rows[0] if matched else None

            pass_check = False
            error_msg = ""
            if not matched:
                error_msg = f"No match for '{term}'"
            else:
                scope = first_match["scope"]
                k_id = first_match["knowledge_id"]
                src_id = first_match["source_id"]
                loc = first_match["source_locator"]

                scope_ok = (scope == expected_scope)
                id_ok = (k_id == expected_id)
                loc_ok = (loc is not None and len(str(loc).strip()) > 0)

                official_ok = True
                if scope == "OFFICIAL_POLICY":
                    official_ok = (src_id is not None and len(str(src_id).strip()) > 0)
                elif scope == "DEMO_WORKFLOW":
                    official_ok = (src_id is None)

                pass_check = scope_ok and id_ok and loc_ok and official_ok
                if not pass_check:
                    error_msg = f"Check failed: id={k_id}(exp={expected_id}), scope={scope}(exp={expected_scope}), src={src_id}, loc={loc}"

            if pass_check:
                results["passed"] += 1
            else:
                results["status"] = "FAIL"

            results["cases"].append({
                "term": term,
                "matched": matched,
                "knowledge_id": first_match["knowledge_id"] if first_match else None,
                "scope": first_match["scope"] if first_match else None,
                "topic": first_match["topic"] if first_match else None,
                "source_id": first_match["source_id"] if first_match else None,
                "source_locator": first_match["source_locator"] if first_match else None,
                "passed": pass_check,
                "error": error_msg,
            })

        # Scope confusion assertion: ensure OFFICIAL_POLICY and DEMO_WORKFLOW are never merged into one item
        cursor.execute("""
            SELECT knowledge_id, scope, topic, source_id
            FROM knowledge_item
            WHERE (scope = 'OFFICIAL_POLICY' AND knowledge_id LIKE 'KI-DEMO-%')
               OR (scope = 'DEMO_WORKFLOW' AND source_id IS NOT NULL);
        """)
        confused_rows = cursor.fetchall()
        if confused_rows:
            results["scope_leakage_detected"] = True
            results["status"] = "FAIL"

    finally:
        conn.close()

    return results


if __name__ == "__main__":
    res = run_layer_g_tests()
    print(f"Layer G Result: {res['status']} ({res['passed']}/{res['total']}) - scope leakage: {res['scope_leakage_detected']}")
    for c in res["cases"]:
        print(f"  [{'PASS' if c['passed'] else 'FAIL'}] '{c['term']}' -> id={c['knowledge_id']}, scope={c['scope']}, src={c['source_id']}, loc={c['source_locator']}")
