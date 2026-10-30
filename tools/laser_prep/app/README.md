---
file: README.md
version: 0.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: How to use, build, and test the laser prep app prototype, and what it does not do yet.
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# Laser Prep app (prototype v0.1)

Replaces the CorelDraw step: open a Fusion or Onshape DXF (or an SVG), set what gets cut, scored, and engraved, and save a laser-ready PDF. One HTML file, works offline, nothing is uploaded.

**Open:** download `laser_prep_v0.1.html` and open it in Chrome or Edge. (GitHub's normal file view shows source code; use the download button.)

## Using it

1. **File.** Drop a `.dxf` or `.svg` on the box, or click it.
2. **Units.** Every file needs a confirm. The list shows the part's size for each unit choice and whether it fits the bed. CAD exports often have the wrong unit in the file (Fusion's File > Export writes centimeters; Onshape has been reported to write inches over millimeter numbers), so check the size against the part.
3. **Bed and lines.** Pick the bed size the ULS driver uses. Line width defaults to 0.001 in. "Join gaps up to" closes tiny gaps between line ends (0.001 in default, 0.01 in max).
4. **Colors.** Every closed shape starts as **cut** (red). Click a line to select its outline, click inside a shape to select its inside, Shift-click to add. Then press **Cut** (R), **Score** (B), **Engrave** (K), or **None** (N). Insides can only be engraved or none. Holes inside an engraved shape stay bare.
5. **Output.** **Save PDF** for UCP import or for printing from Adobe Reader at Actual size. **Save DXF** writes R12 vectors only (black insides are left out). **Print** prints from the browser at true size (Margins None, Scale Default). **Save SVG** writes the same drawing as an SVG.

The **Checks** list flags open lines set to cut, shapes that almost close (with a button to join them), spots where three lines meet, overlapping lines, removed duplicates, skipped items (text, dimensions, hatches), and hidden bend lines from sheet metal flat patterns.

Output stays locked until units are confirmed, the part fits the bed with a 0.25 in margin, and something is assigned.

## What it is built from

| File | What it does |
|---|---|
| `src/geom.js` | Segments, units suggestions, duplicates, overlaps, joining, nesting, `analyze()` |
| `src/dxf_in.js` | DXF reader: header units, blocks, LINE, CIRCLE, ARC, LWPOLYLINE and POLYLINE with bulges, SPLINE (any degree, fit-point fallback), ELLIPSE, INSERT and MINSERT, extrusion, skip counts |
| `src/svg_in.js` | SVG reader: all path commands, rect, circle, ellipse, line, polyline, polygon, transforms, viewBox and units |
| `src/writers.js` | Layout from the bed's top-left; PDF (byte by byte, DeviceRGB, `0.072 w`, even-odd fills), SVG, R12 DXF |
| `src/ui.js`, `src/page.html` | The page |
| `build.js` | Inlines `src/` into `laser_prep_v0.1.html` |

Design: `../laser_prep_core_design_v1.1.md`. The source modules keep fixed names because the build and tests load them by name; each carries its version in its header.

## Build and test

```bash
node build.js
```

```bash
node test/run_fixtures.js
```

```bash
node test/write_outputs.js /tmp/laser_out
```

```bash
python3 test/validate_outputs.py /tmp/laser_out
```

```bash
node test/ui_smoke.js /tmp/laser_ui
```

`validate_outputs.py` needs pypdf, Pillow, ezdxf, and `pdftoppm` (Poppler). `ui_smoke.js` needs Playwright with Chromium. This folder is CommonJS (`package.json`) because the repo root is an ES module package.

Results at v0.1: fixtures 33/33, written outputs 33/33 valid (strict PDF parse, only the four laser colors in a render, drawn size and position, DXF audit and size), browser checks 17/17.

## Not done or not known yet

- **Never run on the laser.** Whether UCP imports the PDF, and whether Reader or Chrome prints it as vectors, is what the test card visit (`../test_card/README.md`) finds out. If the visit says DXF import only, or a specific DXF color form, `writers.js` changes; if it says print only, the Print button becomes the main path.
- **No real CAD exports tested.** All inputs so far are synthetic fixtures. Real Fusion and Onshape exports of team parts are the next test.
- Changing units or the join tolerance re-reads the file and resets colors.
- TEXT and MTEXT are skipped; export text from CAD as outlines.
- Overlap checking is skipped above 4000 straight lines (it is pairwise).
- SVG fill and stroke colors are ignored; colors are set in the app.
- No "remember my colors" between files, no nesting of parts, no geometry editing (by design).

## CHANGELOG

- v0.1 (2026-10-30): First prototype and README.
