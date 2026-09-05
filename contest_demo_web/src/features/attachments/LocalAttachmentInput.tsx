import { useState } from 'react';
import { useLocalAttachments } from './LocalAttachmentContext';
import { DEMO_ATTACHMENT_MAX_BYTES, DEMO_ATTACHMENT_TYPES } from './types';

export function LocalAttachmentInput({ onCertificateChange }: { onCertificateChange: (ready: boolean) => void }) {
  const { pending, putPending, clear } = useLocalAttachments();
  const [error, setError] = useState('');
  const selectFile = (file?: File) => {
    if (!file) { clear(); onCertificateChange(false); setError(''); return; }
    if (!DEMO_ATTACHMENT_TYPES.has(file.type)) { clear(); onCertificateChange(false); setError('仅支持 JPG、PNG 或 PDF 文件。'); return; }
    if (file.size > DEMO_ATTACHMENT_MAX_BYTES) { clear(); onCertificateChange(false); setError('本地演示文件不能超过 10 MB。'); return; }
    // Provider 仅创建 blob: URL；这里不读取字节、不编码，也不触发任何网络请求。
    putPending(file);
    onCertificateChange(true);
    setError('');
  };
  return <label className="block text-sm font-medium">医院证明（可选）
    <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="mt-2 block w-full text-sm" onChange={(event) => selectFile(event.currentTarget.files?.[0])} />
    {pending && <span className="mt-2 block text-xs text-muted-foreground">本地已选择：{pending.displayName}</span>}
    {error && <span className="mt-2 block text-xs text-danger">{error}</span>}
    <span className="mt-3 block text-xs leading-5 text-muted-foreground">仅用于当前浏览器演示预览；材料不上传、不保存，也不会发送文件名或文件内容。</span>
  </label>;
}
