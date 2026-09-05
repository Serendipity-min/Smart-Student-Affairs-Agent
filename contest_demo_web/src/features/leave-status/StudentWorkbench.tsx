import type { ReactNode } from 'react';
import type { LeaveStatus } from '../../lib/fastgpt-types';
import { formatAssigneeForStatus, formatLeaveType } from '../../lib/format';
import { Card } from '../../components/ui/card';
import { StatusPill } from '../../components/status/StatusPill';
import { ApplicationTimeline } from './ApplicationTimeline';

export function StudentWorkbench({ leave, onOpen }: { leave?: LeaveStatus; onOpen: () => void }) {
  return <div className="space-y-5"><Card className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-service">我的演示申请</p><h1 className="mt-2 text-2xl font-semibold">学生办理工作台</h1><p className="mt-2 text-sm text-muted-foreground">仅显示当前浏览器会话中已查询或已提交的受控 DEMO 申请。</p></div>{leave && <StatusPill status={leave.status} />}</div>{leave ? <dl className="mt-6 grid border border-border text-sm sm:grid-cols-2"><Row label="申请编号" value={<span className="font-mono-data">{leave.application_id}</span>} /><Row label="当前审批角色" value={formatAssigneeForStatus(leave.status, leave.current_assignee_role)} /><Row label="假别 / 时长" value={`${formatLeaveType(leave.leave_type ?? '')} · ${leave.duration_days ?? '-'} 天`} /><Row label="审批进度" value={`${Math.min(leave.approval_index ?? 0, leave.approver_sequence?.length ?? 0)} / ${leave.approver_sequence?.length ?? 0} 已流转`} /></dl> : <div className="mt-6 rounded bg-panel p-4 text-sm text-muted-foreground">尚未选择演示申请。请先提交申请或通过“进度查询”打开申请编号。</div>}<button onClick={onOpen} className="mt-5 text-sm font-medium text-service underline underline-offset-4">查询或打开演示申请</button></Card>{leave && <ApplicationTimeline leave={leave} />}</div>;
}

function Row({ label, value }: { label: string; value: ReactNode }) { return <div className="border-b border-border p-4 even:sm:border-l sm:[&:nth-last-child(-n+2)]:border-b-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
