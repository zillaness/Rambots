---
file: README.md
version: 1.2
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: How to run the laser test card at the laser PC (PRD Step 0 and Step 1 in one visit) and what to record.
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# Laser test card

One visit to the laser PC answers the two questions that decide the laser prep app's design:

1. Can a saved file be **imported straight into UCP** with its colors intact? (Step 0)
2. If not, can a file be **printed** to the ULS driver from Adobe Reader or Chrome without breaking lines, colors, or scale? (Step 1)

Background (not needed at the laser PC): `../research/uls_direct_import_research_v1.0.md` (Step 0) and `../research/print_path_research_v1.0.md` (Step 1).

## Files

| File | What it is |
|---|---|
| `laser_test_card_v1.2.html` | Open in Chrome or Edge. Works offline. Saves the PDF (and an optional SVG), and runs the Chrome print test. |
| `laser_test_card_plain_v1.0.dxf` | The simplest possible color test: a red 4.000 in square and a blue 2.000 in line. R2000, inches, nothing else. |
| `laser_test_card_colored_v1.1.dxf` | Colors already set: color 1 red (cut), 5 blue (score), 7 black (engrave). Inches, R2000, closed loops, plus filled shapes (HATCH) and a TEXT label. |
| `laser_test_card_colored_r12_v1.1.dxf` | The cut square and score line again, in the oldest common DXF version (R12). R12 cannot store units: if UCP reads it as inches the square is 4.000 in. |
| `laser_test_card_raw_mm_v1.1.dxf` | Built like a plain Fusion or Onshape sketch export: millimeters, layer 0, no color, loose lines, no fills. |
| `laser_test_card_curves_v1.1.dxf` | Every curve type CAD exports use, all red: circle, bulge-cornered rectangle, slot from loose lines and arcs, ellipse, spline, block copies. |
| `laser_test_card_color_codes_v1.1.dxf` | Nine lines of different lengths, one per way a DXF can say red, blue, or black (R2004). |
| `make_test_card_dxf_v1.1.py`, `make_test_card_extra_dxf_v1.2.py` | Rebuild the DXFs (`pip install ezdxf`). Geometry must match the HTML file. |

We add no comment lines to the DXFs (one could trip an importer and spoil the test), so their version is in the filename only. ezdxf writes its standard creator tag, and the header extents and limits are set to the real drawing size.

The PDF is written byte by byte by the HTML page: colors are plain RGB (`1 0 0` red) with no color profile, lines are 0.072 pt (0.001 in), the page is exactly the bed size, and it asks viewers not to scale it when printing.

## Get the files onto the laser PC

Download the files above from GitHub (branch `claude/elegant-feynman-q7xk18`, folder `tools/laser_prep/test_card/`) or bring them on a USB stick. Use GitHub's download button for the HTML file. Its normal file view shows source code, not the page.

## Before cutting anything

Write these down (PRD open questions 1 to 6 and 9, plus what the research says to check):

| Question | Answer |
|---|---|
| ULS model (VLS, PLS, ILS) and the printer name in Windows | |
| Is there a UCP window or tray icon? (If printing only opens a Windows Properties dialog, it is the older driver, and import is unlikely.) | |
| UCP version | |
| UCP **System** tab: is there a **Direct Import Package** box? Is it on? | |
| Bed size set in the ULS driver | |
| Resolution (DPI) choices in the ULS driver, and the current setting | |
| CorelDraw version | |
| Can it run an unsigned .exe? Internet? | |
| UCP color table (Settings > Manual Control or the Materials tab): what do red, blue, black do? Screenshot it. | |
| Adobe Reader or Acrobat installed? | |

Direct import was a paid add-on in at least one ULS manual, with a 30-day trial. **Ask a mentor before turning on any trial or license** on school equipment.

Then open `laser_test_card_v1.2.html`, set **Bed size** to the driver's size, and click **Save PDF**. Use scrap at least 7.5 x 5 in of a material whose settings you know.

Cut each route on its **own fresh piece of scrap**, labeled with the route name. Check every job in the UCP preview before firing. Only cut the ones that look right. **Screenshot every import dialog**, including any scale, units, or centering options.

## Step 0: import into UCP

Import is often a folder icon or an **Import** button near the top of UCP. ULS says **DXF import is vectors only**. Black fills in a DXF are not expected to engrave; that is normal. Check raster engraving on the PDF only.

| File | Imports? | Size right? | Red = cut? | Blue = score? | Black = raster? | Hole left bare? | Notes |
|---|---|---|---|---|---|---|---|
| Saved PDF | | | | | | | |
| `plain` DXF (do this one first) | | | | | n/a | n/a | |
| `colored` DXF | | | | | n/a | n/a | |
| `colored_r12` DXF | | | | | n/a | n/a | |
| `raw_mm` DXF | | | n/a (no color) | n/a (no color) | n/a | n/a | |

In Notes, write any error message word for word and which shapes went missing. If the PDF complains about fonts or the "TEST v1" label is missing, judge the shapes on their own; the label uses a font that is not embedded.

For the raw DXF also note:

- Did UCP ask for units or scale? Did it read millimeters (4.000 in square) or not (101.6 in square)?
- **Recolor test:** click, right-click, or select one imported line and look for any way to change its color or process. Yes or no?
- Color 7 is "black or white" in DXF. In the colored DXF, did the black shapes come in as black, white, or not at all?

### Curves probe

| Shape (all red) | Size | Shows up? | Smooth and right size? |
|---|---|---|---|
| Circle | 1.000 in diameter | | |
| Rounded rectangle (bulge corners) | 2.000 x 1.000 in | | |
| Slot (separate lines and arcs) | 2.000 x 0.500 in | | |
| Ellipse | 2.000 x 1.000 in | | |
| Wave (spline) closed by a line | 2.000 in wide | | |
| Three holes (block copies) | 0.250, 0.250, 0.500 in | | |

Anything missing or wrong here, the app must convert to plain lines and arcs before saving a DXF.

### Color-code probe

Nine lines, longest at the top. Use the length to tell them apart (UCP may show the drawing flipped). Write the color or process UCP gives each one.

| # | Length | How the line says its color | Intended | UCP shows |
|---|---|---|---|---|
| 1 | 2.0 in | Color index 1 on the line | red | |
| 2 | 1.8 in | Color index 5 on the line | blue | |
| 3 | 1.6 in | Color index 7 on the line | black | |
| 4 | 1.4 in | Layer color 1, line set to "by layer" | red | |
| 5 | 1.2 in | Layer color 5, line set to "by layer" | blue | |
| 6 | 1.0 in | 24-bit color FF0000 only | red | |
| 7 | 0.8 in | 24-bit color 0000FF only | blue | |
| 8 | 0.6 in | 24-bit color 000000 only | black | |
| 9 | 0.4 in | Index 1 (red) and 24-bit 0000FF (blue) together | either | |

Rows 4 and 5 show whether layer colors count (CAD exports often color by layer). Rows 6 to 8 show whether 24-bit color is read. Row 9 shows which one wins when they disagree. If the file won't open at all, note that; it is a newer DXF version (R2004) than the others.

## Step 1: print to the ULS driver

Run these even if Step 0 passed. They tell us the fallback.

Run them in this order. Write down the driver's resolution (DPI) on every run: Chrome's print engine never draws a line thinner than one printer pixel, so the resolution decides how thin a "hairline" really is.

1. **Adobe Reader** (if installed): open the saved PDF, Print, choose the ULS printer. Paper size: the bed size. Page Sizing: **Actual size**, checked every time, because Reader remembers the last choice and the previous user may have left it on Fit. **Choose paper source by PDF page size** on. **Print in grayscale** off. **Print as image** off. Set orientation by hand if the preview is rotated. Preview shows the art in the top-left corner.
2. **Saved PDF in Chrome or Edge**: open the saved PDF in the browser's own viewer and print it. Paper size: the bed size. Margins: **None**. Scale: **Actual size** or 100, not Fit. Leave **Print as image** off if the box appears.
3. **Chrome or Edge page print**: in the HTML page click **Print (Chrome test)**. Destination: the ULS printer. Paper size: the bed size. Margins: **None**. Scale: **Default**. Headers and footers: off. Color, not black and white.

| Route | DPI | Job reaches UCP? | Red = vector cut? | Blue = vector score? | Black = raster? | Size right? | Notes |
|---|---|---|---|---|---|---|---|
| Reader | | | | | | | |
| PDF in browser viewer | | | | | | | |
| Chrome page print | | | | | | | |

If you change **Line width** on the page, click **Save PDF** again before printing; the width is in the file name (for example `_3mil_`).

If lines raster instead of vector, work down this list and note what changed the result:

1. Set the driver to its highest resolution and reprint.
2. Reader: Edit > Preferences > Page Display, turn off **Enhance thin lines**, reprint.
3. **Line width** 0.003 in, then **0 (PDF hairline only)**, then 0.0005 in. On the Chrome routes, 0.0005 in probably prints the same as 0.001 in, because of the one-pixel minimum.
4. In the ULS driver, check the job is not set to raster only and the color table is on.

If the ULS power and speed window can only be opened from the Windows print dialog, write that down. It changes the design.

## Measure the cut

Kerf makes the dropped-out piece small and the hole in the sheet big by the same amount, so the average of the two cancels it.

One row per route that was cut, each from its own piece of scrap.

| Route | Piece X | Hole X | Size X | Piece Y | Hole Y | Size Y | Kerf |
|---|---|---|---|---|---|---|---|
| PDF import | | | | | | | |
| DXF import | | | | | | | |
| Reader | | | | | | | |
| PDF in browser viewer | | | | | | | |
| Chrome page print | | | | | | | |

Size = (piece + hole) / 2. Kerf = (hole - piece) / 2.

**Pass:** size is 4.000 ± 0.010 in on both axes. A browser "fit to page" error shows up as 0.04 in or more.

Position (PDF and print routes only; DXF placement depends on how UCP places imports): with the sheet against the top-left stops, the hole's top and left edges should sit about 0.25 in from the sheet edges.

## Bring back real CAD exports too

If there is time, export one real team part each way and keep the files: Fusion sketch (right-click, Export DXF), Fusion flat pattern, Onshape sketch or face export. The research found no real samples, and these are the best test data the app could get.

## Send back

The filled tables, the screenshots (import dialogs, color table), a photo of the cut card, and any real exports.

## What the results decide

| Result | Build |
|---|---|
| Raw DXF imports and colors can be assigned in UCP quickly | No app, or a one-page how-to (research found no sign UCP can recolor, so this is unlikely) |
| Saved PDF imports correctly | HTML app that fixes colors and saves a PDF for UCP import (Option E1) |
| Only a DXF imports correctly | Same app, saving DXF in whichever version and color form the probes show works; no raster fills |
| Import fails, Reader print passes | HTML app that saves a PDF; Reader prints it (Option E2) |
| Only Chrome print passes | HTML app that prints from the browser (Option A) |
| Nothing passes | Native Windows program (Option C) |

## CHANGELOG

- v1.0 (2026-10-30): Initial release. Visit checklist, record tables, measurement method, and decision table for the laser test card.
- v1.1 (2026-10-30): Added from the ULS import research: Direct Import Package check, older-driver check, mentor OK before trials, DXF vectors-only note, recolor test, screenshot step. Added the R12, curves, and color-code probes with their tables, a request for real CAD exports, and a DXF-only row in the decision table. From the print path research: Step 1 order (Reader, PDF in browser viewer, page print), DPI recorded per run, Reader traps, and a failure ladder. HTML renamed to v1.1.
- v1.2 (2026-10-30): From the independent review: plain DXF added and done first; DXFs v1.1 with real header extents; R12 expected size noted; color-code lines told apart by length; every print route lists paper size and scale; PDF asks viewers not to scale; re-save after changing line width; error text and missing shapes recorded; raw DXF color columns marked n/a; one measurement row per route on fresh scrap; position check limited to PDF and print routes. HTML now v1.2.
