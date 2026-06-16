import clsx from 'clsx';
import type { LabelHTMLAttributes } from 'react';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return <label className={clsx('text-sm font-medium text-ink', className)} {...props} />;
}
