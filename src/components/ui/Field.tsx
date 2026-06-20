import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { Label } from './Label';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  // One id flows to the Label (htmlFor) and the control (id) so the two are
  // always associated, even if a call site forgets to pass htmlFor.
  const generatedId = useId();
  const controlId = htmlFor ?? generatedId;
  const errorId = `${controlId}-error`;
  const hintId = `${controlId}-hint`;
  const showHint = Boolean(hint) && !error;

  // Wire aria-describedby / aria-invalid onto the single control here, so each
  // form field is announced with its error/hint without repeating this per call.
  let control = children;
  if (isValidElement(children)) {
    const child = children as ReactElement<{
      id?: string;
      'aria-describedby'?: string;
      'aria-invalid'?: boolean;
    }>;
    const describedBy = [
      child.props['aria-describedby'],
      error ? errorId : null,
      showHint ? hintId : null,
    ]
      .filter(Boolean)
      .join(' ');
    control = cloneElement(child, {
      id: child.props.id ?? controlId,
      'aria-describedby': describedBy || undefined,
      'aria-invalid': error ? true : child.props['aria-invalid'],
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={controlId}>{label}</Label>
      {control}
      {showHint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
