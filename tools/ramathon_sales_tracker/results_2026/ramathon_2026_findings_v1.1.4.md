---
file: ramathon_2026_findings_v1.1.4.md
version: 1.1.4
author: Sam Cao
created: 2026-10-17
last_updated: 2026-10-17
description: Ram-a-thon 2026 results for team and mentors: fun data points, clicker rankings, stockouts, themes, demographics, Plinko estimate, copters, how we compared to other groups, and next-year changes.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# Ram-a-thon 2026: what the data says

We grossed about **900 tickets** (830 counted, plus about 70 handed to helpers for food). That's about **$810 after CCA's 10%** and **69%** of the 1,300-ticket goal. Clickers carried the sales table, Plinko quietly tripled its goal, and copters fell off a cliff.

Only the sales laptop exported. Every number below is either **tracked** (from its 69 sales) or marked **~estimated** (from your end-of-day counts).

| File | What it is |
|---|---|
| [Google Sheet (snapshot v1.0.1)](https://docs.google.com/spreadsheets/d/1RJPla1v_S8OTfUqtEAHkUTp_OWdJUxhWsUgXi4Od20I/edit) | Values-only summary in Drive |
| `ramathon_2026_results_v1.0.xlsx` | Full workbook, 13 tabs, live formulas. Drag it into Drive to get it as a Google Sheet |
| `ramathon_2026_infographic_v1.1.4.png` | 1080x1920 recap image (source: the `.html` next to it; photos in `infographic_photos/`, cropped by `crop_infographic_photos_v1.0.py`) |
| `event_ticket_estimates_v1.3.1.md` | Photo-based ticket estimates for the other 19 groups |
| `build_ramathon_2026_results_v1.0.py` | Rebuilds the workbook from the CSV export |
| `ramathon_sales_laptop1_2026-10-17.csv` | The raw export |

## Fun data points

1. **One parent cleared us out of Dumplings:** all 8 we had left at the time, in one sale at 12:42 PM (27 tickets). It was the biggest sale of the day.
2. **Creeper sold out first.** All 10 were gone by 11:48 AM, about 90 minutes before the last sale.
3. **Plinko took about 330 drops** (inferred), about 3.3x its 100-ticket goal. It was our second-biggest booth, and we have zero data on it.
4. **The last two sales, 12 seconds apart,** took the final 4 Salmon nigiri and the last 2 Spam musubi.
5. **Median checkout: 5 seconds.** The fastest sale took 1.
6. **Rush hour: 11:00 to 11:30 AM**, with 21 sales and 109 tickets.
7. **Teens went for Salmon nigiri:** 6 of 9 teen sales included one.
8. **Creeper and WD-40 went to boys** (7 of 8 gender-tagged units each). **Egg tart went to girls** (7 of 8).
9. **Top combo: Avocado + Dumpling** (4 sales).
10. **Salmon nigiri was the social one.** It showed up in 12 mixed sales alongside 10 different designs.
11. **Half of all clickers sold were Asian food designs** (64 of 129). Every one with a known count sold out.
12. **24 free Pokémon cards** went out with purchases, across 23 sales.
13. **20 sales were exactly the 3-for-10 deal.** More kids stopped at 3 clickers (20 sales) than at 2 (12).
14. **88 copter launchers** are still in the bin.
15. **Plinko alone (~330 tickets) out-earned the average group** at the event (~325).
16. **The Prize Table ran out** of cheese squishes and dino plushes.

## Clicker leaderboard

Ranked by **sales rate**: units sold per hour while the design was on the table. We made unequal amounts of each design, so raw units mostly measure how many we printed. A sale counts at most 3 of one design toward the rate, so the 8-Dumpling parent doesn't skew it.

| Rank | Design | Rate (per hr) | Sold | Stock | Sold out at | Left over |
|---|---|---|---|---|---|---|
| 1 | Dumpling | 7.1 | 24 | 24 | 12:42 PM | 0 |
| 2 | Salmon nigiri | 6.9 | 23 | 23 | 1:20 PM | 0 |
| 3 | Creeper | 5.6 | 10 | 10 | **11:48 AM** | 0 |
| 4 | Avocado | 4.4 | 12 | 12 | 12:43 PM | 0 |
| 5 | Egg tart | 3.3 | 11 | restocked | unknown | unknown |
| 5 | Chocolate bar | 3.3 | 11 | 15 | | 4 |
| 7 | Hot dog bun | 3.0 | 10 | 22 | | 12 |
| 8 | WD-40 | 2.4 | 8 | 15 | | 7 |
| 8 | Creeper infinity cube | 2.4 | 8 | 9 | | 1 |
| 10 | Spam musubi | 1.8 | 6 | 6 | 1:20 PM | 0 |
| 11 | S'mores | 0.9 | 3 | 9 | | 6 |
| 12 | LEGO brick | 0.6 | 2 | 4 | | 2 |

Not ranked: Oreo (probably never put out, 4 left) and Burger (not in the stock count, 1 sold).

The blended rank (70% rate, 30% units) comes out in exactly the same order, so the answer doesn't depend on how you weigh it.

Dumpling and Salmon nigiri were the real demand leaders, at about 7 an hour each. Creeper is the story, though. It ranked third on rate with less than half their stock, so it ran out first. Spam musubi sold out too, but slowly. It was right-sized, not a hidden hit.

If Egg tart only reached the table around 11:00 AM (its first sale was 11:07, about 45 minutes after most designs started selling), its rate jumps to about 4.7 an hour and it moves to 4th.

## What we ran short on, and what it cost

| Design | Sold out at | Hours gone | Lost units | Lost tickets |
|---|---|---|---|---|
| Creeper | 11:48 AM | 1.5 | 8.7 | ~31 |
| Dumpling | 12:42 PM | 0.6 | 4.5 | ~16 |
| Avocado | 12:43 PM | 0.6 | 2.7 | ~10 |
| **Total** | | | **~16** | **~56** |

Lost units = each design's own sales rate x hours it was gone before the last sale (1:20 PM). At 3.53 tickets per clicker, that's about 56 tickets with unlimited stock.

Treat that as a floor. Once all three were gone, clicker pace fell from 43 units an hour to 19. The crowd was also thinning toward the 1:00 PM close, so we can't say how much of that slump was stock.

The other side of the ledger: **36 clickers went to the blowout** (Hot dog bun 12, WD-40 7, S'mores 6, Chocolate bar 4, Oreo 4, LEGO brick 2, Creeper cube 1). We printed about the right total in the wrong mix.

**Next year's print counts** (this year's rate x 3.3 selling hours + 20% buffer):

| Design | Had | Next year |
|---|---|---|
| Dumpling | 24 | 29 |
| Salmon nigiri | 23 | 28 |
| Creeper | 10 | 23 |
| Avocado | 12 | 18 |
| Egg tart | 11+ | 14 |
| Chocolate bar | 15 | 14 |
| Hot dog bun | 22 | 12 |
| WD-40 | 15 | 10 |
| Creeper infinity cube | 9 | 10 |
| Spam musubi | 6 | 8 |
| S'mores | 9 | 4 |
| LEGO brick | 4 | 3 |

That's 173 total, vs about 160 this year. It's roughly the same print time, aimed at what sold.

## Themes and combos

| Theme | Designs | Units | Sell-through (known counts) |
|---|---|---|---|
| Asian food | Salmon nigiri, Dumpling, Spam musubi, Egg tart | 64 | 100% |
| Minecraft | Creeper, Creeper infinity cube | 18 | 95% |
| Snacks & treats | Avocado, Chocolate bar, Hot dog bun, S'mores, Burger | 37 | 62% |
| Workshop | WD-40, LEGO brick | 10 | 53% |

Avocado carried Snacks & treats. Without it, that theme sold about half its stock.

Variety beat sets. Of the 35 sales with 2 or more clickers, 30 mixed designs and only 5 were several of one design. 23 sales crossed themes, most often Asian food + Snacks & treats (12 sales).

Top pairs: Avocado + Dumpling (4); Creeper + Dumpling, Avocado + Egg tart, Dumpling + Egg tart (3 each). Salmon nigiri (12 mixed sales) and Dumpling (11) were the anchors kids built a 3-for-10 around.

## Who bought what

Tags are optional, and about a third of sales had none. Kids were 32 of the 45 age-tagged sales, Teens 9, and Adults 4. The counts below are **customers who picked the design**, not units, so one bulk buyer doesn't crown a favorite.

| Group | Sales | Most popular |
|---|---|---|
| Kids | 32 | Dumpling (9); Creeper, Hot dog bun, Salmon nigiri (6 each) |
| Teens | 9 | Salmon nigiri (6); Creeper infinity cube (2) |
| Adults | 4 | Salmon nigiri (2) |
| Boys and men | 28 | Dumpling (8); Creeper (7); WD-40 (6) |
| Girls and women | 18 | Salmon nigiri (7); Egg tart (6); Dumpling (5) |
| Kid boys | 19 | Creeper, Dumpling, Hot dog bun (5 each) |
| Kid girls | 11 | Dumpling (4); Chocolate bar, Egg tart (3 each) |
| Teen boys | 4 | Creeper infinity cube, Salmon nigiri (2 each) |
| Teen girls | 4 | Salmon nigiri (3) |

Every gender-tagged copter buyer was a boy. Groups under about 5 sales are hints, not findings.

"Kid" lumps elementary and middle schoolers together, which hides the split we'd actually stock for. Next year the tags should be Elementary / Middle / High school / Adult.

## Event totals

| Booth | Tickets | Goal | % of goal | Source |
|---|---|---|---|---|
| Clickers | ~488 | 500 | 98% | 455 tracked + the untracked blowout |
| Plinko | ~330 (310 to 350) | 100 | 330% | Inferred: ~900 minus everything else |
| Balloon Battle | ~55 (50 to 60) | 200 | 28% | Estimate; about 10 to 12 player-matches |
| Copters | 27 | 500 | 5% | Tracked |
| **Total** | **~900** | **1,300** | **69%** | 830 counted + ~70 helper food tickets |

Plinko math: 900 gross, minus 500 to 530 for clickers and copters, minus 50 to 60 for Battle, leaves 310 to 350. At 1 ticket per drop, that's about 330 drops.

## How we stacked up against other groups

The event sold 7,000 tickets across 20 groups. Ours is the only real count; every other group is eyeballed from container photos (±30%, see `event_ticket_estimates_v1.3.1.md`).

| Group | Tickets |
|---|---|
| **Rambots** | **830 in the box, + ~70 fed to helpers (~900 earned)** |
| Exec Student Gov | ~675 in the jar we saw, + ~700 from the 10% cut (~1,375) |
| Class Gov (stuffed bag, grade unknown) | ~675 |
| WCO | ~350 |
| Business Club | ~350 |
| Fitness | ~350 |
| Average of the other 19 | ~325 |

- **About 12%** of every ticket at the event landed in our box.
- That's **about 2.5x** the average group.
- **#1 in direct sales? Unclear.** Exec's jar (~675) is a photo estimate, and they may have had more jars or bags. The class gov bag could also be 500 to 850.
- **Exec out-earned us overall.** They keep the 10% cut from every group, about 700 of the 7,000 tickets, on top of their own sales.
- The ~70 tickets we fed helpers were spent at food booths, so they sit in other groups' containers.

## Copters

5 kits for 27 tickets, about 24 net. Last year was about 450 net at the same prices, so we're **down about 95%**. 2 of the 5 kits were toroidal. All 3 gender-tagged buyers were boys.

88 launchers, 155 propellers, 42 toroidal props, and 100 ripcords carry over. Don't buy parts next year.

Why it dropped is a guess until we test it:

- Clickers took 94% of the sales table's tickets. They may have pulled the same kids and tickets copters used to get. **Test:** give copters their own table, or run a flying demo.
- Families from last year may already own one. **Test:** ask at the table, or sell replacement props and ripcords.

## Other hypotheses

- LEGO brick sold twice in two minutes at 10:41 AM, then never again. It may have been buried behind other designs.
- The 3-for-10 deal plus a free Pokémon card seems to pull kids up to 3 clickers.

## Next year

1. Rebalance the print queue with the table above: about 2x the Creepers, more Dumpling, Salmon nigiri, and Avocado, and fewer Hot dog buns and S'mores.
2. Put every booth on the tracker. Plinko and Battle together were about 43% of the money, and we have no data on either.
3. Recount stock the morning of, after any restock. Ring the blowout up as its own item so it shows up in the data.
4. Change the age tags to Elementary / Middle / High school / Adult, and tag every sale.

## Method notes

- **Selling window:** 10:01:54 AM (first sale opened) to 1:20:39 PM (last sale closed), 3.31 hours.
- **Sales rate:** units / hours on the table. A design is on the table from the window start until its last unit sells, or until the window ends if it never sold out. A sale counts at most 3 of one design.
- **Lost units:** rate x (window end - sell-out time). This ignores substitution, since some kids bought another design instead.
- **Ideal stock:** rate x 3.31 hours x 1.2, rounded up.
- **Assumptions from Sam (Oct 17):** 830 counted plus ~5 tickets per helper for food (~900 gross); clickers + copters 500 to 530 including the blowout; Battle 50 to 60; Plinko 1 ticket per drop; Oreo probably not put out; Egg tart restocked after the Oct 16 count; copters ~450 net last year at the same prices.
- **Starting stock:** Sam's Oct 16 counts built into the tracker.

## CHANGELOG

- v1.0 (2026-10-17): Initial release.
- v1.1 (2026-10-17): Added how we stacked up against other groups (Rambots corrected to 830 + ~70 fed), Plinko vs the average group, and prize sell-outs. Dumpling fact now says the sale cleared out every one we had left. Infographic is now v1.1 (1080x1920).
- v1.1.1 (2026-10-17): Points to infographic v1.1.1, whose club chart shows only Rambots, Class Gov, Exec Student Gov, and the average group. The full top-6 table stays here.
- v1.1.2 (2026-10-17): Points to infographic v1.1.2, whose club chart is Rambots vs the average group only (no individual student governments).
- v1.1.3 (2026-10-17): Points to infographic v1.1.3, which adds Exec Student Gov (~675) back between Rambots and the average group.
- v1.1.4 (2026-10-17): Exec now includes their 10% cut (~700), so they out-earned us overall; whether their own sales beat ours is unclear. Points to infographic v1.1.4 and estimates v1.3.1.
