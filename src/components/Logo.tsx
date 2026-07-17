import * as React from 'react';
import { cx } from '../lib/cx';

export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Height of the gearhead mark in px; the wordmark scales with it. */
  size?: number;
  /** `onLight` uses red/ink ink; `onRed` uses Rambot Yellow (for red backgrounds). */
  tone?: 'onLight' | 'onRed';
  /** Show the "RAMBOTS" wordmark next to the mark. */
  showWord?: boolean;
  /** Show the gearhead mark. */
  showMark?: boolean;
}

/**
 * The Rambots logo lockup: the gearhead "Robo Ram" mark plus the RAMBOTS
 * wordmark. NOTE: the mark here is a placeholder gear pending the official
 * Robo Ram SVG (drop it in `assets/logos/`); the wordmark styling is final.
 * Always spell it "Rambots" or "RAMBOTS" — never "RamBots" or "Ram Bots".
 */
export const Logo = React.forwardRef<HTMLSpanElement, LogoProps>(function Logo(
  { size = 32, tone = 'onLight', showWord = true, showMark = true, className, ...rest },
  ref,
) {
  const markColor = tone === 'onRed' ? '#f4a81c' : '#a31f36';
  const wordClass = tone === 'onRed' ? undefined : 'rb-logo__word--red';
  return (
    <span
      ref={ref}
      className={cx('rb-logo', tone === 'onRed' && 'rb-logo--onRed', className)}
      aria-label="Rambots"
      {...rest}
    >
      {showMark && (
        <span className="rb-logo__mark" style={{ width: size, height: size }}>
          {/* Placeholder gearhead mark — swap for the official Robo Ram SVG. */}
          <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-hidden="true" fill="none">
            <path
              fill={markColor}
              d="M24 3l3.2 4.1 5-1.6 1 5.2 5.2 1-1.6 5 4.1 3.2-4.1 3.2 1.6 5-5.2 1-1 5.2-5-1.6L24 45l-3.2-4.1-5 1.6-1-5.2-5.2-1 1.6-5L8.1 28l4.1-3.2-1.6-5 5.2-1 1-5.2 5 1.6L24 3z"
            />
            <circle cx="24" cy="24" r="9" fill="#fff" />
            <path fill={markColor} d="M18 24c0-2.2 1.4-4 3.4-4 .9 0 1.6.7 1.6 1.5S22.3 23 21.4 23c-.4 0-.7.4-.7 1s.3 1 .7 1c.9 0 1.6.7 1.6 1.5S22.3 29 21.4 29c-2 0-3.4-1.8-3.4-5zm12 0c0 3.2-1.4 5-3.4 5-.9 0-1.6-.7-1.6-1.5S25.7 25 26.6 25c.4 0 .7-.4.7-1s-.3-1-.7-1c-.9 0-1.6-.7-1.6-1.5s.7-1.5 1.6-1.5c2 0 3.4 1.8 3.4 4z" />
          </svg>
        </span>
      )}
      {showWord && (
        <span className={cx('rb-logo__word', wordClass)} style={{ fontSize: size * 0.62 }}>
          RAMBOTS
        </span>
      )}
    </span>
  );
});
