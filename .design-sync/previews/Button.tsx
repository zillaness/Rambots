import * as React from 'react';
import { Button } from '@rambots/design-system';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button variant="primary">Join the team</Button>
    <Button variant="secondary">Learn more</Button>
    <Button variant="outline">Cancel</Button>
    <Button variant="ghost">Skip</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const Disabled = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button variant="primary" disabled>Primary</Button>
    <Button variant="outline" disabled>Outline</Button>
  </div>
);
