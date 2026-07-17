import * as React from 'react';
import { cx } from '../lib/cx';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the control. */
  label?: React.ReactNode;
  /** Marks the field required and shows a red asterisk. */
  required?: boolean;
  /** Helper text under the input; turns red when `error` is set. */
  help?: React.ReactNode;
  /** Error message. Presence switches the field into its error style. */
  error?: React.ReactNode;
}

/**
 * A labelled text input with helper and error states. Focus draws a Rambot Red
 * ring; the error state borders the control in red and shows the error message.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, required = false, help, error, id, className, ...rest },
  ref,
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const message = error ?? help;
  return (
    <div className={cx('rb-field', error && 'rb-field--error')}>
      {label && (
        <label className="rb-field__label" htmlFor={inputId}>
          {label}
          {required && <span className="rb-field__req" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cx('rb-input', className)}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      />
      {message && <span className={cx('rb-field__help', error && 'rb-field__help--error')}>{message}</span>}
    </div>
  );
});
