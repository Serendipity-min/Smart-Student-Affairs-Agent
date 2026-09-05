export function formatDateTimeLocal(value: string) {
  return value.replace('T', ' ').replace(/(\d{2}:\d{2})$/, '$1:00');
}

export function toDateTimeLocalInput(value: string) {
  // 仅转换既有文本格式，不经 Date 解析，避免本地时区造成表单回填偏移。
  return value.replace(' ', 'T').replace(/:\d{2}$/, '');
}

export function formatRole(role?: string | null) {
  const labels: Record<string, string> = {
    counselor: '辅导员',
    teaching_vice_dean: '学院分管教学副院长',
    academic_affairs: '教务处'
  };
  return role ? (labels[role] ?? '待学校确认') : '待分配';
}

export function formatAssigneeForStatus(status?: string, role?: string | null) {
  const terminalLabels: Record<string, string> = {
    approved: '流程结束',
    rejected: '流程已终止',
    withdrawn: '已撤回',
    cancelled: '已销假 / 流程结束',
    need_more_info: '等待学生补充',
    pending_confirmation: '等待学生确认'
  };
  if (terminalLabels[status ?? '']) return terminalLabels[status ?? ''];
  // 只有流转中的申请才可能出现尚未分配；终态绝不把 null 误解释为待分配。
  if ((status === 'submitted' || status === 'under_review') && !role) return '待流程分配';
  return formatRole(role);
}

export function formatLeaveType(value: string) {
  const labels: Record<string, string> = {
    sick: '病假', personal: '事假', official_activity: '公假', other: '其他'
  };
  return labels[value] ?? value;
}

export function formatMaterial(value: string) {
  const labels: Record<string, string> = { hospital_certificate: '医院证明' };
  // 未知材料代码不擅自补成制度事实，统一提示人工确认。
  return labels[value] ?? '其他材料（请人工确认）';
}
