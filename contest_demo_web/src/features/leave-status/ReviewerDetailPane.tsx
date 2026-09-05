import type { ReactNode } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { StatusPill } from '../../components/status/StatusPill';
import type { LeaveStatus } from '../../lib/fastgpt-types';
import { formatAssigneeForStatus, formatLeaveType } from '../../lib/format';
import { AttachmentPreview } from '../attachments/AttachmentPreview';
import { ApplicationTimeline } from './ApplicationTimeline';

type Props = { leave?: LeaveStatus; collapsed: boolean; onExpandList: () => void; actionDock?: ReactNode };
export function ReviewerDetailPane({ leave, collapsed, onExpandList, actionDock }: Props) {
  if (!leave) return <Card className="flex min-h-[360px] items-center justify-center p-6 text-center text-sm text-muted-foreground lg:h-full lg:min-h-0"><div><p className="font-medium text-foreground">从左侧选择一条申请开始审核</p><p className="mt-2">申请详情、材料声明和实际审批时间线将在这里显示。</p></div></Card>;
  return <section className="flex min-h-[500px] min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card lg:h-full lg:min-h-0"><header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-mono-data text-xs text-muted-foreground">{leave.application_id}</p>{collapsed && <button type="button" className="hidden items-center gap-1 text-xs font-semibold text-service hover:underline lg:inline-flex" onClick={onExpandList}><PanelLeftOpen size={15} />展开申请列表</button>}</div><h2 className="mt-1 text-xl font-semibold">{formatLeaveType(leave.leave_type ?? '')} · {leave.duration_days ?? '-'} 天</h2><p className="mt-1 text-xs text-muted-foreground">当前审批环节：{formatAssigneeForStatus(leave.status, leave.current_assignee_role)}</p></div><StatusPill status={leave.status} /></header><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"><dl className="grid border border-border text-sm sm:grid-cols-2"><Item label="时间" value={`${leave.start_at ?? '-'} 至 ${leave.end_at ?? '-'}`} /><Item label="实习状态" value={leave.off_campus_internship ? '校外实习' : '非校外实习'} /><Item label="原因摘要" value={leave.reason_summary ?? '-'} /><Item label="病假证明声明" value={leave.has_hospital_certificate ? '已声明准备' : '未声明准备'} /></dl><AttachmentPreview applicationId={leave.application_id} declared={leave.has_hospital_certificate} /><div className="mt-5"><ApplicationTimeline leave={leave} /></div></div>{actionDock}</section>;
}
function Item({ label, value }: { label: string; value: string }) { return <div className="border-b border-border p-4 even:sm:border-l sm:[&:nth-last-child(-n+2)]:border-b-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>; }
