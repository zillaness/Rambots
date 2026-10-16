---
file: README.md
version: 1.4
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
- **Source copy:** branch `claude/focused-dirac-gom1ys`, folder `tools/ramathon_sales_tracker/`. Edit there, test, then copy `index.html` and `sw.js` to the live folder.
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
| **Done · Next customer** (or Enter) | Saves the sale, resets the panel |
| **Log walk-off** | Stock that left without tickets (demo unit, giveaway, broken) |

The panel shows **Collect N tix**. When one customer buys from both booths it also shows how many tickets go in each booth's box. Clickers are priced together across designs (any mix): 1 = 4, 2 = 7, 3 = 10, then they stack (4 = 14, 5 = 17, 6 = 20). A design without a photo shows its first letter; **Other design** catches anything not on the list.

## Balloon Battle

1. **Queue:** type a first name, tap the number of extra weapons (so the crew can have them ready), **Add to queue** (or Enter). Wait times start at 3 minutes per match and adjust to the real pace.
2. **Start vs House** (next person) or **Start vs Player** (next two). Tickets are collected now: 5 per player + 1 per extra weapon. The toast says exactly how many from whom.
3. **Match over** when someone loses all 3 balloons, then tap the result:
   - vs House: how many House balloons the player popped (0 to 3).
   - vs Player: who won, then how many the loser popped.
4. The result card says how many 3-card bundles to hand over. **Instant rematch** runs the same players again at the rematch price (shows how many people are waiting).
5. **Cancel match** if a bot fails before the match counts: hand tickets back, players go back to the front of the queue.

Payout rules (Settings): 3 cards per balloon. vs Player is **winner only** by default (always 9 cards, can't be gamed by two kids cooperating); switch to **both players, per balloon** if you prefer. Match, rematch, weapon prices and cards per balloon are editable in Settings and apply to new matches.

## Clock, goal and pace

- The top bar shows a small chip with the time and how far ahead or behind the goal this laptop is (target = a steady pace from the event start to the end). Tap it for the per-booth table and the tickets per minute still needed.
- **Settings > Clock and goal:** event date and hours (default Sat 10/17, 10:30 AM to 1:00 PM), goals per booth (default Clickers 500, Copters 500, Battle 200) and a switch to hide the chip. Each laptop paces only the booths it runs. Plinko (goal 100) is counted from its bucket and typed into Combine.

## Upsell prompts

- **Clickers:** the right panel breaks the price into deals (e.g. `3 for 10 + 2 for 7 · 3.40 each`) and, when it saves money, says "Ask: 1 more is only +3 tix".
- **Copters:** with a Full kit in the cart, a red **Ask** box offers **Upgrade 1 kit (+1)** to a toroidal kit (with a one-line explanation of what toroidal means) and **+ Extra propeller**. The wording lives in `TOROIDAL_PITCH` at the top of the script.

## Backorders

Something sold out? **Backorder** (next to Log walk-off) logs the item, quantity, a parent's name and a phone or email (required). No tickets are taken. Backorders never count as sales and only appear in History, the stats and the **Backorders CSV**. That file contains contact info: keep it off the public repo.

## Prize Table

1. **Settings > Prize Table:** check the cards per prize and, if you want live stock, type each prize's starting count (blank = not tracked).
2. Tap the prize(s) the kid picks. The panel shows **Collect N cards**; take the cards, tap **Done · Next trade** (or Enter).
3. With stock entered, each button shows **N left**, turns red when low, and says **None left** at zero (it still lets you log it and warns you to check the bin).
4. **Totals** lists prizes most-popular first, cards redeemed, average cards per trade, and an estimated prize cost.

Card price changes in Settings apply to new trades only. The buttons are placeholders (Small 3, Medium 6, Grand 9) until the real prize list and photos arrive.

## Everywhere

- **Undo** (or Ctrl+Z / Cmd+Z) reverses the last change and says exactly what it undid.
- **History** lists every sale, trade, match, and walk-off. **Void** takes one out of the totals; **Restore** or Undo puts it back.
- **Totals** shows tickets expected in each box, dollars after CCA's 10%, item counts with walk-offs, battle cards paid and cards per ticket (target about 1), and the age/gender breakdown.

## Prices

Sale prices live in `PRICE_GROUPS` and `CATEGORIES` at the top of the script (clicker designs in `CLICKER_DESIGNS`); Balloon Battle prices live in Settings.

| Item | Tix |
|---|---|
| Fidget clicker (any design) | 1 = 4, 2 = 7, 3 = 10, stacked after 3 |
| Pull copter full kit (launcher + propeller + ripcord) | 5 |
| Kit with toroidal propeller | 6 |
| Launcher only | 3 |
| Extra propeller | 1 |
| Toroidal propeller | 2 |
| Extra ripcord | 1 |
| Balloon Battle match (per player) | 5 |
| Instant rematch (per player) | 6 |
| Extra weapon | 1 |
| Prize Table (cards, not tix) | Small 3, Medium 6, Grand 9 (editable) |

## Exports and combining the laptops

Totals (and Settings) has three downloads:

| Button | File name | What's in it |
|---|---|---|
| Sales CSV | `ramathon_sales_<booth>_<station>_<laptop id>_<date>_<time>.csv` | One row per item / player / trade / walk-off |
| Stats CSV | `ramathon_stats_...csv` | Averages, combo counts, add-on rates, busiest 30 minutes, goal vs actual |
| Backorders CSV | `ramathon_backorders_...csv` | Backorder list with contact info (private) |

Every sales row carries `record_id`, `laptop_id` and `exported_at`. Each export is a full snapshot, so hourly backups repeat earlier rows.

**Combine laptops' CSVs** (Totals or Settings): pick the sales CSVs from all laptops, early backups included. Each record is counted once, from its newest export (a sale voided after a backup stays voided). Type the Plinko bucket count, then read the event total against the 1,300 goal or **Download combined CSV**.

## End of the event

1. **Totals:** compare "Tickets that should be in the boxes" (and each box) with the counted boxes.
2. **Totals > Sales CSV** on every laptop (export every hour or so during the event as a backup), plus **Stats CSV** and, if any, **Backorders CSV**.
3. Copy the sales CSVs onto one laptop and use **Combine laptops' CSVs** for the event total. Player names are never exported.
4. Inventory check per item: before − after − walk-offs = sold.

Sales CSV columns: `station, record (S = sale, T = prize trade, B = battle, W = walk-off), status, opened_at, closed_at, category, item, qty, item_tickets, record_total_tickets, age, gender, battle_mode, player, balloons_popped, won, cards_paid, walkoff_reason, cards_redeemed, record_id, laptop_id, exported_at`.

## Known limits

- Data lives in each laptop's browser. Clearing browser data deletes it, so export before anyone touches browser settings.
- Undo history resets when the page reloads (the saved data doesn't).
- A local copy works too if you download the whole `ramathon-sales-tracker` folder (photos included) and always open it from the same place; it just won't pick up updates. The hosted link is simpler.
- Each laptop, and each booth link, keeps its own data. The hosted link and a local copy are different storage, so pick one and stick to it.

## CHANGELOG

- v1.0 (2026-10-16): Initial release for Ram-a-thon 2026.
- v1.1 (2026-10-16): Balloon Battle queue and matches, per-box ticket split, walk-off log, net $, booth links, offline reopen, clicker photo folder.
- v1.2 (2026-10-16): Photo button per clicker design, priced together; live on GitHub Pages (presentations branch); Xiao long bao renamed Dumpling.
- v1.2.1 (2026-10-16): Booths renamed Clickers and Copters; all 13 clicker photos live.
- v1.3 (2026-10-16): Prize Table replaces Plinko (cards in, prizes out, live stock, most-popular prizes); each booth link has its own storage; fixed two-tab undo.
- v1.4 (2026-10-16): Clock and pace chip with per-booth goals, clicker combo breakdown and nudge, copter upgrade prompts, copter photos, backorders, stats CSV, new export names with record ids, Combine screen.
