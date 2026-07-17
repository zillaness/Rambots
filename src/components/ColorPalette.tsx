import * as React from 'react';
import { cx } from '../lib/cx';

export interface Swatch {
  name: string;
  /** CSS color value shown on the chip and printed as the code. */
  value: string;
  /** Short usage note. */
  note?: string;
  /** Draw a hairline border on the chip (for very light colors). */
  bordered?: boolean;
}

export interface ColorPaletteProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Swatches to display. Defaults to the Rambots brand palette. */
  colors?: Swatch[];
}

/** The two core brand colors plus supporting neutrals, used as the default. */
export const RAMBOTS_PALETTE: Swatch[] = [
  { name: 'Rambot Red', value: '#A31F36', note: 'Primary / backgrounds' },
  { name: 'Rambot Yellow', value: '#F4A81C', note: 'Accent / text / logo' },
  { name: 'Ink', value: '#1C1A1B', note: 'Body text' },
  { name: 'Gray 200', value: '#E5E1E2', note: 'Borders', bordered: true },
  { name: 'Gray 050', value: '#FAF8F8', note: 'Muted surface', bordered: true },
  { name: 'Paper', value: '#FFFFFF', note: 'Surface', bordered: true },
];

/**
 * A swatch board for brand colors — each chip shows the color, its name, and
 * hex code. Renders the Rambots brand palette by default; pass `colors` to show
 * any custom set. This is the color reference for the style guide.
 */
export const ColorPalette = React.forwardRef<HTMLDivElement, ColorPaletteProps>(
  function ColorPalette({ colors = RAMBOTS_PALETTE, className, ...rest }, ref) {
    return (
      <div ref={ref} className={cx('rb-palette', className)} {...rest}>
        {colors.map((c) => (
          <div className="rb-swatch" key={c.name}>
            <div
              className="rb-swatch__chip"
              style={{ background: c.value, boxShadow: c.bordered ? 'inset 0 0 0 1px #e5e1e2' : undefined }}
            />
            <div className="rb-swatch__meta">
              <span className="rb-swatch__name">{c.name}</span>
              <span className="rb-swatch__hex">{c.value}</span>
              {c.note && <span className="rb-swatch__note">{c.note}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  },
);
