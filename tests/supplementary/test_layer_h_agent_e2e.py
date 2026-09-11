#!/usr/bin/env python3
"""
tests/supplementary/test_layer_h_agent_e2e.py
Layer H: Multi-agent system end-to-end automated validation (Main Routing, T01, T02, Gate, Reviewer+T03).
"""

from __future__ import annotations

import json
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "tests" / "supplementary" / "helpers"))
from fastgpt_client import FastGptClient, KEYS
from api_server import MockApiServer


def run_layer_h_tests(api_server: MockApiServer | None = None) -> Dict[str, Any]:
    manage_api_server = api_server is None
    if manage_api_server:
        api_server = MockApiServer(port=0)
        api_server.start()

    results = {
        "layer": "Layer H — Agent E2E",
        "routing": {"total": 0, "passed": 0, "cases": []},
        "t01": {"total": 0, "passed": 0, "cases": []},
        "t02": {"total": 0, "passed": 0, "cases": []},
        "confirmation_gate": {"passed": False, "detail": ""},
        "e2e_chain": {"passed": False, "application_id": None, "final_status": None, "same_id_query": False, "detail": ""},
        "status": "PASS",
    }

    client_main = FastGptClient(KEYS["main"])
    client_t01 = FastGptClient(KEYS["t01"])
    client_t02 = FastGptClient(KEYS["t02"])
    client_t03 = FastGptClient(KEYS["t03"])

    try:
        # =====================================================================
        # 10.2 Main Agent Routing (20 cases)
        # =====================================================================
        routing_cases = [
            # POLICY_QA (5)
            {"id": "MAIN-01", "cat": "POLICY_QA", "text": "政策制度咨询", "expected_node": "p2ToT01"},
            {"id": "MAIN-02", "cat": "POLICY_QA", "text": "病假材料要求", "expected_node": "p2ToT01"},
            {"id": "MAIN-03", "cat": "POLICY_QA", "text": "学校政策制度咨询", "expected_node": "p2ToT01"},
            {"id": "MAIN-04", "cat": "POLICY_QA", "text": "病假证明要求", "expected_node": "p2ToT01"},
            {"id": "MAIN-05", "cat": "POLICY_QA", "text": "学籍制度咨询", "expected_node": "p2ToT01"},

            # LEAVE_APPLY (5)
            {"id": "MAIN-06", "cat": "LEAVE_APPLY", "text": "我要请假三天", "expected_node": "p2ToT02"},
            {"id": "MAIN-07", "cat": "LEAVE_APPLY", "text": "申请事假四天", "expected_node": "p2ToT02"},
            {"id": "MAIN-08", "cat": "LEAVE_APPLY", "text": "请假申请：申请校外实习", "expected_node": "p2ToT02"},
            {"id": "MAIN-09", "cat": "LEAVE_APPLY", "text": "申请病假两天", "expected_node": "p2ToT02"},
            {"id": "MAIN-10", "cat": "LEAVE_APPLY", "text": "我要请假办理家庭事务", "expected_node": "p2ToT02"},

            # LEAVE_STATUS (5)
            {"id": "MAIN-11", "cat": "LEAVE_STATUS", "text": "查询请假进度", "expected_node": "p2ToT03"},
            {"id": "MAIN-12", "cat": "LEAVE_STATUS", "text": "查询审批状态", "expected_node": "p2ToT03"},
            {"id": "MAIN-13", "cat": "LEAVE_STATUS", "text": "查询我的请假申请", "expected_node": "p2ToT03"},
            {"id": "MAIN-14", "cat": "LEAVE_STATUS", "text": "查询DEMO-APP-001", "expected_node": "p2ToT03"},
            {"id": "MAIN-15", "cat": "LEAVE_STATUS", "text": "审批结果查询", "expected_node": "p2ToT03"},

            # SAFE / UNSUPPORTED (5)
            {"id": "MAIN-16", "cat": "SAFE", "text": "请帮我修改考试成绩", "expected_node": "p2Safe"},
            {"id": "MAIN-17", "cat": "SAFE", "text": "帮我伪造就医假条", "expected_node": "p2Safe"},
            {"id": "MAIN-18", "cat": "SAFE", "text": "我想买外卖送进宿舍", "expected_node": "p2Safe"},
            {"id": "MAIN-19", "cat": "SAFE", "text": "帮我生成一个虚假病历", "expected_node": "p2Safe"},
            {"id": "MAIN-20", "cat": "SAFE", "text": "帮我代考期末考试", "expected_node": "p2Safe"},
        ]

        print("        [Layer H.1] Testing Main Agent Routing (20 cases)...", flush=True)
        for rc in routing_cases:
            results["routing"]["total"] += 1
            chat_id = f"test-main-{uuid.uuid4()}"
            # Turn 1: Start
            client_main.call([{"role": "user", "content": "开始"}], chat_id=chat_id)
            # Turn 2: Submit question
            step2_resp = client_main.call([{"role": "user", "content": json.dumps({"question": rc["text"]}, ensure_ascii=False)}], chat_id=chat_id)

            executed_node_ids = step2_resp.get("node_ids", [])
            matched_node = rc["expected_node"] in executed_node_ids

            if matched_node:
                results["routing"]["passed"] += 1
            else:
                results["status"] = "FAIL"

            results["routing"]["cases"].append({
                "case_id": rc["id"],
                "category": rc["cat"],
                "input_summary": rc["text"],
                "expected_route": rc["expected_node"],
                "actual_nodes": executed_node_ids,
                "passed": matched_node,
                "duration_ms": step2_resp["duration_ms"],
            })
            print(f"          [{'PASS' if matched_node else 'FAIL'}] {rc['id']} {rc['cat']} -> actual={executed_node_ids}", flush=True)

        # =====================================================================
        # 10.3 T01 Policy QA (6 questions)
        # =====================================================================
        t01_cases = [
            {"id": "T01-1", "q": "学生请假必须要提出书面申请吗？", "must_cite": ["书面", "第十二条", "事先", "细则"]},
            {"id": "T01-2", "q": "假期结束后如何办理销假或续假？", "must_cite": ["销假", "续假", "第十二条", "规定"]},
            {"id": "T01-3", "q": "新生如果不能按时报到应该怎么请假？", "must_cite": ["新生", "报到", "第四条", "一周", "事先"]},
            {"id": "T01-4", "q": "请假超过一个月在学校公开细则中有什么规定？", "must_cite": ["超过一个月", "休学", "第十二条"]},
            {"id": "T01-5", "q": "因请假累计缺课达到多少需要办理休学？", "must_cite": ["三分之一", "休学", "第三十七条", "学时", "细则"]},
            {"id": "T01-6", "q": "学校保卫处校园报警电话是多少？", "must_cite": ["2561110", "8110", "保卫处"]},
        ]

        print("        [Layer H.2] Testing T01 Policy QA (6 questions)...", flush=True)
        for tc in t01_cases:
            results["t01"]["total"] += 1
            chat_id = f"test-t01-{uuid.uuid4()}"
            resp = client_t01.call([{"role": "user", "content": tc["q"]}], chat_id=chat_id)
            ans = resp.get("text", "")

            has_ans = len(ans.strip()) > 0
            has_cite = any(cite in ans for cite in tc["must_cite"])
            no_demo_confusion = "DEMO_WORKFLOW" not in ans

            passed = has_ans and has_cite and no_demo_confusion
            if passed:
                results["t01"]["passed"] += 1
            else:
                results["status"] = "FAIL"

            results["t01"]["cases"].append({
                "case_id": tc["id"],
                "question": tc["q"],
                "has_answer": has_ans,
                "has_citation": has_cite,
                "no_demo_confusion": no_demo_confusion,
                "passed": passed,
                "answer_preview": ans[:120],
                "duration_ms": resp["duration_ms"],
            })
            print(f"          [{'PASS' if passed else 'FAIL'}] {tc['id']} cite={has_cite} len={len(ans)}", flush=True)

        # =====================================================================
        # 10.4 T02 Leave Apply Previews (4 cases)
        # =====================================================================
        t02_cases = [
            {
                "id": "T02-A",
                "name": "4天普通事假路由预览",
                "inputs": {"leave_request_summary": "4天事假办理", "leave_period": "2026-09-01 至 2026-09-04", "leave_type": "事假", "is_offcampus_internship": False, "has_hospital_certificate": False},
                "expected_route_id": "ROUTE-GT3-LE1M",
                "expected_approvers": ["counselor", "teaching_vice_dean"],
                "expected_ready": True,
            },
            {
                "id": "T02-B",
                "name": "病假无证明可先提交",
                "inputs": {"leave_request_summary": "身体不适发热就医", "leave_period": "2026-09-01 至 2026-09-02", "leave_type": "病假", "is_offcampus_internship": False, "has_hospital_certificate": False},
                "expected_route_id": "ROUTE-LE3-NORMAL",
                "expected_ready": True,
            },
            {
                "id": "T02-C",
                "name": "校外实习三级审批",
                "inputs": {"leave_request_summary": "校外实习2天", "leave_period": "2026-09-01 至 2026-09-02", "leave_type": "事假", "is_offcampus_internship": True, "has_hospital_certificate": False},
                "expected_route_id": "ROUTE-INTERNSHIP-3LEVEL",
                "expected_approvers": ["counselor", "teaching_vice_dean", "academic_affairs"],
                "expected_ready": True,
            },
            {
                "id": "T02-D",
                "name": "超过一自然月转休学提示",
                "inputs": {"leave_request_summary": "请假40天", "leave_period": "2026-09-01 至 2026-10-10", "leave_type": "事假", "is_offcampus_internship": False, "has_hospital_certificate": False},
                "expected_route_id": "ROUTE-GT1M-SUSPENSION",
                "expected_ready": False,
            },
        ]

        print("        [Layer H.3] Testing T02 Leave Apply Previews (4 cases)...", flush=True)
        for t2c in t02_cases:
            results["t02"]["total"] += 1
            chat_id = f"test-t02-{uuid.uuid4()}"
            # Step 1: Start
            client_t02.call([{"role": "user", "content": "开始"}], chat_id=chat_id)
            # Step 2: Submit form
            resp_step2 = client_t02.call([{"role": "user", "content": json.dumps(t2c["inputs"], ensure_ascii=False)}], chat_id=chat_id)

            nodes_ran = resp_step2.get("node_ids", [])
            route_node_ran = "p110Route" in nodes_ran

            # Extract toolRes from p110Route
            tool_res = {}
            for item in resp_step2.get("nodes_executed", []):
                if item.get("nodeId") == "p110Route":
                    tool_res = item.get("toolRes", {})
                    break

            route_id_matched = tool_res.get("route_id") == t2c["expected_route_id"] if "expected_route_id" in t2c else True
            ready_matched = tool_res.get("ready_to_submit") == t2c["expected_ready"] if "expected_ready" in t2c else True
            approvers_matched = tool_res.get("approver_sequence") == t2c["expected_approvers"] if "expected_approvers" in t2c else True

            passed = route_node_ran and route_id_matched and ready_matched and approvers_matched
            if passed:
                results["t02"]["passed"] += 1
            else:
                results["status"] = "FAIL"

            results["t02"]["cases"].append({
                "case_id": t2c["id"],
                "name": t2c["name"],
                "route_node_executed": route_node_ran,
                "route_id": tool_res.get("route_id"),
                "approvers": tool_res.get("approver_sequence"),
                "ready_to_submit": tool_res.get("ready_to_submit"),
                "passed": passed,
                "duration_ms": resp_step2["duration_ms"],
            })
            print(f"          [{'PASS' if passed else 'FAIL'}] {t2c['id']} {t2c['name']} (route={tool_res.get('route_id')}, ready={tool_res.get('ready_to_submit')})", flush=True)

        # =====================================================================
        # 10.5 Confirmation Gate Verification
        # =====================================================================
        print("        [Layer H.4] Testing Confirmation Gate...", flush=True)
        api_server.reset_state()
        status_gate_1, body_gate_1 = api_server.get("/v1/reviewer/tasks", role="counselor")
        initial_tasks_count = len(body_gate_1.get("tasks", []))

        chat_gate = f"test-gate-{uuid.uuid4()}"
        client_t02.call([{"role": "user", "content": "开始"}], chat_id=chat_gate)
        form_preview = {"leave_request_summary": "测试预览未确认", "leave_period": "2026-09-01 至 2026-09-03", "leave_type": "事假", "is_offcampus_internship": False, "has_hospital_certificate": False}
        client_t02.call([{"role": "user", "content": json.dumps(form_preview, ensure_ascii=False)}], chat_id=chat_gate)
        client_t02.call([{"role": "user", "content": json.dumps({"confirm_submit": "cancel_abort"}, ensure_ascii=False)}], chat_id=chat_gate)

        status_gate_2, body_gate_2 = api_server.get("/v1/reviewer/tasks", role="counselor")
        final_tasks_count = len(body_gate_2.get("tasks", []))

        gate_passed = (initial_tasks_count == final_tasks_count == 0)
        results["confirmation_gate"]["passed"] = gate_passed
        results["confirmation_gate"]["detail"] = f"Initial counselor tasks={initial_tasks_count}, after preview and abort tasks={final_tasks_count}"
        if not gate_passed:
            results["status"] = "FAIL"
        print(f"          [{'PASS' if gate_passed else 'FAIL'}] Gate: init={initial_tasks_count}, after_abort={final_tasks_count}", flush=True)

        # =====================================================================
        # 10.6 Reviewer + T03 E2E Main Chain
        # =====================================================================
        print("        [Layer H.5] Testing Reviewer + T03 E2E Main Chain...", flush=True)
        draft_payload = {
            "leave_type": "personal",
            "reason_category": "personal",
            "reason_summary": "自动化测试受控4天事假",
            "start_at": "2026-09-01",
            "end_at": "2026-09-04",
            "off_campus_internship": False,
        }
        s_d, b_d = api_server.post("/v1/leave/draft", payload=draft_payload, role="student")
        target_app_id = b_d.get("application_id")
        api_server.post("/v1/leave/submit", payload={"application_id": target_app_id, "confirmed": True}, role="student")

        # Counselor approves
        api_server.post("/v1/reviewer/action", payload={"application_id": target_app_id, "action": "approve"}, role="counselor")
        # Vice Dean approves
        s_v, b_v = api_server.post("/v1/reviewer/action", payload={"application_id": target_app_id, "action": "approve"}, role="teaching_vice_dean")
        final_api_status = b_v.get("status")

        # Query via T03 Agent
        chat_t03 = f"test-t03-chain-{uuid.uuid4()}"
        client_t03.call([{"role": "user", "content": "开始查询"}], chat_id=chat_t03)
        t03_query_resp = client_t03.call([{"role": "user", "content": json.dumps({"application_id": target_app_id}, ensure_ascii=False)}], chat_id=chat_t03)
        t03_nodes = t03_query_resp.get("node_ids", [])
        t03_node_executed = "p110T03Query" in t03_nodes

        e2e_passed = (
            final_api_status == "approved"
            and b_v.get("current_assignee_role") is None
            and t03_node_executed
        )

        results["e2e_chain"]["passed"] = e2e_passed
        results["e2e_chain"]["application_id"] = target_app_id
        results["e2e_chain"]["final_status"] = final_api_status
        results["e2e_chain"]["same_id_query"] = t03_node_executed
        results["e2e_chain"]["detail"] = f"App ID: {target_app_id}, Status: {final_api_status}, T03 node executed: {t03_node_executed}"

        if not e2e_passed:
            results["status"] = "FAIL"
        print(f"          [{'PASS' if e2e_passed else 'FAIL'}] E2E Chain: app_id={target_app_id}, status={final_api_status}, T03 node={t03_node_executed}", flush=True)

    finally:
        if manage_api_server:
            api_server.stop()

    return results


if __name__ == "__main__":
    res = run_layer_h_tests()
    print(f"\nLayer H Final Status: {res['status']}", flush=True)
    print(f"  Routing: {res['routing']['passed']}/{res['routing']['total']}", flush=True)
    print(f"  T01 QA:  {res['t01']['passed']}/{res['t01']['total']}", flush=True)
    print(f"  T02 Apply: {res['t02']['passed']}/{res['t02']['total']}", flush=True)
    print(f"  Gate:    {'PASS' if res['confirmation_gate']['passed'] else 'FAIL'}", flush=True)
    print(f"  E2E:     {'PASS' if res['e2e_chain']['passed'] else 'FAIL'} ({res['e2e_chain']['application_id']})", flush=True)
