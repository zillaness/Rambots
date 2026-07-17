import * as React from 'react';
import { cx } from '../lib/cx';

export type BadgeTone = 'red' | 'yellow' | 'neutral' | 'success' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color tone. `red` and `yellow` are the brand tones. */
  tone?: BadgeTone;
  /** Show a leading status dot. */
  dot?: boolean;
}

/**
 * A small pill for statuses, categories, and counts. Uppercase by default.
 * Prefer `neutral` for metadata and reserve `red`/`yellow` for brand emphasis.
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ tone = 'neutral', dot = false, className, children, ...rest }, ref) {
    return (
      <span ref={ref} className={cx('rb-badge', `rb-badge--${tone}`, className)} {...rest}>
        {dot && <span className="rb-badge__dot" aria-hidden="true" />}
        {children}
      </span>
    );
  },
);
