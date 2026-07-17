import * as React from 'react';
import { Logo } from '@rambots/design-system';

export const OnLight = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 8 }}>
    <Logo size={44} />
    <Logo size={28} showMark={false} />
  </div>
);

export const OnRed = () => (
  <div style={{ background: '#a31f36', padding: 24, borderRadius: 12, display: 'inline-block' }}>
    <Logo tone="onRed" size={44} />
  </div>
);
