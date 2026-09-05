import { CheckCircle2, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { LeaveStatus } from '../../lib/fastgpt-types';
import { formatAssigneeForStatus } from '../../lib/format';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { StatusPill } from '../../components/status/StatusPill';

export function LeaveSuccess({ leave, onQuery, onRestart }: { leave: LeaveStatus; onQuery: () => void; onRestart: () => void }) {
  return <Card className="p-6 sm:p-8"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded bg-emerald-50 text-success"><CheckCircle2 size={24} /></span><div><h2 className="text-xl font-semibold">DEMO 申请已提交</h2><p className="mt-2 text-sm text-muted-foreground">申请已进入演示审批队列，不会进入学校生产系统。</p></div></div>
    <div className="mt-6 grid gap-0 border border-border text-left text-sm sm:grid-cols-4"><Field label="申请编号" value={<span className="font-mono-data font-semibold">{leave.application_id}</span>} /><Field label="当前状态" value={<StatusPill status={leave.status} />} /><Field label="当前审批角色" value={formatAssigneeForStatus(leave.status, leave.current_assignee_role)} /><Field label="请假天数" value={leave.duration_days ? `${leave.duration_days} 天` : '待学校确认'} /></div>
    <div className="mt-6 flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={onRestart}>返回首页</Button><Button onClick={onQuery}><Search size={16} />查询申请状态</Button></div>
  </Card>;
}
function Field({ label, value }: { label: string; value: ReactNode }) { return <div className="border-b border-border p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 font-medium">{value}</div></div>; }
