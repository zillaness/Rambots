---
category: Data Display
---

# Badge

A small pill for statuses, categories, and counts. Uppercase by default.

- Tones: `red`, `yellow` (brand), `neutral` (default), `success`, `outline`.
- Prefer `neutral` for metadata; reserve `red`/`yellow` for brand emphasis.
- Add `dot` for a leading status dot.

```tsx
import { Badge } from '@rambots/design-system';

<Badge tone="red">Rookie All-Star</Badge>
<Badge tone="neutral" dot>Qualifying</Badge>
```
