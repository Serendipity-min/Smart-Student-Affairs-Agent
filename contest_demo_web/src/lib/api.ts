import type { LeaveFormPayload, LeaveStatus, MainRouteResult, ReviewRole, ReviewerTask, T01Result, T02Result, T03Result } from './fastgpt-types';

type GatewayErrorPayload = { error?: { code?: string; message?: string } };

type PostOptions = { retryOnce?: boolean };

async function post<T>(path: string, payload: unknown, options: PostOptions = {}): Promise<T> {
  // 只读或未写入的预览允许一次短暂重试；确认提交绝不由浏览器自动重放。
  const attempts = options.retryOnce ? 2 : 1;
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({})) as T & GatewayErrorPayload;
      if (response.ok) return data;
      lastError = new Error(data.error?.message ?? '服务暂时不可用，请稍后重试');
      // 仅 5xx 可重试，避免把客户端校验失败误当作网络波动。
      if (response.status < 500 || attempt + 1 >= attempts) throw lastError;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('服务暂时不可用，请稍后重试');
      if (attempt + 1 >= attempts) throw lastError;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 350));
  }
  throw lastError ?? new Error('服务暂时不可用，请稍后重试');
}

export const contestApi = {
  main: (message: string, chatId?: string) => post<MainRouteResult>('/api/main', { message, chatId }, { retryOnce: true }),
  t01: (question: string, chatId?: string) => post<T01Result>('/api/t01', { question, chatId }, { retryOnce: true }),
  // confirm 不能自动重试：写入结果未知时必须交由用户确认，防止重复提交。
  t02: (action: 'preview' | 'confirm' | 'cancel', form?: LeaveFormPayload, chatId?: string) => post<T02Result>('/api/t02', { action, form, chatId }, { retryOnce: action === 'preview' }),
  t03: (applicationId: string, chatId?: string) => post<T03Result>('/api/t03', { applicationId, chatId }, { retryOnce: true }),
  studentApplication: (applicationId: string) => post<{ leave: LeaveStatus }>('/api/student/application', { applicationId }, { retryOnce: true }),
  // 补充操作写入状态机，不能自动重试，避免重复记录学生补充意见。
  studentSupplement: (applicationId: string, hasHospitalCertificate: boolean, comment: string, reasonSummary?: string) => post<{ leave: LeaveStatus }>('/api/student/supplement', { applicationId, hasHospitalCertificate, comment, reasonSummary }),
  reviewerTasks: (role: ReviewRole) => post<{ role: ReviewRole; tasks: ReviewerTask[] }>('/api/reviewer/tasks', { role }, { retryOnce: true }),
  reviewerApplication: (role: ReviewRole, applicationId: string) => post<{ leave: LeaveStatus }>('/api/reviewer/application', { role, applicationId }, { retryOnce: true }),
  reviewerAction: (role: ReviewRole, applicationId: string, action: 'approve' | 'reject' | 'request_more_info', comment: string) => post<{ leave: LeaveStatus }>('/api/reviewer/action', { role, applicationId, action, comment })
};
