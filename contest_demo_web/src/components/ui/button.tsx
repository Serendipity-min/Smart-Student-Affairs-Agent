import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'danger' };

export function Button({ className, variant = 'default', type = 'button', ...props }: Props) {
  const variants = {
    default: 'bg-primary text-white hover:bg-[#002541] focus-visible:ring-service',
    outline: 'border border-border bg-white text-foreground hover:border-service hover:text-service focus-visible:ring-service',
    ghost: 'text-muted-foreground hover:bg-slate-100 hover:text-foreground focus-visible:ring-primary',
    danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger'
  };
  return <button type={type} className={cn('inline-flex h-10 items-center justify-center gap-2 rounded px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', variants[variant], className)} {...props} />;
}
