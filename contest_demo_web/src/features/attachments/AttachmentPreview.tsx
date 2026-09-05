import { useState } from 'react';
import { FileText, Maximize2, X } from 'lucide-react';
import { useLocalAttachments } from './LocalAttachmentContext';

export function AttachmentPreview({ applicationId, declared }: { applicationId: string; declared?: boolean }) {
  const { get } = useLocalAttachments();
  const attachment = get(applicationId);
  const [expanded, setExpanded] = useState(false);
  if (!declared) return null;
  if (!attachment) return <section className="mt-5 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-medium">已声明准备医院证明</p><p className="mt-1 text-xs leading-5">当前浏览器演示会话中没有可预览的本地文件。材料未上传服务器。</p></section>;
  if (attachment.mimeType === 'application/pdf') return <section className="mt-5 rounded border border-border bg-panel p-4"><p className="text-sm font-medium">医院证明</p><div className="mt-3 flex items-center gap-2 text-sm"><FileText size={18} className="text-service" /><span>{attachment.displayName}</span></div><a className="mt-3 inline-block text-sm font-medium text-service underline underline-offset-4" href={attachment.objectUrl} target="_blank" rel="noreferrer">打开本地预览</a><p className="mt-2 text-xs text-muted-foreground">本地演示预览 · 未上传服务器</p></section>;
  return <section className="mt-5 rounded border border-border bg-panel p-4"><p className="text-sm font-medium">医院证明</p><p className="mt-1 text-xs text-muted-foreground">{attachment.displayName}</p><button type="button" className="mt-3 block overflow-hidden rounded border border-border text-left" onClick={() => setExpanded(true)} aria-label="放大医院证明预览"><img src={attachment.objectUrl} alt="医院证明本地缩略图" className="h-40 w-auto max-w-full object-contain" /></button><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Maximize2 size={13} />点击图片可放大 · 本地演示预览 · 未上传服务器</p>{expanded && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-6" role="dialog" aria-modal="true" aria-label="医院证明放大预览" onClick={() => setExpanded(false)}><div className="relative max-h-full max-w-4xl" onClick={(event) => event.stopPropagation()}><button type="button" className="absolute -right-3 -top-3 grid size-8 place-items-center rounded-full bg-white text-slate-700 shadow" onClick={() => setExpanded(false)} aria-label="关闭预览"><X size={17} /></button><img src={attachment.objectUrl} alt="医院证明本地放大预览" className="max-h-[85vh] max-w-full rounded bg-white object-contain" /></div></div>}</section>;
}
