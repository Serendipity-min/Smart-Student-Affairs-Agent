import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export function SafeNotice({ onHome }: { onHome: () => void }) {
  return <Card className="mx-auto max-w-2xl p-6 md:p-8"><span className="grid size-10 place-items-center rounded bg-panel text-service"><ShieldAlert size={21} /></span><h1 className="mt-5 text-2xl font-semibold">该请求无法直接执行</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">出于隐私和权限保护，系统不会查询其他学生的申请，也不会绕过人工确认直接提交。</p><Button className="mt-6" onClick={onHome}>返回事务首页</Button></Card>;
}
