import clsx from 'clsx';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'w-full rounded-md border border-ink/15 px-3 py-2 text-body placeholder:text-muted focus:border-coral focus:ring-2 focus:ring-coral/30 outline-none',
        className
      )}
      {...props}
    />
  );
});
