---
file: README.md
version: 1.0
author: Sam Cao
created: 2026-10-16
last_updated: 2026-10-16
description: Front page of the Rambots (Team 2204) repo: links to the live GitHub Pages and what each main branch holds.
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# Rambots (Team 2204)

## Live pages (GitHub Pages)

| Page | Link |
|---|---|
| Presentations and study materials | https://zillaness.github.io/Rambots/ |
| Ram-a-thon tracker: Sales laptop | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=sales |
| Ram-a-thon tracker: Balloon Battle laptop | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=battle |
| Ram-a-thon tracker: Prize Table laptop | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=prizes |

Each tracker link keeps its own data in that laptop's browser. How to run it: `ramathon-sales-tracker/README.md` on the `presentations` branch.

## Branches

| Branch | What it holds |
|---|---|
| `claude/rambots-design-system-dz4u44` (default) | Rambots design system: brand colors, type, logos and UI components (`src/`, `docs/`) |
| `presentations` | The GitHub Pages site: everything under zillaness.github.io/Rambots |
| `ramathon-carnival` | Ram-a-thon tracker source (`tools/ramathon_sales_tracker/`); changes are copied to `presentations` to go live |

Other branches are working branches for single projects.

## CHANGELOG

- v1.0 (2026-10-16): Initial README with live page links and a branch guide.
