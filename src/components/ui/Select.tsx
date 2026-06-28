import clsx from 'clsx';
import { forwardRef, type SelectHTMLAttributes } from 'react';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={clsx(
        'w-full rounded-md border border-ink/15 px-3 py-2 text-body focus:border-coral focus:ring-2 focus:ring-coral/30 outline-none bg-card',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
