#!/usr/bin/env python3
"""
tests/supplementary/helpers/api_server.py
Isolated local Node mock API server manager for supplementary automated tests.
"""

from __future__ import annotations

import http.client
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.parse
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
NODE_SERVER_SCRIPT = REPO_ROOT / "external_mock_api" / "src" / "server.mjs"

ACTORS = {
    "student": "DEMO-STU-001",
    "counselor": "DEMO-REV-COUNSELOR",
    "teaching_vice_dean": "DEMO-REV-VICE-DEAN",
    "academic_affairs": "DEMO-REV-ACADEMIC",
}


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class MockApiServer:
    def __init__(self, port: int = 0, token: str = "test_token_student_affairs_supplementary_32chars"):
        self.port = port if port > 0 else find_free_port()
        self.token = token
        self.host = "127.0.0.1"
        self.base_url = f"http://{self.host}:{self.port}"
        self.temp_dir: Optional[tempfile.TemporaryDirectory] = None
        self.state_file: Optional[Path] = None
        self.process: Optional[subprocess.Popen] = None

    def start(self) -> None:
        if self.process is not None:
            return

        self.temp_dir = tempfile.TemporaryDirectory(prefix="mock_api_test_")
        self.state_file = Path(self.temp_dir.name) / "test_state.json"

        env = os.environ.copy()
        env["PORT"] = str(self.port)
        env["HOST"] = self.host
        env["DEMO_API_TOKEN"] = self.token
        env["DEMO_DATA_FILE"] = str(self.state_file)

        self.process = subprocess.Popen(
            ["node", str(NODE_SERVER_SCRIPT)],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            cwd=str(REPO_ROOT),
        )

        # Wait for server to be ready
        started = False
        deadline = time.time() + 8.0
        while time.time() < deadline:
            try:
                conn = http.client.HTTPConnection(self.host, self.port, timeout=1.0)
                conn.request("GET", "/health")
                resp = conn.getresponse()
                if resp.status == 200:
                    resp.read()
                    started = True
                    conn.close()
                    break
                conn.close()
            except Exception:
                time.sleep(0.05)

        if not started:
            self.stop()
            raise RuntimeError(f"Mock API server failed to start on port {self.port} within timeout.")

    def stop(self) -> None:
        if self.process is not None:
            try:
                self.process.terminate()
                self.process.wait(timeout=2)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None

        if self.temp_dir is not None:
            try:
                self.temp_dir.cleanup()
            except Exception:
                pass
            self.temp_dir = None
            self.state_file = None

    def reset_state(self) -> None:
        if self.state_file and self.state_file.exists():
            try:
                self.state_file.unlink()
            except Exception:
                pass

    def request(
        self,
        method: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        role: Optional[str] = "student",
        user_id: Optional[str] = None,
        token: Optional[str] = None,
        custom_headers: Optional[Dict[str, str]] = None,
    ) -> Tuple[int, Dict[str, Any]]:
        full_path = path
        if params:
            query_str = urllib.parse.urlencode(params)
            full_path = f"{path}?{query_str}" if "?" not in path else f"{path}&{query_str}"

        headers: Dict[str, str] = {"Content-Type": "application/json"}

        # Token
        use_token = self.token if token is None else token
        if use_token:
            headers["Authorization"] = f"Bearer {use_token}"

        # Actor
        if role is not None:
            headers["X-Demo-User-Role"] = role
            actual_user_id = user_id if user_id is not None else ACTORS.get(role, "DEMO-STU-001")
            if actual_user_id:
                headers["X-Demo-User-Id"] = actual_user_id
        elif user_id is not None:
            headers["X-Demo-User-Id"] = user_id

        if custom_headers:
            headers.update(custom_headers)

        body_str = None
        if payload is not None:
            body_str = json.dumps(payload)

        try:
            conn = http.client.HTTPConnection(self.host, self.port, timeout=5.0)
            conn.request(method, full_path, body=body_str, headers=headers)
            resp = conn.getresponse()
            status = resp.status
            raw_data = resp.read().decode("utf-8")
            conn.close()
            try:
                return status, json.loads(raw_data)
            except json.JSONDecodeError:
                return status, {"raw": raw_data}
        except Exception as exc:
            return 599, {"error": {"code": "CLIENT_EXCEPTION", "message": str(exc)}}

    def get(self, path: str, **kwargs) -> Tuple[int, Dict[str, Any]]:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, payload: Optional[Dict[str, Any]] = None, **kwargs) -> Tuple[int, Dict[str, Any]]:
        return self.request("POST", path, payload=payload, **kwargs)

    def __enter__(self) -> MockApiServer:
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.stop()
