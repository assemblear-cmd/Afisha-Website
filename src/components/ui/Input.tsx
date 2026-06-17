import clsx from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-md border border-ink/15 px-3 py-2 text-body placeholder:text-muted focus:border-coral focus:ring-2 focus:ring-coral/30 outline-none',
        className
      )}
      {...props}
    />
  );
});
