import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LeaveStatus } from '../../lib/fastgpt-types';
import { formatRole } from '../../lib/format';

const actionLabels: Record<string, string> = { create_draft: '生成预览', submit: '学生提交', approve: '审核通过', reject: '审核不通过', request_more_info: '要求补充', supplement: '学生补充', withdraw: '撤回申请', cancel: '完成销假' };

export function ApplicationTimeline({ leave }: { leave: LeaveStatus }) {
  const sequence = leave.approver_sequence ?? [];
  const history = leave.review_history ?? [];
  const approvedRoles = new Set(history.filter((item) => (item.action ?? item.action_type) === 'approve').map((item) => item.actor_role));
  const pending = leave.status === 'submitted' || leave.status === 'under_review' || leave.status === 'need_more_info' || leave.status === 'pending_confirmation';
  const [expanded, setExpanded] = useState(pending);
  useEffect(() => { // 切换申请时按状态恢复默认：终态收起，待审批申请展开。
    setExpanded(pending);
  }, [leave.application_id, pending]);
  return <section className="rounded border border-border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">实际审批时间线</h3><p className="mt-1 text-xs text-muted-foreground">节点由当前审批序列、实际审核历史和当前状态生成；不预填未来审批结果。</p></div><button type="button" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-service hover:underline" onClick={() => setExpanded((open) => !open)}>{expanded ? <><ChevronUp size={15} />收起</> : <><ChevronDown size={15} />展开</>}</button></div>
    {expanded && <ol className="mt-5 space-y-4 border-l border-border pl-5">{history.map((item) => { const action = item.action ?? item.action_type ?? 'unknown'; return <li key={item.action_id} className="relative"><span className="absolute -left-[27px] top-1 size-3 rounded-full bg-service" /><p className="text-sm font-medium">{actionLabels[action] ?? action} · {formatRole(item.actor_role)}</p><p className="mt-1 text-xs text-muted-foreground">{item.action_at}{item.comment ? ` · ${item.comment}` : ''}</p></li>; })}
      {leave.status === 'need_more_info' && leave.supplement_request && <li className="relative"><span className="absolute -left-[27px] top-1 size-3 rounded-full bg-amber-500" /><p className="text-sm font-medium">等待学生补充材料</p><p className="mt-1 text-xs text-muted-foreground">{formatRole(leave.supplement_request.requested_by_role)}：{leave.supplement_request.comment}</p></li>}
      {(leave.status === 'submitted' || leave.status === 'under_review') && sequence.map((role, index) => !approvedRoles.has(role) && leave.current_assignee_role === role ? <li key={`current-${role}-${index}`} className="relative"><span className="absolute -left-[27px] top-1 size-3 rounded-full bg-primary ring-4 ring-blue-100" /><p className="text-sm font-semibold text-primary">当前待 {formatRole(role)} 审核</p></li> : null)}
      {leave.status === 'approved' && <TerminalItem label="审批完成" tone="success" symbol="✓" />}
      {leave.status === 'rejected' && <TerminalItem label="审批终止" tone="danger" symbol="✕" />}
      {leave.status === 'withdrawn' && <TerminalItem label="学生已撤回" tone="muted" symbol="○" />}
      {leave.status === 'cancelled' && <TerminalItem label="已销假" tone="success" symbol="✓" />}
    </ol>}
  </section>;
}

function TerminalItem({ label, symbol, tone }: { label: string; symbol: string; tone: 'success' | 'danger' | 'muted' }) {
  const colors = { success: 'bg-emerald-600', danger: 'bg-danger', muted: 'bg-slate-400' };
  return <li className="relative"><span className={`absolute -left-[27px] top-1 grid size-3 place-items-center rounded-full ${colors[tone]} text-[8px] text-white`}>{symbol}</span><p className="text-sm font-semibold">{symbol} {label}</p></li>;
}
