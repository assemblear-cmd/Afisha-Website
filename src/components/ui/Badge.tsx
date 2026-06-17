import clsx from 'clsx';
import type { ReactNode } from 'react';

export type BadgeTone = 'default' | 'success' | 'coral';

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-surface text-muted',
  success: 'bg-success/10 text-success',
  coral: 'bg-coral/10 text-coral',
};

export interface BadgeProps {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
}

export function Badge({ children, className, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full text-xs px-2.5 py-1 font-medium',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
