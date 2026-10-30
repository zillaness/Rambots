---
file: laser_prep_app_prd_v1.0.md
version: 1.0
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: PRD for a tool that replaces the CorelDraw prep step (hairline + RGB color assignment) before sending jobs to the Rambots' Universal Laser Systems cutter, including every open issue as of this date.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# Laser Prep App: PRD

**Status:** Draft, not approved. No code written yet.
**Owner:** Samuel Cao
**Users:** Rambots students and mentors cutting parts on the Universal laser

---

## 1. Summary

Students design in Fusion or Onshape, export a DXF, then open it in CorelDraw only to do three things: set every line to hairline, set colors to RGB red, blue, or black, and print to the Universal Laser Systems (ULS) driver. This PRD defines a small tool that does those steps faster and with fewer mistakes, so Corel is no longer the bottleneck.

The single biggest unknown is **how the finished job reaches the laser**. That question decides whether this is a browser app, a Windows program, or no app at all. Section 5 lays out the options and Section 6 gives a cheap test sequence that settles it before any real build.

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
- Every line arrives at the driver at **0.001 in or thinner** in **exact RGB** values.
- A **1.000 in test square cuts at 1.000 in ±0.005** (scale and origin are correct).
- A new student can do it the first time with no mentor help, in under 2 minutes.
- Nothing has to be installed with admin rights on the laser PC.

### Non-goals

- Editing geometry (moving, resizing, drawing shapes).
- Setting laser power, speed, or PPI. Those stay in the ULS control panel, mapped by color.
- Reading PDF input.
- Nesting parts on a sheet.

---

## 4. Requirements

### Must have

1. **Import DXF and SVG.** DXF entities: LINE, LWPOLYLINE (including bulge arcs), POLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE, and INSERT (block references). SVG: paths, basic shapes, groups, transforms.
2. **Units.** Read DXF `$INSUNITS`. If missing, ask the student (inches or mm) and show the resulting overall size in inches so a 25.4x error is obvious before cutting.
3. **Per-shape color assignment.** Click a shape's **outline** or its **inside** separately, as in Corel's outline and fill. Choices: red, blue, black, or none.
4. **Force hairline.** Every outline is output at 0.001 in regardless of source width.
5. **Exact RGB.** Output colors are exactly 255,0,0 / 0,0,255 / 0,0,0. Never CMYK, never color-managed.
6. **Compound fills.** When an inside is set to black (raster engrave), holes nested inside that shape stay empty. Requires grouping nested closed loops with an even-odd fill rule. Otherwise filling a plate would also engrave over its holes.
7. **Bed and origin.** Art is placed from the top-left of the laser bed at true size. Page size matches the ULS bed size.
8. **Preview** at true scale with dimensions shown.
9. **Send to laser** by whichever path Section 6 proves works (print, or export a file for UCP import).

### Should have

- Select all outlines and set one color.
- Select by current color.
- Warn on open contours set to cut (the part would not drop out).
- Warn on duplicate overlapping lines (the laser double-cuts them and burns the edge).
- Built-in **test card**: a 1.000 in red square, a blue score line, and a black filled square, for the Section 6 test.

### Could have

- Remember the last bed size and units.
- Text from DXF (TEXT, MTEXT) shown as black fill for engraving.

---

## 5. Options considered

### Option 0: No app. Import directly into the ULS Control Panel (UCP)

ULS states that PDF and DXF files can be imported directly into the UCP (VLS, PLS, and ILS platforms) and the LSM (ULTRA platform), with no printing step. If our machine's UCP version has this, students might skip Corel by exporting DXF from CAD and importing straight into UCP.

- **Pros:** Nothing to build. Officially supported. Skips the Windows print pipeline entirely.
- **Cons:** Unknown whether our UCP version has import. Unknown whether imported DXF lines get colors and hairline treatment, or whether colors can be assigned inside UCP.
- **This must be checked first.** It may make every other option unnecessary, or reduce the app to "fix colors and export a clean PDF or DXF for UCP import."

### Option A: HTML app, prints through the browser

A single page (hosted link plus offline .html file) that imports, assigns colors, and prints with the browser's print dialog to the ULS printer.

- **Pros:** Fastest to build. Runs on any PC with no install. Easy to update.
- **Cons:** Printing goes through Chrome or Edge, which ULS does not document either way. Risks: the browser scales the page, adds margins or headers, thickens 0.001 in lines, rasterizes content, or color-manages RGB values so red is no longer exactly 255,0,0. Students must set Margins None, Scale 100%, and the right paper size every time.
- **Evidence of risk:** Changes in a program's print output can break laser drivers even when the design is correct. Rhino 8 broke Epilog driver jobs that worked in Rhino 7, with no confirmed fix (McNeel forum). The browser print path has not been tested on our ULS.

### Option B: Packaged desktop app on a browser engine (Electron)

Same code as Option A, wrapped as a desktop app that can preset the printer, margins, and page size.

- **Pros:** Removes student print-setting errors.
- **Cons:** Still renders and prints through Chromium, so it fixes setting errors but not line or color problems if the browser engine is the cause. Large download. May be blocked by school IT.

### Option C: Native Windows program

A small Windows program that draws lines straight to the Windows print system with true hairline pens and exact RGB, the same way Corel and Acrobat do.

- **Pros:** Matches the documented path. ULS says its driver works with any Windows program that prints through the Windows print system, and names Adobe Acrobat as an example. Full control over line width, color, page size, and origin.
- **Cons:** Slower to build and update. Needs to run on the laser PC. A C# WinForms program on .NET Framework 4.8 (built into Windows 10 and 11) can be a single .exe with no installer and no admin rights, but school IT may still block unsigned programs.

### Option D: Existing free tools (Inkscape, Adobe Reader)

Inkscape can set hairline and RGB, then print. Adobe Reader can print a prepared PDF.

- **Pros:** Free and already exists.
- **Cons:** Inkscape is as manual as Corel, and Inkscape forum threads report trouble getting clean vector output to laser drivers. Reader only prints; it cannot fix colors. Useful as a fallback printer for a PDF made by another option.

### Comparison

| | Build effort | Install on laser PC | Print path documented by ULS | Removes Corel |
|---|---|---|---|---|
| 0: UCP direct import | None | None | Yes (direct import) | Maybe, depends on color handling |
| A: HTML app | Low | None | No (untested) | Yes, if the print test passes |
| B: Electron | Medium | Yes | No (same engine as A) | Yes, if the print test passes |
| C: Native Windows | Medium to high | Single .exe, no admin | Yes | Yes |
| D: Inkscape / Reader | None | Yes (Inkscape) | Reader yes, Inkscape unclear | No real time saved |

---

## 6. Recommendation: decide by test, not by guess

Run these in order. Stop at the first one that passes.

**Step 0: UCP import check (5 minutes).** On the laser PC, open the ULS control panel and look for an Import or Open option. Import `rambots_bearing_plate_cut_v1.1.pdf` and the `.dxf`.
- Pass if colors survive (red cuts, blue scores, black engraves) and the size is exact. Then the app only needs to **export** clean files for UCP import. Build the HTML app with an export button and no printing. Corel is gone.
- Fail or no import option: go to Step 1.

**Step 1: Browser print test (10 minutes).** I build only the test card page. Print it from Chrome to the ULS printer with Margins None and Scale 100%.
- Pass if the red square vector-cuts at 1.000 in ±0.005, the blue line scores as a vector, and the black square rasters. Then build Option A in full.
- Fail: go to Step 2.

**Step 2: Native Windows program (Option C).** Build the same features as a single .exe. The color-assignment design from the HTML version carries over.

### Test card spec

- Page: set to the laser bed size; art at top-left.
- 1.000 x 1.000 in square, RGB 255,0,0, 0.001 in line. Measure with calipers after cutting.
- 2.000 in straight line, RGB 0,0,255, 0.001 in line.
- 0.500 x 0.500 in filled square, RGB 0,0,0, no outline.
- Small text label "TEST v1" in black fill.

---

## 7. Issues and risks (as of 2026-10-30)

| # | Issue | Impact | Status / mitigation |
|---|---|---|---|
| 1 | Browser printing to the ULS driver is undocumented, not documented as broken | Decides the whole architecture | Step 1 test |
| 2 | Unknown whether our UCP version has direct PDF/DXF import | Could remove the need for any print path | Step 0 check |
| 3 | Browser may scale, add margins, or add headers and footers | Wrong size or offset parts | Test card; on-screen print settings; Option B or C if it keeps happening |
| 4 | Browser may thicken 0.001 in lines or rasterize | Lines raster instead of cut | Test card |
| 5 | Color management may shift RGB 255,0,0 | Driver does not recognize the cut color | Test card; native app writes raw RGB |
| 6 | CMYK red in Corel (known Corel 2019 + ULS issue) | Already a current failure mode | App always outputs RGB |
| 7 | DXF units missing or wrong | 25.4x scale errors | Read `$INSUNITS`, ask when missing, show overall size |
| 8 | DXF entity coverage (SPLINE, ELLIPSE, INSERT, HATCH) varies by exporter | Shapes missing from preview | Test with real Fusion and Onshape exports |
| 9 | Fills need compound paths so holes are not engraved | Ruined engraving | Even-odd grouping of nested loops |
| 10 | Open contours and duplicate lines from CAD exports | Parts do not drop out; double burns | Warnings in the app |
| 11 | ULS bed size and driver page size not yet known | Placement errors | Collect from the laser PC (open question) |
| 12 | School IT may block unsigned .exe or Electron apps | Option B or C cannot run | Ask IT early; prefer a single .exe with no installer |
| 13 | Hosted web link needs internet on the laser PC | Link unusable offline | Also ship the offline .html file |
| 14 | ULS color-to-setting mapping on our machine is unconfirmed | Black might map to vector engrave instead of raster | Read the current UCP color table |

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

---

## 9. Decisions so far

- Inputs: **DXF and SVG** only.
- Colors: **red, blue, black**, assigned per shape, **outline and inside separately**.
- Hosting for any browser version: **both** a hosted link and an offline .html file.
- No geometry editing, no power or speed settings.
- Architecture: **not decided.** Set by the Section 6 test sequence.

---

## 10. Next actions

1. Sam: at the laser PC, do Step 0 (UCP import of the v1.1 PDF and DXF) and answer open questions 1 to 6.
2. Claude: if Step 0 fails, build the test card page for Step 1.
3. Sam: run Step 1 and measure the square.
4. Approve the architecture, then build.

---

## Sources

- [ULS: Laser System User Interfaces (UCP and LSM, direct PDF/DXF import)](https://ulsinc.com/discover-uls-innovations/laser-system-user-interfaces)
- [UMD: Using the ULS Laser Control Panel (0.001 in vector lines; prints from any Windows program, Acrobat named)](https://sandbox.umd.edu/wiki/index.php/Using_the_ULS_Laser_Control_Panel)
- [Sawmill Creek: Universal V-460 won't vector on new computer (CorelDraw CMYK red)](https://sawmillcreek.org/goto/post?id=3101449)
- [McNeel forum: Rhino 8 print discards settings for laser cutting](https://discourse.mcneel.com/t/rhino-8-print-discards-settings-for-laser-cutting/175135)
- [Inkscape forum: vector output for laser cutter/engravers](https://inkscape.org/forums/cutplot/vector-output-for-laser-cutterengravers)
- [LightBurn forum: Universal Laser Systems support](https://forum.lightburnsoftware.com/t/universal-laser-systems-support/112229)

## CHANGELOG

- v1.0 (2026-10-30): Initial draft. Captures current Corel workflow, requirements, options 0 / A / B / C / D, the test-first decision sequence, all known issues, and open questions.
