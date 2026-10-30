---
file: BURNDOWN.md
version: 1.0
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Token burndown ledger for the laser prep project on branch claude/elegant-feynman-q7xk18.
ai_update: Append ledger lines as units finish; keep the NEXT line current; fill Handoff at the end.
---

# Burndown: 2026-10-30 (reset: not given; weekly usage 76% at start)

Scope: laser prep project only (`tools/laser_prep/`). Two other burndown tasks run elsewhere, so this one stays on this branch.
Not in scope at start: building the app. Changed later in the night: Sam set a goal to build a functional prototype (see ledger). Nothing outward-facing.
Phase 0 usage experiments: skipped, the user is asleep and cannot read `/usage`.

## Queue (ranked by value per token)

1. Ledger (this file)
2. Research: ULS direct file import (formats, color handling, raster vs vector, versions) [subagent]
3. Research: Fusion 360 and Onshape DXF export behavior [subagent]
4. Research: Windows print path for Chrome, Edge, and Adobe Reader to vector laser drivers [subagent]
5. Test card additions for the visit: R12 DXF variant, curves DXF (bulge arcs, spline, ellipse), README expectations updated with research
6. Core technical design doc (shared by Options A, E1, E2)
7. DXF fixture library for future app tests (synthetic CAD-like edge cases with expected results)
8. Handoff
9. Functional prototype (added by Sam's goal): app/src modules, build to one offline HTML, fixture test runner, browser smoke test

## Ledger

- 10:06 ✅ ledger started
- 10:06 ✅ research subagents dispatched (ULS import, CAD DXF export, print path)
- 10:08 ✅ R12 and curves DXF probes for the test card, committed 5660df1
- 10:10 ✅ core technical design draft, committed 98a09dd
- 10:12 ✅ DXF fixture library (19 fixtures, expected results, self-check), committed d2b59fe
- 10:14 ✅ fixture oracle (19/19 agree after fixing f18 expectation, v1.0.1), committed 3907e1c
- 10:14 ✅ ULS direct import research reviewed, committed dbf2a27
- 10:15 ✅ DXF color-code probe (entity ACI, layer color, true color), committed 856bb04
- 10:15 ✅ CAD DXF export research reviewed, committed c399bd2
- 10:17 ✅ print path research reviewed + test card v1.1 (README, HTML, zero-width option), committed 5094519
- 10:18 ✅ core design v1.1 (research folded in), committed d1fe682
- 10:21 ✅ fixture library v1.1 (33 fixtures, oracle 33/33), committed df2e7b6
- 10:22 ✅ proposed PRD v1.2 change list (28 items), committed e3b944c
- 10:26 ✅ draft handoff written
- 10:26 ⚑ SCOPE CHANGE: Sam set the goal "functional prototype without asking me". Building the app is now authorized (prototype v0.1, HTML route, per core design v1.1).
- 10:37 ✅ prototype v0.1 working: app/laser_prep_v0.1.html; fixtures 33/33, outputs 33/33 valid, browser 17/17; committed 272d082
- 10:40 ✅ app README committed 91f0e63
- 10:40 ✅ test card v1.2 from the independent review (scaling guard, plain DXF, real extents, per-route measuring), committed 62a7e9a
- 10:40 ▶ NEXT: app v0.2 (PrintScaling None and real DXF extents in app output, keep colors across bed changes already), then final handoff

## Handoff

**Done tonight (all committed and pushed to `claude/elegant-feynman-q7xk18`):**

- Test card v1.1 (`tools/laser_prep/test_card/`): HTML page, 6 DXFs (colored, R12, raw mm, curves, color codes), README checklist with tables for every probe. PDF, SVG, and Chrome print output checked in headless Chromium.
- Research (`tools/laser_prep/research/`): ULS direct import, Fusion and Onshape DXF export, Windows print path. Each labels findings Verified, Reported, or Inferred.
- Core design v1.1 (`tools/laser_prep/laser_prep_core_design_v1.1.md`): shared engine for Options A, E1, E2; effort 25 to 39 hours.
- Fixture library v1.1 (`tools/laser_prep/fixtures/`): 33 DXFs with hand-written expected results and an ezdxf oracle that agrees with all 33.
- Proposed PRD v1.2 changes (`tools/laser_prep/prd_v1_2_proposed_changes_v1.0.md`): 28 items, kept out of the PRD because v1.1 is unapproved.

**Biggest findings:**

- DXF import into UCP is vectors only (ULS); PDF carries raster too. E1 should save PDF.
- Direct import may be a paid "Direct Import Package" (System tab, 30-day trial in one manual). Check it first at the visit; ask a mentor before any trial.
- No evidence UCP can recolor imported objects, so Option 0 (raw CAD DXF straight into UCP) is unlikely.
- Never trust the DXF units header: Fusion File > Export writes cm; Onshape reportedly writes an inches header over mm coordinates.
- Chrome's print engine never draws a line under one printer pixel; driver DPI decides the real hairline. Reader is the commonly reported working print route.

**Waiting on Sam:**

1. Approve, edit, or reject PRD v1.1 (`laser_prep_app_prd_v1.1.md`); v1.0 is still beside it until then.
2. Then accept or reject the 28 proposed v1.2 changes.
3. Laser PC visit with the test card README; bring back tables, screenshots, a photo of the cut card, and real CAD exports.
4. Optional: allow ulsinc.com (and the other hosts named in the research reports) in this environment's network settings so the excerpt-based findings can be checked against full pages.

**Not done, on purpose:** no app code (architecture waits on the visit and approval); nothing outward-facing; Phase 0 usage experiments skipped (no one awake to read `/usage`).

**Suggested next session start:** read this handoff, then the visit results if they exist; update the PRD with the route Section 6 picks; build from the core design using the fixtures as the test suite.

## CHANGELOG

- v1.0 (2026-10-30): Ledger started.
