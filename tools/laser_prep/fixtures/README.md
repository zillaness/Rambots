---
file: README.md
version: 1.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: What the DXF fixture library is, how to regenerate it, and how an implementation should use expected_results_v1.1.json.
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# DXF fixtures for the laser prep app

Small DXF files, each built to test one thing the app's core must handle (see `../laser_prep_core_design_v1.0.md`, sections 3 to 5). They are test data only; the app is not built yet.

`expected_results_v1.1.json` holds the answer for each file: loop count, open chain count, nesting depths, warning counts, and overall size in inches. The counts are written by hand from how each fixture is built, so they test an implementation instead of copying one. The generator re-reads every file with ezdxf, audits it, and checks the measured size against the hand-written size before it finishes.

| Fixture | What it tests |
|---|---|
| f01 | Four LINEs, exact corners |
| f02 | 1e-6 in gaps (floating point noise) must join |
| f03 | 0.005 in gap: not joined, reported as almost closed |
| f04 | Open contour |
| f05 | Branch point (three lines meet): chains stay open |
| f06 | Exact duplicate line, reversed |
| f07 | Partial collinear overlap: reported, not fixed |
| f08 | Plate, holes, pocket, island: depths 0 / 1 / 2 |
| f09 | LWPOLYLINE bulge corners |
| f10 | Slot from loose LINEs and ARCs |
| f11 | ARC with extrusion (0,0,-1): mirrored coordinates |
| f12 | SPLINE with control points and knots |
| f13 | ELLIPSE |
| f14 | Blocks inside blocks, scaled and rotated |
| f15 | Millimeters ($INSUNITS 4) |
| f16 | No units (R12): the app must ask |
| f17 | TEXT and MTEXT: skipped with a count |
| f18 | R12 POLYLINE with VERTEX bulges |
| f19 | MINSERT array |
| f20 | Centimeters ($INSUNITS 5), Fusion File > Export case |
| f21 | Header says inches over millimeter coordinates (Onshape case): the app suggests a unit factor |
| f22 | Meters ($INSUNITS 6) |
| f23 | Degree 5 SPLINE |
| f24 | Rational SPLINE (exact circle) |
| f25 | SPLINE with fit points only: interpolate and warn |
| f26 | Half ELLIPSE, rotated 30 degrees |
| f27 | Sheet metal bend lines on their own layers: set aside, not joined |
| f28 | Same square on two layers: four duplicates |
| f29 | Gaps of 0.0001, 0.0009, 0.005, 0.02 in |
| f30 | Nonzero Z and a mirrored circle at another height |
| f31 | Coordinates far from the origin (mm) |
| f32 | DIMENSION, POINT, HATCH: counted by type and skipped |
| f33 | Circle made of 360 short LINEs |

## Regenerate

```bash
pip install ezdxf
```

```bash
python3 make_fixtures_v1.1.py
```

Check the expected results against the rules (a test oracle, not the app):

```bash
python3 reference_check_v1.1.py
```

## Using the expected results

For each entry in `fixtures`: parse the file, join, nest, and compare. Sizes match within `sizeTolerance`. Counts listed under `defaults.omittedCountsMeanZero` are zero when a fixture leaves them out, and `ignored` and `unitSuggestions` are empty. `depths` is sorted. `defaults` also holds the reference-layer words and the unit plausibility rule (bed, minimum size, factors) the expectations assume. Fixtures f01 to f19 come from the core design; f20 to f33 come from the CAD export research's fixture list. The research's top item, real exports of team parts, cannot be synthesized and is still needed.

## CHANGELOG

- v1.0 (2026-10-30): Initial release, 19 fixtures.
- v1.0.1 (2026-10-30): Added reference_check_v1.0.py; f18 expected results fixed (units missing).
- v1.1 (2026-10-30): Added f20 to f33 from the CAD export research, new expected-result fields, generator and oracle v1.1. All 33 agree with the oracle.
