---
file: laser_prep_core_design_v1.1.md
version: 1.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Technical design for the geometry core shared by the HTML routes (Options A, E1, E2) of the laser prep app: DXF and SVG input, loop joining, nesting, color assignment, and PDF, SVG, and DXF output.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# Laser Prep App: Core Technical Design

**Status:** Draft. This is a plan, not approval to build. v1.1 folds in the three research reports in `research/`. PRD v1.1 still gates the build on the laser PC visit and Sam's sign-off.
**Applies to:** Options A (browser print), E1 (save file, import into UCP), and E2 (save PDF, print from Reader). They share everything here and differ only in the last step. Option C (native Windows) would port the same design to C#. Option 0 (no app) needs none of it.

---

## 1. Pipeline

```
file in ──> parse ──> normalize ──> join ──> nest ──> assign colors ──> check ──> write
 DXF/SVG    entities   inches,       loops    holes     outline /        warnings   PDF / SVG / DXF
                       blocks out,   and      and       inside per                  then save
                       curves kept   chains   islands   loop                        or print
```

Each stage is a pure function from one plain data structure to the next. The UI only reads the result of "nest" and writes assignments. That keeps every stage testable from a script with no browser.

---

## 2. Data model

All coordinates are inches, float64, y down from the bed's top-left. Everything converts on the way in, so nothing downstream thinks about units or DXF's y-up axis.

```
Segment  = Line  { a, b }
         | Arc   { center, r, start, end, ccw }      // radians
         | Cubic { p0, p1, p2, p3 }                   // from SVG paths and ellipses
         | Poly  { points[] }                         // flattened splines
Chain    = { segments[], closed, bbox, signedArea, sourceIds[] }
Loop     = closed Chain + { parent, children[], depth }
Job      = { loops[], openChains[], units, sourceBBox, warnings[] }
Assign   = { outline: 'red' | 'blue' | 'black' | null, inside: 'black' | null }   // per loop
           { outline: ... }                                                     // per open chain
```

Arcs stay arcs and cubics stay cubics until the writer. Flattening early would bloat files and turn a smooth hole into hundreds of tiny segments the laser has to slow down for.

---

## 3. Parsing

### 3.1 DXF

**Recommendation: write a small reader for the needed subset instead of pulling in a library.** A DXF file is pairs of lines (group code, value). Reading the HEADER for `$INSUNITS`, the BLOCKS section, and these ENTITIES covers the PRD:

| Entity | Notes |
|---|---|
| LINE | 10/20 start, 11/21 end |
| CIRCLE, ARC | Center, radius, angles in degrees counterclockwise. Watch the extrusion vector (210/220/230): if it is (0, 0, -1), the entity sits in a mirrored coordinate system and X must be negated (angles reflect too). Mirrored sketch geometry from CAD exports hits this. |
| LWPOLYLINE | Vertices with optional bulge (42). Bulge b between two points is an arc of sweep 4·atan(b); radius = chord / (2·sin(sweep/2)). Negative b turns clockwise. Flag 70 bit 1 = closed. Same extrusion rule as arcs. |
| POLYLINE + VERTEX + SEQEND | Older form of the same thing (R12 files). |
| SPLINE | Any degree: Fusion sketch exports are reported to write degree 5, which readers limited to degree 3 drop. Knots, control points, optional weights (rational). Evaluate with de Boor's algorithm and flatten to a Poly with 0.0005 in chord tolerance. If a file has fit points but no control points, fall back to a centripetal Catmull-Rom through the fit points and warn; Fusion is reported to write only the end points of fit-point splines, so a spline with two fit points and no control points gets a loud warning. |
| ELLIPSE | Center, major-axis vector, ratio, start and end parameters. Convert to four cubic Béziers per full turn (error well under 0.0001 in at part sizes). |
| INSERT | Block name, insert point, x/y scale, rotation, plus MINSERT row/column arrays. Expand recursively with the block's base point subtracted. Guard against blocks that insert themselves. |
| TEXT, MTEXT | Not in the first version. Count them and warn ("3 text items were skipped; export text as geometry"). Neither CAD is documented to write TEXT for sketch text anyway (Fusion needs Explode Text; Onshape writes short segments). |
| HATCH, POINT, DIMENSION, anything else | Ignored and counted by type. **No entity is ever skipped silently**: the warning lists every skipped type and count. Fills are assigned in the app, not inherited. |

Z: drop it. Drawing exports can put views at different heights, and Onshape offers a "z-height to zero, normals positive" option because nonzero Z and flipped normals happen. After the extrusion transform, only X and Y are kept.

**Units: the header is a default, never a decision.** The CAD research found Fusion's File > Export writes centimeters whatever the design uses, Onshape is reported to write `$INSUNITS` = 1 (inches) over millimeter coordinates, and Onshape drawings are reported in meters. So:

- Read `$INSUNITS` (1 = in, 2 = ft, 4 = mm, 5 = cm, 6 = m) as the starting guess. Missing or 0 starts at mm, the default unit in both CAD tools for most students.
- **Always** show the overall size in inches and make the student confirm it before anything else is unlocked.
- Also try the factors that real exports get wrong (10, 25.4, 1000, and their inverses). If the header's size does not fit the bed but one of those does, say so: "This reads as 101.6 x 63.5 in. As millimeters it would be 4.0 x 2.5 in. Which is right?"
- Joining tolerances (section 4) apply only after units are confirmed, since a wrong unit makes them 25.4 times off.

Why not a library: an offline single HTML file can't `npm install`, and vendoring a general DXF library brings tens of kilobytes of code for entities we skip. The subset above is about 300 to 400 lines and is exactly the part we have to test anyway. The tradeoff is ours to maintain. **This is a decision for Sam; see section 10.**

### 3.2 SVG

Parse with the browser's own DOM (`DOMParser`), walk elements, and apply each element's full transform chain. `path` commands become Lines, Arcs (SVG elliptical arcs with equal radii) or Cubics; quadratic curves are raised to cubics. Units come from the root `width`/`height` and `viewBox`. If the root has no physical units (Inkscape and some exporters write plain px), ask, offering 96 px per inch as the default.

---

## 4. Joining segments into loops

CAD exports often arrive as separate pieces: a slot can be two LINEs and two ARCs. Requirement 2 needs these joined.

1. Collect every segment endpoint. Snap endpoints to a grid of cells the size of the tolerance (default 0.001 in) in a hash map so neighbors are found in constant time.
2. Build a graph: nodes are snapped points, edges are segments.
3. Walk every node with exactly two edges into chains. A chain that returns to its start is a closed loop.
4. Nodes with one edge are open ends. Nodes with three or more edges are branch points (T-junctions, overlapping construction lines). Do not guess at branches: keep them as open chains and warn, because guessing wrong cuts the wrong shape.
5. When two endpoints meet within tolerance but not exactly, move both to their midpoint so the output has no microscopic gaps.
6. A full circle or closed LWPOLYLINE is already a loop and skips the graph.

Tolerance: 0.001 in default, adjustable up to 0.01 in (never defaulted higher: LightBurn users report coarse auto-close joining the wrong things). No source measured real gap sizes; sketch exports of lines and arcs should join exactly or within floating point noise (around 1e-9), and spline-to-polyline joints may need more. After joining, report "joined N endpoint pairs, largest gap X in". A gap bigger than tolerance but under 0.01 in is reported as "almost closed" with a one-click fix, because the student probably meant it to close.

### 4.1 Duplicates

Before joining, drop exact duplicates: same kind, same endpoints in either direction, same arc parameters within tolerance. Collinear overlapping lines that only partly overlap are reported, not fixed; the fix changes geometry and the PRD says no geometry editing.

---

## 5. Nesting (holes and islands)

1. Flatten every loop to a polygon (arcs at 0.001 in chord tolerance) used only for tests, never for output.
2. Sort loops by area, largest first.
3. A loop's parent is the smallest loop that contains one of its points (point-in-polygon). Loops that touch or cross are rare in part outlines; warn if a loop's points disagree about which loop contains them.
4. Depth 0 is a part outline, depth 1 its holes, depth 2 an island inside a hole, and so on.

Filling uses this tree. When a loop's inside is set to black, the writer emits that loop plus its direct children as one compound path with the even-odd rule, so the holes stay bare. A grandchild island that is also set to black gets its own compound path. This matches PRD requirement 7 and the test card's plate with a hole.

Hit testing for the UI uses the same tree: a click inside the drawing selects the deepest loop containing the point (its inside); a click within a few screen pixels of a stroke selects that loop's outline.

---

## 6. Color assignment and checks

Defaults when a file loads:

- Geometry on layers whose names contain BEND, EXTENT, CONSTRUCTION, or CENTER: none, and hidden behind a "show reference layers" toggle. Fusion flat patterns put bend center and bend extent lines on their own layers, and Onshape uses `SHEETMETAL_BEND_LINES_UP` and `_DOWN`; cutting them would slice the part along its folds. (The name list is a starting guess; check it against real exports.)
- Every closed loop outline: red (cut). That is what students want most of the time.
- Every open chain outline: none, with a warning, because an open cut does not drop a part out.
- Insides: none.

Tools: click outline, click inside, select all outlines, select by current color, and a palette of red, blue, black, none.

Checks shown before output:

| Check | Severity |
|---|---|
| Open chain set to red | Warning: part will not drop out |
| Branch point found | Warning, with the location highlighted |
| Duplicate or overlapping line | Warning (exact duplicates already removed) |
| Art bigger than the bed | Blocks output |
| Units not yet confirmed | Blocks output |
| Entities skipped (by type) | Warning listing each type and count |
| Nothing assigned | Blocks output |

---

## 7. Output writers

All writers place art from the bed's top-left. Origin offset defaults to 0.25 in (matching the test card) so nothing sits on the bed edge.

### 7.1 PDF (Options E1 and E2)

Same approach the test card already uses and verifies: write the bytes directly.

- One page, MediaBox = bed size in points.
- Strokes: `1 0 0 RG` / `0 0 1 RG` / `0 0 0 RG`, width `0.072 w` (0.001 in).
- Fills: `0 0 0 rg`, compound paths with `f*`.
- Arcs become cubic Béziers of 90 degrees or less each; Polys become `m`/`l` runs.
- No ICC profile, no OutputIntent, no transparency, no fonts.
- Numbers to 4 decimals of a point.

The ULS Direct File Import page says PDF import carries both vector and raster content, while DXF import carries vectors only. If the visit confirms that, PDF is the output for E1 as well as E2, because black fills need raster.

### 7.2 SVG (Option A)

Inline SVG sized in inches, same structure as the test card's print path: viewBox in inches, strokes at 0.001 user units, `fill-rule="evenodd"` for compound fills, print CSS with `@page` set to the bed and no backgrounds. The test card found Chrome painted a page-sized white fill unless backgrounds were turned off in print CSS; the app must keep that rule. Chrome and Edge print a page by converting it to PDF and then to EMF with PDFium, which never draws a stroke thinner than one printer pixel. The real hairline width on this route is set by the driver's DPI, so the app's print screen tells students which DPI the visit found works.

### 7.3 DXF (fallback for E1)

Only if the visit shows UCP imports DXF but not PDF. Write R12 or R2000, whichever the probes show UCP reads, with color in whichever form the color-code probe shows UCP reads (entity color index, layer color, or 24-bit true color). If both index and true color are written, they must agree. Layers CUT, SCORE, ENGRAVE. Arcs stay ARC entities, Polys become LWPOLYLINE (POLYLINE in R12). Inside fills cannot be expressed reliably here; disable black insides when DXF output is selected.

---

## 8. Page structure

One HTML file, no external requests, so the offline copy and the hosted copy are identical.

```
<style>      tokens, layout, print CSS
<main>       drop zone, units prompt, preview (inline SVG), palette, warnings, bed size, output button
<script>
  dxf.js       section 3.1
  svg_in.js    section 3.2
  geom.js      joining, nesting, flattening, hit testing (sections 4 and 5)
  writers.js   PDF, SVG, DXF (section 7)
  ui.js        state, events, rendering the preview
```

The modules are written as separate files during development and inlined into one HTML file by a short build script, so tests can import `geom.js` and `writers.js` directly in Node.

---

## 9. Testing

- **Fixtures:** a library of small DXFs covering each entity and each failure mode (gaps, branches, duplicates, mirrored arcs, bulges, splines, nested blocks, missing units), each with an expected-results file (loop count, open chain count, nesting depths, overall size). Built: `fixtures/` (19 fixtures, `expected_results_v1.0.1.json`, and `reference_check_v1.0.py`, which applies sections 4 and 5 with ezdxf and agrees with all 19).
- **Unit tests in Node:** parse, join, and nest each fixture and compare to the expected results.
- **Writer tests:** write a PDF for each fixture, parse it back strictly, render it with Poppler, and check that only the four allowed colors appear and that sizes match to 0.001 in. The test card's verification script already does this and can be reused.
- **Real exports:** at least three real Fusion and three real Onshape exports of team parts before the first student uses it: Fusion sketch, flat pattern with and without "convert splines to polylines", drawing; Onshape sketch or face, drawing, flat view. These outrank every synthetic fixture.
- **Fixtures still to add** from the CAD research list: centimeter header, inches header over millimeter coordinates, meters, degree 5 and rational and fit-point-only splines, partial and rotated ellipses, flat-pattern layer names, the same shape on two layers, gap sizes of 0.0001 / 0.005 / 0.02 in, nonzero Z, coordinates far from the origin, DIMENSION and POINT entities, and text as hundreds of short lines.

---

## 10. Decisions for Sam

| Decision | Recommendation | Why | Constraint it creates |
|---|---|---|---|
| Own DXF reader vs vendored library | Own reader for the subset | Offline single file, small, fully tested | We maintain it; unusual entities need code |
| Spline handling | Flatten at 0.0005 in | Simple and exact enough for a laser | Output files a little larger for spline-heavy parts |
| Text (TEXT, MTEXT) | Skip with a warning in v1 | Students can export text as geometry | Text-only engraving needs a CAD step |
| Default color for closed loops | Red | Most jobs are cut-only | A student who forgets to change it cuts instead of scoring |
| Reference layers (bend, extent, construction) | Default to none and hidden | Cutting a bend line ruins a sheet metal part | Layer-name list must be maintained |
| Units confirmation | Required on every file | Both CAD tools have reported unit header errors | One extra click per job |
| Output format for E1 | PDF | ULS documents PDF import as raster and vector, DXF as vectors only; fills need raster | DXF only as a fallback, chosen by the probes |

---

## 11. Rough effort (estimate, not a commitment)

| Part | Hours |
|---|---|
| DXF reader (subset, blocks, extrusion, any-degree splines, skip counts) | 5 to 7 |
| SVG reader | 2 to 3 |
| Joining, duplicates, nesting, hit testing | 5 to 8 |
| Writers (PDF, SVG, DXF) | 2 to 4; PDF largely exists in the test card |
| UI (including units confirmation and reference-layer toggle) | 7 to 11 |
| Fixtures and tests | 4 to 6 |
| **Total** | **25 to 39** |

Option C would reuse sections 2 to 7 as a spec; add the Windows printing code and roughly 1.5x the UI time.

## CHANGELOG

- v1.0 (2026-10-30): Initial draft. Pipeline, data model, DXF and SVG parsing subset, joining and nesting algorithms, color defaults and checks, PDF/SVG/DXF writers, page structure, testing plan, decisions for Sam, and effort estimate.
- v1.1 (2026-10-30): Folded in the research reports. Units header treated as a default with mandatory size confirmation and plausibility factors; any-degree and fit-point spline handling; Z dropped; every skipped entity counted; adjustable join tolerance with a largest-gap report; reference layers (bend, extent) default to none; DXF color form set by the color-code probe; PDF as E1 output; PDFium one-pixel note on the print route; real exports and missing fixtures listed; effort range updated.
