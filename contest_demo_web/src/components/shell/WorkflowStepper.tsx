import { Check } from 'lucide-react';

const steps = ['填写信息', '审批预览', '确认提交', '办理完成'];

export function WorkflowStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return <div className="border border-border bg-white px-4 py-5 md:px-6"><div className="hidden md:flex">{steps.map((label, index) => {
    const number = index + 1; const done = number < current; const active = number === current;
    return <div className="flex flex-1 items-start last:flex-none" key={label}><div><span className={done ? 'grid size-7 place-items-center rounded-full bg-primary text-white' : active ? 'grid size-7 place-items-center rounded-full border-2 border-service bg-white text-sm font-semibold text-service' : 'grid size-7 place-items-center rounded-full border border-border bg-background text-sm text-muted-foreground'}>{done ? <Check size={14} /> : number}</span><p className={active ? 'mt-2 text-sm font-semibold' : 'mt-2 text-sm text-muted-foreground'}>{label}</p></div>{index < steps.length - 1 && <span className={done ? 'mt-3 h-0.5 flex-1 bg-primary' : 'mt-3 h-0.5 flex-1 bg-border'} />}</div>;
  })}</div><p className="text-sm font-medium md:hidden">步骤 {current}/4 · {steps[current - 1]}</p></div>;
}
