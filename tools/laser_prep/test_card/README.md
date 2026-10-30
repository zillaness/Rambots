---
file: README.md
version: 1.0
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

## Files

| File | What it is |
|---|---|
| `laser_test_card_v1.0.html` | Open in Chrome or Edge. Works offline. Saves the PDF and SVG, and runs the Chrome print test. |
| `laser_test_card_colored_v1.0.dxf` | Colors already set: color 1 red (cut), 5 blue (score), 7 black (engrave). Inches, closed loops, filled shapes. |
| `laser_test_card_raw_mm_v1.0.dxf` | Built like a Fusion or Onshape export: millimeters, layer 0, no color, loose lines, no fills. |
| `make_test_card_dxf_v1.0.py` | Rebuilds the two DXFs (`pip install ezdxf`). Geometry must match the HTML file. |

The DXFs have no metadata block inside them. A DXF comment line could trip an importer and spoil the test, so their version is in the filename only.

The PDF is written byte by byte by the HTML page: colors are plain RGB (`1 0 0` red) with no color profile, lines are 0.072 pt (0.001 in), and the page is exactly the bed size.

## Get the files onto the laser PC

Download the four files above from GitHub (branch `claude/elegant-feynman-q7xk18`, folder `tools/laser_prep/test_card/`) or bring them on a USB stick. Use GitHub's download button for the HTML file. Its normal file view shows source code, not the page.

## Before cutting anything

Write these down (they are PRD open questions 1 to 6 and 9):

| Question | Answer |
|---|---|
| ULS model (VLS, PLS, ILS) | |
| UCP version | |
| Bed size set in the ULS driver | |
| CorelDraw version | |
| Can it run an unsigned .exe? Internet? | |
| UCP color table: what do red, blue, black do? | |
| Adobe Reader or Acrobat installed? | |

Then open `laser_test_card_v1.0.html`, set **Bed size** to the driver's size, and click **Save PDF**. Use scrap at least 7.5 x 5 in of a material whose settings you know.

Check every job in the UCP preview before firing. Only cut the ones that look right.

## Step 0: import into UCP

Look for Import or Open in UCP. Import each file and fill in a row.

| File | Imports? | Size on screen right? | Red = cut? | Blue = score? | Black = raster? | Hole left bare? | Notes |
|---|---|---|---|---|---|---|---|
| Saved PDF | | | | | | | |
| `colored` DXF | | | | | | | |
| `raw_mm` DXF | | | | | | | |

For the raw DXF also note:

- Did UCP read it as millimeters (4.000 in square) or as inches (101.6 in square)?
- Can you assign red, blue, and black to its lines inside UCP? How long did it take?
- Color 7 is "black or white" in DXF. Did the black shapes in the colored DXF come in as black or as white?

## Step 1: print to the ULS driver

Run these even if Step 0 passed. They tell us the fallback.

**Adobe Reader** (if installed): open the saved PDF, Print, choose the ULS printer. Page Sizing: **Actual size**. **Print in grayscale** off. Preview shows the art in the top-left corner.

**Chrome or Edge**: in the HTML page click **Print (Chrome test)**. Destination: the ULS printer. Paper size: the bed size. Margins: **None**. Scale: **Default**. Headers and footers: off.

| Route | Job reaches UCP? | Red = vector cut? | Blue = vector score? | Black = raster? | Size right? | Notes |
|---|---|---|---|---|---|---|
| Reader | | | | | | |
| Chrome | | | | | | |

If lines raster instead of vector, try again with **Line width** set to 0.0005 in, then 0.003 in, and note which one works.

If the ULS power and speed window can only be opened from the Windows print dialog, write that down. It changes the design.

## Measure the cut

Kerf makes the dropped-out piece small and the hole in the sheet big by the same amount, so the average of the two cancels it.

| | Piece | Hole | Size = (piece + hole) / 2 | Kerf = (hole - piece) / 2 |
|---|---|---|---|---|
| X | | | | |
| Y | | | | |

**Pass:** size is 4.000 ± 0.010 in on both axes. A browser "fit to page" error shows up as 0.04 in or more.

Position: with the sheet against the top-left stops, the hole's top and left edges should sit about 0.25 in from the sheet edges.

## Send back

The filled tables, a photo of the cut card, and a screenshot of the UCP color table.

## What the results decide

| Result | Build |
|---|---|
| Raw DXF imports and colors can be assigned in UCP quickly | No app, or a one-page how-to |
| Saved PDF or colored DXF imports correctly | HTML app that fixes colors and saves a file for UCP import |
| Import fails, Reader print passes | HTML app that saves a PDF; Reader prints it |
| Only Chrome print passes | HTML app that prints from the browser |
| Nothing passes | Native Windows program |

## CHANGELOG

- v1.0 (2026-10-30): Initial release. Visit checklist, record tables, measurement method, and decision table for the laser test card.
