import * as React from 'react';
import { ColorPalette, RAMBOTS_PALETTE } from '@rambots/design-system';

export const BrandPalette = () => (
  <div style={{ maxWidth: 540 }}>
    <ColorPalette />
  </div>
);

export const CoreColors = () => (
  <div style={{ maxWidth: 340 }}>
    <ColorPalette colors={RAMBOTS_PALETTE.slice(0, 2)} />
  </div>
);
