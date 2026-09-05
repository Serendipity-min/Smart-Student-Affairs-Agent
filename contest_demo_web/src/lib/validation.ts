import { z } from 'zod';

export const leaveFormSchema = z.object({
  reason: z.string().trim().min(2, '请至少填写 2 个字的请假事由').max(200, '请假事由不超过 200 字'),
  start_at: z.string().min(1, '请选择开始时间'),
  end_at: z.string().min(1, '请选择结束时间'),
  leave_type: z.enum(['sick', 'personal', 'official_activity', 'other']),
  off_campus_internship: z.boolean(),
  has_hospital_certificate: z.boolean()
}).superRefine((value, context) => {
  if (value.start_at && value.end_at && value.end_at < value.start_at) {
    context.addIssue({ code: 'custom', path: ['end_at'], message: '结束时间不能早于开始时间' });
  }
});

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;
