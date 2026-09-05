import { ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export function LeaveConfirm({ onBack, onConfirm, busy }: { onBack: () => void; onConfirm: () => void; busy?: boolean }) {
  return <Card className="p-6"><span className="grid size-10 place-items-center rounded bg-panel text-service"><ShieldCheck size={21} /></span><h2 className="mt-4 text-xl font-semibold">确认提交</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">当前尚未创建申请。只有点击“确认并提交”后，系统才允许进入受鉴权 DEMO 写入链路。</p><div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={onBack} disabled={busy}>返回修改</Button><Button onClick={onConfirm} disabled={busy}>{busy ? '正在提交…' : '确认并提交'}</Button></div></Card>;
}
