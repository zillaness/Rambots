# Rambots Brand Guidelines

**Team 2204 "The Rambots"** — brand and style guide. These are the rules the
design system encodes; use them for every Rambots asset, document, and interface.

## Names

Approved names, in order of preference:

- **Rambots**
- **2204 Rambots**
- **Team 2204**
- **The Rambots**
- **Team 2204 "The Rambots"**

**Spelling:** always **Rambots** or **RAMBOTS**. Never "RamBots", never "Ram Bots".

## Colors

| Token | Name | Hex | Use |
|---|---|---|---|
| `--rb-red` | **Rambot Red** | `#A31F36` | Primary. Backgrounds and key surfaces. Also our school color. |
| `--rb-yellow` | **Rambot Yellow** | `#F4A81C` | The opposite of Rambot Red. Text, logo, and accents. |

Supporting neutrals (`--rb-ink`, the gray ramp, `--rb-paper`) carry body text,
borders, and surfaces so the two brand colors stay high-impact.

**Contrast:** Rambot Yellow on Rambot Red is a brand pairing reserved for the
logo and large display type — it does not meet contrast minimums for body text.
For readable text on a red surface, use white; for text on yellow, use ink.

## Typography

**Helvetica Neue** is the default typeface for all assets and documents. The
system falls back to `Helvetica, Arial, sans-serif` where Helvetica Neue is not
installed. The type scale runs Display → Heading 1–3 → Body Large → Body →
Caption (see the Type Specimen).

## Logos

- **Robo Ram — "gearhead" logo:** the main logo.
- **Robo Ram — profile picture:** the avatar/mark variant.
- **Graffiti / streetwear wordmark:** the streetwear-style mark (formerly
  nicknamed the "stussy" logo — the trademark reference is removed; call it the
  **graffiti** or **streetwear** logo).

Official source files live in `assets/logos/`. Until the official Robo Ram
vector is in place, the `Logo` component renders a placeholder gear mark with the
final wordmark styling.

## Voice

Confident, team-spirited, engineering-proud. Lead with the red, punctuate with
the yellow.
