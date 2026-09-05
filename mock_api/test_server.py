#!/usr/bin/env python3
"""备用 API 的规则边界、鉴权、归属校验和确认闸门测试。"""

from __future__ import annotations

import json
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from pathlib import Path

from server import (
    StudentAffairsServer,
    calculate_leave_route,
    prepare_runtime_database,
)


class RouteRuleTests(unittest.TestCase):
    def route(self, start: str, end: str, **extra):
        payload = {
            "start_at": start,
            "end_at": end,
            "leave_type": "personal",
            "off_campus_internship": False,
            **extra,
        }
        return calculate_leave_route(payload)

    def test_three_day_normal_route(self) -> None:
        result = self.route("2026-09-01", "2026-09-03")
        self.assertEqual(result["route_id"], "ROUTE-LE3-NORMAL")
        self.assertEqual(result["duration_days"], 3)

    def test_internship_priority_route(self) -> None:
        result = self.route(
            "2026-09-01", "2026-09-03", off_campus_internship=True
        )
        self.assertEqual(result["route_id"], "ROUTE-INTERNSHIP-3LEVEL")
        self.assertEqual(result["approver_sequence"], ["counselor", "teaching_vice_dean", "academic_affairs"])

    def test_four_and_fourteen_day_routes(self) -> None:
        self.assertEqual(
            self.route("2026-09-01", "2026-09-04")["route_id"],
            "ROUTE-GT3-LE1M",
        )
        self.assertEqual(
            self.route("2026-09-01", "2026-09-14")["route_id"],
            "ROUTE-GT3-LE1M",
        )

    def test_fifteen_day_route(self) -> None:
        result = self.route("2026-09-01", "2026-09-15")
        self.assertEqual(result["route_id"], "ROUTE-GT3-LE1M")
        self.assertFalse(result["requires_human_confirmation"])

    def test_calendar_month_not_fixed_thirty_days(self) -> None:
        exact_month = self.route("2027-01-31", "2027-02-28")
        beyond_month = self.route("2027-01-31", "2027-03-01")
        self.assertEqual(exact_month["route_id"], "ROUTE-GT3-LE1M")
        self.assertEqual(beyond_month["route_id"], "ROUTE-GT1M-SUSPENSION")

    def test_sick_leave_proof_is_optional_before_submit(self) -> None:
        result = self.route(
            "2026-09-01", "2026-09-01", leave_type="sick",
            has_hospital_certificate=False,
        )
        self.assertTrue(result["valid"])
        self.assertTrue(result["ready_to_submit"])
        self.assertIn("审核环节要求补充", "".join(result["warnings"]))

    def test_invalid_range_is_rejected(self) -> None:
        result = self.route("2026-09-02", "2026-09-01")
        self.assertFalse(result["valid"])


class HttpApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.database = Path(cls.temp_dir.name) / "runtime.sqlite3"
        prepare_runtime_database(cls.database)
        cls.token = "unit-test-token-not-for-production"
        cls.server = StudentAffairsServer(("127.0.0.1", 0), cls.database, cls.token, False)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)
        cls.temp_dir.cleanup()

    def request(self, method: str, path: str, body=None, user="DEMO-STU-001", role="student", token=None):
        connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
        headers = {
            "Authorization": f"Bearer {self.token if token is None else token}",
            "X-Demo-User-Id": user,
            "X-Demo-User-Role": role,
        }
        encoded = None
        if body is not None:
            encoded = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        connection.request(method, path, body=encoded, headers=headers)
        response = connection.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
        connection.close()
        return response.status, payload

    def test_health_does_not_require_auth(self) -> None:
        status, payload = self.request("GET", "/health", token="wrong")
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "ok")

    def test_invalid_token_is_rejected(self) -> None:
        status, payload = self.request(
            "POST",
            "/v1/route/calculate",
            {"start_at": "2026-09-01", "end_at": "2026-09-02", "leave_type": "personal"},
            token="wrong",
        )
        self.assertEqual(status, 401)
        self.assertEqual(payload["error"]["code"], "UNAUTHORIZED")

    def test_create_confirm_submit_and_owner_boundary(self) -> None:
        draft = {
            "start_at": "2027-03-01 08:00:00",
            "end_at": "2027-03-02 18:00:00",
            "leave_type": "personal",
            "reason_category": "演示事务",
            "reason_summary": "演示：用于接口自动测试。",
            "off_campus_internship": False,
        }
        status, created = self.request("POST", "/v1/leave/draft", draft)
        self.assertEqual(status, 201)
        application_id = created["application_id"]

        status, error = self.request(
            "POST", f"/v1/leave/{application_id}/submit", {"confirmed": False}
        )
        self.assertEqual(status, 400)
        self.assertEqual(error["error"]["code"], "CONFIRMATION_REQUIRED")

        status, _ = self.request(
            "GET", f"/v1/leave/{application_id}", user="DEMO-STU-002"
        )
        self.assertEqual(status, 403)

        status, submitted = self.request(
            "POST", f"/v1/leave/{application_id}/submit", {"confirmed": True}
        )
        self.assertEqual(status, 200)
        self.assertEqual(submitted["status"], "submitted")

    def test_cancel_requires_return_confirmation(self) -> None:
        status, payload = self.request(
            "POST",
            "/v1/leave/DEMO-APP-001/cancel",
            {"confirmed": True, "returned_to_campus": False},
        )
        self.assertEqual(status, 400)
        self.assertEqual(payload["error"]["code"], "RETURN_CONFIRMATION_REQUIRED")


if __name__ == "__main__":
    unittest.main(verbosity=2)
