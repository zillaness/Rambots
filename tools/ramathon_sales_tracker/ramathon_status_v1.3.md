---
file: ramathon_status_v1.3.md
version: 1.3
author: Sam Cao
created: 2026-10-16
last_updated: 2026-10-16
description: Source of truth for the Ram-a-thon 2026 tracker: what Sam decided, what Claude suggested or assumed (not confirmed), what is still open, and how to resume work.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom. Keep "Decided by Sam" limited to things Sam actually said.
---

# Ram-a-thon 2026: status and handoff

Event: **Saturday Oct 17, 10:30 AM to 1:00 PM, CCA Hayward.** Tracker **v1.8.2** is live.

## Where things are

| What | Where |
|---|---|
| Live tracker (GitHub Pages, unlisted) | branch `presentations`, folder `ramathon-sales-tracker/` |
| Sales laptop link | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=sales |
| Battle laptop link | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=battle |
| Prize Table laptop link | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=prizes |
| Source (edit here, then copy `index.html`, `sw.js`, `README.md` to the live folder) | branch `ramathon-carnival`, folder `tools/ramathon_sales_tracker/` (the old branch `claude/focused-dirac-gom1ys` is frozen at v1.7.1 and kept until after the event) |
| How to use the tracker | `README.md` in either folder |
| Test suites (Playwright) | `tools/ramathon_sales_tracker/tests/` (see its README) |
| Open-items page with notes and a copy button (private Claude artifact) | https://claude.ai/artifact/JWCsGNL8Jr1nZGgKg1YbEQ |

Deploy rule: copy files with `cp` (rsync is not installed in the cloud container), then compare md5 of each file against `origin/presentations`.

## Decided by Sam

**Booths and laptops**
- Up to 3 laptops, each booth link with its own saved data: Sales (Clickers + Copters), Balloon Battle, Prize Table.
- The Prize Table (cards in, prizes out) replaces tracking Plinko. Plinko tickets are counted from its bucket at the end.
- Everything autosaves in the browser. Undo (and Ctrl+Z) says what it undid. Demographics (age band, gender) are optional.
- Huge buttons. Tap = +1, and quantities can be punched in.

**Sales**
- Clickers: 1 for 4, 2 for 7, 3 for 10, stacking after 3. Show combo deals and average cost per clicker.
- Copters: full kit 5, extra propeller 1, extra toroidal propeller 2, ripcord 1. Toroidal upgrade on a kit is +1. Launcher alone exists (rare).
- Always ask about the toroidal upgrade (with a short explanation) and extra propellers (regular and toroidal).
- Backorders are an interest list only.
- Stock counts per item will come from Sam.

**Goals and clock**
- Goals: clickers 500, copters 500, battle 200, Plinko 100. The top-bar chip shows only the booths that laptop runs.

**Exports**
- CSV names carry kind, booth, station, laptop and date/time. Early and late exports must not double count. The 3 laptops add up.

**Balloon Battle**
- Never more than 1 card per ticket paid out on average. A 9-card prize costs about $5.
- Scoring Sam picked: **3 cards (or vouchers) for every balloon you pop, but only if your robot survives to the end of the match.** Sam also said to keep every scoring option switchable in Settings, and wants to workshop scoring with the business team.
- Flow: choose vs House or vs Player first, record add-ons for each player, add to the queue and collect tickets, then start the match from the queue when ready.
- A started match can be restarted. Sign-ups continue while the countdown stays on top.
- The clock shows Ready until GO. Restart goes back to Ready for free. Pause and edit the clock.
- Match length 2 minutes (custom lengths allowed). Turnaround between matches is 1 to 2 minutes.
- Queue: push someone down if not ready; remove and refund if they are tired of waiting. Show the estimated wait next to the names.
- Weapons: wheel spikes +1, buzz saw +2. A player can take either or both.
- **Weapons unlock once:** pay once, later matches are 5 tix with no weapon charge.
- Upsell weapons: a red Ask line, bright weapon buttons, and a pop-up if a player picked none. Also upsell at the end of the match.
- After a match there are two buttons: **Instant rematch** and **Rematch (back in line)**.
- Instant rematch: Sam said 5 tickets, **once**, and only if the queue isn't too long. Sam later said a 7-ticket premium to cut the line is possible and will ask the business team.
- Scoring script on screen in two places: short on the sign-up panel, full behind the Rules button. The controls script will be written later with Sam.

**Sales add-ons (decided 2026-10-16)**
- Policy: don't discount. If people are unhappy, give extra or a freebie instead.
- Cash: no cash discount (tabled). A small cash-emoji button marks a sale as a cash sale at full price; cash sales count toward the goal. Sales first; Battle only if cash shows up there.
- Free Pokémon card for every 10 tix spent, with a reminder on screen. It costs little and sends kids to Plinko or Balloon Battle.
- 30 tix earns a free prize: 3 free cards. Nothing extra on top. (Claude proposed this reading; Sam approved it.) With the prize prices below, 1 free card is a Small prize and 3 is a Medium prize.
- Prize Table prices: Small 1 card, Medium 3, Grand 9 (Sam said "1 ticket" for the Small prize; the tracker reads it as 1 card).
- The Sales prompts (clicker Ask, copter Ask, free-card box) were too big and covered the panel; v1.8.1 shrinks them.
- The Pokémon card is the voucher (screens keep saying "Pokémon card").
- Creeper infinity fidget cubes go under clickers at the clicker price (mix and match). The booth is "Clickers & Fidget Toys".
- Stock (counted Oct 16): Egg tart 8, Hot dog bun 22, S'mores 9, Chocolate bar 15, Avocado 12, Dumpling 24, Creeper clicker 10, Oreo about 4 (may be slightly defective), Spam musubi 6, Salmon nigiri 23, LEGO brick 4, WD-40 15, Creeper infinity cube about 9. Burger: none printed yet, maybe tonight (button kept, not counted). Copters: launchers 93, ripcords 105, standard propellers 158, fancy (toroidal) propellers 44; the "small" rows (20 standard, 10 fancy) are full size and are included.
- Freebie button: deprioritized for this event. If built later: track only, no cap; at Battle, both a free match and bonus cards.
- Walk-off logging: Sam considers it unnecessary. The button stays and is optional.
- Partner club referrals: an optional tag like the demographics, built only once a partner club agrees. Sam will ask the students which other clubs they are in.
- Source branch renamed `ramathon-carnival`; keep the old branch until after the event.

**Plinko**
- 9 slots. Sam is considering limiting where kids may drop.
- Sam likes a drop multiplier: 3x from the center, 2x next to the center, 1x from the sides.
- **At most 3 cards (or vouchers) per drop.** Some slots should pay stickers.

## Suggested or assumed by Claude (not confirmed by Sam)

Check these with the team. Everything except the Plinko board is a Settings change or a one-line edit.

- **Cash sales (v1.8):** cash is $1 per ticket. The whole sale is cash or tickets (no split payments). Totals keeps cash out of "Tickets that should be in the boxes" and shows it on its own line; the CSV marks each sale row `paid_with` tickets or cash.
- **Free card rule (v1.8):** counted on one customer's Clickers + Copters total (cash sales included), 1 card per full 10 tix, no cap. The panel asks for more when the next card is 1 to 3 tix away. Script line: "Win more at Plinko or Balloon Battle." Rate is in Settings (0 = off).
- **Free card cost:** about $0.56 a card (9-card prize ≈ $5), so about 6% of the ticket money on a sale that earns one.

- **Weapon unlock token.** Claude suggested a sticker or hand stamp so the crew can tell a kid already unlocked a weapon. Not decided. The tracker wording is neutral ("already unlocked"). With no token, the tracker still carries weapons into rematches automatically.
- **Instant rematch defaults:**
  - The "2 or fewer matches waiting" threshold is Claude's number.
  - The "Only one player (vs House)" rematch choice was Claude's addition.
- **Light matchmaking** (Solo sign-ups with a "Pair with ..." button). Sam answered "skip for now"; Claude built it so the crew can use it or ignore it.
- **Wait estimate** uses 2 minutes of turnaround. Sam said 1 to 2.
- **"Back to queue"** keeps the tickets and puts the match at the front of the line.
- **Refunded and paired sign-ups** stay in the CSV with those statuses so Combine never double counts.
- **Plinko board design:** the middle slot and both edge slots pay 1 card, the other 6 slots pay a sticker, 1 ticket per drop.
  - Claude designed this from Sam's multiplier and the 3-card cap.
  - The odds come from an idealized board model that assumes 9 drop holes over 9 slots. It needs about 50 test drops on the real board.
- **3-card cap scope.** Applied to Plinko only. Balloon Battle still pays up to 9 cards per match (3 per balloon). Ask whether the cap should apply to battle too.
- **Toroidal pitch behind a tap (v1.8.1):** to keep the copter Ask small, the pitch shows only after tapping "Why toroidal?". Sam's earlier decision was to always give a short explanation; the crew should still say it.
- **Launcher-only price** is 3 tix in the tracker. Confirm.
- **Upgrade cleanup:** practice names sitting in the old name-only battle queue were dropped when laptops upgraded to v1.7.

## Still needed from Sam

1. Burger count if any get printed tonight (Settings > Starting stock on the sales laptop).
2. Pre-bagged kit counts, if any (the parts counts are in).
3. Prize list: how many of each prize, and optional real names and photos (upload to `ramathon-sales-tracker/prize_photos/`). Card prices are decided.
4. Plinko board facts: peg rows, number of drop holes, final slot payouts, tickets per drop. Optional: 50 test-drop tallies.
5. Plinko stickers: how many and the rough cost each.
6. Toroidal pitch wording check (`TOROIDAL_PITCH` in `index.html`).
7. A photo of the Creeper infinity cube: `ramathon-sales-tracker/clicker_photos/creeper_cube.jpg` on the presentations branch.
8. Controls script for the battle robots.
9. Any new clicker designs (name and photo).
10. A stack of Pokémon cards at the Sales table for the free card with purchase.

## Open questions for the business team

These are tracked with notes on the open-items page.

- **Battle:**
  - Scoring (keep the survive rule?).
  - Knocked out pays 0 or 1.
  - Instant rematch 5 or 7, and when it is allowed.
  - Weapon prices and list.
  - Unlock token.
  - Solo kids (pair them, or always play the house).
  - Match length.
  - The house driver's target (vs House at or under 1 card per ticket).
  - Refunds.
- **Plinko:** drop rule and multiplier, slot payouts, tickets per drop.
- **Prize Table:** cards per prize.
- **Sales:** confirm prices, goals, and who follows up on backorders. Free card rate (1 per 10 tix) and the 30-tix free prize.
- **Partner club:** which club, and what each side gives referred kids (a freebie, not a discount).
- **Running the day:** who runs each laptop, and who exports hourly and combines at the end.

## Numbers already worked out

- **Battle under survive scoring:** the worst single match is 12 cards for 10 tix (a 2–2 finish on time). vs House can pay 9 cards for 5 tix, so the driver controls that rate. The Battle screen shows live cards per ticket.
- **Plinko on an ideal 9-slot board, 8 peg rows:**
  - A center drop lands an edge slot 0.4% of the time. A kid dropping over an edge lands it about 27% of the time.
  - Big edge payouts only work if kids can't choose where they drop.
- **Recommended Plinko board** (Claude's design): 3x / 2x / 1x multiplier, 1-card middle and edge slots, stickers elsewhere.
  - Every hole stays at 0.84 cards per ticket or less, with 8 or 12 peg rows.
  - About 1 drop in 4 wins a card; the rest win a sticker.

## How to resume in a new chat

1. Read this file and `README.md`.
2. Changes go on branch `ramathon-carnival` in `tools/ramathon_sales_tracker/`.
3. Run the tests before deploying (`tests/README.md`).
4. Deploy by copying to `ramathon-sales-tracker/` on `presentations` and checking md5.
5. Keep backorder contact info and any GitHub token out of the public repo. Player names are never exported.

## CHANGELOG

- v1.0 (2026-10-16): Initial status and handoff after tracker v1.7.1.
- v1.1 (2026-10-16): Tracker v1.8 (cash sale button, free Pokémon card per 10 tix). Sam's sales add-on decisions. Source branch renamed `ramathon-carnival`.
- v1.2 (2026-10-16): Tracker v1.8.1 (smaller Sales prompts). Prize prices decided: Small 1, Medium 3, Grand 9.
- v1.3 (2026-10-16): Tracker v1.8.2. Card is the voucher; Creeper infinity cube under Clickers & Fidget Toys; clicker and copter stock counts.
