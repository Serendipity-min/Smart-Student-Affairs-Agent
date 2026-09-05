#!/usr/bin/env python3
"""超星代码节点的 Python 参考实现：校验时间并计算请假审批路由。"""

from __future__ import annotations

import calendar
from datetime import date, datetime
from typing import Any


SUPPORTED_DATETIME_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
)


def parse_datetime(value: Any) -> datetime:
    """接受平台常见日期格式；拒绝模糊日期，避免路由在时区或语义上漂移。"""
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str) or not value.strip():
        raise ValueError("起止时间不能为空")
    normalized = value.strip().replace("T", " ").removesuffix("Z")
    for fmt in SUPPORTED_DATETIME_FORMATS:
        try:
            return datetime.strptime(normalized, fmt)
        except ValueError:
            continue
    raise ValueError("时间必须使用 YYYY-MM-DD 或 YYYY-MM-DD HH:MM[:SS]")


def add_calendar_month(value: date) -> date:
    """计算下一个自然月同日；月末不存在同日时落到下月最后一天。"""
    if value.month == 12:
        target_year, target_month = value.year + 1, 1
    else:
        target_year, target_month = value.year, value.month + 1
    target_day = min(value.day, calendar.monthrange(target_year, target_month)[1])
    return date(target_year, target_month, target_day)


def calculate_leave_route(payload: dict[str, Any]) -> dict[str, Any]:
    """返回确定性路由；写入动作必须在任务流的确认节点之后另行执行。"""
    result: dict[str, Any] = {
        "valid": False,
        "ready_to_submit": False,
        "duration_days": None,
        "route_id": None,
        "approver_sequence": [],
        "requires_human_confirmation": False,
        "material_required": [],
        "errors": [],
        "warnings": [],
        "next_action": "collect_required_fields",
    }

    try:
        start_at = parse_datetime(payload.get("start_at"))
        end_at = parse_datetime(payload.get("end_at"))
    except ValueError as exc:
        result["errors"].append(str(exc))
        return result

    if end_at < start_at:
        result["errors"].append("结束时间不能早于开始时间")
        return result

    duration_days = (end_at.date() - start_at.date()).days + 1
    result["duration_days"] = duration_days

    leave_type = str(payload.get("leave_type") or "").strip()
    if leave_type not in {"sick", "personal", "official_activity", "other"}:
        result["errors"].append("假别缺失或不在允许范围内")
        return result
    result["valid"] = True

    if leave_type == "sick":
        if not bool(payload.get("has_hospital_certificate", False)):
            # 病假证明只记录演示布尔状态，由辅导员审核时决定是否追补，不能硬性拦截学生提交。
            result["warnings"].append("未声明已准备医院证明：可先提交，辅导员可在审核环节要求补充。")

    # 校外实习优先级最高；公开制度中的“一个月”以自然月周年日为边界。
    calendar_month_end = add_calendar_month(start_at.date())
    if bool(payload.get("off_campus_internship", False)):
        result["route_id"] = "ROUTE-INTERNSHIP-3LEVEL"
        result["approver_sequence"] = ["counselor", "teaching_vice_dean", "academic_affairs"]
        result["next_action"] = "show_confirmation_summary"
    elif end_at.date() > calendar_month_end:
        result["route_id"] = "ROUTE-GT1M-SUSPENSION"
        result["requires_human_confirmation"] = True
        result["warnings"].append("超过一个自然月，应转休学流程，不得按普通请假提交")
        result["next_action"] = "contact_college_for_suspension"
    elif duration_days <= 3:
        result["route_id"] = "ROUTE-LE3-NORMAL"
        result["approver_sequence"] = ["counselor"]
        result["next_action"] = "show_confirmation_summary"
    else:
        result["route_id"] = "ROUTE-GT3-LE1M"
        result["approver_sequence"] = ["counselor", "teaching_vice_dean"]
        result["next_action"] = "show_confirmation_summary"

    if bool(payload.get("retroactive", False)):
        result["requires_human_confirmation"] = True
        result["warnings"].append("原则上不得事后补假；特殊原因须核验是否符合三天内委托代办条件")

    blocks_submission = result["route_id"] == "ROUTE-GT1M-SUSPENSION"
    result["ready_to_submit"] = bool(result["valid"] and not blocks_submission)
    return result


def main(args: dict[str, Any]) -> dict[str, Any]:
    """超星代码节点入口；若平台要求其他入口名，只需包装调用本函数。"""
    return calculate_leave_route(args)


if __name__ == "__main__":
    import json
    import sys

    payload = json.loads(sys.stdin.read() or "{}")
    print(json.dumps(main(payload), ensure_ascii=False))
