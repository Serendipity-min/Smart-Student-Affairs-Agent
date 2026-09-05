import { Badge } from '../ui/badge';

export function StatusPill({ status }: { status: string }) {
  const text: Record<string, string> = { submitted: '已提交', pending_confirmation: '待确认', under_review: '审核中', need_more_info: '待补充', approved: '已批准', rejected: '未批准', withdrawn: '已撤回', cancelled: '已销假' };
  return <Badge className="bg-blue-50 text-primary">{text[status] ?? '状态待确认'}</Badge>;
}
