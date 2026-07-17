---
category: Surfaces
---

# Card

A content container with an optional brand accent bar, eyebrow, title,
description, and footer.

- `variant="default"` is a white surface with a red accent bar.
- `variant="feature"` is a Rambot Red hero surface; the eyebrow renders in
  Rambot Yellow.
- `accent`: `red` (default), `yellow`, or `none`.

```tsx
import { Card, Button } from '@rambots/design-system';

<Card
  eyebrow="Season 2024"
  title="Regional Champions"
  description="Team 2204 took the blue banner at the district event."
  footer={<Button size="sm">Read recap</Button>}
/>
```
