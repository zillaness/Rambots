# Rambots Design System — conventions

Team 2204 "The Rambots" brand components. Spell the name **Rambots** or
**RAMBOTS** only — never "RamBots" or "Ram Bots".

## Setup — no provider, one stylesheet

There is **no React provider or theme wrapper**. Components are styled entirely
by plain CSS: `styles.css` defines the brand tokens on `:root` and every
component class. As long as `styles.css` is in the page's import closure
(it is, for anything built with this DS), components render on-brand. Import
components and use them directly:

```tsx
import { Button, Card, Badge } from '@rambots/design-system';

<Card
  eyebrow="Season 2024"
  title="Regional Champions"
  description="Team 2204 took the blue banner."
  footer={<Button variant="primary">Read recap</Button>}
/>
```

## Styling idiom — props first, tokens for glue

**Do not add CSS classes to these components** — each owns its `rb-*` classes and
is configured through **props** (`variant`, `size`, `tone`, `accent`, …). Style
your own surrounding layout with the brand **CSS custom properties** (all live in
`styles.css`), never hard-coded hex:

| Group | Tokens (examples) |
|---|---|
| Brand color | `--rb-red` (#A31F36), `--rb-yellow` (#F4A81C), `--rb-primary`, `--rb-accent` |
| On-color text | `--rb-on-primary` (white, for text on red), `--rb-on-accent` (ink, for text on yellow) |
| Text / surface | `--rb-text`, `--rb-text-muted`, `--rb-bg`, `--rb-surface`, `--rb-border` |
| Semantic | `--rb-success`, `--rb-warning`, `--rb-danger`, `--rb-info` |
| Type | `--rb-font-sans` (Helvetica Neue stack), `--rb-text-display`…`--rb-text-caption`, `--rb-weight-regular/medium/bold` |
| Space / radius | `--rb-space-1`…`--rb-space-8`, `--rb-radius-sm/md/lg/pill` |

**Contrast rule:** Rambot Yellow on Rambot Red is reserved for the logo and large
display type — it fails contrast for body text. On a red surface use white text
(`--rb-on-primary`); on yellow use ink (`--rb-on-accent`).

## Where the truth lives

- `styles.css` (+ its `@import`s and `tokens/`) — the authoritative token and
  class definitions. Read it before styling anything custom.
- Each component's `<Name>.prompt.md` and `<Name>.d.ts` — the props contract and
  usage examples.

## Components

Actions: **Button**. Data display: **Badge**. Surfaces: **Card**. Forms:
**Input**. Feedback: **Alert**. Navigation: **NavBar**. Foundations: **Logo**,
**ColorPalette**, **TypeSpecimen** (the color and type reference boards).

> The **Logo** mark is a placeholder gear pending the official Robo Ram vector
> (the "gearhead" logo). Its wordmark styling is final. Prefer `tone="onRed"` on
> red surfaces (yellow lockup) and `tone="onLight"` elsewhere.
