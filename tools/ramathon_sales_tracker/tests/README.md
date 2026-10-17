---
file: README.md
version: 1.2.1
author: Sam Cao
created: 2026-10-16
last_updated: 2026-10-16
description: How to run the Playwright test suites for the Ramathon sales tracker.
ai_update: Update last_updated and version. Keep the filename README.md. Append changelog at bottom.
---

# Tracker tests

Browser tests (Playwright) for `../index.html`. Run them before every deploy.

## Run

1. Serve the tracker at `http://localhost:8766/ramathon-sales-tracker/`:

   ```bash
   mkdir -p /tmp/site && rm -rf /tmp/site/ramathon-sales-tracker
   cp -r tools/ramathon_sales_tracker /tmp/site/ramathon-sales-tracker
   (cd /tmp/site && python3 -m http.server 8766) &
   ```

2. Run each suite with a folder for screenshots and downloads:

   ```bash
   mkdir -p /tmp/shots
   for t in tools/ramathon_sales_tracker/tests/*_test_v*.mjs; do echo "== $t"; node "$t" /tmp/shots | grep -v '^PASS'; done
   ```

   Lines starting with `FAIL` are failures. Each suite exits non-zero if any check fails.

The suites import Playwright from `/opt/node-tools/node_modules/playwright/index.mjs`, the path in the Claude Code cloud container. On another machine, install Playwright and change that import to `playwright`.

After changing `index.html`, copy it into `/tmp/site/ramathon-sales-tracker/` again before re-running.

## Suites

| File | Covers |
|---|---|
| `battle_flow_test_v1.0.mjs` | Battle sign-up, weapon unlocks, queue, clock, rematch, pairing, CSV, Combine, migration, phone |
| `cash_bonus_test_v1.1.mjs` | Cash sale button and free card with purchase: panel, toast, Totals, History, stats, CSV, Combine, Settings, migration, phone |
| `battle_scoring_test_v1.0.mjs` | Scoring modes, survive default, knocked-out row, presets, rules card |
| `exports_combine_test_v1.1.1.mjs` | Stats, export names, record ids, backorders, Combine across laptops |
| `sales_walkoff_test_v1.1.mjs` | Sales basics and walk-offs |
| `prize_table_test_v1.1.1.mjs` | Prize Table trades and stock |
| `stock_test_v1.1.mjs` | Starting stock and stock left |
| `tie_migration_test_v1.0.mjs` | Tie-rule default migration |
| `phone_overflow_test_v1.0.mjs` | No sideways scroll at phone width (prints one line per screen; `"bad":[]` is a pass) |

## CHANGELOG

- v1.0 (2026-10-16): Initial test README.
- v1.1 (2026-10-16): Added the cash and free-card suite (tracker v1.8).
- v1.2 (2026-10-16): Five suites bumped to v1.1 for tracker v1.8.1 and v1.8.2.
- v1.2.1 (2026-10-16): Prize and Combine suites at v1.1.1 for tracker v1.8.3.
