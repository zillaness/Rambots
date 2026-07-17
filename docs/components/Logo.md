---
category: Foundations
---

# Logo

The Rambots logo lockup: the gearhead "Robo Ram" mark plus the RAMBOTS wordmark.

- `tone="onLight"` (red/ink) or `tone="onRed"` (Rambot Yellow, for red surfaces).
- `size` sets the mark height in px; the wordmark scales with it.
- Toggle `showMark` / `showWord` to use the mark or wordmark alone.

> The mark is a **placeholder gear** pending the official Robo Ram SVG — drop it
> in `assets/logos/`. Always spell it **Rambots** or **RAMBOTS**.

```tsx
import { Logo } from '@rambots/design-system';

<Logo />
<Logo tone="onRed" size={40} />
```
