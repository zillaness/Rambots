import * as React from 'react';
import { Badge } from '@rambots/design-system';

export const Tones = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Badge tone="red">Champion</Badge>
    <Badge tone="yellow">Finalist</Badge>
    <Badge tone="neutral">Qualifying</Badge>
    <Badge tone="success">Passed</Badge>
    <Badge tone="outline">Rookie</Badge>
  </div>
);

export const WithDot = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <Badge tone="success" dot>Online</Badge>
    <Badge tone="neutral" dot>Idle</Badge>
    <Badge tone="red" dot>Live</Badge>
  </div>
);
