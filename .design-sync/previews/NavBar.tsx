import * as React from 'react';
import { NavBar, Button } from '@rambots/design-system';

export const Default = () => (
  <NavBar
    items={[
      { label: 'Team', href: '#', active: true },
      { label: 'Robots', href: '#' },
      { label: 'Sponsors', href: '#' },
      { label: 'Outreach', href: '#' },
    ]}
    actions={<Button variant="secondary" size="sm">Donate</Button>}
  />
);
