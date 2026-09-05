import { BookOpen, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation } from '../../lib/fastgpt-types';
import { Card } from '../../components/ui/card';

export default function KnowledgeAnswer({ answer, citations = [] }: { answer: string; citations?: Citation[] }) {
  const [expanded, setExpanded] = useState(false);
  return <Card className="p-5"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><BookOpen size={16} className="text-primary" />知识库答复</div>
    <article className="prose prose-slate max-w-none text-sm leading-7"><Markdown remarkPlugins={[remarkGfm]}>{answer}</Markdown></article>
    {citations.length > 0 && <div className="mt-5 border-t border-border pt-3"><button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-sm font-medium text-primary"><ChevronDown className={expanded ? 'rotate-180 transition-transform duration-150' : 'transition-transform duration-150'} size={16} />参考依据（{citations.length}）</button>
      {expanded && <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{citations.map((citation, index) => <li key={`${citation.title}-${index}`}>{citation.title}{citation.source ? ` · ${citation.source}` : ''}</li>)}</ul>}
    </div>}
  </Card>;
}
