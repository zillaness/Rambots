import * as React from 'react';
import { cx } from '../lib/cx';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** `default` = white surface, `feature` = Rambot Red surface. */
  variant?: 'default' | 'feature';
  /** Top accent bar color. Omit for no accent bar. */
  accent?: 'red' | 'yellow' | 'none';
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  /** Rendered under the title as muted body text. */
  description?: React.ReactNode;
  /** Footer row (e.g. action buttons). Omitting it hides the footer. */
  footer?: React.ReactNode;
}

/**
 * A content container with an optional brand accent bar, eyebrow, title,
 * description, and footer. Use `variant="feature"` for a red hero card where the
 * eyebrow renders in Rambot Yellow.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', accent = 'red', eyebrow, title, description, footer, className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('rb-card', variant === 'feature' && 'rb-card--feature', className)} {...rest}>
      {accent !== 'none' && <div className={cx('rb-card__accent', accent === 'yellow' && 'rb-card__accent--yellow')} />}
      <div className="rb-card__body">
        {eyebrow && <span className="rb-card__eyebrow">{eyebrow}</span>}
        {title && <h3 className="rb-card__title">{title}</h3>}
        {description && <p className="rb-card__text">{description}</p>}
        {children}
      </div>
      {footer && <div className="rb-card__footer">{footer}</div>}
    </div>
  );
});
