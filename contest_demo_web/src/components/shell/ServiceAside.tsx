import { ShieldCheck } from 'lucide-react';
import { Card } from '../ui/card';

export function ServiceAside() {
  return <Card className="h-fit p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} className="text-service" />系统事务提示</h2><div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground"><p>当前步骤不会创建申请。</p><p>审批路径由规则引擎计算。</p><p>确认后才会创建并提交。</p><p>仅使用受控合成数据。</p></div></Card>;
}
