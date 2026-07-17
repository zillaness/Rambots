---
category: Actions
---

# Button

The primary Rambots action control.

- Use `variant="primary"` (Rambot Red) for the main action on a view — at most
  one per group.
- Use `variant="secondary"` (Rambot Yellow) for a prominent alternative.
- Use `outline` / `ghost` for lower-emphasis actions.
- Sizes: `sm`, `md` (default), `lg`. Add `block` to fill the container width.

```tsx
import { Button } from '@rambots/design-system';

<Button variant="primary" size="md">Join the team</Button>
<Button variant="secondary">Learn more</Button>
<Button variant="outline">Cancel</Button>
```
