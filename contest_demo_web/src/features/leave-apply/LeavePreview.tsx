import { CheckCircle2, FileSearch, ShieldAlert } from 'lucide-react';
import type { LeaveFormPayload, LeaveRoute } from '../../lib/fastgpt-types';
import { formatLeaveType, formatMaterial, formatRole } from '../../lib/format';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export function LeavePreview({ form, route, onConfirm, onBack, onCancel, busy }: { form: LeaveFormPayload; route: LeaveRoute; onConfirm: () => void; onBack: () => void; onCancel: () => void; busy?: boolean }) {
  const canConfirm = route.ready_to_submit === true;
  const materials = route.material_required?.length ? route.material_required.map(formatMaterial).join('、') : '暂无额外材料提示';
  return <Card className="p-5 sm:p-6"><div className="mb-6 flex items-start gap-3"><span className="grid size-9 place-items-center rounded bg-panel text-service"><FileSearch size={19} /></span><div><h2 className="text-xl font-semibold">审批预览</h2><p className="mt-1 text-sm text-muted-foreground">以下审批信息均来自规则引擎的真实返回。</p></div></div>
    <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2"><Item label="请假类型" value={formatLeaveType(form.leave_type)} /><Item label="请假天数" value={`${route.duration_days} 天`} /><Item label="请假时间" value={`${form.start_at} 至 ${form.end_at}`} /><Item label="审批角色" value={route.approver_sequence.map(formatRole).join(' → ')} /><Item label="匹配规则" value={route.route_id} /><Item label="可提交" value={canConfirm ? '满足当前规则条件' : '暂不满足提交条件'} /><Item label="材料要求" value={materials} /><Item label="规则提示" value={route.warnings?.join('；') || '暂无'} /></dl>
    <div className="mt-5 flex items-start gap-2 rounded bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldAlert size={16} className="mt-0.5 shrink-0" />当前尚未创建申请。进入下一步后，仍需本人再次明确确认。</div>
    {!canConfirm && <div className="mt-4 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950" role="status"><ShieldAlert size={17} className="mt-0.5 shrink-0" /><div><p className="font-semibold">当前申请暂不满足提交条件。</p><p>请根据规则提示补充材料或转人工确认后重新办理。</p>{form.leave_type === 'sick' && <p className="mt-1">病假须提供医院证明；公开细则未明确证明的具体格式或盖章要求，具体以学院或校医院最新要求为准。</p>}</div></div>}
    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border pt-5"><Button variant="ghost" onClick={onCancel} disabled={busy}>取消本次申请</Button><Button variant="outline" onClick={onBack} disabled={busy}>返回修改</Button>{canConfirm && <Button onClick={onConfirm} disabled={busy}>进入确认提交 <CheckCircle2 size={16} /></Button>}</div>
  </Card>;
}

function Item({ label, value }: { label: string; value: string }) { return <div className="border-b border-border pb-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium leading-6">{value}</dd></div>; }
