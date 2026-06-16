import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return <div className={clsx('max-w-[1200px] mx-auto px-4 sm:px-6', className)}>{children}</div>;
}
