import { ArrowLeft, Search } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ServiceAside } from '../components/shell/ServiceAside';
import { WorkflowStepper } from '../components/shell/WorkflowStepper';
import { AppShell } from '../components/shell/AppShell';
import { Button } from '../components/ui/button';
import { Home } from '../features/main-agent/Home';
import { LeaveConfirm } from '../features/leave-apply/LeaveConfirm';
import { LeaveForm } from '../features/leave-apply/LeaveForm';
import { LeavePreview } from '../features/leave-apply/LeavePreview';
import { LeaveSuccess } from '../features/leave-apply/LeaveSuccess';
import { LeaveStatusCard } from '../features/leave-status/LeaveStatusCard';
import { StudentWorkbench } from '../features/leave-status/StudentWorkbench';
import { ReviewerWorkbench } from '../features/leave-status/ReviewerWorkbench';
import { SafeNotice } from '../features/safe/SafeNotice';
import { LocalAttachmentInput } from '../features/attachments/LocalAttachmentInput';
import { LocalSessionAttachmentProvider, useLocalAttachments } from '../features/attachments/LocalAttachmentContext';
import { contestApi } from '../lib/api';
import type { DemoRole, DemoSessions, LeaveFormPayload, LeaveRoute, LeaveStatus, ReviewRole } from '../lib/fastgpt-types';

type View = 'home' | 'policy-query' | 'policy' | 'leave-form' | 'leave-preview' | 'leave-confirm' | 'leave-success' | 'status-query' | 'status-result' | 'student-workbench' | 'reviewer-workbench' | 'safe';
const PolicyPage = lazy(() => import('../features/t01/PolicyPage').then((module) => ({ default: module.PolicyPage })));

export function App() {
  return <LocalSessionAttachmentProvider><AppContent /></LocalSessionAttachmentProvider>;
}

function AppContent() {
  const demoMode = useMemo(() => new URLSearchParams(window.location.search).get('demo') === '1', []);
  const [view, setView] = useState<View>('home');
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<DemoSessions>({});
  const [question, setQuestion] = useState('');
  const [policy, setPolicy] = useState<{ answer: string; citations: Array<{ title: string; source?: string }> }>();
  const [form, setForm] = useState<LeaveFormPayload>();
  const [route, setRoute] = useState<LeaveRoute>();
  const [leave, setLeave] = useState<LeaveStatus>();
  const [statusInput, setStatusInput] = useState('');
  const [reviewerRole, setReviewerRole] = useState<ReviewRole>('counselor');
  const [demoRole, setDemoRole] = useState<DemoRole>('student');
  const [supplementComment, setSupplementComment] = useState('');
  const [supplementCertificate, setSupplementCertificate] = useState(false);
  const attachments = useLocalAttachments();

  const active = view.startsWith('policy') ? 'policy' : view.startsWith('leave') ? 'leave' : view.startsWith('status') || view === 'student-workbench' ? 'status' : view === 'reviewer-workbench' ? 'workbench' : 'home';
  function reset() { attachments.reset(); setDemoRole('student'); setView('home'); setSessions({}); setQuestion(''); setPolicy(undefined); setForm(undefined); setRoute(undefined); setLeave(undefined); setStatusInput(''); setSupplementComment(''); setSupplementCertificate(false); }
  function go(target: 'home' | 'policy' | 'leave' | 'status' | 'workbench') {
    if (target === 'home') return reset();
    // 学生入口和审核入口互斥展示，避免标题仍显示审核角色却跳转到学生事务页。
    if (target === 'workbench') { setDemoRole(reviewerRole); setView('reviewer-workbench'); return; }
    setDemoRole('student');
    if (target === 'policy') setView('policy-query');
    if (target === 'leave') setView('leave-form');
    if (target === 'status') setView('student-workbench');
  }
  function switchDemoRole(role: DemoRole) {
    setDemoRole(role);
    if (role === 'student') { setView('student-workbench'); return; }
    setReviewerRole(role);
    setView('reviewer-workbench');
  }
  function saveSession(kind: keyof DemoSessions, id: string) { setSessions((current) => ({ ...current, [kind]: id })); }

  async function askMain(message: string) {
    setBusy(true);
    try {
      const result = await contestApi.main(message, sessions.main); saveSession('main', result.mainChatId); setQuestion(message);
      if (result.terminal === 't01') {
        // 主路由只负责分流；等待独立 T01 会话完成，避免页面提前解除忙碌状态。
        await runT01(message);
        return;
      }
      if (result.terminal === 't02') return setView('leave-form');
      if (result.terminal === 't03') return setView('status-query');
      setView('safe');
    } catch (error) { toast.error(error instanceof Error ? error.message : '服务入口暂时不可用'); } finally { setBusy(false); }
  }
  async function runT01(text: string) {
    setBusy(true);
    try { const result = await contestApi.t01(text, sessions.t01); saveSession('t01', result.t01ChatId); setQuestion(text); setPolicy({ answer: result.answer, citations: result.citations }); setView('policy'); } catch (error) { toast.error(error instanceof Error ? error.message : '制度咨询未完成'); } finally { setBusy(false); }
  }
  async function makePreview(values: LeaveFormPayload) {
    setBusy(true);
    try { const result = await contestApi.t02('preview', values, sessions.t02); if (!result.route) throw new Error('未获得可复核的审批预览'); saveSession('t02', result.t02ChatId); setForm(values); setRoute(result.route); setView('leave-preview'); } catch (error) { toast.error(error instanceof Error ? error.message : '预览未生成'); } finally { setBusy(false); }
  }
  function returnToEdit() {
    // 旧会话已停在确认节点；清除它后，修改后的表单只能创建新的 T02 预览会话。
    setRoute(undefined);
    setSessions((current) => ({ ...current, t02: undefined }));
    setView('leave-form');
  }
  async function confirm() {
    if (!sessions.t02) return;
    setBusy(true);
    try { const result = await contestApi.t02('confirm', undefined, sessions.t02); if (!result.leave || result.leave.status !== 'submitted') throw new Error('未获得已提交的 DEMO 申请结果'); attachments.bind(result.leave.application_id); saveSession('t02', result.t02ChatId); setLeave(result.leave); setView('leave-success'); } catch { toast.error('提交结果暂未确认，请勿重复提交。'); } finally { setBusy(false); }
  }
  async function cancelLeave() {
    if (!sessions.t02) return reset();
    setBusy(true);
    try {
      const result = await contestApi.t02('cancel', undefined, sessions.t02);
      if (!result.cancelled || result.writeObserved) throw new Error('取消结果未能安全确认');
      toast.success('本次申请已取消，未创建或提交办件。'); reset();
    } catch (error) { toast.error(error instanceof Error ? error.message : '取消未确认'); } finally { setBusy(false); }
  }
  async function query(applicationId: string) {
    const id = applicationId.trim(); if (!id) return toast.error('请输入申请编号'); setBusy(true);
    try {
      const result = await contestApi.t03(id, sessions.t03); saveSession('t03', result.t03ChatId);
      // T03 保留平台查询链；成功后用同源 DEMO API 获取 V0.3 审批历史，失败时仍展示 T03 已确认的最小结果。
      const detail = await contestApi.studentApplication(id).catch(() => ({ leave: result.leave }));
      setLeave(detail.leave); setStatusInput(id); setView('status-result');
    } catch (error) { toast.error(error instanceof Error ? error.message : '查询未完成'); } finally { setBusy(false); }
  }
  async function submitSupplement() {
    if (!leave || !supplementComment.trim()) return toast.error('请填写补充说明');
    setBusy(true);
    try {
      // 仅发送是否已准备证明的布尔值；文件名只停留在本地界面，不进入请求体。
      const result = await contestApi.studentSupplement(leave.application_id, supplementCertificate, supplementComment.trim(), leave.reason_summary);
      // 补充接口仍只接收布尔声明；成功后才把当前浏览器内存材料覆盖绑定到同一申请编号。
      if (supplementCertificate) attachments.bind(leave.application_id);
      setLeave(result.leave); setSupplementComment(''); setSupplementCertificate(false); toast.success('补充信息已提交，申请已回到原审批角色。');
    } catch (error) { toast.error(error instanceof Error ? error.message : '补充操作未完成'); } finally { setBusy(false); }
  }

  const back = <Button variant="ghost" className="-ml-3" onClick={reset}><ArrowLeft size={17} />返回事务首页</Button>;
  return <AppShell active={active} onNavigate={go} demoRole={demoRole} onDemoRoleChange={switchDemoRole}><div className={demoMode ? 'text-[1.06em]' : ''}>
    {view === 'home' && <Home onSubmit={askMain} onLeave={() => go('leave')} onStatus={() => go('status')} busy={busy} />}
    {view === 'policy-query' && <div className="mx-auto max-w-3xl space-y-5">{back}<section className="border border-border bg-white p-6"><p className="text-sm text-service">制度咨询</p><h1 className="mt-2 text-2xl font-semibold">请描述需要查询的制度问题</h1><textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="mt-5 min-h-32 w-full rounded border border-border p-3 text-sm outline-none" placeholder="例如：请假四天谁审批？" /><Button className="mt-4" onClick={() => runT01(question.trim())} disabled={!question.trim() || busy}>{busy ? '正在检索…' : '查询制度答复'}</Button></section></div>}
    {view === 'policy' && policy && <div className="space-y-5">{back}<Suspense fallback={<p className="text-sm text-muted-foreground">正在加载制度答复…</p>}><PolicyPage question={question} answer={policy.answer} citations={policy.citations} /></Suspense></div>}
    {['leave-form', 'leave-preview', 'leave-confirm', 'leave-success'].includes(view) && <div className="space-y-6"><WorkflowStepper current={view === 'leave-form' ? 1 : view === 'leave-preview' ? 2 : view === 'leave-confirm' ? 3 : 4} /><div className="grid gap-6 lg:grid-cols-12"><div className="lg:col-span-8">{view === 'leave-form' && <LeaveForm initialValues={form} onSubmit={makePreview} onCancel={reset} busy={busy} />}{view === 'leave-preview' && form && route && <LeavePreview form={form} route={route} onBack={returnToEdit} onCancel={cancelLeave} onConfirm={() => setView('leave-confirm')} busy={busy} />}{view === 'leave-confirm' && <LeaveConfirm onBack={() => setView('leave-preview')} onConfirm={confirm} busy={busy} />}{view === 'leave-success' && leave && <LeaveSuccess leave={leave} onRestart={reset} onQuery={() => { setStatusInput(leave.application_id); setView('status-query'); }} />}</div>{view !== 'leave-success' && <aside className="lg:col-span-4"><ServiceAside /></aside>}</div></div>}
    {view === 'student-workbench' && <div className="mx-auto max-w-4xl space-y-5"><StudentWorkbench leave={leave} onOpen={() => setView('status-query')} /></div>}
    {view === 'reviewer-workbench' && <ReviewerWorkbench role={reviewerRole} />}
    {view === 'status-query' && <div className="mx-auto max-w-3xl space-y-5">{back}<section className="border border-border bg-white p-6"><p className="text-sm text-service">进度查询</p><h1 className="mt-2 text-2xl font-semibold">查询申请状态</h1><p className="mt-2 text-sm text-muted-foreground">请输入当前受控 DEMO 申请编号。</p><label className="mt-5 block text-sm font-medium">申请编号<input value={statusInput} onChange={(event) => setStatusInput(event.target.value.toUpperCase())} placeholder="DEMO-APP-XXXXXXXX" className="mt-2 w-full rounded border border-border px-3 font-mono-data text-sm outline-none" /></label><Button className="mt-4" onClick={() => query(statusInput)} disabled={busy}><Search size={16} />{busy ? '正在查询…' : '查询办件状态'}</Button></section></div>}
    {view === 'status-result' && leave && <div className="mx-auto max-w-4xl space-y-5">{back}<LeaveStatusCard leave={leave} />{leave.status === 'need_more_info' && <section className="rounded border border-border bg-white p-5"><h2 className="text-lg font-semibold">补充演示信息</h2><p className="mt-2 text-sm text-muted-foreground">{leave.supplement_request?.comment ?? '审核方要求补充说明。'}</p><div className="mt-4"><LocalAttachmentInput onCertificateChange={setSupplementCertificate} /></div><label className="mt-4 block text-sm font-medium">补充说明<textarea value={supplementComment} onChange={(event) => setSupplementComment(event.target.value)} className="mt-2 min-h-24 w-full rounded border border-border p-3 text-sm" maxLength={200} /></label><Button className="mt-4" onClick={submitSupplement} disabled={busy}>提交补充</Button></section>}</div>}
    {view === 'safe' && <SafeNotice onHome={reset} />}
  </div></AppShell>;
}
