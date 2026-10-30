---
file: prd_v1_2_proposed_changes_v1.1.md
version: 1.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Proposed edits to the laser prep PRD for a v1.2, drawn from the three research reports and the test card, waiting on Sam's approval of v1.1 first.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# Proposed changes for PRD v1.2

PRD v1.1 is not approved yet, so these are listed here instead of edited in. Approve v1.1 first, then accept, reject, or change each row below. Nothing here changes the architecture decision, which still waits on the laser PC visit.

Sources: `research/uls_direct_import_research_v1.0.md` (ULS), `research/cad_dxf_export_research_v1.0.md` (CAD), `research/print_path_research_v1.0.md` (Print). Evidence labels in those reports matter: most findings come from search excerpts because several vendor sites are outside this session's network allowlist.

## Changes that shift a recommendation

| # | PRD section | Change | Why |
|---|---|---|---|
| 1 | 5, Option 0 | Mark Option 0 as unlikely. | ULS: no evidence UCP can recolor imported objects; one lab wiki says it cannot. Raw CAD exports usually arrive as one color, so import alone saves nothing. |
| 2 | 5, Option E1; 4, req 10 | E1 saves **PDF**. DXF only as a fallback the probes pick. | ULS says DXF import is vectors only and PDF import carries raster and vector. Black fills need raster. |
| 3 | 5, Option E1; 7; 8 | Add: direct import may be a **paid add-on** ("Direct Import Package" in the UCP System tab, 30-day trial in one manual). New open question: is it licensed, and who approves a purchase? | ULS (PLS4.75 manual excerpt). If it costs money, E1 has a cost E2 does not. |
| 4 | 5, Option A and B | Evidence: Chrome and Edge print a page as PDF, then EMF through PDFium, which never draws a line thinner than one printer pixel. No field reports of browser printing to ULS, Epilog, or Trotec. Keep A below E2. | Print. The headless check covered only the PDF stage. |

## Requirements

| # | PRD section | Change | Why |
|---|---|---|---|
| 5 | 4, req 1 | SPLINE of any degree (degree 5 is common from Fusion), rational and fit-point-only forms; ELLIPSE full and partial; drop Z; honor the extrusion direction. HATCH, POINT, DIMENSION, TEXT, MTEXT ignored and **counted by type, never silently**. | CAD |
| 6 | 4, req 2 | Join tolerance 0.001 in default, adjustable to 0.01 in, applied after units are confirmed. Report "joined N pairs, largest gap X". | CAD (no measured gap data; coarse auto-close mis-joins) |
| 7 | 4, req 3 | The units header is a default, never a decision. Always show the overall size and require confirmation. Handle in, ft, mm, cm, m. Suggest factors (10, 25.4, 1000) when the part does not fit the bed as read. | CAD: Fusion File > Export writes cm; Onshape reportedly writes an inches header over mm coordinates and meters for drawings. |
| 8 | 4, new must-have | Geometry on bend, extent, construction, or center layers defaults to none and is hidden behind a toggle. | CAD: flat patterns put bend lines on their own layers; cutting them slices the part along its folds. |
| 9 | 4, should-have | Test card link becomes `laser_test_card_v1.2.html`. | The card moved to v1.2 (research and independent review fixes). |

## Test plan (Section 6)

| # | Change | Why |
|---|---|---|
| 10 | Step 0: check for the Direct Import Package first; screenshot every import dialog; recolor test on the raw DXF; do not judge "black = raster" on DXFs. | ULS |
| 11 | Step 0: add the R12, curves, and color-code probes (already in the test card). | ULS: DXF color handling and entity support are undocumented. |
| 12 | Step 1 order: Reader, then the saved PDF in the browser's viewer, then the Chrome page print. Record driver DPI on every run. | Print |
| 13 | Test card spec: add the plain, R12, curves, and color-code probes, the zero-width PDF line option, the no-scaling PDF preference, and per-route measuring on fresh scrap. File list in Section 6 is out of date (it names v1.0 files). | Test card v1.2 |
| 14 | Ask for real exports from team parts during the visit (Fusion sketch and flat pattern, Onshape sketch or face). | CAD: no real samples were found; they outrank every synthetic fixture. |

## Issues table (Section 7)

| # | Issue | Change |
|---|---|---|
| 15 | 1 | Reword: Chromium documents the PDF to EMF path; ULS is silent; no field reports either way. |
| 16 | 2 | Reword: ULS documents import; the open question is which UCP version and whether the import package is enabled. |
| 17 | 4 | Mechanism found: PDFium's one-pixel minimum, so real line width depends on driver DPI. |
| 18 | 5 | Lower the risk: no evidence of color management on this path. The live risks are the grayscale and black-and-white toggles. |
| 19 | 7 | Header unreliable in both CAD tools (see change 7). |
| 20 | 8 | Rank SPLINE first, then ELLIPSE, INSERT, HATCH. Fixtures f12, f23 to f26 cover splines and ellipses. |
| 21 | 16, 17 | Raw DXF probably arrives as one color; ACI 7 handling undocumented; the color-code probe tests both. |
| 22 | 18 | Add: Reader remembers the last scaling choice, Print as image, Enhance thin lines, orientation. |
| 23 | new | Direct import may need a paid license. |
| 24 | new | Bend and extent lines get cut if not hidden (change 8). |
| 25 | new | SumatraPDF prints pages as images and cannot keep vector cuts; do not suggest it as a Reader substitute. |

## Other

| # | Change |
|---|---|
| 26 | Section 10: add a link to `laser_prep_core_design_v1.1.md` (effort 25 to 39 hours for the HTML routes) and `fixtures/` (33 fixtures with an oracle). |
| 27 | Sources: add the three research reports. |
| 28 | Network note: ulsinc.com and several vendor and docs sites are outside this session's allowlist. Allowing them would let the "Reported" and "Verified from excerpt" findings be checked against full pages. |
| 29 | Status line and Section 10: a working prototype exists (`app/laser_prep_v0.2.html`, built from the core design, tested against all 33 fixtures and in a browser). It covers Options E1, E2, and A in one page (Save PDF, Print, Save DXF). The visit decides which button is the main path, not whether to build. |
| 30 | Section 9: record that Sam set a goal on 2026-10-30 to build a functional prototype without waiting for approval, which superseded "approve the architecture, then build" for the prototype only. |

## CHANGELOG

- v1.0 (2026-10-30): Initial list of 28 proposed changes from the research reports and test card v1.1.
- v1.1 (2026-10-30): File names updated to test card v1.2; items 29 (prototype exists) and 30 (prototype goal) added, in order after 28.
