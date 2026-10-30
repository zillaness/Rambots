---
file: README.md
version: 1.0.1
author: Samuel Cao
created: 2026-10-08
last_updated: 2026-10-30
description: What the Print Tracker is, how to build the workbook, install the Apps Script and run the tests.
ai_update: Update last_updated and version. Append changelog at bottom.
---

# Print Tracker

> **Archived 2026-10-30. This copy is no longer maintained.** The Print Tracker moved to the
> private `zillaness/3Dprinting` repo, folder `print_tracker/`, with its history. Make changes there.
> These files stay here unchanged so existing links keep working.

A Google Sheet for splitting big 3D print batches across the team. Leads list the parts; people claim
batches, print at home, and update a status. The Summary tab shows progress, finished kits, whether the
deadline is realistic, and how much filament to hand each person.

First project: Ramathon Carnival (80 pull copter launchers, 120 ripcords, 120 basic and 60 fancy
propellers, plus stretch items).

## Files

| File | What it is |
|---|---|
| `build_print_tracker_v1.0.py` | Builds the `.xlsx`. Upload it to Google Drive and open it as a Google Sheet. |
| `print_tracker_v1.0.gs` | Apps Script pasted into the sheet: date stamps, Fill gaps, Re-split. |
| `print_tracker_test_v1.0.mjs` | Node tests for the Apps Script, against an in-memory fake of the Sheets API. |

## Build

```sh
pip install openpyxl
python3 tools/print_tracker/build_print_tracker_v1.0.py --out print_tracker_v1.0.xlsx          # seeded with the carnival
python3 tools/print_tracker/build_print_tracker_v1.0.py --blank --out print_tracker_blank_v1.0.xlsx  # empty tracker
```

Import into Google Sheets: Drive > New > File upload, then open the file and choose File > Save as Google
Sheets. Some formulas (QUERY, MINIFS, MAXIFS) only work in Google Sheets; Excel and LibreOffice show
errors in those cells.

## Install the script

In the Google Sheet: Extensions > Apps Script, replace `Code.gs` with `print_tracker_v1.0.gs`, save,
reload the sheet. A **Print Tracker** menu appears. `onEdit` is a simple trigger, so editors get no
permission prompt; the first menu click asks for access to this spreadsheet only (`@OnlyCurrentDoc`).

## Test

```sh
node --test tools/print_tracker/print_tracker_test_v1.0.mjs
```

## How it works

- **Parts** has one row per part: quantity needed, copies per kit, copies per plate, material,
  requirements, hours and grams per plate (from Bambu Studio), and a file link.
- **Prints** has one row per batch. Rows start at one plate's worth; Qty is editable.
  **Fill gaps** adds Unclaimed rows for copies no row covers yet (Failed rows don't count, so failed
  copies come back). **Re-split unclaimed rows** rebuilds untouched rows after Per plate changes.
- Picking a name stamps **Claimed on** and sets Status to Claimed. Every status change stamps
  **Status changed**. A Claimed or Printing row unchanged for longer than the Summary's stale setting
  (default 3 days) turns orange.
- **Kits done** for a kit is the lowest kits-done across its parts; that part is flagged Bottleneck.
- Formulas are pre-filled for the first 120 Prints rows and 40 Parts rows. The script copies them to
  any row past that when a Part is typed there or Fill gaps writes there.

## CHANGELOG

- v1.0 (2026-10-08): Initial release.
- v1.0.1 (2026-10-30): Marked archived; the tracker moved to zillaness/3Dprinting.
