---
category: Navigation
---

# NavBar

The Rambots top navigation bar on a Rambot Red background: logo at left, links
in the middle/right, optional actions. Active and hovered links render in Rambot
Yellow.

- `brand` defaults to the Rambots logo (yellow-on-red).
- `items` is an array of `{ label, href, active }`.
- `actions` holds right-aligned content such as a CTA `Button`.

```tsx
import { NavBar, Button } from '@rambots/design-system';

<NavBar
  items={[
    { label: 'Team', href: '#', active: true },
    { label: 'Robots', href: '#' },
    { label: 'Sponsors', href: '#' },
  ]}
  actions={<Button variant="secondary" size="sm">Donate</Button>}
/>
```
