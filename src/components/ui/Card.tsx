import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-white shadow-card border border-ink/5 overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}
