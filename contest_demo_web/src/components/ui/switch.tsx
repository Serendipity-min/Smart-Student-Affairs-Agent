import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { ComponentPropsWithoutRef } from 'react';

type Props = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

export function Switch({ ...props }: Props) {
  return <SwitchPrimitive.Root className="group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-slate-200 transition-colors data-[state=checked]:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-service focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...props}>
    <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-150 group-data-[state=checked]:translate-x-5" />
  </SwitchPrimitive.Root>;
}
