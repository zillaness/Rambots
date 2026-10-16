---
file: README.md
version: 1.8
author: Sam Cao
created: 2026-10-16
last_updated: 2026-10-16
description: How to set up, run, and export the Ramathon sales tracker (live at zillaness.github.io/Rambots/ramathon-sales-tracker/).
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# Ramathon Sales Tracker

One web page with huge buttons for the Ram-a-thon booths: Clickers and Copters (shared sales laptop), Balloon Battle (its own laptop) and the Prize Table (its own laptop, Pokemon cards in, prizes out). Every tap saves to that laptop's browser immediately. Once the page has been opened once, it reopens even with no wifi.

## Event-day links (one per laptop)

| Laptop | Link | What it shows |
|---|---|---|
| Sales table | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=sales | Clickers and Copters |
| Balloon Battle | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=battle | Battle queue and matches |
| Prize Table | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=prizes | Card-for-prize trades |

Each booth link keeps its **own saved data**, so two different booth links can even share one laptop (two tabs) without touching each other. Opening the **same** booth link in two tabs shows a red warning; close one.

**All booths on one laptop instead?** Open the plain link (no `?booth=`), go to **Settings > This laptop runs**, and turn on the booths you need. You get one big tile per booth, one data set and one CSV.

Plinko is not tracked; count its ticket bucket afterward.

The page is unlisted (not on the Rambots site's landing page) and asks search engines not to index it.

## Where the files live

- **Live copy:** branch `presentations`, folder `ramathon-sales-tracker/` (served by GitHub Pages).
- **Source copy:** branch `ramathon-carnival`, folder `tools/ramathon_sales_tracker/`. Edit there, test, then copy `index.html` and `sw.js` to the live folder.
- **Clicker photos:** upload straight into the live folder `ramathon-sales-tracker/clicker_photos/` (file names in its README).
- **Prize photos:** `ramathon-sales-tracker/prize_photos/` (any names; send the prize list and card prices to wire them up).
- **Copter photos:** `ramathon-sales-tracker/copter_photos/` (file names in its README).

The `?booth=` part locks the laptop to its booth. The plain link (no `?booth=`) lets you pick booths in **Settings**.

## Setup (5 minutes per laptop, the day before)

1. Open that laptop's link in Chrome while on wifi, then bookmark it.
2. Use a **normal** window, never private/incognito (private windows throw the data away).
3. Ring up a fake sale or match, then **Settings > Delete all data** so counts start at zero.
4. One tab only. A second tab shows a red warning.

## Sales table

| Do this | What happens |
|---|---|
| Tap **Clickers** or **Copters** | Opens that booth's photo buttons |
| Tap an item (clickers: tap the design's photo) | Adds 1 to the current customer |
| The number in the right panel | Keypad to punch in an exact quantity |
| **−** / **+** in the right panel | Adjust one line |
| **Kid / Teen / Adult**, **Male / Female** | Optional. Tag who the items are *for*. Tap again to clear |
| **💵** (small button, top right of the panel) | Marks the whole sale as a **cash sale** at full price ($1 per ticket). The panel says **Collect cash $N**. Tap again (or Undo) to switch back to tickets |
| Yellow **Give N free Pokémon cards** box | Hand the cards over with the items: 1 free card for every 10 tix in one sale (3 cards at 30 tix is enough for a free prize) |
| **Done · Next customer** (or Enter) | Saves the sale, resets the panel. The toast repeats how many free cards to give |
| **Log walk-off** | Stock that left without tickets (demo unit, giveaway, broken) |

**Free Pokémon card with purchase.** When a sale is 1 to 3 tix short of the next card, the panel asks for it ("Ask: 2 more tix gets a free Pokémon card"; with 2 clickers the "1 more" line says "+ a free Pokémon card"). Script: "Win more at Plinko or Balloon Battle and trade them at the Prize Table." Change the rate or turn it off (0) in **Settings > Free Pokémon card with purchase**; changes apply to new sales.

**Cash sales** count toward the goal and pace like any sale, but their money goes in the cash box, so Totals leaves them out of "Tickets that should be in the boxes" and shows them on their own line.

The panel shows **Collect N tix**. When one customer buys from both booths it also shows how many tickets go in each booth's box. Clickers are priced together across designs (any mix): 1 = 4, 2 = 7, 3 = 10, then they stack (4 = 14, 5 = 17, 6 = 20). A design without a photo shows its first letter; **Other design** catches anything not on the list.

## Balloon Battle

**Sign up (right side), tickets collected now:**
1. Pick **vs House** (one player), **vs Player** (came as a pair) or **Solo** (wants an opponent).
2. Type the first name(s). Enter on player 1 jumps to player 2.
3. Read the red **Ask** line and tap weapons per player. One tap = **unlock** (wheel spikes +1, buzz saw +2). Two taps = **already unlocked** earlier (free). Three taps = none. Weapons unlock once. How the crew checks an earlier unlock (sticker, stamp or nothing) is not decided yet; see `ramathon_status_v1.1.md`.
4. **Add to queue · collect N tix.** If a player has no weapon, a pop-up asks about weapons first. The toast says what to collect, any new unlocks, and the place in line with the wait.

The short scoring script sits under the form; **Rules / script** has the full rules, the volunteer script and a slot for the controls script.

**Queue (left, under the match):** each sign-up shows its estimated wait next to the names (time left in the current match, plus 2 minutes turnaround, plus one match cycle per match ahead; it follows the real pace once a few matches have run). Per row: **Start** (any match), **Weapons** (add or change; says what to collect or hand back), **↓** (not ready yet, move down one), **✕** (remove and refund; the toast says how many tix to hand back). Two solos waiting: the earlier one shows **Pair with ...** (ages shown when tagged) to make one vs Player match in the earlier spot.

**The match (pinned on top while sign-ups continue):**
1. **Start next** (or Start on any row) calls the match up. The clock shows **Ready**.
2. **GO** starts the countdown (default 2:00; **Settings > Match length**). **Pause / Resume**, **Edit clock** (±10 s, ±1 min, back to full), **Restart** (back to Ready, free, counted in the stats), **Change weapons**, **Not ready: back to queue** (front of the line, tickets kept). At zero it flashes red **Time!** and counts overtime.
3. **Match over** and tap the result:
   - vs House: how many House balloons the player popped, on the **Survived** row or the **Knocked out** row.
   - vs Player: how many balloons each player popped (0 to 3 each), then **Save result**.
4. The result card says how many 3-card bundles to give, then offers (for both players, or only one of them vs House):
   - **Instant rematch** (5 tix): plays right now, once in a row, only while 2 or fewer matches are waiting.
   - **Rematch · back in line** (5 tix): back of the queue.
   Weapons stay unlocked either way. The rematch price and both rules are in **Settings**.

Payout rules (**Settings > Balloon Battle scoring**, one tap per preset, each showing its worst single match in cards per ticket):

| Preset | How it pays | Worst vs Player match |
|---|---|---|
| **3 per balloon, must survive to the end** (default) | 3 cards per balloon you popped, only if your robot still has a balloon when the match ends. Knocked out = 0 (or the "Knocked out" cards setting) | 12 cards / 10 tix (2–2 on time) |
| 3 per balloon, winner only | Winner gets 3 per balloon they popped; tie rule in Settings | 12 / 10 (2–2 tie) |
| 3 per balloon, winner only + 1 for the loser | Same, loser gets 1 | 12 / 10 |
| 2 per balloon, everyone | Each player 2 per balloon | 10 / 10 |
| 3 per balloon, everyone | Each player 3 per balloon | 15 / 10 |
| By outcome 9 / 6 / 3 / 1 | Knockout win / win on time / survived / knocked out | 10 / 10 |

vs House can pay up to 9 cards for 5 tix in any per-balloon preset; the house driver keeps it down. The Battle screen shows the running cards per ticket (all, vs House, vs Player) and turns red above 1. **Rules / script** (Battle screen) shows the rules and a volunteer script for whatever is set. Match, rematch, weapon prices and cards per balloon are editable in Settings and apply to new matches.

## Clock, goal and pace

- The top bar shows a small chip with the time and how far ahead or behind the goal this laptop is (target = a steady pace from the event start to the end). Tap it for the per-booth table and the tickets per minute still needed.
- **Settings > Clock and goal:** event date and hours (default Sat 10/17, 10:30 AM to 1:00 PM), goals per booth (default Clickers 500, Copters 500, Battle 200) and a switch to hide the chip. Each laptop paces only the booths it runs. Plinko (goal 100) is counted from its bucket and typed into Combine.

## Upsell prompts

- **Clickers:** the right panel breaks the price into deals (e.g. `3 for 10 + 2 for 7 · 3.40 each`) and, when it saves money, says "Ask: 1 more is only +3 tix".
- **Copters:** with a Full kit in the cart, a red **Ask** box offers **Upgrade 1 kit to toroidal (+1)** (with a one-line explanation of what toroidal means), then **+ Extra propeller (1)** and **+ Extra toroidal (2)**. The wording lives in `TOROIDAL_PITCH` at the top of the script.

## Backorders

Something sold out? **Backorder** (next to Log walk-off) logs the item, quantity, a parent's name and a phone or email (required). No tickets are taken. Backorders never count as sales and only appear in History, the stats and the **Backorders CSV**. That file contains contact info: keep it off the public repo.

## Stock left

**Settings > Starting stock:** type how many of each clicker design and each copter part you brought (blank = not tracked). Buttons then show **N left**, turn red when low and say **None left** at zero (tapping still works, with a warning that suggests a Backorder). Copters count by part: a Full kit uses a launcher, a propeller and a ripcord; a toroidal kit uses a toroidal propeller instead. Open, sold and walked-off items come off the count; voids put them back. Totals has a **Left** column and a **Copter parts left** table.

## Prize Table

1. **Settings > Prize Table:** check the cards per prize and, if you want live stock, type each prize's starting count (blank = not tracked).
2. Tap the prize(s) the kid picks. The panel shows **Collect N cards**; take the cards, tap **Done · Next trade** (or Enter).
3. With stock entered, each button shows **N left**, turns red when low, and says **None left** at zero (it still lets you log it and warns you to check the bin).
4. **Totals** lists prizes most-popular first, cards redeemed, average cards per trade, and an estimated prize cost.

Card price changes in Settings apply to new trades only. The buttons are placeholders (Small 3, Medium 6, Grand 9) until the real prize list and photos arrive.

## Everywhere

- **Undo** (or Ctrl+Z / Cmd+Z) reverses the last change and says exactly what it undid.
- **History** lists every sale, trade, match, and walk-off. **Void** takes one out of the totals; **Restore** or Undo puts it back.
- **Totals** shows tickets expected in each box (cash sales are not in the boxes; they show as their own line), dollars after CCA's 10%, free Pokémon cards given with purchases, item counts with walk-offs, battle cards paid and cards per ticket (target about 1), and the age/gender breakdown.

## Prices

Sale prices live in `PRICE_GROUPS` and `CATEGORIES` at the top of the script (clicker designs in `CLICKER_DESIGNS`); Balloon Battle prices live in Settings.

| Item | Tix |
|---|---|
| Fidget clicker (any design) | 1 = 4, 2 = 7, 3 = 10, stacked after 3 |
| Pull copter full kit (launcher + propeller + ripcord) | 5 |
| Kit with toroidal propeller | 6 |
| Launcher only | 3 |
| Extra propeller | 1 |
| Extra toroidal propeller | 2 |
| Extra ripcord | 1 |
| Balloon Battle match (per player, also Rematch back in line) | 5 |
| Instant rematch (per player) | 5 |
| Unlock wheel spikes (once) | 1 |
| Unlock buzz saw (once) | 2 |
| Prize Table (cards, not tix) | Small 3, Medium 6, Grand 9 (editable) |

## Exports and combining the laptops

Totals (and Settings) has three downloads:

| Button | File name | What's in it |
|---|---|---|
| Sales CSV | `ramathon_sales_<booth>_<station>_<laptop id>_<date>_<time>.csv` | One row per item / player / trade / walk-off |
| Stats CSV | `ramathon_stats_...csv` | Averages, combo counts, add-on rates, busiest 30 minutes, goal vs actual |
| Backorders CSV | `ramathon_backorders_...csv` | Backorder list with contact info (private) |

Every sales row carries `record_id`, `laptop_id` and `exported_at`. Sale rows also carry `paid_with` (tickets or cash) and, on the first row of each sale, `bonus_cards` (free cards handed over). Battle sign-ups export as `queued` until played; refunded and paired sign-ups export with those statuses and Combine skips them. Each weapon is its own row (e.g. `Buzz saw`, 2 tix; `Buzz saw (unlocked earlier)`, 0 tix). Each export is a full snapshot, so hourly backups repeat earlier rows.

**Combine laptops' CSVs** (Totals or Settings): pick the sales CSVs from all laptops, early backups included. Each record is counted once, from its newest export (a sale voided after a backup stays voided). Type the Plinko bucket count, then read the event total against the 1,300 goal or **Download combined CSV**.

## End of the event

1. **Totals:** compare "Tickets that should be in the boxes" (and each box) with the counted boxes.
2. **Totals > Sales CSV** on every laptop (export every hour or so during the event as a backup), plus **Stats CSV** and, if any, **Backorders CSV**.
3. Copy the sales CSVs onto one laptop and use **Combine laptops' CSVs** for the event total (it lists cash sales and free cards separately; older exports read as ticket sales). Player names are never exported.
4. Inventory check per item: before − after − walk-offs = sold.

Sales CSV columns: `station, record (S = sale, T = prize trade, B = battle, W = walk-off), status, opened_at, closed_at, category, item, qty, item_tickets, record_total_tickets, age, gender, battle_mode, player, balloons_popped, won, cards_paid, walkoff_reason, cards_redeemed, record_id, laptop_id, exported_at, battle_outcome, paid_with, bonus_cards` (battle_outcome: Survived / Knocked out / Tie, or the outcome name).

## Known limits

- Data lives in each laptop's browser. Clearing browser data deletes it, so export before anyone touches browser settings.
- Undo history resets when the page reloads (the saved data doesn't).
- On a screen 768 pixels tall, a sale with the copter Ask box pushes **Done** below the edge of the panel. Press **Enter**, scroll the panel, or zoom Chrome to 80% (Ctrl and minus) on that laptop.
- A local copy works too if you download the whole `ramathon-sales-tracker` folder (photos included) and always open it from the same place; it just won't pick up updates. The hosted link is simpler.
- Each laptop, and each booth link, keeps its own data. The hosted link and a local copy are different storage, so pick one and stick to it.

## CHANGELOG

- v1.0 (2026-10-16): Initial release for Ram-a-thon 2026.
- v1.1 (2026-10-16): Balloon Battle queue and matches, per-box ticket split, walk-off log, net $, booth links, offline reopen, clicker photo folder.
- v1.2 (2026-10-16): Photo button per clicker design, priced together; live on GitHub Pages (presentations branch); Xiao long bao renamed Dumpling.
- v1.2.1 (2026-10-16): Booths renamed Clickers and Copters; all 13 clicker photos live.
- v1.3 (2026-10-16): Prize Table replaces Plinko (cards in, prizes out, live stock, most-popular prizes); each booth link has its own storage; fixed two-tab undo.
- v1.4 (2026-10-16): Clock and pace chip with per-booth goals, clicker combo breakdown and nudge, copter upgrade prompts, copter photos, backorders, stats CSV, new export names with record ids, Combine screen.
- v1.4.1 (2026-10-16): All six copter buttons have photos; home-screen tiles show the blue switch (Clickers) and the kid with a pull copter (Copters).
- v1.5 (2026-10-16): Battle countdown with custom length; vs Player scored by balloons popped (winner paid per balloon, tie rule); stock left for clicker designs and copter parts.
- v1.5.1 (2026-10-16): Ties pay each player for their own balloons by default.
- v1.6 (2026-10-16): Every Balloon Battle scoring option as Settings presets with worst-case cards per ticket; new default "3 per balloon, must survive to the end"; live cards-per-ticket bar; Rules / script card; match clock waits for GO; battle_outcome CSV column.
- v1.7 (2026-10-16): Balloon Battle sign-up flow (vs House / vs Player / Solo, named weapons that unlock once, tickets at sign-up, weapon Ask line and pop-up), queue of paid matches with waits next to names, start any match, push down, refund, pair solos; pinned match with GO, Pause, Edit clock, Restart, Change weapons, Back to queue; Instant rematch (5, once, short line) and Rematch back in line.
- v1.7.1 (2026-10-16): Removed sticker wording (the weapon unlock token is undecided); points to the status file for decisions vs open items.
- v1.8 (2026-10-16): Cash sale button (full price, counts toward the goal, kept out of the ticket boxes). Free Pokémon card with purchase (1 per 10 tix) with panel reminder, Ask line and toast. New CSV columns `paid_with` and `bonus_cards`. Source branch renamed `ramathon-carnival`.
