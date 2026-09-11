#!/usr/bin/env python3
"""
tests/supplementary/helpers/fastgpt_client.py
FastGPT API client helper for supplementary automated agent validation.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional, Set
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

FASTGPT_BASE = os.environ.get("FASTGPT_BASE", "https://fastgpt.sangfor.com.cn:19443/api")
COMPLETIONS_URL = f"{FASTGPT_BASE}/v1/chat/completions"

KEYS = {
    "main": os.environ.get("FASTGPT_MAIN_KEY", "openapi-cDxoeIMUGjLtvzYgHeAoDY93XcpTPBp2IesnFae8IdBpemuU5hCDyM5Vyk0lEo9MS"),
    "t01": os.environ.get("FASTGPT_T01_KEY", "openapi-w8pjpA5Teg11HJbNv5gWDpiX7Wchz5NYa6T7fCUChQS0A5qRyTpMegCAM"),
    "t02": os.environ.get("FASTGPT_T02_KEY", "openapi-s89fEuSHOREbWy7bcLhgJXJOSMB7Gce7MmZyOOWcLzy40rgifSX9MJOzrQ9KH"),
    "t03": os.environ.get("FASTGPT_T03_KEY", "openapi-kJpxcKobMhVpO7Ryn4ltuQbbx3okPBpALI128rhEg5InzhnwvgG7r1tC"),
}


class FastGptClient:
    def __init__(self, key: str, base_url: str = COMPLETIONS_URL):
        self.key = key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.verify = False

    def call(
        self,
        messages: List[Dict[str, Any]],
        chat_id: Optional[str] = None,
        detail: bool = True,
        stream: bool = False,
        timeout: float = 35.0,
    ) -> Dict[str, Any]:
        """
        Executes FastGPT chat completion and aggregates nodes, responses, and text.
        """
        payload = {
            "stream": stream,
            "detail": detail,
            "messages": messages,
        }
        if chat_id:
            payload["chatId"] = chat_id

        headers = {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }

        result: Dict[str, Any] = {
            "text": "",
            "node_ids": set(),
            "nodes_executed": [],
            "flow_responses": [],
            "duration_ms": 0,
            "status_code": 200,
        }

        start_time = time.time()
        try:
            resp = self.session.post(self.base_url, headers=headers, json=payload, timeout=timeout)
            result["status_code"] = resp.status_code

            if not stream:
                try:
                    data = resp.json()
                except Exception:
                    data = {"raw": resp.text}

                # Extract text
                choices = data.get("choices", [])
                if choices and isinstance(choices, list) and len(choices) > 0:
                    msg = choices[0].get("message", {})
                    result["text"] = msg.get("content", "")

                # Extract responseData / flowResponses
                resp_data = data.get("responseData", [])
                if isinstance(resp_data, list):
                    for item in resp_data:
                        if isinstance(item, dict):
                            result["nodes_executed"].append(item)
                            nid = item.get("nodeId")
                            if nid:
                                result["node_ids"].add(nid)

                flow_resp = data.get("flowResponses", [])
                if isinstance(flow_resp, list):
                    for item in flow_resp:
                        if isinstance(item, dict):
                            result["flow_responses"].append(item)
                            nid = item.get("nodeId")
                            if nid:
                                result["node_ids"].add(nid)

            else:
                # SSE stream parsing
                for line in resp.iter_lines(decode_unicode=True):
                    if not line:
                        continue
                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            parsed = json.loads(data_str)
                            if isinstance(parsed, dict):
                                if "choices" in parsed:
                                    for c in parsed["choices"]:
                                        delta = c.get("delta", {})
                                        if "content" in delta:
                                            result["text"] += str(delta["content"])
                                if "responseData" in parsed:
                                    for item in parsed["responseData"]:
                                        if isinstance(item, dict):
                                            result["nodes_executed"].append(item)
                                            nid = item.get("nodeId")
                                            if nid:
                                                result["node_ids"].add(nid)
                        except Exception:
                            pass

        except Exception as exc:
            result["status_code"] = 599
            result["text"] = f"Exception: {str(exc)}"

        result["duration_ms"] = int((time.time() - start_time) * 1000)
        result["node_ids"] = list(result["node_ids"])
        return result

    def call_stream(self, messages: List[Dict[str, Any]], chat_id: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        return self.call(messages, chat_id=chat_id, stream=False, **kwargs)
