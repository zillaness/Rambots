---
category: Foundations
---

# ColorPalette

A swatch board for brand colors — each chip shows the color, its name, and hex
code. Renders the Rambots brand palette by default (Rambot Red, Rambot Yellow,
and supporting neutrals). This is the color reference for the style guide.

```tsx
import { ColorPalette, RAMBOTS_PALETTE } from '@rambots/design-system';

<ColorPalette />
<ColorPalette colors={RAMBOTS_PALETTE.slice(0, 2)} />
```
