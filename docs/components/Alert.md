---
category: Feedback
---

# Alert

An inline message banner with a colored left accent, keyed to a semantic tone.

- Tones: `info` (default), `success`, `warning`, `error`.
- Pass `title` for the bold headline and children for the body copy.
- Override the leading glyph with `icon`.

```tsx
import { Alert } from '@rambots/design-system';

<Alert tone="success" title="Robot passed inspection">
  You're cleared for your first qualifying match.
</Alert>
```
