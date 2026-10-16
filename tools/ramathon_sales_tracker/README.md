---
file: README.md
version: 1.0
author: Sam Cao
created: 2026-10-16
last_updated: 2026-10-16
description: How to set up, run, and export the Ramathon sales tracker (tools/ramathon_sales_tracker/index.html).
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# Ramathon Sales Tracker

One HTML file with huge buttons for logging booth sales on a laptop. It needs no internet once the file is on the laptop. Every tap is saved on that laptop immediately.

## Setup (5 minutes, do it before the event)

1. Download `index.html` from this folder onto the laptop (GitHub: open the file, then **Download raw file**).
2. Put it somewhere it will stay (Desktop is fine) and double-click it. It opens in the browser.
3. Use a **normal** browser window, never private/incognito. Private windows throw the data away when they close.
4. Open **Settings**:
   - **Station name:** e.g. `Laptop 1` or `Copter table`. It goes on every exported row.
   - **This laptop sells:** pick Fidget Clickers, Pull Copters, or both. Plinko is off by default.
   - **Demographic buttons:** shown or hidden.
5. Ring up a fake sale, then **Settings > Delete all data** so the counts start at zero.

Always open the same copy of the file on that laptop, in one tab only. A second tab shows a red warning.

## Ringing up a sale

| Do this | What happens |
|---|---|
| Tap **Fidget Clickers** or **Pull Copters** | Opens that half's buttons |
| Tap an item | Adds 1 to the current customer |
| Tap **# Type qty** (or the number in the right panel) | Keypad to punch in an exact quantity |
| **−** / **+** in the right panel | Adjust one line |
| **Kid / Teen / Adult**, **Male / Female** | Optional. Tag who the items are *for*. Tap again to clear |
| **Done · Next customer** (or Enter) | Saves the sale, resets the panel |
| **Undo** (or Ctrl+Z / Cmd+Z) | Reverses the last change and says exactly what it undid |
| **← Back** (or Esc) | Back to the two big halves |

The panel shows **Collect N tix** for the customer. Clicker tiers are applied automatically: 1 = 4, 2 = 7, 3 = 10, then they stack (4 = 14, 5 = 17, 6 = 20).

**History** lists every sale. **Void** takes a sale out of the totals; **Restore** or Undo puts it back.

## Prices (edit `CATEGORIES` at the top of the script)

| Item | Tix |
|---|---|
| Fidget clicker | 1 = 4, 2 = 7, 3 = 10, stacked after 3 |
| Pull copter full kit (launcher + propeller + ripcord) | 5 |
| Kit with toroidal propeller | 6 |
| Launcher only | 3 |
| Extra propeller | 1 |
| Toroidal propeller | 2 |
| Extra ripcord | 1 |
| Plinko game (off by default) | 1 |

## End of the event

1. **Totals** shows "Tickets that should be in the box." Count the box and compare.
2. **Totals > Download CSV** (also in Settings). Export every hour or so during the event as a backup.
3. With two laptops, paste both CSVs into one sheet. Each row carries its station name, so nothing collides.

CSV columns: `station, customer_no, status (sold/voided/open), opened_at, closed_at, category, item, qty, item_tickets, customer_total_tickets, age, gender`. One row per item line.

Colors and variants are not tracked. Count inventory before and after for the color split, and count giveaways and broken units separately so they don't show up as sales.

## Known limits

- Data lives in that laptop's browser. Clearing browser data deletes it, so export before anyone touches browser settings.
- Undo history resets when the page reloads (the sales themselves don't).

## CHANGELOG

- v1.0 (2026-10-16): Initial release for Ramathon 2026.
