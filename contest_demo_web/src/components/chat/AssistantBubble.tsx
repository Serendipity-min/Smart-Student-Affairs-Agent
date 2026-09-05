import { Bot, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function AssistantBubble({ children, loading = false }: { children?: ReactNode; loading?: boolean }) {
  return <div className="flex gap-3">
    <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-blue-50 text-primary"><Bot size={17} /></span>
    <div className="min-w-0 flex-1 rounded-[14px] border border-border bg-white px-4 py-3 shadow-card">
      {loading ? <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" size={16} />正在处理…</span> : children}
    </div>
  </div>;
}
