import { ClipboardCheck, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { LeaveStatus } from '../../lib/fastgpt-types';
import { formatAssigneeForStatus } from '../../lib/format';
import { Card } from '../../components/ui/card';
import { StatusPill } from '../../components/status/StatusPill';

export function LeaveStatusCard({ leave }: { leave: LeaveStatus }) {
  return <Card className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded bg-panel text-service"><ClipboardCheck size={19} /></span><div><h2 className="text-xl font-semibold">办件状态</h2><p className="mt-1 text-sm text-muted-foreground">仅展示本次受控 DEMO 查询返回的办件摘要。</p></div></div><StatusPill status={leave.status} /></div>
    <dl className="mt-6 grid gap-0 border border-border sm:grid-cols-2"><Item label="申请编号" value={<span className="font-mono-data">{leave.application_id}</span>} /><Item label="当前审批角色" value={formatAssigneeForStatus(leave.status, leave.current_assignee_role)} /><Item label="请假天数" value={leave.duration_days ? `${leave.duration_days} 天` : '待学校确认'} /><Item label="匹配规则" value={leave.matched_route_id ? <span className="font-mono-data">{leave.matched_route_id}</span> : '待学校确认'} /></dl>
    <div className="mt-5 flex items-start gap-2 rounded bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldAlert size={16} className="mt-0.5 shrink-0" />申请数据为演示用合成数据。系统不会显示他人的请假信息，也不处理任何真实身份资料。</div>
  </Card>;
}
function Item({ label, value }: { label: string; value: ReactNode }) { return <div className="border-b border-border p-4 even:sm:border-l sm:even:border-l sm:[&:nth-last-child(-n+2)]:border-b-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
