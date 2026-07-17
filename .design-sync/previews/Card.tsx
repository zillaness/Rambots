import * as React from 'react';
import { Card, Button } from '@rambots/design-system';

export const Default = () => (
  <div style={{ maxWidth: 360 }}>
    <Card
      eyebrow="Season 2024"
      title="Regional Champions"
      description="Team 2204 took the blue banner at the district event with a 10–2 record."
      footer={<Button size="sm">Read recap</Button>}
    />
  </div>
);

export const Feature = () => (
  <div style={{ maxWidth: 360 }}>
    <Card
      variant="feature"
      accent="none"
      eyebrow="Sponsor us"
      title="Power the Rambots"
      description="Your support funds parts, travel, and outreach for Team 2204."
      footer={<Button variant="secondary" size="sm">Become a sponsor</Button>}
    />
  </div>
);
