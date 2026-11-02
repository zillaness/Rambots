---
file: README.md
version: 0.3
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-11-02
description: How to use, build, and test the laser prep app (v0.3: Phase 1 prep plus Phase 2 design features), and what it does not do yet.
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# Laser Prep app (v0.3)

Replaces CorelDraw for the Universal laser: open Fusion or Onshape DXFs (or SVGs), add shapes, text, images, test patterns, and boxes, lay everything out on the bed, set what gets cut, scored, and engraved, and save a laser-ready PDF. One HTML file, works offline, nothing is uploaded.

**Open:** download `laser_prep_v0.3.html` and open it in Chrome or Edge. (GitHub's normal file view shows source code; use the download button.)

## Using it

**Add** (left panel, top)
- **File:** drop a `.dxf` or `.svg`. Every file needs a units confirm; the list shows the part's size for each unit and whether it fits the bed. Colors already in the file (red, blue, black, the CUT / SCORE / ENGRAVE layers that CutSheetCalculator writes) are used; a plain CAD export starts with every closed outline set to cut.
- **Shape:** rectangle (rounded corners), circle, ellipse or oval, slot, polygon, star. Edit sizes in the Selected panel.
- **Text:** Label Sans, Allerta Stencil, Hershey Simplex (single line, for fast score or vector engrave), or any font on the PC ("Use fonts on this PC", Chrome and Edge only, asks permission). Cap height, letter and line spacing, alignment, filled or outline. Follow a straight line, an arc (top or bottom), or the outline you clicked last.
- **Image:** PNG or JPG, engraved as grayscale (the driver dithers) or dithered in the app. "Add cut outline" traces the image's shape and grows it by an offset, for keychains and stickers; the outline stays grouped with the image.
- **Test pattern:** 4 in test square, kerf comb, press-fit comb (thickness set below the menu), color grid with all eight ULS colors (orange's value is unverified).
- **Box:** width, depth, height, thickness, finger width, inside or outside sizes, open top. Makes finger-jointed panels.

**Selected**: position, rotation, size; units and resize for files (resizing a CAD part needs a tick-box warning because holes and fits scale too); shape, text, and image settings; Duplicate, Delete, Group, Ungroup.

**Colors**: click a line for its outline or inside a shape for its inside, Shift-click to add. Cut (R), Score (B), Engrave (K), None (N), or another ULS color. Insides can be engraved, not cut.

**Layout**: copies in a grid; repeat with a list (one line per copy, `{}` in a text is replaced, `1-20` expands); Arrange with the rectangle packer, the true-outline nester (both ported from CutSheetCalculator), or Pack tighter (SVGnest, searches for the time you set); align and space evenly. Groups (an image and its outline, each repeat version, multi-object copies, anything grouped with the button) always move together.

**Tabs and joints**: holding tabs (count and width) on selected cut outlines; click a straight edge, then Fingers on edge (use the opposite "start with" on the mating edge) or Tabs on edge + matching slots (the slot strip goes onto the mating part).

**Output**: kerf compensation (cut outlines grow by half the kerf on parts and shrink on holes), line width, then Save PDF (for UCP import or Adobe Reader at Actual size), Print, Save DXF (vectors only), or Save SVG.

Output stays locked until every file's units are confirmed, nothing is off the bed or inside the margin, and something is set to cut, score, or engrave. The Checks list says why.

Keys: R B K N colors, A all outlines, Esc clear, Delete removes, arrows nudge (Shift for 4x), Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+D duplicate.

## What it is built from

| File | What it does |
|---|---|
| `src/geom.js`, `src/dxf_in.js`, `src/svg_in.js` | Reading files: segments, units, joining, nesting of holes, file colors |
| `src/clip.js` | Offsets and booleans (vendored Clipper) |
| `src/doc.js` | Objects on the bed, transforms, copies, align, groups, undo |
| `src/shapes.js`, `src/fonts.js`, `src/images.js`, `src/patterns.js`, `src/joints.js` | Phase 2 features |
| `src/nest.js` | Arrange: MaxRects and greedy true-outline nester (ported from CutSheetCalculator), SVGnest adapter |
| `src/writers.js` | PDF (byte by byte, DeviceRGB, `0.072 w`, no-scaling preference, image XObjects), SVG, R12 DXF |
| `src/ui.js`, `src/page.html` | The page |
| `src/vendor/` | Clipper 6.1.3a (Boost), SVGnest geometry, placement, and genetic search (MIT), opentype.js 1.3.4 (MIT), fonts (OFL, public domain), with license files |
| `build.js`, `build_order.json` | Inline everything into `laser_prep_v0.3.html` |
| `tools/make_fonts_data_v1.0.py` | Regenerates `src/fonts_data.js` from the font files |

Source modules keep fixed names because the build and tests load them by name; each carries its version in its header.

## Build and test

```bash
node build.js
```

```bash
node test/phase2_unit.js
```

```bash
node test/run_fixtures.js
```

```bash
node test/write_outputs.js /tmp/laser_out && python3 test/validate_outputs.py /tmp/laser_out
```

```bash
node test/write_doc_outputs.js /tmp/laser_doc && python3 test/validate_doc_outputs.py /tmp/laser_doc
```

```bash
node test/ui_smoke.js /tmp/laser_ui
```

The Python checks need pypdf, Pillow, ezdxf, and Poppler's `pdftoppm`; the browser test needs Playwright with Chromium. This folder is CommonJS (`package.json`) because the repo root is an ES module package.

Results at v0.3: unit 81/81, fixtures 33/33, Phase 1 outputs 33/33, the everything document valid (strict PDF, only laser colors and image grays, DXF audit), browser 29/29.

## Not done or not known yet

- **Never run on the laser.** The test card visit (`../test_card/README.md`) decides whether UCP imports the PDF or the print route is used.
- **No real CAD exports tested yet**; all inputs so far are synthetic.
- Fonts on the PC: only Chrome and Edge, after a permission prompt; some font files (collections) may not load.
- Label Sans and Hershey cover letters, digits, and `#-./:?_`; other characters are reported as missing.
- Arrange's leftovers sit to the right of the bed and lock output until moved or deleted.
- Changing a file's units or join tolerance re-reads it and resets its colors; editing a text resets its colors to its style.
- Overlap checking inside a file is skipped above 4000 straight lines.

## CHANGELOG

- v0.1 (2026-10-30): First prototype and README.
- v0.2 (2026-10-30): PDF asks viewers not to scale; DXF header extents and limits; tests point at test card v1.2 files.
- v0.3 (2026-11-02): Phase 2: shapes, text, images, patterns, boxes, layout and arrange, groups, tabs and joints, kerf, file colors, resize with a warning, undo; vendored libraries and fonts; new tests.
