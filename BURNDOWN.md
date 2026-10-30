---
file: BURNDOWN.md
version: 1.1
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
- 10:42 ✅ app v0.2 committed 39ee9fb; proposed PRD changes v1.1 committed 783f3c5
- 10:42 ✅ handoff rewritten; goal met: functional prototype tested end to end
- 11:07 ✅ PRD v1.2 drafted after Sam's interview: v1.1 approved, 30 changes applied, Phase 2 section (9 features) added; v1.0 and v1.1 retired
- 11:10 ✅ PRD v1.3: bed sizes by ULS model (24 x 18 default), align to grid, resize CAD with warning (last), read colors and layers, CutSheetCalculator reuse for nesting, labels, and fonts
- 11:10 ▶ NEXT: Sam reviews PRD v1.3; laser PC visit with test card v1.2 (read the nameplate model)

## Handoff

**Done tonight (all committed and pushed to `claude/elegant-feynman-q7xk18`):**

- **Working prototype** (`tools/laser_prep/app/laser_prep_v0.2.html`, one offline file): load DXF or SVG, confirm units, click outlines and insides to set cut / score / engrave, see checks, save PDF (main route), R12 DXF, SVG, or print at true size. Tests: fixtures 33/33, written outputs 33/33 valid (strict PDF, four colors only, size and position, DXF audit), browser checks 17/17. Built by Sam's goal set mid-night; see the ledger.
- **Test card v1.2** (`tools/laser_prep/test_card/`): HTML page plus 6 DXF probes (plain, colored, R12, raw mm, curves, color codes) and a README checklist, revised after an independent review (no-scaling PDF preference, full print settings for every route, per-route measuring on fresh scrap, plain DXF first, real header extents).
- **Research** (`tools/laser_prep/research/`): ULS direct import, Fusion and Onshape DXF export, Windows print path, each with Verified / Reported / Inferred labels.
- **Core design v1.1** (`tools/laser_prep/laser_prep_core_design_v1.1.md`) and **fixture library v1.1** (`tools/laser_prep/fixtures/`, 33 DXFs, expected results, ezdxf oracle 33/33).
- **Proposed PRD v1.2 changes** (`tools/laser_prep/prd_v1_2_proposed_changes_v1.1.md`): 30 items, kept out of the PRD because v1.1 is unapproved.

**Biggest findings:**

- DXF import into UCP is vectors only (ULS); PDF carries raster too. The app saves PDF by default.
- Direct import may be a paid "Direct Import Package" (System tab, 30-day trial in one manual). Check it first at the visit; ask a mentor before any trial.
- No evidence UCP can recolor imported objects, so raw CAD DXF straight into UCP (Option 0) is unlikely.
- Never trust the DXF units header: Fusion File > Export writes cm; Onshape reportedly writes an inches header over mm coordinates. The app makes every file's units a confirm step.
- Chrome's print engine never draws a line under one printer pixel; driver DPI decides the real hairline. Reader is the commonly reported working print route.

**Waiting on Sam:**

1. Try the prototype on a real team part: open `app/laser_prep_v0.2.html`, load a Fusion or Onshape DXF, color it, save the PDF.
2. Laser PC visit with `test_card/README.md`; bring back the tables, screenshots, a photo of each route's cut piece, and real CAD exports. The visit decides which output button is the main path.
3. Done 2026-10-30: v1.1 approved and the 30 changes applied in the PRD (now `laser_prep_app_prd_v1.3.md`), which adds Phase 2 (Section 11), bed sizes (Appendix A), and CutSheetCalculator reuse (11.1). Review it, especially Section 11.
4. Optional: allow ulsinc.com and the other hosts named in the research reports in this environment's network settings, so excerpt-based findings can be checked against full pages.

**Known gaps in the prototype:** never run against UCP or the ULS driver; no real CAD exports tested; changing units or join tolerance resets colors; text is skipped; overlap check skipped above 4000 lines. Full list in `app/README.md`.

**Not done, on purpose:** nothing outward-facing (no PRs, no Pages deploy to `presentations`); Phase 0 usage experiments skipped (no one awake to read `/usage`).

**Suggested next session start:** read this handoff, then the visit results if they exist; update the PRD with the route the visit picks; adjust `app/src/writers.js` to match (DXF version and color form, or print-first); test with real exports.

## CHANGELOG

- v1.0 (2026-10-30): Ledger started.
- v1.1 (2026-10-30): Handoff rewritten for the prototype, test card v1.2, and proposed PRD changes v1.1.
