import * as React from 'react';
import { cx } from '../lib/cx';
import { Logo } from './Logo';

export interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface NavBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Left-aligned brand. Defaults to the Rambots logo (yellow-on-red). */
  brand?: React.ReactNode;
  /** Primary navigation links. */
  items?: NavItem[];
  /** Right-aligned actions (e.g. a CTA Button). */
  actions?: React.ReactNode;
}

/**
 * The Rambots top navigation bar on a Rambot Red background, with the logo at
 * left, links in the middle/right, and optional actions. Active and hovered
 * links render in Rambot Yellow.
 */
export const NavBar = React.forwardRef<HTMLElement, NavBarProps>(function NavBar(
  { brand, items = [], actions, className, ...rest },
  ref,
) {
  return (
    <nav ref={ref} className={cx('rb-navbar', className)} {...rest}>
      <div className="rb-navbar__brand">{brand ?? <Logo tone="onRed" size={28} />}</div>
      {items.length > 0 && (
        <ul className="rb-navbar__links">
          {items.map((item) => (
            <li key={item.label}>
              <a
                href={item.href ?? '#'}
                className={cx('rb-navbar__link', item.active && 'rb-navbar__link--active')}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      {actions && <div className="rb-navbar__actions">{actions}</div>}
    </nav>
  );
});
