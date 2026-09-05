import { useState, type ReactNode } from 'react';
import { Building2, Menu } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { DemoRole } from '../../lib/fastgpt-types';

type NavTarget = 'home' | 'policy' | 'leave' | 'status' | 'workbench';
type Props = { children: ReactNode; active: NavTarget; onNavigate: (target: NavTarget) => void; demoRole: DemoRole; onDemoRoleChange: (role: DemoRole) => void };

export function AppShell({ children, active, onNavigate, demoRole, onDemoRoleChange }: Props) {
  const items: Array<[NavTarget, string]> = [['home', '事务首页'], ['policy', '制度问答'], ['leave', '请假办理'], ['status', '进度查询'], ['workbench', '审批工作台']];
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const navigate = (target: NavTarget) => {
    // 移动端选择服务后收起菜单，避免遮挡表单、检索结果或确认按钮。
    setMobileNavigationOpen(false);
    onNavigate(target);
  };
  return <div className="min-h-screen bg-background text-foreground">
    <header className="relative border-b border-border bg-white">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
        <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => navigate('home')}>
          <span className="grid size-9 shrink-0 place-items-center rounded bg-primary text-white"><Building2 size={20} /></span>
          <div className="min-w-0"><p className="text-base font-semibold tracking-tight">学事智办 <span className="mx-1 text-border">|</span><span className="hidden text-sm font-normal text-muted-foreground sm:inline">学生请假与事务服务</span></p><p className="truncate text-xs text-muted-foreground sm:hidden">学生请假与事务服务</p></div>
        </button>
        <nav className="hidden items-center gap-1 md:flex">{items.map(([target, label]) => <button key={target} onClick={() => navigate(target)} className={active === target ? 'rounded bg-primary px-3 py-2 text-sm font-medium text-white' : 'rounded px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-panel hover:text-foreground'}>{label}</button>)}</nav>
        <div className="flex shrink-0 items-center gap-2"><select aria-label="切换演示角色" value={demoRole} onChange={(event) => onDemoRoleChange(event.target.value as DemoRole)} className="hidden h-9 max-w-52 rounded border border-border bg-white px-2 text-xs text-muted-foreground lg:block"><option value="student">演示角色：学生</option><option value="counselor">演示角色：辅导员</option><option value="teaching_vice_dean">演示角色：学院分管教学副院长</option><option value="academic_affairs">演示角色：教务处</option></select><Badge className="hidden bg-panel text-service sm:inline-flex">演示环境 · 受控合成数据</Badge><button aria-expanded={mobileNavigationOpen} aria-label="打开服务导航" className="grid size-9 place-items-center rounded border border-border text-muted-foreground md:hidden" onClick={() => setMobileNavigationOpen((open) => !open)}><Menu size={18} /></button></div>
      </div>
      {mobileNavigationOpen ? <nav aria-label="移动端服务导航" className="absolute inset-x-0 top-full z-20 border-b border-border bg-white px-4 py-3 shadow-sm md:hidden"><div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-2">{items.map(([target, label]) => <button key={target} className={active === target ? 'rounded bg-panel px-3 py-2 text-left text-sm font-medium text-primary' : 'rounded px-3 py-2 text-left text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground'} onClick={() => navigate(target)}>{label}</button>)}</div></nav> : null}
    </header>
    <main className="mx-auto min-h-[calc(100vh-128px)] max-w-[1200px] px-4 py-6 md:px-6 md:py-8">{children}</main>
    <footer className="border-t border-border bg-white"><div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6"><p><span className="mr-2 inline-block size-2 rounded-full bg-success" />规则有依据 · 写入需确认 · 演示数据不进入真实教务系统</p><span>比赛演示环境</span></div></footer>
  </div>;
}
