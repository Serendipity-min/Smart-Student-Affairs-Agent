import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
type Action = 'approve' | 'reject' | 'request_more_info';
export function ReviewerActionDock({ resetKey, busy, onAction }: { resetKey: string; busy: boolean; onAction: (action: Action, comment: string) => void }) {
  const [comment, setComment] = useState('');
  useEffect(() => {
    // 父级在审核成功后会替换详情实例；此处才清空已成功提交的意见，失败输入始终保留。
    setComment('');
  }, [resetKey]);
  const trigger = (action: Action) => { onAction(action, comment); /* 网络失败时保留输入，避免审核意见意外丢失。 */ };
  return <aside className="shrink-0 border-t border-border bg-white px-5 py-4 shadow-[0_-6px_18px_rgba(23,32,51,.06)] lg:pb-5"><label className="block text-sm font-semibold">审核意见 <span className="font-normal text-muted-foreground">（要求补充 / 不批准必填）</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 min-h-20 w-full resize-y rounded border border-border p-3 text-sm outline-none" maxLength={200} placeholder="批准可不填写；其他操作请说明原因" /></label><div className="mt-3 flex flex-wrap gap-3"><Button onClick={() => trigger('approve')} disabled={busy}>批准</Button><Button variant="outline" onClick={() => trigger('request_more_info')} disabled={busy}>要求补充</Button><Button variant="danger" onClick={() => trigger('reject')} disabled={busy}>不批准</Button></div></aside>;
}
