/**
 * 请假审批的确定性规则。该实现与超星代码节点的 Python 参考实现保持同一边界：
 * “一个月”按自然月计算，不把 30 天误当作一个月；本模块只计算，不产生写入副作用。
 */

const SUPPORTED_LEAVE_TYPES = new Set(['personal', 'sick', 'official_activity', 'other']);

function parseDateTime(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('起止时间不能为空');
  }
  const normalized = value.trim().replace('T', ' ').replace(/Z$/, '');
  const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!matched) {
    throw new Error('时间必须使用 YYYY-MM-DD 或 YYYY-MM-DD HH:MM[:SS]');
  }
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = matched;
  const result = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  // Date 会自动进位，因此必须反查字段，拒绝 2 月 30 日等不存在日期。
  if (result.getUTCFullYear() !== Number(year) || result.getUTCMonth() !== Number(month) - 1 || result.getUTCDate() !== Number(day)) {
    throw new Error('时间包含不存在的日期');
  }
  return result;
}

function toDateKey(value) {
  return value.toISOString().slice(0, 10);
}

function addCalendarMonth(value) {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(nextYear, nextMonth, Math.min(day, lastDay)));
}

function isTrue(value) {
  return value === true || value === 'true';
}

export function calculateLeaveRoute(payload = {}) {
  const result = {
    valid: false,
    ready_to_submit: false,
    duration_days: null,
    route_id: null,
    approver_sequence: [],
    requires_human_confirmation: false,
    material_required: [],
    errors: [],
    warnings: [],
    next_action: 'collect_required_fields'
  };

  let startAt;
  let endAt;
  try {
    startAt = parseDateTime(payload.start_at);
    endAt = parseDateTime(payload.end_at);
  } catch (error) {
    result.errors.push(error.message);
    return result;
  }
  if (endAt < startAt) {
    result.errors.push('结束时间不能早于开始时间');
    return result;
  }

  const durationDays = Math.floor((Date.parse(toDateKey(endAt)) - Date.parse(toDateKey(startAt))) / 86400000) + 1;
  result.duration_days = durationDays;
  const leaveType = String(payload.leave_type ?? '').trim();
  if (!SUPPORTED_LEAVE_TYPES.has(leaveType)) {
    result.errors.push('假别缺失或不在允许范围内');
    return result;
  }
  result.valid = true;
  const offCampusInternship = isTrue(payload.off_campus_internship);
  const exceedsNaturalMonth = endAt > addCalendarMonth(startAt);
  if (leaveType === 'sick' && !isTrue(payload.has_hospital_certificate)) {
    // 病假证明仅是演示声明，缺失时由辅导员在审核环节决定是否追补，不能阻断学生提交。
    result.warnings.push('未声明已准备医院证明：可先提交，辅导员可在审核环节要求补充。');
  }

  // 校外实习的优先级最高，即使超过一个自然月也必须走三级审批而非休学提示。
  if (offCampusInternship) {
    result.route_id = 'ROUTE-INTERNSHIP-3LEVEL';
    result.approver_sequence = ['counselor', 'teaching_vice_dean', 'academic_affairs'];
    result.next_action = 'show_confirmation_summary';
  } else if (exceedsNaturalMonth) {
    result.route_id = 'ROUTE-GT1M-SUSPENSION';
    result.requires_human_confirmation = true;
    result.warnings.push('超过一个自然月，应转休学流程，不得按普通请假提交');
    result.next_action = 'contact_college_for_suspension';
  } else if (durationDays <= 3) {
    result.route_id = 'ROUTE-LE3-NORMAL';
    result.approver_sequence = ['counselor'];
    result.next_action = 'show_confirmation_summary';
  } else {
    result.route_id = 'ROUTE-GT3-LE1M';
    result.approver_sequence = ['counselor', 'teaching_vice_dean'];
    result.next_action = 'show_confirmation_summary';
  }
  if (isTrue(payload.retroactive)) {
    result.requires_human_confirmation = true;
    result.warnings.push('原则上不得事后补假；特殊原因须核验是否符合三天内委托代办条件');
  }
  result.ready_to_submit = result.valid && result.route_id !== 'ROUTE-GT1M-SUSPENSION';
  return result;
}
