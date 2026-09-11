#!/usr/bin/env python3
"""
tests/supplementary/test_layer_d_state_machine.py
Layer D: API State machine and approval lifecycle closure (Cases D1~D8).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "tests" / "supplementary" / "helpers"))
from api_server import MockApiServer


def run_layer_d_tests(server: MockApiServer | None = None) -> Dict[str, Any]:
    manage_server = server is None
    if manage_server:
        server = MockApiServer(port=3199)
        server.start()

    results = {
        "layer": "Layer D — State Machine",
        "cases": [],
        "passed": 0,
        "total": 0,
        "status": "PASS",
    }

    def record_case(case_id: str, name: str, passed: bool, expected: str, actual: str, trace: list):
        results["total"] += 1
        if passed:
            results["passed"] += 1
        else:
            results["status"] = "FAIL"
        results["cases"].append({
            "case_id": case_id,
            "name": name,
            "passed": passed,
            "expected": expected,
            "actual": actual,
            "trace": trace,
        })

    try:
        # ---------------------------------------------------------------------
        # D1: Draft creation
        # ---------------------------------------------------------------------
        trace_d1 = []
        d1_payload = {
            "leave_type": "personal",
            "reason_category": "personal",
            "reason_summary": "家庭事务办理",
            "start_at": "2026-09-01",
            "end_at": "2026-09-02",
            "off_campus_internship": False,
        }
        status, body = server.post("/v1/leave/draft", payload=d1_payload, role="student")
        app_id_d1 = body.get("application_id", "")
        app_status_d1 = body.get("status", "")
        trace_d1.append(f"POST /v1/leave/draft -> status_code={status}, app_id={app_id_d1}, status={app_status_d1}")
        d1_ok = (status == 201 and app_id_d1.startswith("DEMO-APP-") and app_status_d1 == "pending_confirmation")
        record_case("D1", "创建请假草稿 (Draft)", d1_ok, "201 pending_confirmation", f"{status} {app_status_d1}", trace_d1)

        # ---------------------------------------------------------------------
        # D2: Submit confirmation gate
        # ---------------------------------------------------------------------
        trace_d2 = []
        # Unconfirmed
        status_unconf, body_unconf = server.post("/v1/leave/submit", payload={"application_id": app_id_d1, "confirmed": False}, role="student")
        trace_d2.append(f"POST /v1/leave/submit (confirmed=False) -> status_code={status_unconf}, error={body_unconf.get('error', {}).get('code')}")
        # Confirmed
        status_conf, body_conf = server.post("/v1/leave/submit", payload={"application_id": app_id_d1, "confirmed": True}, role="student")
        assignee_d2 = body_conf.get("current_assignee_role")
        status_after_conf = body_conf.get("status")
        trace_d2.append(f"POST /v1/leave/submit (confirmed=True) -> status_code={status_conf}, status={status_after_conf}, assignee={assignee_d2}")
        d2_ok = (
            status_unconf == 400
            and body_unconf.get("error", {}).get("code") == "CONFIRMATION_REQUIRED"
            and status_conf == 200
            and status_after_conf == "submitted"
            and assignee_d2 == "counselor"
        )
        record_case("D2", "提交确认闸门 (Submit Confirmation)", d2_ok, "unconfirmed->400, confirmed->200 submitted (assignee=counselor)", f"unconf={status_unconf}, conf={status_conf} {status_after_conf}", trace_d2)

        # ---------------------------------------------------------------------
        # D3: 4-day normal 2-level approval chain
        # ---------------------------------------------------------------------
        trace_d3 = []
        d3_draft = {
            "leave_type": "personal",
            "reason_category": "personal",
            "reason_summary": "4天事假流程测试",
            "start_at": "2026-09-01",
            "end_at": "2026-09-04",
            "off_campus_internship": False,
        }
        _, b_d3_d = server.post("/v1/leave/draft", payload=d3_draft, role="student")
        app_id_d3 = b_d3_d["application_id"]
        server.post("/v1/leave/submit", payload={"application_id": app_id_d3, "confirmed": True}, role="student")
        trace_d3.append(f"Draft & Submit -> app_id={app_id_d3}, status=submitted, assignee=counselor")

        # Counselor approves
        s_c_app, b_c_app = server.post("/v1/reviewer/action", payload={"application_id": app_id_d3, "action": "approve"}, role="counselor")
        trace_d3.append(f"Counselor approve -> status={b_c_app.get('status')}, assignee={b_c_app.get('current_assignee_role')}")

        # Teaching vice dean approves
        s_v_app, b_v_app = server.post("/v1/reviewer/action", payload={"application_id": app_id_d3, "action": "approve"}, role="teaching_vice_dean")
        trace_d3.append(f"Vice Dean approve -> status={b_v_app.get('status')}, assignee={b_v_app.get('current_assignee_role')}")

        d3_ok = (
            s_c_app == 200
            and b_c_app.get("status") == "under_review"
            and b_c_app.get("current_assignee_role") == "teaching_vice_dean"
            and s_v_app == 200
            and b_v_app.get("status") == "approved"
            and b_v_app.get("current_assignee_role") is None
        )
        record_case("D3", "4天普通事假两级审批", d3_ok, "counselor->under_review (vice_dean) -> vice_dean->approved", f"mid={b_c_app.get('status')}, final={b_v_app.get('status')}", trace_d3)

        # ---------------------------------------------------------------------
        # D4: Off-campus internship 3-level approval chain
        # ---------------------------------------------------------------------
        trace_d4 = []
        d4_draft = {
            "leave_type": "personal",
            "reason_category": "personal",
            "reason_summary": "校外实习三级审批测试",
            "start_at": "2026-09-01",
            "end_at": "2026-09-02",
            "off_campus_internship": True,
        }
        _, b_d4_d = server.post("/v1/leave/draft", payload=d4_draft, role="student")
        app_id_d4 = b_d4_d["application_id"]
        server.post("/v1/leave/submit", payload={"application_id": app_id_d4, "confirmed": True}, role="student")
        trace_d4.append(f"Submit internship leave -> app_id={app_id_d4}")

        # Level 1: Counselor
        _, b_d4_c = server.post("/v1/reviewer/action", payload={"application_id": app_id_d4, "action": "approve"}, role="counselor")
        trace_d4.append(f"Level 1 (Counselor) -> status={b_d4_c.get('status')}, assignee={b_d4_c.get('current_assignee_role')}")

        # Level 2: Teaching Vice Dean
        _, b_d4_v = server.post("/v1/reviewer/action", payload={"application_id": app_id_d4, "action": "approve"}, role="teaching_vice_dean")
        trace_d4.append(f"Level 2 (Vice Dean) -> status={b_d4_v.get('status')}, assignee={b_d4_v.get('current_assignee_role')}")

        # Level 3: Academic Affairs
        s_d4_a, b_d4_a = server.post("/v1/reviewer/action", payload={"application_id": app_id_d4, "action": "approve"}, role="academic_affairs")
        trace_d4.append(f"Level 3 (Academic Affairs) -> status={b_d4_a.get('status')}, assignee={b_d4_a.get('current_assignee_role')}")

        d4_ok = (
            b_d4_c.get("status") == "under_review"
            and b_d4_c.get("current_assignee_role") == "teaching_vice_dean"
            and b_d4_v.get("status") == "under_review"
            and b_d4_v.get("current_assignee_role") == "academic_affairs"
            and s_d4_a == 200
            and b_d4_a.get("status") == "approved"
            and b_d4_a.get("current_assignee_role") is None
        )
        record_case("D4", "校外实习三级审批", d4_ok, "counselor -> vice_dean -> academic_affairs -> approved", f"final status={b_d4_a.get('status')}", trace_d4)

        # ---------------------------------------------------------------------
        # D5: Request More Info & Supplement
        # ---------------------------------------------------------------------
        trace_d5 = []
        d5_draft = {
            "leave_type": "sick",
            "reason_category": "sick",
            "reason_summary": "病假待补材料测试",
            "start_at": "2026-09-01",
            "end_at": "2026-09-02",
            "has_hospital_certificate": False,
        }
        _, b_d5_d = server.post("/v1/leave/draft", payload=d5_draft, role="student")
        app_id_d5 = b_d5_d["application_id"]
        server.post("/v1/leave/submit", payload={"application_id": app_id_d5, "confirmed": True}, role="student")

        # Counselor requests more info
        s_req, b_req = server.post("/v1/reviewer/action", payload={"application_id": app_id_d5, "action": "request_more_info", "comment": "请补充就医诊断材料说明"}, role="counselor")
        trace_d5.append(f"Counselor request_more_info -> status={b_req.get('status')}, assignee={b_req.get('current_assignee_role')}")

        # Student supplements
        s_sup, b_sup = server.post("/v1/leave/supplement", payload={"application_id": app_id_d5, "comment": "已上传医院就医证明", "has_hospital_certificate": True}, role="student")
        trace_d5.append(f"Student supplement -> status={b_sup.get('status')}, assignee={b_sup.get('current_assignee_role')}")

        # Counselor approves
        s_d5_app, b_d5_app = server.post("/v1/reviewer/action", payload={"application_id": app_id_d5, "action": "approve"}, role="counselor")
        trace_d5.append(f"Counselor approve -> status={b_d5_app.get('status')}")

        d5_ok = (
            s_req == 200
            and b_req.get("status") == "need_more_info"
            and b_req.get("current_assignee_role") is None
            and s_sup == 200
            and b_sup.get("status") == "under_review"
            and b_sup.get("current_assignee_role") == "counselor"
            and s_d5_app == 200
            and b_d5_app.get("status") == "approved"
        )
        record_case("D5", "补材料并恢复原审核角色 (Supplement Loop)", d5_ok, "need_more_info -> supplement -> under_review(counselor) -> approved", f"req={b_req.get('status')}, sup={b_sup.get('status')}, app={b_d5_app.get('status')}", trace_d5)

        # ---------------------------------------------------------------------
        # D6: Reject & Terminal Immutability
        # ---------------------------------------------------------------------
        trace_d6 = []
        d6_draft = {
            "leave_type": "personal",
            "reason_category": "personal",
            "reason_summary": "驳回流程测试",
            "start_at": "2026-09-01",
            "end_at": "2026-09-02",
        }
        _, b_d6_d = server.post("/v1/leave/draft", payload=d6_draft, role="student")
        app_id_d6 = b_d6_d["application_id"]
        server.post("/v1/leave/submit", payload={"application_id": app_id_d6, "confirmed": True}, role="student")

        # Counselor rejects
        s_rej, b_rej = server.post("/v1/reviewer/action", payload={"application_id": app_id_d6, "action": "reject", "comment": "请假理由不充分，予以驳回"}, role="counselor")
        trace_d6.append(f"Counselor reject -> status={b_rej.get('status')}")

        # Subsequent review attempt
        s_reapp, b_reapp = server.post("/v1/reviewer/action", payload={"application_id": app_id_d6, "action": "approve"}, role="counselor")
        trace_d6.append(f"Subsequent approve attempt -> status_code={s_reapp}, error={b_reapp.get('error', {}).get('code')}")

        d6_ok = (
            s_rej == 200
            and b_rej.get("status") == "rejected"
            and s_reapp == 409
            and b_reapp.get("error", {}).get("code") == "TERMINAL_IMMUTABLE"
        )
        record_case("D6", "审核驳回及终态不可变性 (Reject & Terminal)", d6_ok, "rejected -> 409 TERMINAL_IMMUTABLE", f"rej={s_rej} {b_rej.get('status')}, reapp={s_reapp} {b_reapp.get('error', {}).get('code')}", trace_d6)

        # ---------------------------------------------------------------------
        # D7: Withdraw
        # ---------------------------------------------------------------------
        trace_d7 = []
        d7_draft = {
            "leave_type": "personal",
            "reason_category": "personal",
            "reason_summary": "撤回流程测试",
            "start_at": "2026-09-01",
            "end_at": "2026-09-02",
        }
        _, b_d7_d = server.post("/v1/leave/draft", payload=d7_draft, role="student")
        app_id_d7 = b_d7_d["application_id"]
        server.post("/v1/leave/submit", payload={"application_id": app_id_d7, "confirmed": True}, role="student")

        # Student withdraws
        s_wdr, b_wdr = server.post("/v1/leave/withdraw", payload={"application_id": app_id_d7, "confirmed": True}, role="student")
        trace_d7.append(f"Student withdraw -> status_code={s_wdr}, status={b_wdr.get('status')}")

        d7_ok = (s_wdr == 200 and b_wdr.get("status") == "withdrawn")
        record_case("D7", "主动撤回申请 (Withdraw)", d7_ok, "200 withdrawn", f"{s_wdr} {b_wdr.get('status')}", trace_d7)

        # ---------------------------------------------------------------------
        # D8: Cancel (销假) on approved leave
        # ---------------------------------------------------------------------
        trace_d8 = []
        # Try cancel without return_to_campus
        s_c_bad, b_c_bad = server.post("/v1/leave/cancel", payload={"application_id": app_id_d3, "confirmed": True, "returned_to_campus": False}, role="student")
        trace_d8.append(f"Cancel (returned=False) -> status_code={s_c_bad}, error={b_c_bad.get('error', {}).get('code')}")

        # Cancel with return_to_campus
        s_c_ok, b_c_ok = server.post("/v1/leave/cancel", payload={"application_id": app_id_d3, "confirmed": True, "returned_to_campus": True}, role="student")
        trace_d8.append(f"Cancel (returned=True) -> status_code={s_c_ok}, status={b_c_ok.get('status')}")

        d8_ok = (
            s_c_bad == 400
            and b_c_bad.get("error", {}).get("code") == "RETURN_CONFIRMATION_REQUIRED"
            and s_c_ok == 200
            and b_c_ok.get("status") == "cancelled"
        )
        record_case("D8", "返校销假闭环 (Cancel)", d8_ok, "unreturned->400, returned->200 cancelled", f"bad={s_c_bad}, ok={s_c_ok} {b_c_ok.get('status')}", trace_d8)

    finally:
        if manage_server:
            server.stop()

    return results


if __name__ == "__main__":
    res = run_layer_d_tests()
    print(f"Layer D Result: {res['status']} ({res['passed']}/{res['total']})")
    for c in res["cases"]:
        print(f"  [{'PASS' if c['passed'] else 'FAIL'}] {c['case_id']} {c['name']} -> actual={c['actual']}")
