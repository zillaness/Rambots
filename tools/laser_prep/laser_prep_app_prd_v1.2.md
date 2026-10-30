---
file: laser_prep_app_prd_v1.2.md
version: 1.2
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: PRD for a tool that replaces the CorelDraw prep step (hairline + RGB color assignment) before sending jobs to the Rambots' Universal Laser Systems cutter, with a proposed Phase 2 for layout, shapes, text, images, joints, and calibration.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# Laser Prep App: PRD

**Status:**
- **Phase 1 (prep):** draft for review. v1.1 and the 30 proposed changes were accepted on 2026-10-30 and are folded in here. A prototype exists: `app/laser_prep_v0.2.html`.
- **Phase 2 (design features, Section 11):** proposed. It needs its own approval, after the laser PC visit confirms the Phase 1 output route.

**Owner:** Samuel Cao
**Users:** Rambots students and mentors cutting parts on the Universal laser

---

## 1. Summary

Students design in Fusion or Onshape, export a DXF, then open it in CorelDraw to set every line to hairline, set colors to RGB red, blue, or black, and print to the Universal Laser Systems (ULS) driver. Sometimes they also lay out copies, add text or shapes, place images, or draw joints in Corel. Phase 1 replaces the prep step. Phase 2 (proposed) covers the design extras.

The biggest unknown is still **how the finished job reaches the laser**. The leading candidate is an HTML app that fixes colors and line widths, **saves a PDF**, and the student **imports that PDF into UCP** (Option E1). It needs no print dialog, and students can prep on any computer. It works only if our UCP version can import files (possibly a paid add-on) and keeps their colors. The laser PC visit (Section 6) settles it.

---

## 2. Current workflow

1. Design the part in Fusion or Onshape.
2. Export DXF.
3. On the laser PC, import the DXF into CorelDraw and choose units.
4. Select outlines, set outline width to **hairline**.
5. Set each outline (or fill) to **RGB 255,0,0** (cut), **0,0,255** (score), or **0,0,0** (engrave).
6. Sometimes: place several copies, repeat a part with small changes (for example a different name or number on each), add text or simple shapes, place an image, or draw tabs and finger joints.
7. Check page size against the laser bed.
8. File > Print, choose the ULS printer, set power and speed per color in the ULS panel, run.

Steps 3 to 5, 7, and 8 happen on nearly every job. Step 6 happens on some jobs (Sam, 2026-10-30: "mainly hairline and printing, but sometimes layout and copies, sometimes repeat with customization").

### Where it breaks

| Failure | What happens | Evidence |
|---|---|---|
| Line not set to hairline | ULS treats it as a raster or ignores it; part does not cut | ULS requires vector lines at 0.001 in or thinner (UMD ULS guide) |
| Corel uses CMYK red instead of RGB red | Driver does not recognize CMYK (0,100,100,0) as RGB 255,0,0 and rasters everything | Reported with CorelDraw 2019 on a ULS V-460 (Sawmill Creek thread) |
| DXF imports at wrong scale | Part cuts at 10x, 25.4x, or 1000x size | Fusion File > Export writes centimeters; Onshape reportedly writes an inches header over millimeter numbers (CAD research) |
| Page size does not match the bed | Art is offset or clipped | Common driver setup issue |
| Only one machine has Corel | Queue at one PC; students wait for a license, not the laser | Observed workflow |
| Copies and layout done by hand | Slow, uneven spacing, parts placed off the sheet | Observed workflow |

---

## 3. Goals and success criteria (Phase 1)

- A student goes from a Fusion or Onshape DXF to a job running on the ULS laser **without CorelDraw**.
- Every line reaches UCP (by import or by print) at **0.001 in or thinner** in **exact RGB** values.
- The test card's **4.000 in square measures 4.000 ± 0.010 in on both axes**, taking the average of the dropped-out piece and the hole it leaves (kerf cancels out).
- A new student can do it the first time with no mentor help, in under 2 minutes.
- Nothing has to be installed with admin rights on the laser PC.
- **Preferred:** prep can happen on any computer, so the laser PC is used only to load and run the job.

### Phase 1 non-goals

- Drawing, moving, or resizing geometry. **Moved to Phase 2** (Section 11).
- Laying out copies or nesting. **Moved to Phase 2.**
- Setting laser power, speed, or PPI. Those stay in the ULS control panel, mapped by color.
- Reading PDF input.

---

## 4. Requirements (Phase 1)

### Must have

1. **Import DXF and SVG.** DXF: LINE, ARC, CIRCLE, LWPOLYLINE with bulges, POLYLINE with VERTEX, SPLINE (any degree, rational, fit-point-only, closed), ELLIPSE (full and partial), INSERT and MINSERT. Honor the extrusion direction and drop Z. HATCH, POINT, DIMENSION, TEXT, and MTEXT are ignored and **counted by type, never silently**. SVG: paths, basic shapes, groups, transforms.
2. **Join segments into closed loops.** Chain pieces whose endpoints touch. Tolerance 0.001 in by default, adjustable up to 0.01 in, applied after units are confirmed. Report "joined N pairs, largest gap X". Requirements 4 and 7 and the open-contour warning depend on this.
3. **Units.** The file's units header is a default, never a decision. Always show the overall size in inches and require the student to confirm it. Handle in, ft, mm, cm, m. Flag when the size as read does not fit the bed and another unit would.
4. **Per-shape color assignment.** Click a shape's **outline** or its **inside** separately. Choices: red, blue, black, or none. Only closed loops have an inside.
5. **Force hairline.** Every outline is output at 0.001 in regardless of source width.
6. **Exact RGB.** Output colors are exactly 255,0,0 / 0,0,255 / 0,0,0. Never CMYK, never color-managed.
7. **Compound fills.** When an inside is set to black, holes nested inside it stay empty (even-odd fill).
8. **Reference layers hidden.** Geometry on bend, extent, construction, or center layers defaults to none and is hidden behind a toggle. Cutting a bend line slices a sheet metal part along its fold.
9. **Bed and origin.** Art is placed from the top-left of the laser bed at true size, 0.25 in margin. Page size matches the ULS bed size.
10. **Preview** at true scale with dimensions shown.
11. **Output:** **PDF** written byte by byte by the app (default; for UCP import or Reader printing), with a request to viewers not to scale it. DXF (R12, vectors only) and browser printing as fallbacks; the visit decides which is the main button.

### Should have

- Select all outlines and set one color; select by current color.
- Warn on open contours set to cut, branch points, almost-closed gaps (with a one-click join), duplicate and overlapping lines.
- Link to the test card (`test_card/laser_test_card_v1.2.html`) for checking a new laser PC or driver.

### Could have

- Remember the last bed size and line width.

---

## 5. Options considered

### Option 0: No app. Import CAD DXF directly into UCP

ULS documents direct PDF and DXF import into UCP (VLS, PLS, ILS) and LSM (ULTRA).

- **Pros:** Nothing to build.
- **Cons:** Raw CAD DXFs usually carry no useful color (layer 0, color 7 or BYLAYER). No evidence UCP can recolor imported objects; one lab wiki says it cannot. Direct import may also be a paid add-on.
- **Status: unlikely.** The visit checks it anyway (raw DXF plus recolor test).

### Option A: HTML app, prints through the browser

- **Pros:** No install, easy to update.
- **Cons:** Chrome and Edge print a page by converting it to PDF and then to EMF through PDFium, which never draws a line thinner than one printer pixel; the real hairline width depends on driver DPI. No field reports of browser printing to ULS, Epilog, or Trotec drivers. Students must set margins, scale, and paper size every time. Prep stays on the laser PC.

### Option B: Packaged desktop app on a browser engine (Electron)

Same print engine as Option A, so it fixes setting errors but not line or color problems. Large download; may be blocked by school IT; prep stays on the laser PC.

### Option C: Native Windows program

Prints through the Windows print system the way Corel and Acrobat do. Full control, but slower to build, must run on the laser PC, and school IT may block unsigned programs.

### Option D: Existing free tools (Inkscape, Adobe Reader)

Inkscape is as manual as Corel. Reader cannot fix colors on its own, but it can print a PDF the app writes; that pairing is Option E2. SumatraPDF prints pages as images and cannot keep vector cuts.

### Option E: HTML app that saves a file (the prototype)

The page writes the output file itself: red is literally `1 0 0 RG`, lines are `0.072 w`, the page is the bed size, no color profile, no browser print dialog.

- **E1: import the saved PDF into UCP.** No printing. PDF, not DXF, because ULS says DXF import is vectors only and black fills need raster. Depends on Step 0 and on the Direct Import Package being available.
- **E2: print the saved PDF from Adobe Reader** at Actual size. Commonly reported as the working route for ULS and Epilog drivers. Depends on Reader being installed.
- **Pros:** Low build effort (prototype done), no install, exact output, students prep anywhere.
- **Cons:** E1 may cost money; E2 still has Reader settings to get right.

### Comparison

| | Build effort | Install on laser PC | Route documented by ULS | Prep off the laser PC | Removes Corel |
|---|---|---|---|---|---|
| 0: UCP direct import of CAD DXF | None | None | Yes | Yes | Unlikely (no recolor in UCP) |
| A: HTML app, browser print | Low | None | No | No | If the print test passes |
| B: Electron | Medium | Yes | No | No | If the print test passes |
| C: Native Windows | Medium to high | Single .exe | Yes | No | Yes |
| D: Inkscape / Reader alone | None | Inkscape | Partly | No | No real time saved |
| E1: HTML app saves PDF, UCP import | Done (prototype) | None | Yes | Yes | If Step 0 passes |
| E2: HTML app saves PDF, Reader prints | Done (prototype) | Reader | Yes | Yes | If the Reader test passes |

---

## 6. Recommendation: decide by test, not by guess

Run Step 0 and Step 1 in **one visit** with `test_card/` (version 1.2). Its README has the checklist and tables.

**Before anything:** record the ULS model, UCP version, driver bed size and DPI choices, and whether the UCP **System** tab has a **Direct Import Package** box (and whether it is on). Ask a mentor before turning on any trial or license.

**Step 0: UCP import (no printing).** Import the saved PDF, then the DXFs with `plain` first: `plain`, `colored`, `colored_r12`, `raw_mm`, `curves`, `color_codes`. Screenshot every import dialog. Record error text and missing shapes. Do not judge "black = raster" on DXFs (vectors only); judge raster on the PDF. On the raw DXF, check units and try to recolor a line inside UCP.

**Step 1: print to the ULS driver.** Run it even if Step 0 passes. Order: Reader (Actual size, paper = bed, grayscale off, Print as image off), then the saved PDF in the browser's PDF viewer, then the Chrome page print. Record driver DPI on every run.

**Measure** each route on its own labeled piece of scrap: piece and hole in X and Y. Size = (piece + hole) / 2. Pass at 4.000 ± 0.010 in.

**Bring back** the tables, screenshots, a photo of each route's cut piece, and real exports of a team part (Fusion sketch and flat pattern, Onshape sketch or face).

**Then pick the first route that passed.** File output ranks above printing.

1. Raw DXF imports and colors can be assigned in UCP quickly: Option 0.
2. Saved PDF imports correctly: **Option E1** (prototype's Save PDF is the main button).
3. Only a DXF imports correctly: E1 with DXF output in the version and color form the probes show.
4. Reader print passes: **Option E2.**
5. Chrome print passes: Option A (prototype's Print button).
6. Nothing passes: Option C.

### Test card (built, v1.2)

- Page: the bed size picked on the page; art at top-left; PDF asks viewers not to scale.
- 4.000 in red square, 2.000 in blue line, 0.500 in black square, 1.000 in black plate with a 0.500 in hole (even-odd), label "TEST v1".
- Line width picker: 0.001 in (default), 0.0005 in, 0.003 in, 0 (PDF only).
- DXF probes: plain, colored, R12, raw mm, curves, color codes (nine line lengths, one per color encoding).
- Files: `laser_test_card_v1.2.html`, six DXFs, two generator scripts, `README.md`.

---

## 7. Issues and risks (as of 2026-10-30)

| # | Issue | Impact | Status / mitigation |
|---|---|---|---|
| 1 | Browser printing to the ULS driver: Chromium documents the PDF to EMF path; ULS is silent; no field reports | Decides Option A | Step 1 |
| 2 | Which UCP version we have, and whether direct import is enabled | Could remove the need for any print route | Step 0; check the Direct Import Package box first |
| 3 | Browser may scale, add margins, or add headers and footers | Wrong size or offset parts | Test card; on-screen print settings; Option E avoids the browser dialog |
| 4 | PDFium never draws a stroke under one printer pixel | Real line width depends on driver DPI | Record DPI per run; line width picker |
| 5 | Color management could shift RGB values | Driver does not recognize the cut color | No evidence of it on this path; the live risks are grayscale and black-and-white toggles |
| 6 | CMYK red in Corel (known Corel 2019 + ULS issue) | Current failure mode | App always outputs RGB |
| 7 | DXF units header unreliable in both CAD tools | 10x, 25.4x, 1000x scale errors | Mandatory units confirmation with size shown (requirement 3) |
| 8 | DXF entity coverage varies by exporter | Shapes missing | SPLINE first, then ELLIPSE, INSERT, HATCH; fixtures f12, f23 to f26 |
| 9 | Fills need compound paths so holes are not engraved | Ruined engraving | Even-odd grouping; covered in fixtures and the browser test |
| 10 | Open contours and duplicate lines from CAD exports | Parts do not drop out; double burns | Checks list in the app |
| 11 | ULS bed size and driver page size not yet known | Placement errors | Collect at the visit; bed size picker |
| 12 | School IT may block unsigned .exe or Electron apps | Option B or C cannot run | Ask IT early |
| 13 | Hosted web link needs internet on the laser PC | Link unusable offline | Ship the offline .html file |
| 14 | ULS color-to-setting mapping unconfirmed | Black might map to vector engrave | Screenshot the UCP color table |
| 15 | Step 0 files (bearing plate) were not in the repo | Step 0 could not run as written | Resolved: test card |
| 16 | Raw CAD DXF probably arrives as one color; UCP recolor unconfirmed | Option 0 saves nothing | Recolor test at Step 0 |
| 17 | DXF color 7 means "black or white"; UCP handling undocumented | Black may import as white | Color-code probe |
| 18 | Reader remembers the last scaling choice; Print as image, Enhance thin lines, orientation | Wrong scale or rastered lines | Checklist; PDF asks viewers not to scale |
| 19 | Kerf shrinks the dropped-out piece | A correct cut fails a naive check | Average piece and hole |
| 20 | CAD exports split loops into loose segments | No inside to click | Segment joining (requirement 2) |
| 21 | Print routes need the ULS driver, so prep stays on the laser PC | Queue stays | Prefer file output |
| 22 | Direct import may need a paid license | E1 has a cost | Check at the visit; open question 11 |
| 23 | Bend and extent lines cut if not hidden | Sheet metal parts sliced | Requirement 8 |
| 24 | SumatraPDF prints pages as images | Vector cuts lost | Do not suggest it as a Reader substitute |
| 25 | Research rests partly on search excerpts | Some findings unverified | Allow ulsinc.com and related hosts in the environment's network settings, then re-check |

---

## 8. Open questions (Phase 1)

1. Which ULS model is it (VLS, PLS, ILS) and which UCP version?
2. Does that UCP have an Import option for PDF or DXF?
3. What bed size is set in the ULS driver?
4. Which CorelDraw version is on the laser PC?
5. Can the laser PC run an unsigned .exe? Does it have internet?
6. In the current UCP color table, what does each of red, blue, and black do?
7. Should black outlines be allowed (vector engrave), or is black only ever a fill (raster engrave)? (The prototype allows both.)
8. Who maintains the tool after handoff?
9. Is Adobe Reader or Acrobat installed on the laser PC?
10. Where should the hosted test card and app live? (The `presentations` branch serves GitHub Pages.)
11. Is the Direct Import Package licensed or on a trial? If it costs money, who approves the purchase?
12. What DPI choices does the ULS driver offer?

---

## 9. Decisions so far

- Inputs: **DXF and SVG** only.
- Colors: **red, blue, black**, assigned per shape, **outline and inside separately**.
- Hosting for any browser version: **both** a hosted link and an offline .html file.
- No power or speed settings in the app.
- Architecture: **not final.** Set by the Section 6 results. PDF output is the default in the meantime.
- 2026-10-30: review changes 1 to 6 accepted (v1.1).
- 2026-10-30: test card built before the laser PC visit.
- 2026-10-30: Sam set a goal to build a functional prototype without waiting for approval. For the prototype only, this replaced "approve the architecture, then build". Prototype v0.2 exists.
- 2026-10-30: v1.1 approved and the 30 proposed changes accepted, folded into this v1.2.
- 2026-10-30: design features go in a separate **Phase 2** (Section 11) with its own approval after the visit. No Phase 2 build until then.

---

## 10. Next actions

1. Sam: try `app/laser_prep_v0.2.html` on a real team part.
2. Sam: laser PC visit with `test_card/README.md`; answer open questions 1 to 6, 9, 11, 12; bring back tables, screenshots, photos, and real exports.
3. Claude: update this PRD with the results and name the route Section 6 picks; adjust `app/src/writers.js` to match.
4. Sam: review Section 11 and approve, change, or cut Phase 2 features; answer the Phase 2 open questions.
5. Then build Phase 2 in the order Sam approves.

Related documents: `laser_prep_core_design_v1.1.md` (Phase 1 engine, 25 to 39 hours), `fixtures/` (33 DXFs with an oracle), `research/` (three reports), `app/README.md` (prototype).

---

## 11. Phase 2: design features (proposed, not approved)

**Why:** students sometimes lay out copies, repeat parts with changes, add text or shapes, place images, or draw joints in Corel (Section 2, step 6). Phase 1 removes Corel from the prep step only; without Phase 2 those jobs still need Corel or another program.

**Gate:** Phase 2 starts after the visit confirms the Phase 1 output route and Sam approves this section. Phase 1 must keep working unchanged.

**Free tools that already cover parts of this:** Inkscape (shapes, text, text on a path, images, bitmap tracing, a tabbed box extension) and boxes.py or MakerCase (finger-jointed boxes with kerf correction). They save SVG, which the app reads. Building Phase 2 means students need one program instead of two; the cost is the effort below.

### Features

| # | Feature | Decided 2026-10-30 | Notes and constraints | Effort (estimate) |
|---|---|---|---|---|
| P2-1 | **Copies and layout** | Grid first (rows, columns, gap), auto-fit later | The grid checks the bed fit. Auto-fit is nesting, which is much harder | Grid 4 to 8 h; auto-fit 12 to 20 h |
| P2-2 | **Repeat with customization** | Wanted ("that would be a nice feature") | Copies that differ by text, for example numbered parts or names. Built on P2-1 and P2-4 | 4 to 8 h |
| P2-3 | **Basic shapes with size editing** | Rectangle (with rounded corners), circle, ellipse or oval, regular polygons | Typed sizes and positions, plus moving shapes. Needs an object model (select, move, transform), which the Phase 1 app does not have | 10 to 16 h, including the object model |
| P2-4 | **Text with options** | Built-in open fonts **plus** fonts installed on the PC | Font, size, bold or italic where the font has them, letter and line spacing, alignment. Text becomes outlines on output (the ULS is not a PostScript device). Engrave as a fill or cut or score as an outline. PC fonts use the browser's Local Font Access feature: Chrome and Edge only, with a permission prompt, and results differ per PC; built-in fonts are the fallback. Helvetica Neue cannot be bundled | 12 to 18 h |
| P2-5 | **Text following a line** | Wanted | Along a straight line, an arc, or a chosen path, with start position, offset, and side | 6 to 10 h |
| P2-6 | **Images** | Raster engrave first, plus a **cut outline offset around the image**; full trace to vectors later | Grayscale raster, PDF output only (DXF cannot carry images). The outline traces the image's shape (non-background pixels) and offsets it outward by a set distance, for keychains and sticker-style cutouts | Raster 6 to 10 h; offset outline 8 to 12 h; full trace later |
| P2-7 | **Tabs and joints** | All of them: holding tabs, tab-and-slot assembly tabs, and finger joints, both as a **box generator** and **along a chosen edge** | Holding tabs leave small uncut bridges. Tab-and-slot puts tabs on one part and matching slots on another. The box generator takes width, height, depth, and material thickness and makes all panels | Holding tabs 4 to 6 h; tab-and-slot 8 to 12 h; box generator 12 to 18 h; edge fingers 6 to 10 h |
| P2-8 | **Tolerance tweaking** | Wanted | Kerf compensation (offset cuts outward on parts, inward on holes, by half the kerf) and a fit allowance for joints, set from calibration results. Needs a reliable path offset and boolean library (for example a JavaScript port of Clipper2) | 8 to 12 h |
| P2-9 | **Calibration and test patterns** | Wanted | Kerf gauge, press-fit comb (slots in small width steps), score depth ladder, and a power and speed grid limited by the number of colors in the ULS color table. Results feed P2-8. The test card is the starting point | 6 to 10 h |

**Total Phase 2 estimate:** about 106 to 170 hours (the sum of the ranges above), on top of Phase 1. That is a rough range, not a commitment.

**Suggested order** (Sam to confirm): P2-1 grid, P2-9 calibration, P2-8 tolerance, P2-7 holding tabs, then P2-3 shapes and P2-4 text (which unlock P2-2 and P2-5), then images, then joints and the box generator, then auto-fit layout. The first four fit the prep job most closely and reuse the Phase 1 engine.

### Phase 2 constraints

- **Architecture change:** Phase 1 reads a file and assigns colors; Phase 2 needs objects that can be created, selected, moved, copied, and resized, plus undo. Plan this once, before the first Phase 2 feature.
- **Raster content** (text fills, images) only survives in PDF output.
- **Fonts:** bundled fonts must be open-licensed (for example OFL). Each bundled font adds file size to the single HTML file.
- **Geometry library:** offsets, booleans, and tracing are hard to get right by hand; vendor a tested library and add fixtures for it.

### Phase 2 open questions

1. Should imported CAD parts be resizable, or only shapes made in the app? (Skipped on 2026-10-30. Resizing a CAD part usually breaks hole sizes and fits.)
2. Which open fonts to bundle (for example a sans, a bold sans, and a stencil font)?
3. Is a font permission prompt acceptable on the school laser PC, and is the browser Chrome or Edge?
4. Image raster: should the app dither the image, or pass grayscale and let the ULS driver dither?
5. Repeat with customization: where does the per-copy text come from (typed list, pasted list, or a spreadsheet file)?
6. Holding tabs: added automatically, by count per shape, or clicked by hand?
7. Priority order of P2-1 to P2-9, and which ones to cut.
8. Is building Phase 2 worth 106 to 170 hours compared with teaching Inkscape and boxes.py for the occasional design job?

---

## Sources

- [ULS: Laser System User Interfaces (UCP and LSM, direct PDF/DXF import)](https://ulsinc.com/discover-uls-innovations/laser-system-user-interfaces)
- [UMD: Using the ULS Laser Control Panel (0.001 in vector lines; prints from any Windows program, Acrobat named)](https://sandbox.umd.edu/wiki/index.php/Using_the_ULS_Laser_Control_Panel)
- [Sawmill Creek: Universal V-460 won't vector on new computer (CorelDraw CMYK red)](https://sawmillcreek.org/goto/post?id=3101449)
- [McNeel forum: Rhino 8 print discards settings for laser cutting](https://discourse.mcneel.com/t/rhino-8-print-discards-settings-for-laser-cutting/175135)
- [Inkscape forum: vector output for laser cutter/engravers](https://inkscape.org/forums/cutplot/vector-output-for-laser-cutterengravers)
- `research/uls_direct_import_research_v1.0.md`, `research/cad_dxf_export_research_v1.0.md`, `research/print_path_research_v1.0.md` (each with its own sources)
- [Inkscape](https://inkscape.org/), [boxes.py](https://www.festi.info/boxes.py/), [MakerCase](https://www.makercase.com/) (existing free tools for Phase 2 features)
- [MDN: Local Font Access API](https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API) (fonts installed on the PC)

## CHANGELOG

- v1.0 (2026-10-30): Initial draft. Captures current Corel workflow, requirements, options 0 / A / B / C / D, the test-first decision sequence, all known issues, and open questions.
- v1.1 (2026-10-30): Folded in review changes 1 to 6. Test card built before Step 0 and used for both steps; Step 0 also tests a raw millimeter DXF; added Option E (app saves a file: E1 UCP import, E2 Reader print) and a "prep off the laser PC" column; file output ranked above printing; new must-have to join loose segments into loops (requirements renumbered); success check moved to a 4.000 in square averaged over piece and hole; issues 15 to 21 and open questions 9 and 10 added; headless Chrome print result recorded under Option A; LightBurn source removed because the body never used it.
- v1.2 (2026-10-30): v1.1 approved. Applied the 30 proposed changes from `prd_v1_2_proposed_changes_v1.1.md`: Option 0 marked unlikely; E1 saves PDF; direct import may be a paid add-on; print path evidence (PDFium one-pixel minimum); requirements for entities, join tolerance, units confirmation, and hidden reference layers; Step 0 and Step 1 updated to test card v1.2; issues reworded and 22 to 25 added; open questions 11 and 12; prototype and the prototype goal recorded. Workflow map updated with Sam's answer (copies, repeat with customization, text, shapes, images, joints happen sometimes). Geometry editing and layout moved from non-goals to a new Phase 2 section (Section 11) with nine proposed features, decisions from the 2026-10-30 interview, constraints, effort estimates, and open questions; Phase 2 needs its own approval.
