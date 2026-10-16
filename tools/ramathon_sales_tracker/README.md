---
file: README.md
version: 1.2
author: Sam Cao
created: 2026-10-16
last_updated: 2026-10-16
description: How to set up, run, and export the Ramathon sales tracker (live at zillaness.github.io/Rambots/ramathon-sales-tracker/).
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# Ramathon Sales Tracker

One web page with huge buttons for the Ram-a-thon booths: fidget clickers and pull copters (shared sales laptop) and Balloon Battle (its own laptop). Every tap saves to that laptop's browser immediately. Once the page has been opened once, it reopens even with no wifi.

## Event-day links (one per laptop)

| Laptop | Link | What it shows |
|---|---|---|
| Sales table | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=sales | Fidget Clickers and Pull Copters |
| Balloon Battle | https://zillaness.github.io/Rambots/ramathon-sales-tracker/?booth=battle | Battle queue and matches |

The page is unlisted (not on the Rambots site's landing page) and asks search engines not to index it.

## Where the files live

- **Live copy:** branch `presentations`, folder `ramathon-sales-tracker/` (served by GitHub Pages).
- **Source copy:** branch `claude/focused-dirac-gom1ys`, folder `tools/ramathon_sales_tracker/`. Edit there, test, then copy `index.html` and `sw.js` to the live folder.
- **Clicker photos:** upload straight into the live folder `ramathon-sales-tracker/clicker_photos/` (file names in its README).

The `?booth=` part locks the laptop to its booth. The plain link (no `?booth=`) lets you pick booths in **Settings**.

## Setup (5 minutes per laptop, the day before)

1. Open that laptop's link in Chrome while on wifi, then bookmark it.
2. Use a **normal** window, never private/incognito (private windows throw the data away).
3. Ring up a fake sale or match, then **Settings > Delete all data** so counts start at zero.
4. One tab only. A second tab shows a red warning.

## Sales table

| Do this | What happens |
|---|---|
| Tap **Fidget Clickers** or **Pull Copters** | Opens that booth's buttons |
| Tap an item (clickers: tap the design's photo) | Adds 1 to the current customer |
| **# Type qty** (pull copters) or the number in the right panel | Keypad to punch in an exact quantity |
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

## Everywhere

- **Undo** (or Ctrl+Z / Cmd+Z) reverses the last change and says exactly what it undid.
- **History** lists every sale, match, and walk-off. **Void** takes one out of the totals; **Restore** or Undo puts it back.
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
| Plinko play (off by default) | 1 |

## End of the event

1. **Totals:** compare "Tickets that should be in the boxes" (and each box) with the counted boxes.
2. **Totals > Download CSV** on every laptop. Export every hour or so during the event as a backup.
3. Paste all CSVs into one sheet; each row carries its station name. Player names are never exported.
4. Inventory check per item: before − after − walk-offs = sold.

CSV columns: `station, record (S = sale, B = battle, W = walk-off), status, opened_at, closed_at, category, item, qty, item_tickets, record_total_tickets, age, gender, battle_mode, player, balloons_popped, won, cards_paid, walkoff_reason`.

## Known limits

- Data lives in each laptop's browser. Clearing browser data deletes it, so export before anyone touches browser settings.
- Undo history resets when the page reloads (the saved data doesn't).
- Opened as a local file (double-click), it saves fine but won't reopen offline and won't show photos; use the hosted link.
- Each laptop keeps its own data. The hosted link and a local copy are different storage, so stick to the link.

## CHANGELOG

- v1.0 (2026-10-16): Initial release for Ram-a-thon 2026.
- v1.1 (2026-10-16): Balloon Battle queue and matches, per-box ticket split, walk-off log, net $, booth links, offline reopen, clicker photo folder.
- v1.2 (2026-10-16): Photo button per clicker design, priced together; live on GitHub Pages (presentations branch); Xiao long bao renamed Dumpling.
