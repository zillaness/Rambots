---
file: README.md
version: 1.2
author: Sam Cao
created: 2026-10-14
last_updated: 2026-10-14
description: How the presentations GitHub Pages site on this branch is organized and rebuilt.
ai_update: Update last_updated and version. Append changelog at bottom.
---

# Presentations & Study Materials

Static GitHub Pages site for slide decks, study sheets, games, and handouts.
This branch (`presentations`) holds only the site; it shares no history with the
design-system branches.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Landing page (generated) |
| `<slug>/index.html` | Viewer page for a deck or document (generated), or a hand-made HTML study sheet / game (copied in as-is) |
| `<slug>/slides/`, `<slug>/thumbs/` | Rendered slide or page images (generated) |
| `<slug>/overlays/` | Animated GIFs laid over their slide so they keep moving (generated) |
| `files/` | Downloadable originals and PDFs, named `name_vMAJOR.MINOR.ext` |
| `assets/` | Shared CSS/JS and index thumbnails |
| `tools/site.json` | The list of everything on the site: title, topic, type, description |
| `tools/build_site.py` | Builds everything from `site.json` |

## Adding or updating an item

1. Deck or Word doc: put it in `files/` as `name_v1.0.pptx` (or `.docx`), add an
   entry to `tools/site.json` with `kind` `slides` or `document`.
2. HTML study sheet or game: put it at `<slug>/index.html` (plus any images it
   needs next to it), add an entry with `kind` `html`.
3. External page: add an entry with `kind` `link` and a `url`.
4. Run `python3 tools/build_site.py` (needs LibreOffice, poppler-utils, Pillow,
   and Node + Playwright for HTML thumbnails). Use `--force` to re-render everything.

When a file changes, bump its version in the filename and in `site.json`.

## Downloads and locked items

Download buttons stay hidden until someone enters the Konami code
(Up Up Down Down Left Right Left Right B A; on phones, swipe the arrows, then tap
twice on the page header or a blank spot, not on a card or button). Items with `"gated": true` in `site.json` are also left
off the landing page until the code is entered, and their viewer pages are
marked `noindex`. This only hides things. Every file is still public in this
branch and at its direct URL.

## CHANGELOG

- v1.0 (2026-10-14): Initial release.
- v1.1 (2026-10-14): Documented locked items (`"gated": true`).
- v1.2 (2026-10-14): Clarified where the closing taps of the touch code can go.
