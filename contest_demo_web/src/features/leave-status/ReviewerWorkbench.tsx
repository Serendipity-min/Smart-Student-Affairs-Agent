import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { contestApi } from '../../lib/api';
import type { LeaveStatus, ReviewRole, ReviewerTask } from '../../lib/fastgpt-types';
import { ReviewerActionDock } from './ReviewerActionDock';
import { ReviewerDetailPane } from './ReviewerDetailPane';
import { ReviewerTaskPane } from './ReviewerTaskPane';

export function ReviewerWorkbench({ role }: { role: ReviewRole }) {
  const [tasks, setTasks] = useState<ReviewerTask[]>([]);
  const [selected, setSelected] = useState<LeaveStatus>();
  const [busy, setBusy] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const loadTasks = async () => {
    setBusy(true);
    try { const result = await contestApi.reviewerTasks(role); setTasks(result.tasks); }
    catch (error) { toast.error(error instanceof Error ? error.message : '待办加载失败'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    // 角色切换必须回到该角色自己的待办视图，避免沿用前一角色的选中项或收起状态。
    setSelected(undefined); setListCollapsed(false); void loadTasks();
  }, [role]);

  const open = async (applicationId: string) => {
    setBusy(true);
    try {
      const result = await contestApi.reviewerApplication(role, applicationId);
      setSelected(result.leave);
      // 仅在单栏断点把详情带入视口；桌面端始终保留独立详情面板，不触发页面跳动。
      if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (error) { toast.error(error instanceof Error ? error.message : '申请详情加载失败'); }
    finally { setBusy(false); }
  };

  const act = async (action: 'approve' | 'reject' | 'request_more_info', comment: string) => {
    if (!selected) return;
    if ((action === 'reject' || action === 'request_more_info') && !comment.trim()) { toast.error('请填写审核意见'); return; }
    setBusy(true);
    try {
      const result = await contestApi.reviewerAction(role, selected.application_id, action, comment.trim());
      // 审核后的详情留在右侧供连续审核和录像复核，左侧只刷新任务集合。
      setSelected(result.leave); await loadTasks(); toast.success(action === 'approve' ? '审批决定已记录' : '审核意见已记录');
    } catch (error) { toast.error(error instanceof Error ? error.message : '审核操作未完成'); }
    finally { setBusy(false); }
  };

  return <div className={`grid gap-5 lg:h-[calc(100dvh-9.5rem)] lg:min-h-[620px] lg:overflow-hidden ${listCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-[340px_minmax(0,1fr)]'}`}>
    {!listCollapsed && <ReviewerTaskPane role={role} tasks={tasks} selectedId={selected?.application_id} busy={busy} onOpen={open} onRefresh={loadTasks} onCollapse={() => setListCollapsed(true)} />}
    <div ref={detailRef} className="min-h-0"><ReviewerDetailPane leave={selected} collapsed={listCollapsed} onExpandList={() => setListCollapsed(false)} actionDock={selected?.current_assignee_role === role ? <ReviewerActionDock resetKey={`${selected.application_id}:${selected.status}`} busy={busy} onAction={act} /> : undefined} /></div>
  </div>;
}
