---
file: cad_dxf_export_research_v1.0.md
version: 1.0
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: What Fusion 360 and Onshape write into DXF files, what laser users report going wrong, and what the laser prep tool's parser and test fixtures should cover.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# CAD DXF export research: Fusion 360 and Onshape

**Method and limits.** My page-fetch tool could not reach any outside site, so I opened no web pages. Autodesk help text came back in full through Autodesk's help search. Everything else is from search excerpts, so a forum code names the thread returned for that claim, not a confirmed comment. I inspected no real DXF file. **Verified**: an official vendor help or support page states it. **Reported**: a forum or user claim. **Inferred**: my reasoning. Codes like [A2] point to Sources.

## Bottom line

- **Do not trust `$INSUNITS`.** Fusion's sketch export uses the unit picked in its dialog [A1], but File > Export writes centimeters [A4, A5] (Verified). Onshape is reported to write `$INSUNITS` = 1 (inches) whatever the workspace unit [O3], and to export drawings in meters [O4] (Reported). Use the header as a default and make the student confirm the overall size every time.
- **SPLINE support is required.** Fusion sketch export is reported to write SPLINE entities, often degree 5, which some software drops [F1, F5]. Onshape flat views and drawings keep splines by default [O6] (Verified). Ellipse, HATCH and INSERT: no source found.
- **Real exports are not all "layer 0".** Fusion flat patterns put outer profiles, inner profiles, bend lines, extent lines and text on separate layers [A2] (Verified). Onshape sheet metal does the same for bend lines [O5] (Reported). The raw test DXF fits a plain sketch export only.
- **No source gives real gap sizes.** Keep the 0.001 in join tolerance, apply it after units are settled, and put the effort into duplicates, partial overlaps and 3D normals (Inferred).
- **Get real samples.** I found none, so the fixtures below are synthetic. A real export per route is the true test.

## Fusion 360

**1. Sketch export** (right-click the sketch in the Browser, Export DXF)
- Version, layers, colors: not found.
- Units: the dialog asks for a unit, defaulting to the design's (Verified, [A1]). One user found `$INSUNITS` = 4 (Reported, [F3]).
- Geometry: visible geometry only, with opt-in boxes for points, projected and construction geometry (Verified, [A1]).
- Entities: not documented. Arcs arrive as true ARC [F6] and splines as SPLINE [F5] (Reported). No evidence found of POLYLINE, ELLIPSE, INSERT or HATCH. Points would arrive as POINT (Inferred).
- Issues: no spline-to-polyline switch [F5]. Readers limited to degree 3 splines drop the rest, and Fusion now writes more degree 5 [F1]. Fit-point splines export only start and end points [F2]. A disconnected-lines bug was fixed in a 2019 update, per Autodesk staff [F4] (all Reported).

**2. Sheet metal flat pattern** (activate it, then Export DXF)
- Version: not found. Autodesk's fix for broken output is re-saving as AutoCAD 2018 DXF [A7], so the original probably differs (Inferred).
- Units: dialog choice, default design unit (Verified, [A2]).
- Splines: "Convert splines to polylines" with a deviation tolerance. Help says use it if the laser cutter lacks splines [A2]; a support article says turn it off when lines go missing [A7] (Verified). Test both.
- Layers: outer profiles, interior profiles, bend center lines, bend extent lines and text each get a layer; bend and extent lines are opt-in (Verified, [A2]).
- Issues: lines missing, broken or unconnected in third-party software (Verified, [A7]).

**3. Drawing** (Export > Export Sheet as DXF). Version 2013 (Verified, [A3]). Views can land at different heights, giving a "3D DXF" (Verified, [A6]). No spline-to-polyline option (Reported, [F5]). Units: not found. Dimensions probably included (Inferred).

**4. File > Export > DXF** (whole design). A 3D DXF [A9] in centimeters regardless of document units [A4, A5] (Verified); a 100 mm circle opened as 10 mm [A5]. One user found `$INSUNITS` = 5 (Reported, [F3]). Students should avoid it.

**Text.** Autodesk says sketch text cannot export to DXF until you Explode Text [A8] (Verified). Expect geometry, not TEXT or MTEXT (Inferred).

## Onshape

**1. Sketch or planar face** (right-click, Export as DXF/DWG)
- Version: a dialog choice (Verified, [O2]); list not found. Users report a 2018 default and "Release 11-12" as oldest [O3, O10]. R12 cannot hold splines [O11] (Reported).
- Units: header reported as always `$INSUNITS` = 1 with coordinates in workspace units; the fix is editing it to 4 or 0 [O3] (Reported). Whether this dialog has its own unit field: not confirmed.
- Splines: "Export splines as polylines" checkbox (Reported, [O9, O11]); official sketch wording not confirmed.
- Layers and entities: one user got two layers and a double pass [O8]. Rectangles arrive as separate lines [O12] (Reported). Colors: not found.

**2. Drawing.** Version and units are dialog choices, "drawing units or another unit". "Export splines as polylines" applies to every format except PDF. Annotations, notes, table text and dimensions can be exploded into polylines. A "z-height to zero, normals positive" box exists (all Verified, [O1]). One user's 280 mm part exported in meters and a laser service rejected it (Reported, [O4]).

**3. Sheet metal flat view.** Exportable as DXF/DWG (Verified, [O2]). Since July 2018 splines export as splines, with a polyline option (Verified, [O6]). Bend lines sit on layers `SHEETMETAL_BEND_LINES_DOWN` and `_UP` (Reported, [O5]).

**Text.** Sketch text arrives as many short straight segments, with no explode-text equivalent (Reported, [O7]).

## Common problems

- **Open contours.** Rectangles arrive as separate lines [O12] (Reported). Fusion flat patterns can show broken lines [A7] (Verified). LightBurn auto-close joins the wrong things when set too coarse [L2] (Reported).
- **Duplicate lines.** Reported causes: two layers [O8], fill plus stroke, front and back outlines [L1]. LightBurn's dedupe needs near-exact matches [L1]. Projected geometry plus the original in one sketch is another likely cause (Inferred).
- **Splines unsupported.** Fusion degree 5 [F1], Inkscape [F5] (Reported). Autodesk itself says to convert for laser cutters [A2] (Verified).
- **Scale errors.** Factor 10 from Fusion centimeters [A5] (Verified). Factors 25.4 and 1000 from Onshape's inches header and meter drawings [O3, O4]. Some laser software ignores the header [O3] (Reported).
- **Text.** Shops ask for outlines [L3] (Reported). Neither CAD is documented to give TEXT entities for sketch text.
- **FRC prevalence (Inferred, no source).** Most plates are circles, slots and filleted pockets, so LINE, ARC and CIRCLE dominate. Splines should be a minority: logos, text, hand-drawn lightening shapes, curves projected from 3D. Ellipses should be rare (a circle projected at an angle, or the ellipse tool). The danger is a silently dropped spline: a plate cut missing a feature.

## Implications for the PRD

- **Requirement 1 (entities).** Must: LINE, ARC, CIRCLE, LWPOLYLINE with bulges, POLYLINE with VERTEX (R12 output, Inferred), SPLINE (any degree, fit-point and control-point forms, closed), ELLIPSE (full and partial). Keep INSERT (cheap to flatten). Ignore and count HATCH (no evidence either CAD writes it for sketches), POINT, DIMENSION, TEXT, MTEXT. Honor the extrusion direction (codes 210/220/230) and drop Z; Onshape's normals option exists for a reason [O1]. Never skip an entity silently.
- **Requirement 2 (tolerance).** 0.001 in suits line and arc sketches (Inferred). Spline-to-polyline joints may need more, so make it adjustable up to about 0.01 in and report "joined N pairs, largest gap X". Apply it in physical units after the unit decision, since a wrong unit makes it 25.4x off. Do not default higher; coarse values mis-join [L2].
- **Requirement 3 (units).** The header is a default, never a decision. Handle `$INSUNITS` 1, 4, 5 and 6, not only inches and millimeters. Always show size in inches, and flag when another factor (10, 25.4, 1000) gives a size that fits the bed (Inferred). Expect missing headers on R12 files (Inferred).
- **Issue 8.** Rank SPLINE first, then ELLIPSE, INSERT, HATCH. Tie the status to fixture 17.
- **Issue 10.** Warn on open contours, exact and reversed duplicates, partial collinear overlaps, and shapes repeated on two layers. Offer one-click removal. Hide bend and construction layers by default.
- **Is the raw test DXF realistic?** Partly. It matches a plain sketch export: millimeters, loose LINEs, CIRCLE, layer 0, positive coordinates. It lacks a wrong or centimeter header, endpoint gaps, splines, other versions (2013 drawings, 2018 Onshape default, R12), extra layers, Z and normals, and an origin away from the corner (Inferred). Use it as a happy-path import check only; passing Step 0 on it says nothing about spline files.

## Recommended test fixtures

1. `fusion_sketch_mm`: LINE, ARC, CIRCLE, `$INSUNITS` 4.
2. `fusion_export_cm`: `$INSUNITS` 5, coordinates in cm.
3. `onshape_header_inches_coords_mm`: header 1, mm coordinates.
4. `onshape_meters`: a 280 mm part as 0.28 units.
5. `r12_no_insunits`: POLYLINE/VERTEX/SEQEND with bulges, no unit header.
6. `spline_set`: degree 3, degree 5, fit-point only, closed, rational, and the same shape pre-converted to polyline.
7. `ellipse_set`: full, partial, rotated.
8. `flat_pattern_layers`: outer, inner, bend, extent, text layers; Onshape `SHEETMETAL_BEND_LINES_*`.
9. `duplicates`: exact, reversed, partial overlap, same shape on two layers.
10. `gaps`: endpoint gaps of 0.0001, 0.001, 0.005, 0.02 in, plus a tangent arc-to-line joint.
11. `open_contour`: one side missing.
12. `nested_loops`: plate, hole, island inside the hole.
13. `z_and_normals`: ARC and CIRCLE with extrusion (0,0,-1), constant nonzero Z, drawing views at different Z.
14. `drawing_extras`: DIMENSION, TEXT, MTEXT, scaled INSERT, HATCH, POINT, dashed construction lines.
15. `text_as_segments`: hundreds of short LINEs forming letters.
16. `far_from_origin`: negative coordinates and a 10000 mm offset.
17. `real_exports`: one per route (Fusion sketch, flat pattern with and without polylines, drawing; Onshape sketch, face, drawing, flat view) from a real Rambots part, with CAD version and dialog settings noted. Highest priority.

## Sources

- A1 [Export sketch as DXF](https://help.autodesk.com/view/NINVFUS/ENU/?guid=GUID-BC1A5C26-F7DC-499B-8411-5C191784BA3D)
- A2 [Export flat pattern as DXF](https://help.autodesk.com/view/NINVFUS/ENU/?guid=GUID-9C211F95-7739-460F-BCA4-100AF6A444A2)
- A3 [Drawing export to DXF](https://help.autodesk.com/view/NINVFUS/ENU/?guid=DWG-EXPORT-DXF)
- A4 [Files in centimeters](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/DXF-and-DWG-files-are-in-centimeters-when-exported-from-Fusion-360.html)
- A5 [DXF wrong size](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Exported-DXF-from-Fusion-360-is-the-wrong-size-in-another-program.html)
- A6 [3D DXF from drawing](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Exporting-Fusion-360-drawing-to-DXF-is-producing-a-3D-DXF.html)
- A7 [Missing flat pattern entities](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Missing-lines-in-a-DXF-file-created-from-a-sheet-metal-flat-pattern-in-Fusion-360-displayed-in-a-third-party-CAD-software.html)
- A8 [Export text as DXF](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/How-to-export-text-as-DXF-in-Fusion-360.html)
- A9 [Export design to DXF](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Converting-Fusion-360-to-DWG-or-DXF.html)
- F1 [Missing spline](https://forums.autodesk.com/t5/fusion-support-forum/missing-spline-when-exporting-sketch-as-dxf/m-p/12075240)
- F2 [Fit point problems](https://forums.autodesk.com/t5/fusion-support-forum/dxf-fit-point-export-problems/m-p/9000343/highlight/true)
- F3 [Incorrect units](https://forums.autodesk.com/t5/fusion-support-forum/incorrect-units-on-export/td-p/12331375)
- F4 [Disconnected lines](https://forums.autodesk.com/t5/fusion-support-forum/dxf-export-has-disconnected-and-misaligned-lines/m-p/8793500)
- F5 [Spline for Inkscape](https://forums.autodesk.com/t5/fusion-support-forum/export-dxf-with-spline-for-inkscape/m-p/7666050/highlight/true)
- F6 [Arc to line segments](https://forums.autodesk.com/t5/fusion-360-design-validate/dxf-export-changes-arc-to-line-segments/td-p/7310127)
- O1 [Onshape help: Exporting a Drawing](https://cad.onshape.com/help/Content/Drawing/exporting_a_drawing.htm)
- O2 [Onshape help: Exporting Files](https://cad.onshape.com/help/Content/File/exporting_files.htm)
- O3 [Wrong units](https://forum.onshape.com/discussion/18282/dxf-file-export-in-wrong-units)
- O4 [Reddit mirror: Onshape DXF problem](https://redlib.hbubli.cc/r/Onshape/comments/1kvt06p/dxf_export_problem)
- O5 [Fold lines](https://forum.onshape.com/discussion/8101/how-do-i-remove-fold-lines-when-exporting-a-dxf)
- O6 [Onshape: What's New, July 2018](https://www.onshape.com/en/resource-center/what-is-new/whats-new-in-onshape-july-12-2018)
- O7 [Joining text](https://forum.onshape.com/discussion/7192/joining-text)
- O8 [Overlapping lines, layers](https://forum.onshape.com/discussion/27801/how-to-remove-overlapping-sketch-lines-and-sketch-to-dxf-producing-multiple-layers)
- O9 [Xometry: Export DXF from Onshape](https://www.xometry.com/resources/sheet/exporting-dxf-from-onshape/)
- O10 [Closed point problem](https://forum.onshape.com/discussion/10049/closed-point-problem-exporting-to-dxf-dwg)
- O11 [Piecewise polyline](https://forum.onshape.com/discussion/28253/export-sketch-as-piecewise-polyline)
- O12 [Unconnected lines](https://forum.onshape.com/discussion/comment/128596)
- L1 [LightBurn forum: Multiple lines](https://forum.lightburnsoftware.com/t/dxf-and-multiple-lines-revisited/135764)
- L2 [LightBurn forum: Dotted shapes](https://forum.lightburnsoftware.com/t/dxf-import-shows-shapes-dotted/16876)
- L3 [SendCutSend: Fusion sketch to DXF](https://sendcutsend.com/blog/create-and-export-a-sketch-to-dxf-from-fusion-360/)

## CHANGELOG

- v1.0 (2026-10-30): Initial release.
