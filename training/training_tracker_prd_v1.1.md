---
file: training_tracker_prd_v1.1.md
version: 1.1
author: Sam Cao
created: 2026-10-08
last_updated: 2026-10-09
description: Draft PRD for the Rambots 30/60/90 training tracker and tool QR lookup, built on preseason_readiness_list_v1.0.md. Awaiting sign-off; nothing is built yet.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# 30/60/90 Training Tracker: PRD (Draft)

**Status:** draft, awaiting sign-off. Source checklist: `preseason_readiness_list_v1.0.md`.

## Current workflow

### Training

- Preseason training runs Mon and Fri, 3:30 to 6:30. Each night has a different mentor crew.
- Nothing records what was taught or who can now do it. The master timeline has an open reminder to "log build preseason lessons in progress." The Monday crew can't see what the Friday crew verified, and the reverse.
- Readiness is judged by impression. Tool certification is the only hard gate today.
- Past debriefs name the same gap: "no clear goals/checkpoints for training or progress" (23-24), summer CAD "seems to not have stuck" (2025), and students not updating their own tasks.

### Tools

- No per-tool record exists. Gary's power tool training on Oct 25, 2025 ended with an action item that is still open a year later: "establish system to show which tools training students have completed, mark on safety glasses maybe?" (Coda: Logistics > Newsletter Notes).
- The tool quiz (`Tool_Quiz.docx`) is a written identification test covering drivers, pliers, power tools, parts, hand tools and safety. Passing it shows a student can name tools. It doesn't show they've been checked out on a specific machine.
- Per the Sep 2026 safety deck, a mentor monitors all power tool use. So the question at a tool is "has this student been checked out on this tool?" It is never "can they use it alone?"

**Where it breaks:** the team now has the list. What's missing is per-student visibility: which items are verified, which are due, and, for tools, an answer a mentor can get while standing at the machine.

## Problem

There's no shared record, per student, of which readiness items and tool checkouts have been verified. Gaps surface at Kickoff Sim or at competition, when they cost the most to fix. At the tool itself, a mentor has to rely on memory or on the student's word.

## Success criteria

1. Every active member has every item that applies to them, each with a checkpoint due date.
2. A mentor can sign off an item from a phone during a meeting in under 30 seconds.
3. At each checkpoint, one view shows who is behind, grouped by subteam.
4. A student can see their own progress and what's due next without asking.
5. A mentor standing at a tool can scan its QR code and see who is checked out on it within 10 seconds.
6. The page the QR opens is also where the mentor records a new checkout. The place you check is the place you record.

## Scope

**In (v1):**
- Readiness items
- Member roster with subteams
- Sign-offs (who verified what, and when)
- Three checkpoints
- Views by student, by subteam and by checkpoint
- Tool list with tiers
- Tool checkouts
- One QR label per tool, with a printable label sheet

**Out (v1):**
- Lesson plans and curriculum content
- Attendance
- Grades or rankings
- Automated reminders
- Mentor training
- NFC tags
- Physical tool lockouts
- Automatic checkout expiry

## Constraints

- Students are minors. Store names, subteam and skill status only: no contact info, no grades.
- Has to work on a phone in the shop.
- Has to live somewhere students already use. The list itself requires students to use Coda.
- Both mentor crews write to it.
- One source of truth. Tool checkouts live inside the tracker, not in a separate spreadsheet. Otherwise the readiness item "passed the tool quiz for every tool they use" has two answers that drift apart.
- QR labels sit in a room that gets visitors (Open House, accreditation visits). Anyone can photograph a label.

## Checkpoints (dates provisional)

**The dates need checking.** The checkpoint dates in v1.0 came from the master timeline. Its Sep to Nov dates match the 2025 schedule in the "Preseason 26 Training" doc:

| Event | Timeline says | Weekday in 2025 | Weekday in 2026 |
|---|---|---|---|
| Preseason start (Mon/Fri meetings) | Sep 15 | Mon | **Tue** |
| Team bonding (Friday, no school) | Oct 10 | Fri | **Sat** |
| Kickoff Sim (Saturday session) | Oct 25 | Sat | **Sun** |
| Sim Game (Saturday) | Nov 22 | Sat | **Sun** |

Kickoff on Jan 9, 2027 (a Saturday) looks right. The plan keeps the same shape, with each checkpoint landing just before an event:

| Checkpoint | Lands before | Purpose |
|---|---|---|
| Day 30 | Kickoff Sim | Baseline gate: safe and functional in the shop. Tier 2 tool checkouts done. |
| Day 60 | Sim Game | Core subteam skills |
| Day 90 | Winter break, with buffer before Kickoff (Jan 9) | Depth, plus skills that need the Sim Game or accumulated reps |

Real dates go in once this year's preseason start, Kickoff Sim and Sim Game dates are confirmed. If the day counts and the events disagree, the events win.

## Proposed item mapping

| Area | Day 30 | Day 60 | Day 90 |
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

Counts: 73 items, all mapped. A baseline-only member has 17 items at Day 30 and 7 at Day 60. A business member adds 5, 6 and 1. Tool checkouts are tracked separately (next section). They aren't on a checkpoint, because a student only needs a checkout for the tools they'll actually use.

## Tool QR lookup

**The ask:** a QR code next to each tool. A mentor scans it and sees who is trained on that tool.

**What the QR opens:** one page per tool, showing:
- Tool name, tier, and what the checkout requires (watch a demo, then use it under supervision)
- Every student checked out on it, with the date and the mentor who signed
- A "Check out a student" form

The form is the part that keeps this working. The mentor who just watched a student's first supervised use records it on the same page the QR opened. If recording happens anywhere else, the list goes stale. A stale list is worse than none, because mentors will trust it.

**The label:**
- Tool name
- QR code
- "Not on the list? Don't use it. Find a mentor."
- Rambots red and yellow, laminated

The label itself reminds students of the rule even when nobody scans it.

### Tiers (proposal)

| Tier | Tools | Who checks out | QR? |
|---|---|---|---|
| 1: Hand tools | Drivers, pliers, measuring and layout | Covered by the tool quiz and the baseline items | No |
| 2: Common power and fabrication | See list below | Any mentor | Yes |
| 3: High-risk | Table saw, circular saw, bench grinder, angle grinder | A named mentor only (Gary?) | Yes |

### Draft tool list (16 QR codes)

Built from Gary's Oct 2025 power tool order, the Preview Day rotations and the soldering training:

| Tool | Source | Proposed tier |
|---|---|---|
| Cordless drill | Gary #1 | 2 |
| Impact driver | Gary #2 | 2 |
| Drill press | Gary #3 | 2 |
| Miter saw | Gary #4 | 2 |
| Table saw | Gary #5 ("optional") | 3 |
| Jigsaw | Gary #6 | 2 |
| Circular saw | Gary #7 | 3 |
| Cordless ratchet | Gary #8 | 2 |
| Rotary tool (Dremel) | Gary #9 | 2 |
| Bench grinder | Gary #10 ("optional") | 3 |
| Angle grinder | Gary: "skip unless needed" | 3, or not trained this season |
| Laser cutter | Preview Day | 2 (never left unattended) |
| 3D printers | Preview Day | 2 (one label for the printer area) |
| Vinyl cutter | Preview Day | 2 |
| Heat press | Preview Day | 2 |
| Soldering station | Sep 2025 soldering training | 2 |

This list needs checking against what's actually in Room 104.

### Access

| Option | For | Against |
|---|---|---|
| **Login required (recommended)** | Only team members see student names. | Each mentor logs in once on their phone. |
| Anyone with the link | Zero friction | Anyone who photographs a label (Open House visitors, accreditation guests) can see minors' names and training status. |

### Cheap complement (not in v1)

Last year's safety-glasses idea still works alongside the QR codes. A colored band on a student's own safety glasses, by tier, is visible from across the room. The QR code answers "checked out on *this* tool?" The band answers "checked out on anything?" at a glance.

## Recommended home: Coda (needs your approval)

| Option | For | Against |
|---|---|---|
| **Coda (recommended)** | Students already work there (Grants 2027, Logistics, Drafts docs). "Update your own task in Coda" is itself a readiness item. Each tool is a row, and the QR opens that row, with its live checkout list and a form. Claude can build it directly through the connected Rambots Coda. | Every mentor needs a Coda account invited to the doc before their QR scans work. The row links opening cleanly on a phone needs confirming in the dry run. |
| Google Sheet | Mentors almost certainly have Google accounts. Fastest to build. Matches the word "spreadsheet." | Each QR opens a per-tool filter view, which is clunky in a phone browser (better in the Sheets app). Checkouts would go through a linked Google Form. Per-student views are weak. |
| Shared web page (Claude artifact) | Fully custom, fast tap-to-sign-off on a phone. | A new tool for everyone, and its data sits outside the team's existing docs. |

Whichever home you pick holds both the tracker and the tool checkouts. Splitting them breaks the one-source-of-truth constraint. If you'd rather it all be a Google Sheet, that's workable. The tradeoff is weaker phone views and per-student pages.

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
- **Tools:**
  - Name
  - Location in Room 104
  - Tier
  - Checkout requirements
  - Who can check out
  - QR link (to this row)
  - Checked out (a formula listing current checkouts)
- **Tool checkouts:**
  - Member
  - Tool
  - Date
  - Checked out by
  - Note
- **Views:**
  - My progress (per student)
  - Due this checkpoint
  - Behind, by subteam
  - Tonight's sign-offs (for the mentor on shift)
  - One page per tool (what the QR opens)
  - Checkout matrix: students × tools

## Plan

1. Sign off this PRD, including the home, the real dates, the tool list and QR access.
2. Lock the item mapping and tool tiers.
3. Build the tables and views.
4. Load the 73 items and the confirmed tool list.
5. Load the roster. It comes from you; Coda has no members table.
6. Generate the QR labels. They can only be made after step 3, because each label encodes its tool's real page link.
7. Back-fill tool checkouts from mentor memory. Mark these "back-filled" so they can be re-verified.
8. Dry run at one meeting:
   - Two mentors sign off 5 students each.
   - One mentor scans three tool labels from a phone.
9. Print, laminate and mount the labels.
10. Run the Day 30 verification pass.

## Open questions

**Blocking the build:**

1. **This year's dates.** When did preseason training actually start, and when are Kickoff Sim and the Sim Game?
2. **Home.** Coda (recommended) or Google Sheet? The choice covers both the tracker and the tool checkouts.
3. **Who verifies readiness items?** Recommendation: a mentor or subteam lead verifies. Students can mark "ready for check" but can't verify their own.
4. **Returning members.** Do they redo every item and tool checkout, or test out by demonstrating at the Day 30 pass?
5. **Roster.** Where is this year's member list?
6. **Tools.** Strike or add from the 16 above, confirm the tiers, and name who can check out Tier 3.
7. **QR access.** Login required (recommended) or anyone with the link?

**Can wait (carried over from the readiness list):**

8. Hard gates beyond tool certification. This becomes a column you can set later.
9. Merge electrical and programming, or keep them separate?
10. Which end of the 2026 debrief's 1 to 5 scale is good?
11. Do tool checkouts expire each season? Default for v1: they're valid for the season.

## CHANGELOG

- v1.0 (2026-10-08): Initial draft. Maps the readiness list onto 30/60/90 checkpoints, recommends Coda as the home, and lists the questions blocking the build.
- v1.1 (2026-10-09): Added the tool QR lookup: tiers, a draft list of 16 tools, access options, the label, and a check-and-record-in-one-place design. Added the Tools and Tool checkouts tables. Flagged that the checkpoint dates came from last year's schedule; the dates are provisional and the checkpoints are now tied to events. Updated success criteria, scope, constraints, plan and open questions.
