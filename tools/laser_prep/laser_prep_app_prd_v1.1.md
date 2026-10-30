---
file: laser_prep_app_prd_v1.1.md
version: 1.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: PRD for a tool that replaces the CorelDraw prep step (hairline + RGB color assignment) before sending jobs to the Rambots' Universal Laser Systems cutter, including every open issue as of this date.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# Laser Prep App: PRD

**Status:** Draft, not approved. Test card built (`tools/laser_prep/test_card/`); no app code yet.
**Owner:** Samuel Cao
**Users:** Rambots students and mentors cutting parts on the Universal laser

---

## 1. Summary

Students design in Fusion or Onshape, export a DXF, then open it in CorelDraw only to do three things: set every line to hairline, set colors to RGB red, blue, or black, and print to the Universal Laser Systems (ULS) driver. This PRD defines a small tool that does those steps faster and with fewer mistakes, so Corel is no longer the bottleneck.

The single biggest unknown is **how the finished job reaches the laser**. That question decides whether this is a browser app, a Windows program, or no app at all. Section 5 lays out the options and Section 6 gives a test sequence that settles it in one visit to the laser PC.

The leading candidate is an HTML app that fixes colors and line widths, **saves a file**, and the student **imports that file into UCP** (Option E1). It needs no print dialog, and students can prep on any computer and walk up with a finished file. It works only if our UCP version can import files and keeps their colors.

---

## 2. Current workflow

1. Design the part in Fusion or Onshape.
2. Export DXF.
3. On the laser PC, import the DXF into CorelDraw and choose units.
4. Select outlines, set outline width to **hairline**.
5. Set each outline (or fill) to **RGB 255,0,0** (cut), **0,0,255** (score), or **0,0,0** (engrave).
6. Check page size against the laser bed.
7. File > Print, choose the ULS printer, set power and speed per color in the ULS panel, run.

### Where it breaks

| Failure | What happens | Evidence |
|---|---|---|
| Line not set to hairline | ULS treats it as a raster or ignores it; part does not cut | ULS requires vector lines at 0.001 in or thinner (UMD ULS guide) |
| Corel uses CMYK red instead of RGB red | Driver does not recognize CMYK (0,100,100,0) as RGB 255,0,0 and rasters everything | Reported with CorelDraw 2019 on a ULS V-460 (Sawmill Creek thread) |
| DXF imports at wrong scale | Part cuts at 25.4x or 1/25.4 size | DXF units are often missing or ignored on import |
| Page size does not match the bed | Art is offset or clipped | Common driver setup issue |
| Only one machine has Corel | Queue at one PC; students wait for a license, not the laser | Observed workflow |

---

## 3. Goals and success criteria

- A student goes from a Fusion or Onshape DXF to a job running on the ULS laser **without CorelDraw**.
- Every line reaches UCP (by import or by print) at **0.001 in or thinner** in **exact RGB** values.
- The test card's **4.000 in square measures 4.000 ± 0.010 in on both axes**, taking the average of the dropped-out piece and the hole it leaves (kerf cancels out). This checks scale and origin.
- A new student can do it the first time with no mentor help, in under 2 minutes.
- Nothing has to be installed with admin rights on the laser PC.
- **Preferred:** prep can happen on any computer, so the laser PC is used only to load and run the job.

### Non-goals

- Editing geometry (moving, resizing, drawing shapes).
- Setting laser power, speed, or PPI. Those stay in the ULS control panel, mapped by color.
- Reading PDF input.
- Nesting parts on a sheet.

---

## 4. Requirements

### Must have

1. **Import DXF and SVG.** DXF entities: LINE, LWPOLYLINE (including bulge arcs), POLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE, and INSERT (block references). SVG: paths, basic shapes, groups, transforms.
2. **Join segments into closed loops.** Fusion and Onshape often export a rectangle as four separate LINEs. Chain LINE, ARC, and polyline pieces whose endpoints touch (within 0.001 in) into loops. Requirements 4 and 7 and the open-contour warning all depend on this.
3. **Units.** Read DXF `$INSUNITS`. If missing, ask the student (inches or mm) and show the resulting overall size in inches so a 25.4x error is obvious before cutting.
4. **Per-shape color assignment.** Click a shape's **outline** or its **inside** separately, as in Corel's outline and fill. Choices: red, blue, black, or none. Only closed loops have an inside.
5. **Force hairline.** Every outline is output at 0.001 in regardless of source width.
6. **Exact RGB.** Output colors are exactly 255,0,0 / 0,0,255 / 0,0,0. Never CMYK, never color-managed.
7. **Compound fills.** When an inside is set to black (raster engrave), holes nested inside that shape stay empty. Requires grouping nested closed loops with an even-odd fill rule. Otherwise filling a plate would also engrave over its holes.
8. **Bed and origin.** Art is placed from the top-left of the laser bed at true size. Page size matches the ULS bed size.
9. **Preview** at true scale with dimensions shown.
10. **Output** by whichever route Section 6 picks: save a file for UCP import, save a PDF for Reader to print, or print from the browser. File output is written by the app byte for byte, not through the browser's print dialog.

### Should have

- Select all outlines and set one color.
- Select by current color.
- Warn on open contours set to cut (the part would not drop out).
- Warn on duplicate overlapping lines (the laser double-cuts them and burns the edge).
- Link to the test card (`tools/laser_prep/test_card/laser_test_card_v1.0.html`) for checking a new laser PC or driver.

### Could have

- Remember the last bed size and units.
- Text from DXF (TEXT, MTEXT) shown as black fill for engraving.

---

## 5. Options considered

### Option 0: No app. Import directly into the ULS Control Panel (UCP)

ULS states that PDF and DXF files can be imported directly into the UCP (VLS, PLS, and ILS platforms) and the LSM (ULTRA platform), with no printing step. If our machine's UCP version has this, students might skip Corel by exporting DXF from CAD and importing straight into UCP.

- **Pros:** Nothing to build. Officially supported. Skips the Windows print pipeline entirely.
- **Cons:** Unknown whether our UCP version has import. Raw CAD DXFs usually carry no useful color: everything on layer 0 with color 7 or BYLAYER. DXF color is an AutoCAD Color Index number, not RGB. So this works only if colors can be assigned inside UCP, quickly.
- **This must be checked first.** Step 0 tests a raw export as well as a file that already has colors.

### Option A: HTML app, prints through the browser

A single page (hosted link plus offline .html file) that imports, assigns colors, and prints with the browser's print dialog to the ULS printer.

- **Pros:** Fast to build. Runs on any PC with no install. Easy to update.
- **Cons:** Printing goes through Chrome or Edge, which ULS does not document either way. Risks: the browser scales the page, adds margins or headers, thickens 0.001 in lines, rasterizes content, or color-manages RGB values so red is no longer exactly 255,0,0. Students must set Margins None, Scale 100%, and the right paper size every time. Printing needs the ULS driver, so prep stays on the laser PC.
- **Evidence of risk:** Changes in a program's print output can break laser drivers even when the design is correct. Rhino 8 broke Epilog driver jobs that worked in Rhino 7, with no confirmed fix (McNeel forum).
- **Evidence for (partial, 2026-10-30):** In a headless Chrome check, the test card's print-to-PDF output kept exact RGB (`1 0 0 RG`), a 0.001 in line width, and no rasterized content. Chrome's Windows printing path to the ULS driver is different and still untested.

### Option B: Packaged desktop app on a browser engine (Electron)

Same code as Option A, wrapped as a desktop app that can preset the printer, margins, and page size.

- **Pros:** Removes student print-setting errors.
- **Cons:** Still renders and prints through Chromium, so it fixes setting errors but not line or color problems if the browser engine is the cause. Large download. May be blocked by school IT. Prep stays on the laser PC.

### Option C: Native Windows program

A small Windows program that draws lines straight to the Windows print system with true hairline pens and exact RGB, the same way Corel and Acrobat do.

- **Pros:** Matches the documented path. ULS says its driver works with any Windows program that prints through the Windows print system, and names Adobe Acrobat as an example. Full control over line width, color, page size, and origin.
- **Cons:** Slower to build and update. Needs to run on the laser PC, so prep stays there. A C# WinForms program on .NET Framework 4.8 (built into Windows 10 and 11) can be a single .exe with no installer and no admin rights, but school IT may still block unsigned programs.

### Option D: Existing free tools (Inkscape, Adobe Reader)

Inkscape can set hairline and RGB, then print. Adobe Reader can print a prepared PDF.

- **Pros:** Free and already exists.
- **Cons:** Inkscape is as manual as Corel, and Inkscape forum threads report trouble getting clean vector output to laser drivers. Reader cannot fix colors on its own, but it can print a PDF the app writes; that pairing is Option E2.

### Option E: HTML app that saves a file

Same page as Option A, but instead of printing it **writes the output file itself**: the PDF bytes are generated in JavaScript, so red is literally `1 0 0 RG`, lines are `0.072 w` (0.001 in), and the page is the bed size in points, with no color profile and no browser print dialog. The test card already does this.

- **E1: import the saved file into UCP.** No printing at all. Depends on Step 0.
- **E2: print the saved PDF from Adobe Reader** at Actual Size. Stays on the print route ULS documents (Acrobat named). Depends on Reader being on the laser PC and on Reader keeping line widths.
- **Pros:** Low build effort, no install, exact output. Students prep on any computer and bring a finished file, which is the only kind of option that fixes the one-PC queue.
- **Cons:** E1 depends on UCP import keeping colors. E2 still has print settings (Actual Size, grayscale off) that students can get wrong.

### Comparison

| | Build effort | Install on laser PC | Route documented by ULS | Prep off the laser PC | Removes Corel |
|---|---|---|---|---|---|
| 0: UCP direct import | None | None | Yes (direct import) | Yes | Maybe, depends on assigning colors in UCP |
| A: HTML app, browser print | Low | None | No (untested) | No | Yes, if the print test passes |
| B: Electron | Medium | Yes | No (same engine as A) | No | Yes, if the print test passes |
| C: Native Windows | Medium to high | Single .exe, no admin | Yes | No | Yes |
| D: Inkscape / Reader alone | None | Yes (Inkscape) | Reader yes, Inkscape unclear | No | No real time saved |
| E1: HTML app saves file, UCP import | Low | None | Yes (direct import) | Yes | Yes, if Step 0 passes |
| E2: HTML app saves PDF, Reader prints | Low | Reader (often present) | Yes (Acrobat named) | Yes | Yes, if the Reader test passes |

---

## 6. Recommendation: decide by test, not by guess

Run Step 0 and Step 1 in **one visit** with the test card in `tools/laser_prep/test_card/`. Its README has the checklist and the tables to fill in.

**Step 0: UCP import (no printing).** Import three files: the PDF saved from the test card page, the colored DXF (inches, colors set), and the raw DXF (millimeters, no color, loose lines, built like a Fusion or Onshape export). For each, check that it imports, the size is right, red cuts, blue scores, and black rasters with the hole left bare. For the raw DXF, also check units and whether colors can be assigned inside UCP.

**Step 1: print to the ULS driver.** Run it even if Step 0 passes, since it tells us the fallback. Print the saved PDF from Adobe Reader (if installed) at Actual Size, then print the test card page from Chrome with Margins None and Scale Default. If lines raster, retry with the 0.0005 in and 0.003 in line widths.

**Measure** whichever routes were cut: the piece and the hole in X and Y. Size = (piece + hole) / 2. Pass at 4.000 ± 0.010 in.

**Then pick the first route on this list that passed.** File output ranks above printing because students can prep anywhere and there is no print dialog to get wrong.

1. Raw DXF imports and colors can be assigned in UCP quickly: Option 0. No app, or a one-page how-to.
2. Saved PDF or colored DXF imports correctly: **Option E1.**
3. Reader print passes: **Option E2.**
4. Chrome print passes: Option A.
5. Nothing passes: Option C.

### Test card (built)

- Page: the bed size picked on the page; art at top-left.
- 4.000 x 4.000 in square, RGB 255,0,0, 0.001 in line, top-left corner at 0.25, 0.25 in.
- 2.000 in straight line, RGB 0,0,255, 0.001 in line.
- 0.500 x 0.500 in filled square, RGB 0,0,0, no outline.
- 1.000 in filled square with a 0.500 in round hole, RGB 0,0,0, even-odd fill.
- Label "TEST v1" in black fill.
- Line width picker: 0.001 in (default), 0.0005 in, 0.003 in.
- Files: `laser_test_card_v1.0.html`, `laser_test_card_colored_v1.0.dxf`, `laser_test_card_raw_mm_v1.0.dxf`, `make_test_card_dxf_v1.0.py`, `README.md`.

---

## 7. Issues and risks (as of 2026-10-30)

| # | Issue | Impact | Status / mitigation |
|---|---|---|---|
| 1 | Browser printing to the ULS driver is undocumented, not documented as broken | Decides between Option A and the others | Step 1. Chrome's PDF output checked clean in a headless browser; Windows printing still untested |
| 2 | Unknown whether our UCP version has direct PDF/DXF import | Could remove the need for any print route | Step 0; test card ready |
| 3 | Browser may scale, add margins, or add headers and footers | Wrong size or offset parts | Test card; on-screen print settings; Option E avoids the browser print dialog |
| 4 | Browser may thicken 0.001 in lines or rasterize | Lines raster instead of cut | Test card; line width picker |
| 5 | Color management may shift RGB 255,0,0 | Driver does not recognize the cut color | Test card; Option E writes raw RGB with no color profile |
| 6 | CMYK red in Corel (known Corel 2019 + ULS issue) | Already a current failure mode | App always outputs RGB |
| 7 | DXF units missing or wrong | 25.4x scale errors | Read `$INSUNITS`, ask when missing, show overall size; raw test DXF is in millimeters on purpose |
| 8 | DXF entity coverage (SPLINE, ELLIPSE, INSERT, HATCH) varies by exporter | Shapes missing from preview | Test with real Fusion and Onshape exports |
| 9 | Fills need compound paths so holes are not engraved | Ruined engraving | Even-odd grouping of nested loops; test card has a plate with a hole |
| 10 | Open contours and duplicate lines from CAD exports | Parts do not drop out; double burns | Warnings in the app |
| 11 | ULS bed size and driver page size not yet known | Placement errors | Collect from the laser PC; test card has a bed size picker |
| 12 | School IT may block unsigned .exe or Electron apps | Option B or C cannot run | Ask IT early; prefer a single .exe with no installer |
| 13 | Hosted web link needs internet on the laser PC | Link unusable offline | Also ship the offline .html file |
| 14 | ULS color-to-setting mapping on our machine is unconfirmed | Black might map to vector engrave instead of raster | Read the current UCP color table |
| 15 | Step 0 files (`rambots_bearing_plate_cut_v1.1`) were not in the repo | Step 0 could not run as written | Resolved: test card replaces them |
| 16 | Raw CAD DXFs usually carry no color; DXF color is ACI, not RGB | A pre-colored test file would overstate what students get | Step 0 tests the raw DXF too |
| 17 | DXF color 7 means "black or white" | Black shapes may import as white | Check in Step 0 |
| 18 | Reader print settings (Fit vs Actual Size, grayscale) | Wrong scale or lost colors | On-screen instructions; Step 1 |
| 19 | Kerf shrinks the dropped-out piece | A correct cut would fail a ±0.005 in check on a 1.000 in piece | Average piece and hole on a 4.000 in square |
| 20 | CAD exports split loops into loose segments | No inside to click; false open-contour warnings | Join segments (requirement 2) |
| 21 | Print routes need the ULS driver, so prep stays on the laser PC | The one-PC queue stays | Prefer file output (Section 6) |

---

## 8. Open questions

1. Which ULS model is it (VLS, PLS, ILS) and which UCP version?
2. Does that UCP have an Import option for PDF or DXF?
3. What bed size is set in the ULS driver (for example 24 x 12 or 32 x 18 in)?
4. Which CorelDraw version is on the laser PC? (Relevant to the CMYK issue.)
5. Can the laser PC run an unsigned .exe? Does it have internet?
6. In the current UCP color table, what does each of red, blue, and black do?
7. Should black outlines be allowed (vector engrave), or is black only ever a fill (raster engrave)?
8. Who maintains the tool after handoff?
9. Is Adobe Reader or Acrobat installed on the laser PC? (Decides whether Option E2 is available.)
10. Where should the hosted test card and app live? (The `presentations` branch serves GitHub Pages.)

---

## 9. Decisions so far

- Inputs: **DXF and SVG** only.
- Colors: **red, blue, black**, assigned per shape, **outline and inside separately**.
- Hosting for any browser version: **both** a hosted link and an offline .html file.
- No geometry editing, no power or speed settings.
- Architecture: **not decided.** Set by the Section 6 test results.
- 2026-10-30: review changes 1 to 6 accepted (test card before Step 0, raw DXF in Step 0, Option E, file output preferred, segment joining, kerf-cancelling measurement).
- 2026-10-30: test card built before the laser PC visit, not after Step 0 fails.

---

## 10. Next actions

1. Sam: download `tools/laser_prep/test_card/`, run Step 0 and Step 1 in one visit, fill in the README tables, and answer open questions 1 to 6 and 9.
2. Sam: send back the tables, a photo of the cut card, and a screenshot of the UCP color table.
3. Claude: update this PRD with the results and name the route Section 6 picks.
4. Approve the architecture, then build.

---

## Sources

- [ULS: Laser System User Interfaces (UCP and LSM, direct PDF/DXF import)](https://ulsinc.com/discover-uls-innovations/laser-system-user-interfaces)
- [UMD: Using the ULS Laser Control Panel (0.001 in vector lines; prints from any Windows program, Acrobat named)](https://sandbox.umd.edu/wiki/index.php/Using_the_ULS_Laser_Control_Panel)
- [Sawmill Creek: Universal V-460 won't vector on new computer (CorelDraw CMYK red)](https://sawmillcreek.org/goto/post?id=3101449)
- [McNeel forum: Rhino 8 print discards settings for laser cutting](https://discourse.mcneel.com/t/rhino-8-print-discards-settings-for-laser-cutting/175135)
- [Inkscape forum: vector output for laser cutter/engravers](https://inkscape.org/forums/cutplot/vector-output-for-laser-cutterengravers)

## CHANGELOG

- v1.0 (2026-10-30): Initial draft. Captures current Corel workflow, requirements, options 0 / A / B / C / D, the test-first decision sequence, all known issues, and open questions.
- v1.1 (2026-10-30): Folded in review changes 1 to 6. Test card built before Step 0 and used for both steps; Step 0 also tests a raw millimeter DXF; added Option E (app saves a file: E1 UCP import, E2 Reader print) and a "prep off the laser PC" column; file output ranked above printing; new must-have to join loose segments into loops (requirements renumbered); success check moved to a 4.000 in square averaged over piece and hole; issues 15 to 21 and open questions 9 and 10 added; headless Chrome print result recorded under Option A; LightBurn source removed because the body never used it.
