import * as React from 'react';
import { cx } from '../lib/cx';

export interface TypeRow {
  label: string;
  /** CSS font-size for the sample. */
  size: string;
  weight?: number;
}

export interface TypeSpecimenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text rendered at each size. */
  sample?: string;
  /** Rows to render. Defaults to the Rambots type scale. */
  rows?: TypeRow[];
}

/** The Rambots type scale, built on Helvetica Neue. */
export const RAMBOTS_TYPE_SCALE: TypeRow[] = [
  { label: 'Display', size: '48px', weight: 700 },
  { label: 'Heading 1', size: '36px', weight: 700 },
  { label: 'Heading 2', size: '28px', weight: 700 },
  { label: 'Heading 3', size: '22px', weight: 700 },
  { label: 'Body Large', size: '18px', weight: 400 },
  { label: 'Body', size: '16px', weight: 400 },
  { label: 'Caption', size: '12.5px', weight: 500 },
];

/**
 * A type specimen showing the Rambots scale in Helvetica Neue. Each row labels a
 * step and renders the sample text at that size and weight — the typography
 * reference for the style guide.
 */
export const TypeSpecimen = React.forwardRef<HTMLDivElement, TypeSpecimenProps>(
  function TypeSpecimen({ sample = 'The Rambots — Team 2204', rows = RAMBOTS_TYPE_SCALE, className, ...rest }, ref) {
    return (
      <div ref={ref} className={cx('rb-typescale', className)} {...rest}>
        {rows.map((row) => (
          <div className="rb-typescale__row" key={row.label}>
            <span className="rb-typescale__label">{row.label}</span>
            <p
              className="rb-typescale__sample"
              style={{ fontSize: row.size, fontWeight: row.weight, fontFamily: 'var(--rb-font-sans)' }}
            >
              {sample}
            </p>
          </div>
        ))}
      </div>
    );
  },
);
