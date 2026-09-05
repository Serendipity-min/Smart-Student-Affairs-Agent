import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CalendarClock, ShieldAlert } from 'lucide-react';
import type { LeaveFormPayload } from '../../lib/fastgpt-types';
import { leaveFormSchema, type LeaveFormValues } from '../../lib/validation';
import { formatDateTimeLocal, toDateTimeLocalInput } from '../../lib/format';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { LocalAttachmentInput } from '../attachments/LocalAttachmentInput';
import { useLocalAttachments } from '../attachments/LocalAttachmentContext';

export function LeaveForm({ onSubmit, onCancel, initialValues, busy }: { onSubmit: (form: LeaveFormPayload) => void; onCancel: () => void; initialValues?: LeaveFormPayload; busy?: boolean }) {
  const defaultValues = useMemo<LeaveFormValues>(() => ({
    leave_type: initialValues?.leave_type ?? 'personal',
    off_campus_internship: initialValues?.off_campus_internship ?? false,
    has_hospital_certificate: initialValues?.has_hospital_certificate ?? false,
    reason: initialValues?.reason ?? '',
    start_at: initialValues ? toDateTimeLocalInput(initialValues.start_at) : '',
    end_at: initialValues ? toDateTimeLocalInput(initialValues.end_at) : ''
  }), [initialValues]);
  const { control, register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<LeaveFormValues>({ resolver: zodResolver(leaveFormSchema), defaultValues });
  const { clear } = useLocalAttachments();
  const leaveType = watch('leave_type');
  useEffect(() => {
    // 返回修改时显式回填五个字段；不用 Date，确保表单与预览中的本地时间逐字一致。
    reset(defaultValues);
  }, [defaultValues, reset]);
  useEffect(() => {
    if (leaveType !== 'sick') {
      // 切换离开病假时只清理未绑定材料，不影响已提交申请的同会话预览。
      clear();
      setValue('has_hospital_certificate', false, { shouldDirty: true });
    }
  }, [clear, leaveType, setValue]);
  const submit = (values: LeaveFormValues) => onSubmit({ ...values, start_at: formatDateTimeLocal(values.start_at), end_at: formatDateTimeLocal(values.end_at) });
  return <Card className="p-5 sm:p-6"><div className="mb-6 flex items-start gap-3"><span className="grid size-9 place-items-center rounded bg-panel text-service"><CalendarClock size={19} /></span><div><h2 className="text-xl font-semibold">填写请假信息</h2><p className="mt-1 text-sm text-muted-foreground">请如实填写，系统将先生成路由预览，不会直接创建或提交申请。</p></div></div>
    <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <label className="block text-sm font-medium">请假事由<textarea {...register('reason')} className="mt-2 min-h-28 w-full rounded border border-border bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400" placeholder="请输入请假原因（最多 200 字）" />{errors.reason && <span className="mt-1 block text-xs text-danger">{errors.reason.message}</span>}</label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">开始时间<input type="datetime-local" {...register('start_at')} className="mt-2 w-full rounded border border-border bg-white px-3 text-sm outline-none" />{errors.start_at && <span className="mt-1 block text-xs text-danger">{errors.start_at.message}</span>}</label>
        <label className="block text-sm font-medium">结束时间<input type="datetime-local" {...register('end_at')} className="mt-2 w-full rounded border border-border bg-white px-3 text-sm outline-none" />{errors.end_at && <span className="mt-1 block text-xs text-danger">{errors.end_at.message}</span>}</label></div>
      <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">请假类型<select {...register('leave_type')} className="mt-2 w-full rounded border border-border bg-white px-3 text-sm outline-none"><option value="personal">事假</option><option value="sick">病假</option><option value="official_activity">公假</option><option value="other">其他</option></select></label>
        <Controller control={control} name="off_campus_internship" render={({ field }) => <div className="flex h-full items-end"><label className="flex w-full items-center justify-between rounded border border-border px-3 py-2.5 text-sm font-medium">是否处于校外实习<Switch checked={field.value} onCheckedChange={field.onChange} aria-label="是否处于校外实习" /></label></div>} /></div>
      {leaveType === 'sick' && <section className="rounded border border-border bg-panel p-4"><LocalAttachmentInput onCertificateChange={(ready) => setValue('has_hospital_certificate', ready, { shouldDirty: true })} /></section>}
      <div className="flex items-start gap-2 rounded bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldAlert size={16} className="mt-0.5 shrink-0" />本演示仅使用受控合成数据，不连接学校真实业务系统；病假证明仅作为本地布尔声明。</div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5"><Button variant="outline" onClick={onCancel} disabled={busy}>取消</Button><Button type="submit" disabled={busy}>{busy ? '正在处理…' : '生成审批预览'}</Button></div>
    </form>
  </Card>;
}
