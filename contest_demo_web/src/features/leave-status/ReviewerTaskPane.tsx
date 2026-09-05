import { ChevronDown, ChevronUp, PanelLeftClose, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { StatusPill } from '../../components/status/StatusPill';
import type { ReviewRole, ReviewerTask } from '../../lib/fastgpt-types';
import { formatAssigneeForStatus, formatLeaveType, formatRole } from '../../lib/format';

type TaskTab = 'pending' | 'processed';
type Props = { role: ReviewRole; tasks: ReviewerTask[]; selectedId?: string; busy: boolean; onOpen: (applicationId: string) => void; onRefresh: () => void; onCollapse: () => void };

export function ReviewerTaskPane({ role, tasks, selectedId, busy, onOpen, onRefresh, onCollapse }: Props) {
  const [tab, setTab] = useState<TaskTab>('pending'); const [query, setQuery] = useState(''); const [showAllProcessed, setShowAllProcessed] = useState(false);
  const pendingTasks = useMemo(() => tasks.filter((task) => task.is_pending), [tasks]);
  const processedTasks = useMemo(() => tasks.filter((task) => !task.is_pending), [tasks]);
  useEffect(() => { // 角色切换后从待办开始，并清理上一角色的本地筛选与展开状态。
    setTab('pending'); setQuery(''); setShowAllProcessed(false);
  }, [role]);
  const source = tab === 'pending' ? pendingTasks : processedTasks;
  const filtered = source.filter((task) => `${task.application_id} ${formatLeaveType(task.leave_type ?? '')}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visible = tab === 'processed' && !showAllProcessed ? filtered.slice(0, 8) : filtered;
  return <section className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card lg:h-full lg:min-h-0">
    <div className="border-b border-border px-5 pb-4 pt-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-service">Reviewer Workbench</p><h1 className="mt-1 text-xl font-semibold">审批工作台</h1><p className="mt-1 text-xs text-muted-foreground">当前角色：{formatRole(role)}</p></div><Button variant="ghost" className="hidden h-8 shrink-0 px-2 text-xs lg:inline-flex" onClick={onCollapse}><PanelLeftClose size={15} />收起申请列表</Button></div>
      <div className="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="审批任务分类"><button type="button" role="tab" aria-selected={tab === 'pending'} className={tab === 'pending' ? 'rounded bg-primary px-2 py-2 text-xs font-semibold text-white' : 'rounded bg-panel px-2 py-2 text-xs font-semibold text-service hover:bg-blue-100'} onClick={() => setTab('pending')}>待我处理 {pendingTasks.length}</button><button type="button" role="tab" aria-selected={tab === 'processed'} className={tab === 'processed' ? 'rounded bg-primary px-2 py-2 text-xs font-semibold text-white' : 'rounded bg-panel px-2 py-2 text-xs font-semibold text-service hover:bg-blue-100'} onClick={() => setTab('processed')}>已处理 {processedTasks.length}</button></div>
      <label className="relative mt-3 block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input aria-label="搜索申请编号或假别" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded border border-border bg-white pl-9 pr-3 text-xs outline-none" placeholder="搜索申请编号 / 假别" /></label><Button variant="outline" className="mt-3 h-9 w-full text-xs" onClick={onRefresh} disabled={busy}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />刷新任务</Button>
    </div>
    <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-3">{visible.length > 0 ? <div className="space-y-2">{visible.map((task) => <TaskButton key={task.application_id} task={task} selected={task.application_id === selectedId} onOpen={onOpen} />)}</div> : <EmptyTaskState tab={tab} query={query} />}{tab === 'processed' && filtered.length > 8 && <button type="button" className="mt-3 flex w-full items-center justify-center gap-1 rounded border border-border bg-white px-3 py-2 text-xs font-semibold text-service hover:border-service" onClick={() => setShowAllProcessed((show) => !show)}>{showAllProcessed ? <><ChevronUp size={15} />收起</> : <><ChevronDown size={15} />显示更多（另有 {filtered.length - 8} 条）</>}</button>}</div>
  </section>;
}

function TaskButton({ task, selected, onOpen }: { task: ReviewerTask; selected: boolean; onOpen: (applicationId: string) => void }) { return <button type="button" onClick={() => onOpen(task.application_id)} className={selected ? 'w-full rounded border border-service bg-panel p-3 text-left shadow-sm' : 'w-full rounded border border-border bg-white p-3 text-left transition-colors hover:border-service'}><div className="flex items-start justify-between gap-2"><span className="font-mono-data text-xs text-foreground">{task.application_id}</span><StatusPill status={task.status} /></div><p className="mt-2 text-sm font-semibold">{formatLeaveType(task.leave_type ?? '')} · {task.duration_days ?? '-'} 天</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{task.reason_summary || '未填写原因摘要'}</p><p className="mt-2 text-xs text-muted-foreground">{task.off_campus_internship ? '校外实习' : '非校外实习'} · {task.is_pending ? '当前待我审核' : '已处理记录'}</p><p className="mt-1 text-xs text-muted-foreground">{formatAssigneeForStatus(task.status, task.current_assignee_role)}</p></button>; }
function EmptyTaskState({ tab, query }: { tab: TaskTab; query: string }) { if (query.trim()) return <p className="rounded bg-panel p-4 text-center text-sm leading-6 text-muted-foreground">当前分类中没有匹配的申请。</p>; return <p className="rounded bg-panel p-4 text-sm leading-6 text-muted-foreground">{tab === 'pending' ? <>当前没有待处理申请<br />已处理记录可在“已处理”中查看。</> : '暂无已处理记录'}</p>; }
