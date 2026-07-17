import * as React from 'react';
import { cx } from '../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `primary` = Rambot Red, `secondary` = Rambot Yellow. */
  variant?: ButtonVariant;
  /** Control height / padding / text size. */
  size?: ButtonSize;
  /** Stretch to the full width of the container. */
  block?: boolean;
  /** Optional leading element (icon, emoji). */
  leadingIcon?: React.ReactNode;
}

/**
 * The primary Rambots action control. Use `primary` (Rambot Red) for the main
 * action on a view and at most one per group; `secondary` (Rambot Yellow) for a
 * prominent alternative; `outline`/`ghost` for lower-emphasis actions.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', block = false, leadingIcon, className, children, type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx('rb-btn', `rb-btn--${variant}`, `rb-btn--${size}`, block && 'rb-btn--block', className)}
        {...rest}
      >
        {leadingIcon}
        {children}
      </button>
    );
  },
);
