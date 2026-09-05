import { Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

export function ChatComposer({ onSubmit, disabled }: { onSubmit: (message: string) => void; disabled?: boolean }) {
  const [message, setMessage] = useState('');
  function submit() {
    const value = message.trim();
    if (!value || disabled) return;
    setMessage(''); onSubmit(value);
  }
  return <div className="rounded-[14px] border border-border bg-white p-3 shadow-card">
    <div className="flex items-end gap-3"><textarea value={message} disabled={disabled} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} className="min-h-12 flex-1 resize-none border-0 bg-transparent p-2 text-sm outline-none placeholder:text-slate-400" placeholder="输入问题，Enter 发送，Shift + Enter 换行" />
      <Button aria-label="发送" className="size-10 shrink-0 px-0" onClick={submit} disabled={disabled || !message.trim()}><Send size={17} /></Button>
    </div>
  </div>;
}
