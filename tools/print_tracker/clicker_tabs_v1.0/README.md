---
file: README.md
version: 1.0
author: Samuel Cao
created: 2026-10-20
last_updated: 2026-10-20
description: Five CSV tabs that turn the "Robotics internal clicker prints" Google Sheet into a per-component tracker with a plate planner.
ai_update: Update last_updated and version. Rename the folder to match. Append changelog at bottom.
---

# Clicker print tabs

Adds component tracking to the existing "Robotics internal clicker prints" sheet. `Sheet1` stays the
order list (item, internal, customer, total); these tabs read from it. File names have no version
because Google Sheets names each imported tab after its file; the folder carries the version.

| Tab | What it does |
|---|---|
| Printers | Who has which printer and how many colors it prints at once. |
| Print log | One line per batch: date, who, part, good, B-stock. Several people can log the same part. |
| Components | One row per printed piece with its colors. Totals, what's left, and sets ready are computed. |
| Progress | One line per item: customer and internal sets needed vs. ready, pieces left, switches needed. |
| Plate planner | Type the loaded colors; lists every part still needed that prints with only those colors. |

## Rules

- Customer orders take good prints first. B-stock, plus any good prints beyond the customer order,
  fill internal orders.
- Sets ready for an item = copies of its slowest part.
- A part only shows on the plate planner when every one of its colors is loaded.

## Import

Import in this order, because later tabs read earlier ones: Printers, Print log, Components, Progress,
Plate planner. For each: File > Import > Upload, pick the file, Import location **Insert new sheet(s)**,
keep **Convert text to numbers, dates, and formulas** checked. Each tab must keep its file's name.

Recommended after import: Print log column C > Data > Data validation > Dropdown (from a range)
`Components!A2:A`, so part names always match.

## CHANGELOG

- v1.0 (2026-10-20): Initial release, seeded with 12 items and 18 components.
