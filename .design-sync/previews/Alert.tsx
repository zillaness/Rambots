import * as React from 'react';
import { Alert } from '@rambots/design-system';

export const Tones = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 440 }}>
    <Alert tone="info" title="Meeting moved">Tonight's build meeting is in Room 118.</Alert>
    <Alert tone="success" title="Robot passed inspection">You're cleared for your first qualifying match.</Alert>
    <Alert tone="warning" title="Battery low">Swap to a charged battery before the next match.</Alert>
    <Alert tone="error" title="Upload failed">Your reveal video didn't upload — try again.</Alert>
  </div>
);
