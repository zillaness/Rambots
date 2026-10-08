---
file: training_tracker_prd_v1.0.md
version: 1.0
author: Sam Cao
created: 2026-10-08
last_updated: 2026-10-08
description: Draft PRD for the Rambots 30/60/90 training tracker, built on preseason_readiness_list_v1.0.md. Awaiting sign-off; nothing is built yet.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# 30/60/90 Training Tracker: PRD (Draft)

**Status:** draft, awaiting sign-off. Source checklist: `preseason_readiness_list_v1.0.md`.

## Current workflow

- Preseason training has run Mon and Fri, 3:30 to 6:30, since Sep 15. Each night has a different mentor crew (Mon: Rodney Lim, Sam Cao, John Keck, Earl Chen. Fri: Augustine Ng, Jason Hom, Lauren Chan).
- Nothing records what was taught or who can now do it. The master timeline has an open reminder to "log build preseason lessons in progress." The Monday crew can't see what the Friday crew verified, and the reverse.
- Readiness is judged by impression. Tool certification (no tool use without it after Oct 1) is the only hard gate today.
- Past debriefs name the same gap: "no clear goals/checkpoints for training or progress" (23-24), summer CAD "seems to not have stuck" (2025), and students not updating their own tasks.

**Where it breaks:** the team now has the list (`preseason_readiness_list_v1.0.md`). What's missing is per-student visibility: which items are verified, which are due, and who is falling behind before it shows up in build season.

## Problem

There's no shared record, per student, of which readiness items have been verified and by when they're due. Gaps surface at Kickoff Sim or at competition, when they cost the most to fix.

## Success criteria

1. Every active member has every item that applies to them, each with a checkpoint due date.
2. A mentor can sign off an item from a phone during a meeting in under 30 seconds.
3. At each checkpoint, one view shows who is behind, grouped by subteam.
4. A student can see their own progress and what's due next without asking.
5. The Day 30 check happens before Kickoff Sim (Oct 25). The Day 90 check happens before winter break.

## Scope

**In (v1):**
- Readiness items
- Member roster with subteams
- Sign-offs (who verified what, and when)
- Three checkpoints
- Views by student, by subteam and by checkpoint

**Out (v1):**
- Lesson plans and curriculum content
- Attendance
- Grades or rankings
- Automated reminders
- Mentor training

## Constraints

- Students are minors. Store names, subteam and skill status only: no contact info, no grades.
- Has to work on a phone in the shop.
- Has to live somewhere students already use. The list itself requires students to use Coda.
- Both mentor crews write to it.

## Proposed checkpoints (Day 0 = Sep 15, preseason start)

| Checkpoint | Date | Lands before | Purpose |
|---|---|---|---|
| Day 30 | Thu Oct 15 (check Fri Oct 16 or Mon Oct 19) | Kickoff Sim, Oct 25 | Baseline gate: safe and functional in the shop |
| Day 60 | Sat Nov 14 | Sim deadline Nov 21, Sim Game Nov 22 | Core subteam skills |
| Day 90 | Mon Dec 14 | Kickoff Jan 9 (3+ weeks of buffer) | Depth, plus skills that need the Sim Game or accumulated reps |

The Sep 15 start answers the list's Open Question 1 with both dates: readiness gets tested before the simulation (Day 30), and the end goal stays kickoff (Day 90). The cost: today is day 23, so Day 30 is a week away. Many Day 30 items were likely covered already (Sep 3 safety quiz, Sep 9 onboarding, Oct 11 Preview Day). That makes Day 30 mostly a verification pass, not new teaching.

The alternative, Day 0 = Oct 8, puts the checkpoints on Nov 7, Dec 7 and Jan 6. It gives more breathing room, but the first check happens after Kickoff Sim has already started.

## Proposed item mapping

| Area | Day 30 (Oct 15) | Day 60 (Nov 14) | Day 90 (Dec 14) |
|---|---|---|---|
| Baseline (all members) | Safety (6), Shop and Tools (5), How the Team Runs (6) | FIRST and FRC Basics (6), Documentation (1) | none |
| CAD | Onshape account, Stage 1A, Stage 1 retention check | Stage 1B, CAD to laser cut to assembled | Wire paths in CAD |
| Fabrication | Preview Day rotations, power tool safety test | 3D printing, laser cutter, drill and tap, material selection | Load-bearing filament and slicer settings, rivet placement |
| Electrical | none | Control system and CAN wiring, pneumatics, motor anatomy, soldering, Battery Beak | Wiring standard, wiring diagram |
| Programming | none | WPILib deploy, PathPlanner path | AdvantageScope logs, preflight and postflight checklists |
| Drive Team | none | none | All 6 (tryouts, reps, field reading, in-match calls, human player, Sim Game) |
| Scouting | none | Scouting app and what data matters | Pick list, process doc location |
| Business | Business onboarding, Business Bible, grant tracker and sponsor database, financial basics, cash handling (needed before Ramathon) | Grant paragraph, sponsor email, cold call, judge practice Round 1, social media strategy, post-event debrief (after Ramathon and Trunk or Treat) | Pit rule |
| Leads | none | none | All 3 |

Counts: 73 items, all mapped. A baseline-only member has 17 items at Day 30 and 7 at Day 60. A business member adds 5, 6 and 1.

## Recommended home: Coda (needs your approval)

| Option | For | Against |
|---|---|---|
| **Coda (recommended)** | Students already work there (Grants 2027, Logistics, Drafts docs). "Update your own task in Coda" is itself a readiness item. Claude can build it directly through the connected Rambots Coda. | Mentors who rarely open Coda would need a link and a short walkthrough. |
| Google Sheet | Mentors already use Sheets (Season Goals Tracker). Fastest to build. | Per-student views and phone sign-off are clumsy. Adds a second place for students to check. |
| Shared web page (Claude artifact) | Fully custom, fast tap-to-sign-off on a phone. | A new tool for everyone, and its data sits outside the team's existing docs. |

Choosing the home constrains everything after it, so it needs your sign-off.

### Data model (Coda)

- **Members:**
  - Name
  - Subteam(s)
  - Status: rookie, returning or lead
  - Active (yes or no)
- **Items:**
  - Text
  - Area
  - Subteam scope (all, or a specific subteam)
  - Checkpoint (30, 60 or 90)
  - Hard gate (yes or no)
  - Source tags
- **Sign-offs:** one row per member per applicable item, with these fields:
  - Status: not started, practicing, ready for check, or verified
  - Verified by
  - Date
  - Note
- **Views:**
  - My progress (per student)
  - Due this checkpoint
  - Behind, by subteam
  - Tonight's sign-offs (for the mentor on shift)

## Plan

1. Sign off this PRD, including the home and Day 0.
2. Lock the item mapping. Edit the table above.
3. Build the three tables and views.
4. Load the 73 items.
5. Load the roster. It comes from you; Coda has no members table.
6. Dry run at one Mon or Fri meeting: two mentors sign off 5 students each.
7. Run the Day 30 verification pass at the Oct 16 or Oct 19 meeting.

## Open questions

**Blocking the build:**

1. Day 0: Sep 15 (recommended) or Oct 8?
2. Home: Coda (recommended), Google Sheet or shared web page?
3. Who verifies? Recommendation: a mentor or subteam lead verifies. Students can mark an item "ready for check" but can't verify their own.
4. Returning members: do they work through every item, or test out of each item by demonstrating it at the Day 30 pass?
5. The roster: where is this year's member list?

**Can wait (carried over from the readiness list):**

6. Hard gates beyond tool certification. This becomes a column you can set later.
7. Merge electrical and programming, or keep them separate?
8. Which end of the 2026 debrief's 1 to 5 scale is good?

## CHANGELOG

- v1.0 (2026-10-08): Initial draft. Maps the readiness list onto 30/60/90 checkpoints, recommends Coda as the home, and lists the questions blocking the build.
