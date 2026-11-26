---
file: README.md
version: 1.0
author: Samuel Cao
created: 2026-11-26
last_updated: 2026-11-26
description: What the logo files in assets/logos are and when to use each.
ai_update: Update last_updated and version. Append changelog at bottom.
---

# Rambots logos

The official Robo Ram mark, as SVG (viewBox 1919 x 1967).

| File | What it is | Use it for |
|---|---|---|
| `rambots_logo_simplified_v1.0.svg` | One black path | Engraving, laser cutting, CNC, single-colour print, 3D emboss |
| `rambots_logo_v1.0.svg` | Black with white detail paths | Full-detail print and screen use |

`src/components/Logo.tsx` still draws a placeholder gear; swap in these paths when the component is updated. Spell it **Rambots** or **RAMBOTS**.

## CHANGELOG

- v1.0 (2026-11-26): Initial release with both logo files.
