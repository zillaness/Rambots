import * as React from 'react';
import { cx } from '../lib/cx';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Semantic tone. Drives color and default icon glyph. */
  tone?: AlertTone;
  title?: React.ReactNode;
  /** Override the default glyph shown in the leading badge. */
  icon?: React.ReactNode;
}

const GLYPH: Record<AlertTone, string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '×',
};

/**
 * An inline message banner with a colored left accent, keyed to a semantic
 * tone. Pass a `title` for the bold headline and children for the body copy.
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { tone = 'info', title, icon, className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} role="status" className={cx('rb-alert', `rb-alert--${tone}`, className)} {...rest}>
      <span className="rb-alert__icon" aria-hidden="true">{icon ?? GLYPH[tone]}</span>
      <div className="rb-alert__content">
        {title && <p className="rb-alert__title">{title}</p>}
        {children && <p className="rb-alert__text">{children}</p>}
      </div>
    </div>
  );
});
