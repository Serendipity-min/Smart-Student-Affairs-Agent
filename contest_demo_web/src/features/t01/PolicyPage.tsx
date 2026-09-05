import { BookOpen, ShieldCheck } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation } from '../../lib/fastgpt-types';
import { Card } from '../../components/ui/card';

export function PolicyPage({ question, answer, citations }: { question: string; answer: string; citations: Citation[] }) {
  return <div className="grid gap-6 lg:grid-cols-12"><Card className="p-6 lg:col-span-8"><p className="text-sm text-service">制度咨询</p><h1 className="mt-2 text-2xl font-semibold">{question}</h1><article className="prose prose-slate mt-6 max-w-none text-[15px] leading-8"><Markdown remarkPlugins={[remarkGfm]}>{answer}</Markdown></article></Card>
    <div className="space-y-6 lg:col-span-4"><Card className="p-5"><h2 className="flex items-center gap-2 font-semibold"><BookOpen size={18} className="text-service" />依据来源</h2>{citations.length ? <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">{citations.map((citation, index) => <li className="border-b border-border pb-3 last:border-0 last:pb-0" key={`${citation.title}-${index}`}><p className="font-medium text-foreground">{citation.title}</p>{citation.source && <p className="mt-1">{citation.source}</p>}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-muted-foreground">本次答复未返回可展示的制度引用，请以学校最新公开规定为准。</p>}</Card><Card className="p-5"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-service" />适用边界</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">制度咨询以公开知识库及本次答复为准；具体办理由学校最新要求和人工审核确认。</p></Card></div>
  </div>;
}
