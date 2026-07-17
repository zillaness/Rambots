import * as React from 'react';
import { Input } from '@rambots/design-system';

export const Default = () => (
  <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
    <Input label="Team email" type="email" placeholder="you@rambots.org" required />
    <Input label="Full name" placeholder="Ada Lovelace" />
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 320 }}>
    <Input label="Team number" defaultValue="22o4" error="Team number must be digits only" />
  </div>
);

export const HelpAndDisabled = () => (
  <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
    <Input label="Subteam" placeholder="Build, Programming, Business…" help="Pick the group you spend the most time with." />
    <Input label="Team name" defaultValue="Team 2204" disabled />
  </div>
);
