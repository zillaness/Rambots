"""
file: plot_clicker_sales_curve_v1.5.py
version: 1.5
author: Sam Cao
created: 2026-10-18
last_updated: 2026-10-18
description: Builds the interactive Ram-a-thon 2026 sales chart: per-design running totals (hover, compare two, per-sale dots, "enough stock" projections) plus combined total, tickets-per-hour and minutes-per-sale views.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage:
    python3 plot_clicker_sales_curve_v1.5.py <sales.csv> <out.html>
    node render_infographic_v1.1.cjs <out.html> <out.png> <height> 1400   (static PNG of the default view)

The page is one self-contained HTML file. Photos load from infographic_photos/ next to it.

Projection: from each early sell-out to the last sale of the day (1:20 PM), at the
design's own on-table rate (same math as the findings' lost-sales table). The shaded
wedge runs up to the faster pace it sold at in the second half of its time on the table.
A sale counts at most 3 of one design toward a rate, like the workbook.

Each dot is one sale. The page shows its time, what was in it and its ticket total;
age and gender stay out because the page is on a public URL.

Combined views (whole sales table or clickers only, $1 per ticket, net = 90% after
CCA's cut):
  - Day average = tickets / the 3.3 hours from the first sale opening to the last closing.
  - Actual pace = a rolling ~30-minute window (triangular, same weight as a 30-minute
    average, trimmed at the ends of the day) sampled every minute, so lines stay angled.
  - Whole booth = BOOTH totals counted at the end of the day, spread evenly over the
    same hours. Plinko, Balloon Battle and the blowout have no timestamps.
  - "Add Plinko, Battle and blowout" (whole sales table only) stacks those estimates on
    the tracked data as a hatched band: Plinko and Battle spread evenly across the day,
    the blowout as one step after the last tracked sale. Plinko is what's left of the
    ~900 after the tracked sales, the blowout and Battle (1 ticket per drop); each drop
    and each battle match counts as a sale in the minutes-per-sale view.
"""

import csv
import json
import sys
import statistics
from datetime import datetime, timedelta

CAP_PER_SALE = 3
SKIP = {"Oreo", "Burger"}  # not ranked: never put out / not in the stock count
EARLY = ["Avocado", "Dumpling", "Creeper"]  # sold out before the last sale; drawn in this order
STOCK = {"Egg tart": None, "Hot dog bun": 22, "S'mores": 9, "Chocolate bar": 15, "Avocado": 12,
         "Dumpling": 24, "Creeper": 10, "Spam musubi": 6, "Salmon nigiri": 23, "LEGO brick": 4,
         "WD-40": 15, "Creeper infinity cube": 9}
THEME = {"Salmon nigiri": "Asian food", "Dumpling": "Asian food", "Spam musubi": "Asian food",
         "Egg tart": "Asian food", "Hot dog bun": "Snacks & treats", "S'mores": "Snacks & treats",
         "Chocolate bar": "Snacks & treats", "Avocado": "Snacks & treats", "Creeper": "Minecraft",
         "Creeper infinity cube": "Minecraft", "WD-40": "Workshop", "LEGO brick": "Workshop"}
PHOTO = {"Dumpling": "dumpling", "Salmon nigiri": "salmon_nigiri", "Creeper": "creeper",
         "Avocado": "avocado", "Egg tart": "egg_tart", "Chocolate bar": "chocolate_bar",
         "Hot dog bun": "hot_dog_bun", "WD-40": "wd40", "Creeper infinity cube": "creeper_cube",
         "Spam musubi": "spam_musubi", "S'mores": "smores", "LEGO brick": "lego"}
BOOTH = {"counted": 830, "food": 70, "gross": 900, "net": 810}  # Sam's end-of-day count; ~70 food tickets to helpers; net after CCA's 10%
SMOOTH_MIN = 30  # rolling pace window, minutes
EST = {"battle": 55, "battleMatches": 11, "blowout": 60}  # Sam's estimates: Battle 50 to 60 tickets in ~10 to 12 matches; blowout 50 to 70


def parse(s):
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")


def hours(td):
    return td.total_seconds() / 3600


def window_area(a, b, h=SMOOTH_MIN):
    """Area of the triangular window (half-width h, peak 1) between offsets a and b, in minutes."""
    def g(u):
        u = max(-h, min(h, u))
        return (u + h) ** 2 / (2 * h) if u <= 0 else h / 2 + u - u * u / (2 * h)
    return g(b) - g(a)


def pace(points, start, end):
    """Day averages, per-minute rolling pace and half-hour blocks for [(closed_at, tickets), ...]."""
    span = (end - start).total_seconds() / 60
    mins = [((t - start).total_seconds() / 60, q) for t, q in points]
    tix = sum(q for _, q in points)
    gaps = [b - a for (a, _), (b, _) in zip(mins, mins[1:])]
    tix_hr, sales_hr = [], []
    for t in [float(m) for m in range(int(span) + 1)] + [span]:
        norm = window_area(-t, span - t)  # part of the window that falls inside the day
        w = [max(0.0, 1 - abs(m - t) / SMOOTH_MIN) for m, _ in mins]
        tix_hr.append(round(sum(wi * q for wi, (_, q) in zip(w, mins)) / norm * 60, 1))
        sales_hr.append(round(sum(w) / norm * 60, 2))
    first = start.replace(minute=start.minute // 30 * 30, second=0) + timedelta(minutes=30)
    edges = [start]
    while first < end:
        edges.append(first)
        first += timedelta(minutes=30)
    edges.append(end)
    blocks = []
    for a, b in zip(edges, edges[1:]):
        inside = [q for t, q in points if a <= t < b or (b == end and t == end)]
        m = (b - a).total_seconds() / 60
        blocks.append({"from": a.strftime("%H:%M:%S"), "to": b.strftime("%H:%M:%S"), "sales": len(inside),
                       "tickets": sum(inside), "perHr": round(sum(inside) / m * 60, 1),
                       "minPerSale": round(m / len(inside), 2) if inside else None})
    return {"sales": len(points), "tickets": tix, "perHr": round(tix / span * 60, 1),
            "salesPerHr": round(len(points) / span * 60, 2), "gapMean": round(statistics.mean(gaps), 2),
            "gapMedian": round(statistics.median(gaps), 2), "gapMax": round(max(gaps), 1),
            "tixHr": tix_hr, "salesHr": sales_hr, "blocks": blocks}


def build_data(src):
    allrows = list(csv.DictReader(open(src)))
    rows = [r for r in allrows if r["category"] != "Copters"]
    start = min(parse(r["opened_at"]) for r in rows)
    end = max(parse(r["closed_at"]) for r in rows)
    sales, index, when = [], {}, []
    for r in sorted(allrows, key=lambda r: (parse(r["closed_at"]), int(r["record"][1:]))):
        copter = r["category"] == "Copters"
        if r["record"] not in index:
            index[r["record"]] = len(sales)
            when.append(parse(r["closed_at"]))
            sales.append({"id": r["record"], "t": when[-1].strftime("%H:%M:%S"),
                          "tickets": int(r["record_total_tickets"]), "copter": copter, "items": []})
        sales[index[r["record"]]]["items"].append(["Copter: " + r["item"] if copter else r["item"], int(r["qty"])])
    events = {}
    for r in rows:
        if r["item"] in SKIP:
            continue
        events.setdefault(r["item"], []).append((parse(r["closed_at"]), int(r["qty"]), index[r["record"]]))
    designs = []
    for name, ev in events.items():
        ev.sort()
        total = sum(q for _, q, _ in ev)
        stock = STOCK[name]
        sold_out = ev[-1][0] if (stock is not None and total >= stock) else None
        on_table = hours((sold_out or end) - start)
        rate = sum(min(q, CAP_PER_SALE) for _, q, _ in ev) / on_table
        d = {
            "name": name, "theme": THEME[name], "photo": PHOTO[name], "stock": stock,
            "total": total, "rate": round(rate, 3),
            "soldOut": sold_out.strftime("%H:%M:%S") if sold_out else None,
            "events": [[t.strftime("%H:%M:%S"), q, i] for t, q, i in ev],
            "early": name in EARLY,
        }
        if name in EARLY:
            mid = start + (sold_out - start) / 2
            late = sum(min(q, CAP_PER_SALE) for t, q, _ in ev if t > mid) / hours(sold_out - mid)
            gone = hours(end - sold_out)
            d["proj"] = round(total + rate * gone, 2)
            d["projHi"] = round(total + late * gone, 2)
        designs.append(d)
    designs.sort(key=lambda d: -d["rate"])
    scopes = {
        "table": pace([(w, s["tickets"]) for w, s in zip(when, sales)], start, end),
        "clickers": pace([(w, s["tickets"]) for w, s in zip(when, sales) if not s["copter"]], start, end),
    }
    span_hr = hours(end - start)
    booth = dict(BOOTH, perHr=round(BOOTH["gross"] / span_hr, 1), netPerHr=round(BOOTH["net"] / span_hr, 1))
    plinko = BOOTH["gross"] - scopes["table"]["tickets"] - EST["blowout"] - EST["battle"]  # what's left of the ~900
    est = dict(EST, plinko=plinko, perHr=round((plinko + EST["battle"]) / span_hr, 2),
               salesPerHr=round((plinko + EST["battleMatches"]) / span_hr, 2))
    return {"start": start.strftime("%H:%M:%S"), "end": end.strftime("%H:%M:%S"), "smooth": SMOOTH_MIN,
            "early": EARLY, "designs": designs, "sales": sales, "scopes": scopes, "booth": booth, "est": est}


PAGE = r"""<title>Ram-a-thon Clicker Sales</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex, nofollow">
<style>
  /* Layout: one column, header + design chips + chart + comparison cards + data table */
  :root {
    --bg: #FCFCFB; --surface: #FFFFFF; --fg: #1B1B1B; --muted: #4A4A48; --faint: #75746F;
    --rule: #E4E2DD; --grid: #ECEAE5; --other: #C9C7C1; --halo: #FCFCFB;
    --brand: #A31F36; --brand-ink: #FFFFFF; --tag: #A31F36;
    --c-dumpling: #A31F36; --c-avocado: #D18E00; --c-creeper: #1BAF7A;
    --pin-a: #2A78D6; --pin-b: #6250D6;
    --font: "Helvetica Neue", Helvetica, FreeSans, Arial, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #1A1918; --surface: #232220; --fg: #F0EFEC; --muted: #C3C2B7; --faint: #8F8E88;
      --rule: #34332F; --grid: #2C2B29; --other: #57554F; --halo: #1A1918;
      --brand: #E4627A; --brand-ink: #1A1918; --tag: #E4627A;
      --c-dumpling: #E4627A; --c-avocado: #C98500; --c-creeper: #1E9F86;
      --pin-a: #3987E5; --pin-b: #9085E9; color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg: #1A1918; --surface: #232220; --fg: #F0EFEC; --muted: #C3C2B7; --faint: #8F8E88;
    --rule: #34332F; --grid: #2C2B29; --other: #57554F; --halo: #1A1918;
    --brand: #E4627A; --brand-ink: #1A1918; --tag: #E4627A;
    --c-dumpling: #E4627A; --c-avocado: #C98500; --c-creeper: #1E9F86;
    --pin-a: #3987E5; --pin-b: #9085E9; color-scheme: dark;
  }
  body { background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 16px; line-height: 1.4;
         padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
         padding-block: 24px 32px; }
  .wrap { max-width: 1240px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
  header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px 24px; }
  h1 { font-size: clamp(24px, 3.4vw, 34px); line-height: 1.1; font-weight: 800; text-wrap: balance; margin: 0; }
  .sub { color: var(--muted); max-width: 70ch; margin: 6px 0 0; }
  .tag { border: 2px solid var(--tag); color: var(--tag); font-weight: 800; font-size: 13px; letter-spacing: 1.2px;
         padding: 3px 9px; border-radius: 6px; white-space: nowrap; }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .chip { display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px 4px 4px; border-radius: 999px;
          border: 1.5px solid var(--rule); background: var(--surface); color: var(--fg); font: inherit; font-size: 14px;
          cursor: pointer; }
  .chip img { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--ring, var(--other)); }
  .chip[aria-pressed="true"] { border-color: var(--ring, var(--fg)); box-shadow: 0 0 0 1.5px var(--ring, var(--fg)) inset; font-weight: 700; }
  .chip:focus-visible, .btn:focus-visible, .toggle input:focus-visible { outline: 3px solid var(--pin-a); outline-offset: 2px; }
  .row2 { display: flex; flex-wrap: wrap; gap: 10px 20px; align-items: center; justify-content: space-between; }
  .hint { color: var(--faint); font-size: 14px; }
  .btn { font: inherit; font-size: 14px; padding: 6px 12px; border-radius: 8px; border: 1.5px solid var(--rule);
         background: var(--surface); color: var(--fg); cursor: pointer; }
  .toggle { display: inline-flex; gap: 8px; align-items: center; font-size: 14px; color: var(--muted); cursor: pointer; }
  .chart { position: relative; background: var(--surface); border: 1px solid var(--rule); border-radius: 14px; padding: 10px 6px 4px; }
  #svg { display: block; width: 100%; height: auto; touch-action: pan-y; }
  #svg text { font-family: var(--font); }
  .tip { position: absolute; pointer-events: none; background: var(--surface); color: var(--fg); border: 1px solid var(--rule);
         box-shadow: 0 6px 18px rgba(0,0,0,.14); border-radius: 10px; padding: 8px 10px; font-size: 13px; min-width: 170px; }
  .tip b { display: block; margin-bottom: 4px; font-size: 13px; }
  .tip .r { display: flex; justify-content: space-between; gap: 14px; font-variant-numeric: tabular-nums; }
  .tip .sw { display: inline-block; width: 10px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  .tip .me { font-weight: 700; }
  .tip .tot { border-top: 1px solid var(--rule); margin-top: 5px; padding-top: 5px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 14px; }
  .card { background: var(--surface); border: 1px solid var(--rule); border-radius: 14px; padding: 14px 16px; display: flex; gap: 14px; min-width: 0; }
  .card img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid var(--ring); flex: none; }
  .card h3 { margin: 0 0 4px; font-size: 18px; }
  .card dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 14px; margin: 0; font-size: 14px; }
  .card dt { color: var(--faint); }
  .card dd { margin: 0; font-variant-numeric: tabular-nums; }
  .vs { grid-column: 1 / -1; color: var(--muted); font-size: 15px; }
  .empty { color: var(--faint); font-size: 15px; border: 1.5px dashed var(--rule); border-radius: 14px; padding: 14px 16px; }
  details { font-size: 14px; }
  summary { cursor: pointer; color: var(--muted); }
  .tablewrap { overflow-x: auto; margin-top: 8px; }
  table { border-collapse: collapse; min-width: 640px; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--rule); }
  th { color: var(--faint); font-weight: 600; }
  footer { color: var(--faint); font-size: 13px; }
  .viewrow { display: flex; flex-wrap: wrap; gap: 10px 20px; align-items: center; justify-content: space-between; }
  .seg { display: flex; flex-wrap: wrap; gap: 6px; }
  .seg button { font: inherit; font-size: 14px; padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--rule);
                background: var(--surface); color: var(--fg); cursor: pointer; }
  .seg button[aria-pressed="true"] { background: var(--fg); border-color: var(--fg); color: var(--bg); font-weight: 700; }
  .seg button:focus-visible { outline: 3px solid var(--pin-a); outline-offset: 2px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr)); gap: 12px; }
  .stat { background: var(--surface); border: 1px solid var(--rule); border-radius: 14px; padding: 12px 14px; min-width: 0; }
  .stat .k { color: var(--faint); font-size: 13px; }
  .stat .v { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.15; margin: 2px 0; }
  .stat .s { color: var(--muted); font-size: 13px; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 13px; color: var(--muted); padding: 0 8px 8px; }
  .legend span { display: inline-flex; align-items: center; }
  .swl { flex: none; margin-right: 6px; vertical-align: middle; overflow: visible; }
  .wrap[data-view="design"] .only-combined, .wrap:not([data-view="design"]) .only-design { display: none; }
  @media (prefers-reduced-motion: no-preference) { .ln, .lab { transition: opacity .15s ease; } }
</style>

<div class="wrap" id="wrap" data-view="design">
  <header>
    <div>
      <h1 id="h1">Clicker sales through the day</h1>
      <p class="sub" id="sub"></p>
    </div>
    <span class="tag">INTERNAL · DO NOT SHARE</span>
  </header>

  <div class="viewrow">
    <div class="seg" id="views" role="group" aria-label="View">
      <button type="button" data-view="design">Per design</button>
      <button type="button" data-view="total">Combined total</button>
      <button type="button" data-view="rate">Tickets per hour</button>
      <button type="button" data-view="gap">Minutes per sale</button>
    </div>
    <div class="controls only-combined">
      <div class="seg" id="scopes" role="group" aria-label="Which sales">
        <button type="button" data-scope="table">Whole sales table</button>
        <button type="button" data-scope="clickers">Clickers only</button>
      </div>
      <label class="toggle" id="estwrap"><input type="checkbox" id="est"> Add Plinko, Battle and blowout (estimated)</label>
    </div>
  </div>

  <div class="stats only-combined" id="stats"></div>

  <div class="controls only-design" id="chips" role="group" aria-label="Designs"></div>
  <div class="row2 only-design">
    <span class="hint" id="pinhint">Pick up to two designs to compare.</span>
    <div class="controls">
      <label class="toggle"><input type="checkbox" id="proj" checked> Show "enough stock" projections</label>
      <button class="btn" id="clear" type="button">Clear</button>
    </div>
  </div>

  <div class="chart" id="chartbox">
    <svg id="svg" role="img" aria-label="Running total of clickers sold by design, 10 AM to 1:20 PM"></svg>
    <div class="legend only-combined" id="legend"></div>
    <div class="tip" id="tip" hidden></div>
  </div>

  <div class="cards only-design" id="cards"></div>

  <details>
    <summary>All designs as a table</summary>
    <div class="tablewrap"><table id="table"></table></div>
  </details>

  <details>
    <summary id="blocksum">Pace by half hour</summary>
    <div class="tablewrap"><table id="blocks"></table></div>
  </details>

  <details>
    <summary>Average per hour by booth</summary>
    <div class="tablewrap"><table id="booths"></table></div>
  </details>

  <details>
    <summary>Every sale on the sales laptop</summary>
    <div class="tablewrap"><table id="sales"></table></div>
  </details>

  <footer>Ram-a-thon 2026, Rambots (Team 2204). Sales laptop export: 69 sales (64 clicker, 5 copter), 10:01 AM to 1:20 PM, $1 per ticket; net is after CCA's 10%. Per-design rate = clickers sold per hour while the design was on the table; one sale counts at most 3 of a design, and Oreo and Burger are left out. Pace lines use a rolling 30-minute window. The whole-booth total (830 counted plus about 70 tickets given to helpers for food) was counted at the end of the day; Plinko, Balloon Battle and the end-of-day clicker blowout have no timestamps, so their average assumes the same hours. The estimate toggle spreads Plinko (~300, what's left of ~900 at 1 ticket a drop) and Battle (~55, about 11 matches) evenly and adds the ~60 blowout after the last sale. Internal estimates, do not share or repost.</footer>
</div>

<script>
const DATA = __DATA__;
const DAY = "2026-10-17T";
const t = s => new Date(DAY + s).getTime();
const X0 = t("10:00:00"), X1 = t("13:30:00"), START = t(DATA.start), END = t(DATA.end), YMAX = 32;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const EARLY_VAR = { "Dumpling": "--c-dumpling", "Avocado": "--c-avocado", "Creeper": "--c-creeper" };
const fmt = ms => { const d = new Date(ms); let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, "0"); return (h > 12 ? h - 12 : h) + ":" + m; };
const ampm = ms => fmt(ms) + (new Date(ms).getHours() >= 12 ? " PM" : " AM");
const ampmSec = ms => fmt(ms) + ":" + String(new Date(ms).getSeconds()).padStart(2, "0") + (new Date(ms).getHours() >= 12 ? " PM" : " AM");
const designs = DATA.designs.map(d => ({ ...d, ev: d.events.map(([s, q, i]) => [t(s), q, i]), so: d.soldOut ? t(d.soldOut) : null }));
const byName = Object.fromEntries(designs.map(d => [d.name, d]));
const state = { pins: [], hover: null, proj: true, view: "design", scope: "table", est: false };

function totalAt(d, ms) { let c = 0; for (const [tm, q] of d.ev) { if (tm <= ms) c += q; else break; } return c; }
function projAt(d, ms) { return d.proj == null || ms <= d.so ? null : d.total + (d.proj - d.total) * (ms - d.so) / (END - d.so); }
function lineEnd(d) { return d.so && d.early ? d.so : (d.so || END); }
function colorOf(d) {
  if (EARLY_VAR[d.name]) return css(EARLY_VAR[d.name]);
  const i = state.pins.indexOf(d.name);
  if (i === 0) return css("--pin-a");
  if (i === 1) return css("--pin-b");
  if (state.hover === d.name) return css("--fg");
  return css("--other");
}
function active() { const s = new Set(state.pins); if (state.hover) s.add(state.hover); return s; }

// ---------- chips ----------
const chips = document.getElementById("chips");
for (const d of designs) {
  const b = document.createElement("button");
  b.className = "chip"; b.type = "button"; b.dataset.name = d.name; b.setAttribute("aria-pressed", "false");
  b.innerHTML = `<img src="infographic_photos/${d.photo}.jpg" alt="">${d.name}`;
  b.addEventListener("click", () => togglePin(d.name));
  b.addEventListener("mouseenter", () => { state.hover = d.name; paint(); });
  b.addEventListener("mouseleave", () => { state.hover = null; paint(); });
  chips.append(b);
}
function togglePin(name) {
  const i = state.pins.indexOf(name);
  if (i >= 0) state.pins.splice(i, 1);
  else { state.pins.push(name); if (state.pins.length > 2) state.pins.shift(); }
  paint(true); cards();
}
document.getElementById("clear").addEventListener("click", () => { state.pins = []; state.hover = null; paint(); cards(); hideTip(); });
document.getElementById("proj").addEventListener("change", e => { state.proj = e.target.checked; draw(); });

// ---------- chart ----------
const svg = document.getElementById("svg"), box = document.getElementById("chartbox"), tip = document.getElementById("tip");
let G = null; // geometry of the last draw

function draw() {
  hideTip();
  if (state.view === "design") drawDesign(); else drawCombined();
}

// Grid, axes and the "last sale" marker shared by every view; sets G for this draw
function frame(ymax, ystep, fy, title, endLow) {
  const W = Math.max(320, box.clientWidth - 12);
  const wide = W >= 760;
  const M = { l: 44, r: wide ? 270 : 16, t: title ? 32 : 16, b: 38 };
  const H = wide ? 540 : Math.round(Math.min(520, Math.max(340, W * 0.95)));
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const x = ms => M.l + (ms - X0) / (X1 - X0) * pw;
  const y = v => M.t + ph - Math.min(v, ymax) / ymax * ph;
  G = { W, H, M, x, y, wide, pw, ph };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
  const out = [];
  if (title) out.push(`<text x="4" y="14" font-size="12.5" fill="var(--muted)">${title}</text>`);
  for (let v = 0; v <= ymax; v += ystep) {
    out.push(`<line x1="${M.l}" x2="${M.l + pw}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/>`);
    out.push(`<text x="${M.l - 8}" y="${y(v) + 4}" font-size="12" fill="var(--faint)" text-anchor="end">${fy(v)}</text>`);
  }
  const step = wide ? 30 : 60;
  for (let m = 0; m <= 210; m += step) {
    const ms = X0 + m * 60000;
    out.push(`<text x="${x(ms)}" y="${M.t + ph + 24}" font-size="12" fill="var(--faint)" text-anchor="middle">${fmt(ms)}</text>`);
  }
  out.push(`<line x1="${M.l}" x2="${M.l + pw}" y1="${y(0)}" y2="${y(0)}" stroke="var(--faint)"/>`);
  out.push(`<line x1="${x(END)}" x2="${x(END)}" y1="${M.t}" y2="${y(0)}" stroke="var(--faint)" stroke-dasharray="4 4"/>`);
  out.push(`<text x="${x(END) - 6}" y="${endLow ? y(0) - 8 : M.t + 14}" font-size="12" fill="var(--faint)" text-anchor="end">last sale 1:20</text>`);
  out.push(`<line id="cross" x1="0" x2="0" y1="${M.t}" y2="${y(0)}" stroke="var(--faint)" visibility="hidden"/>`);
  return out;
}

function drawDesign() {
  const out = frame(YMAX, 4, v => v, "");
  const { x, y, wide } = G;
  // Draw gray designs first, early sell-outs last (on top)
  const order = [...designs.filter(d => !d.early), ...DATA.early.map(n => byName[n])];
  for (const d of order) {
    const pts = [[x(START), y(0)]]; let c = 0;
    for (const [tm, q] of d.ev) { c += q; pts.push([x(tm), y(c)]); }
    const stop = lineEnd(d);
    if (stop > d.ev[d.ev.length - 1][0]) pts.push([x(stop), y(c)]);
    const dd = "M" + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" L");
    const id = d.name.replace(/[^a-z]/gi, "");
    out.push(`<g class="ln" data-name="${d.name}">`);
    if (d.early && state.proj) {
      const sx = x(d.so), sy = y(d.total);
      out.push(`<polygon points="${sx},${sy} ${x(END)},${y(d.proj)} ${x(END)},${y(d.projHi)}" class="wedge" fill-opacity="0.15"/>`);
      out.push(`<line x1="${sx}" y1="${sy}" x2="${x(END)}" y2="${y(d.proj)}" class="proj" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>`);
    }
    out.push(`<path d="${dd}" fill="none" stroke="var(--halo)" stroke-width="7" stroke-linejoin="round" class="halo"/>`);
    out.push(`<path d="${dd}" fill="none" class="main" stroke-linejoin="round"/>`);
    if (d.early) out.push(`<circle cx="${x(d.so)}" cy="${y(d.total)}" r="6" class="dot" stroke="var(--halo)" stroke-width="2.5"/>`);
    out.push(`<path d="${dd}" fill="none" stroke="transparent" stroke-width="16" class="hit" style="cursor:pointer"/>`);
    const at = []; let run = 0;
    for (const [tm, q] of d.ev) { run += q; at.push([x(tm).toFixed(1), y(run).toFixed(1)]); }
    at.forEach(([cx, cy], k) => { if (!(d.early && k === at.length - 1)) out.push(`<circle cx="${cx}" cy="${cy}" r="3" class="sdot" stroke="var(--halo)" stroke-width="1.5" pointer-events="none"/>`); });
    at.forEach(([cx, cy], k) => out.push(`<circle cx="${cx}" cy="${cy}" r="9" fill="transparent" class="shit" data-k="${k}" style="cursor:pointer"/>`));
    out.push(`</g>`);
  }
  // Right-side labels (wide screens)
  if (wide) {
    const labs = designs.map(d => {
      const v = d.early && state.proj ? d.proj : d.total;
      let text = `${d.name} ${d.total}`;
      if (d.early) text = state.proj ? `${d.name}: ${d.total} sold, ~${Math.round(d.proj)} with stock (up to ${Math.round(d.projHi)})` : `${d.name} ${d.total} (out ${fmt(d.so)})`;
      else if (d.so) text += " (sold out 1:20)";
      return { d, v, text };
    }).sort((a, b) => b.v - a.v);
    let last = -1e9;
    for (const L of labs) {
      let ly = y(L.v) + 4; if (ly < last + 17) ly = last + 17; last = ly;
      out.push(`<g class="lab" data-name="${L.d.name}"><line x1="${x(END) + 2}" y1="${y(L.v)}" x2="${x(END) + 12}" y2="${ly - 4}" stroke-width="1"/>` +
               `<text x="${x(END) + 15}" y="${ly}" font-size="12.5">${L.text}</text></g>`);
    }
  }
  svg.innerHTML = out.join("");
  for (const g of svg.querySelectorAll(".ln")) {
    const n = g.dataset.name;
    for (const h of g.querySelectorAll(".hit, .shit")) {
      h.addEventListener("pointerenter", () => { state.hover = n; paint(); });
      h.addEventListener("pointerleave", () => { state.hover = null; paint(); });
    }
    g.querySelector(".hit").addEventListener("click", ev => { ev.stopPropagation(); togglePin(n); });
    // A sale dot pins its line but never unpins it, so tapping along one line keeps it pinned
    for (const s of g.querySelectorAll(".shit")) s.addEventListener("click", ev => {
      ev.stopPropagation(); if (!state.pins.includes(n)) togglePin(n); showSaleTip(byName[n], +s.dataset.k, ev.clientX, ev.clientY);
    });
  }
  paint(true);
}

function paint(reorder) {
  const act = active(), any = act.size > 0;
  for (const g of svg.querySelectorAll(".ln")) {
    const d = byName[g.dataset.name], on = act.has(d.name), col = colorOf(d);
    g.style.opacity = !any || on ? 1 : 0.13;
    const main = g.querySelector(".main");
    main.setAttribute("stroke", col);
    main.setAttribute("stroke-width", on ? 4 : (d.early ? 3 : 2));
    for (const el of g.querySelectorAll(".proj")) el.setAttribute("stroke", col);
    for (const el of g.querySelectorAll(".wedge")) el.setAttribute("fill", col);
    for (const el of g.querySelectorAll(".dot")) el.setAttribute("fill", col);
    for (const el of g.querySelectorAll(".sdot")) { el.setAttribute("fill", col); el.setAttribute("r", on ? 4 : 3); el.style.opacity = on || d.early ? 1 : 0; }
    if (reorder && state.pins.includes(d.name)) g.parentNode.appendChild(g); // pinned lines on top; never on hover, which would drop the hover
  }
  for (const l of svg.querySelectorAll(".lab")) {
    const d = byName[l.dataset.name], on = act.has(d.name);
    const col = d.early || on ? colorOf(d) : css("--faint");
    l.style.opacity = !any || on ? 1 : 0.25;
    l.querySelector("text").setAttribute("fill", col);
    l.querySelector("text").setAttribute("font-weight", d.early || on ? 700 : 400);
    l.querySelector("line").setAttribute("stroke", col);
  }
  for (const c of chips.children) {
    const d = byName[c.dataset.name], pinned = state.pins.includes(d.name);
    c.setAttribute("aria-pressed", pinned ? "true" : "false");
    c.style.setProperty("--ring", d.early || pinned ? colorOf(d) : css("--other"));
  }
  const n = state.pins.length;
  document.getElementById("pinhint").textContent = n === 0 ? "Pick up to two designs to compare." : n === 1 ? "Pick one more to compare side by side." : "Comparing two. Picking a third replaces the first.";
}

// ---------- crosshair tooltip ----------
function msAt(clientX) {
  if (!G) return null;
  const r = svg.getBoundingClientRect(), sx = (clientX - r.left) * (G.W / r.width);
  const ms = X0 + (sx - G.M.l) / G.pw * (X1 - X0);
  return ms < START || ms > X1 ? null : Math.min(ms, END); // past the last sale snaps to it, so the end of the day is easy to hover
}
function setCross(ms) {
  const cross = svg.querySelector("#cross");
  cross.setAttribute("x1", G.x(ms)); cross.setAttribute("x2", G.x(ms)); cross.setAttribute("visibility", "visible");
}
function showTip(clientX, clientY) {
  if (state.view !== "design") return showComboTip(clientX, clientY);
  const ms = msAt(clientX);
  if (ms == null) { hideTip(); return; }
  setCross(ms);
  const act = active();
  let list = designs.map(d => ({ d, v: totalAt(d, ms), p: state.proj ? projAt(d, ms) : null }));
  list = act.size ? list.filter(o => act.has(o.d.name)) : list.sort((a, b) => b.v - a.v).slice(0, 5);
  const rows = list.map(o => {
    const val = o.p != null ? `${o.v} <span style="color:var(--faint)">(~${Math.round(o.p)} w/ stock)</span>` : o.v;
    return `<div class="r"><span><i class="sw" style="background:${colorOf(o.d) || "var(--other)"}"></i>${o.d.name}</span><span>${val}</span></div>`;
  }).join("");
  tip.innerHTML = `<b>${ampm(ms)}${act.size ? "" : " · top 5"}</b>${rows}`;
  placeTip(clientX, clientY);
}
function placeTip(clientX, clientY) {
  tip.hidden = false;
  const br = box.getBoundingClientRect();
  let left = clientX - br.left + 14, top = clientY - br.top + 14;
  if (left + tip.offsetWidth > br.width - 6) left = clientX - br.left - tip.offsetWidth - 14;
  if (top + tip.offsetHeight > br.height - 6) top = br.height - tip.offsetHeight - 6;
  tip.style.left = Math.max(6, left) + "px"; tip.style.top = Math.max(6, top) + "px";
}
// Time, items and ticket total of one sale; `me` (a design) is bolded with its color
function saleHTML(s, me, meColor) {
  const items = s.items.map(([n, q]) =>
    `<div class="r${n === me ? " me" : ""}"><span><i class="sw" style="background:${n === me ? meColor : "transparent"}"></i>${n}</span><span>×${q}</span></div>`).join("");
  const units = s.items.reduce((a, [, q]) => a + q, 0);
  return `<b>${ampmSec(t(s.t))} · sale #${s.id.slice(1)}</b>${items}` +
    `<div class="r tot"><span>Sale total</span><span>${s.tickets} tickets${!s.copter && units > 1 ? ` · ${units} clickers` : ""}</span></div>`;
}
function showSaleTip(d, k, clientX, clientY) {
  if (!G) return;
  const [tm, , i] = d.ev[k];
  let run = 0; for (let j = 0; j <= k; j++) run += d.ev[j][1];
  setCross(tm);
  const sofar = d.stock == null ? `${run}` : `${run} of ${d.stock}${run >= d.stock ? ", sold out" : ""}`;
  tip.innerHTML = saleHTML(DATA.sales[i], d.name, colorOf(d)) + `<div class="r"><span>${d.name} sold so far</span><span>${sofar}</span></div>`;
  placeTip(clientX, clientY);
}
function hideTip() {
  tip.hidden = true;
  for (const id of ["#cross", "#focus"]) { const c = svg.querySelector(id); if (c) c.setAttribute("visibility", "hidden"); }
}
function onPoint(e) {
  const s = e.target.closest && e.target.closest(".shit");
  if (s && s.dataset.j != null) showComboSaleTip(+s.dataset.j, e.clientX, e.clientY);
  else if (s) showSaleTip(byName[s.parentNode.dataset.name], +s.dataset.k, e.clientX, e.clientY);
  else showTip(e.clientX, e.clientY);
}
svg.addEventListener("pointermove", onPoint);
svg.addEventListener("pointerleave", hideTip);
svg.addEventListener("click", onPoint);

// ---------- combined views: total, tickets per hour, minutes per sale ----------
const VIEWS = {
  design: { h1: "Clicker sales through the day", aria: "Running total of clickers sold by design, 10 AM to 1:20 PM",
    sub: "Running total per design at Ram-a-thon 2026. Each dot is one sale: hover or tap it for the time, what was in the sale and its tickets. Hover a line to highlight it. Click lines or the photos to pin up to two and compare them. Dotted lines show what the early sell-outs would have sold with enough stock." },
  total: { h1: "Combined sales through the day", aria: "Running total of tickets taken on the sales laptop, 10 AM to 1:20 PM",
    sub: "Running total of tickets taken on the sales laptop ($1 each). The dashed line is an even pace that ends at the same total, so the gap shows when we ran ahead of it or fell behind. Hover or tap a dot for that sale." },
  rate: { h1: "Sales pace through the day", aria: "Tickets per hour through the day, with the day average and the whole booth average",
    sub: "Gross dollars per hour ($1 a ticket). The solid line is how fast we actually sold over a rolling 30 minutes; the dashed line is the day average. The dotted line is the whole booth, Plinko and Battle included, if its ~900 tickets were spread evenly. Hover for net after CCA's 10%." },
  gap: { h1: "Time between sales", aria: "Minutes between sales through the day",
    sub: "Each dot is one sale, placed at how many minutes passed since the sale before it, so lower is busier. The solid line is the rolling 30-minute pace; the dashed line is the day average. Hover or tap a dot for that sale." },
};
const CFG = {
  total: { ymax: 500, step: 100, fy: v => money(v), title: "Gross $ so far (1 ticket = $1)", endLow: true },
  rate: { ymax: 300, step: 50, fy: v => money(v), title: "Gross $ per hour (1 ticket = $1)" },
  gap: { ymax: 18, step: 3, fy: v => v, title: "Minutes since the sale before (lower = busier)" },
};
const money = v => "$" + Math.round(v).toLocaleString("en-US");
const net = v => v * 0.9;
const SPAN = (END - START) / 60000;
const gridMin = k => Math.min(k, SPAN); // pace samples sit on each minute, the last one at the final sale
function paceAt(arr, ms) {
  const m = Math.max(0, Math.min(SPAN, (ms - START) / 60000));
  const k = Math.min(Math.floor(m), arr.length - 2), a = gridMin(k), b = gridMin(k + 1);
  return b > a ? arr[k] + (arr[k + 1] - arr[k]) * (m - a) / (b - a) : arr[k + 1];
}
function scopeSales() { return DATA.sales.map((s, i) => ({ ...s, i, ms: t(s.t) })).filter(s => state.scope === "table" || !s.copter); }
const pathOf = pts => "M" + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" L");
const swatch = (stroke, dash, w) => `<svg class="swl" width="18" height="10" aria-hidden="true"><line x1="2" x2="16" y1="5" y2="5" stroke="${stroke}" stroke-width="${w}" stroke-dasharray="${dash}" stroke-linecap="round"/></svg>`;
const SW = {
  main: () => swatch("var(--brand)", "", 2.5),
  avg: () => swatch("var(--muted)", "4 4", 2),
  booth: () => swatch("var(--pin-a)", "0.5 4.5", 2.5),
  dot: () => `<svg class="swl" width="18" height="10" aria-hidden="true"><circle cx="9" cy="5" r="4" fill="var(--brand)"/></svg>`,
};
const row = (sw, k, v) => `<div class="r"><span>${sw}${k}</span><span>${v}</span></div>`;
// Untimed booths (whole sales table only): Plinko and Battle spread evenly, blowout at the last sale
const E = DATA.est, HRS = (END - START) / 3600000, PLINKO = Math.round(E.plinko / 10) * 10;
const estOn = () => state.scope === "table" && state.est;
const estTix = ms => (E.plinko + E.battle) * (ms - START) / (END - START);
const approx = v => "~" + money(v);
const mins = m => m < 1 ? `${Math.round(m * 60)} s` : `${m.toFixed(1)} min`;
const HATCH = `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
  `<rect width="7" height="7" fill="var(--brand)" fill-opacity="0.08"/><line x1="0" y1="0" x2="0" y2="7" stroke="var(--brand)" stroke-width="2" stroke-opacity="0.3"/></pattern></defs>`;
SW.est = () => `<svg class="swl" width="18" height="10" aria-hidden="true"><rect x="1" y="1" width="16" height="8" fill="url(#hatch)" stroke="var(--brand)" stroke-width="1" stroke-dasharray="3 2"/></svg>`;
const EST_NOTE = {
  total: " The hatched band adds Plinko (~$300) and Balloon Battle (~$55) spread evenly across the day, plus the ~$60 clicker blowout as one step at the end. None of those have timestamps, so the band is an estimate.",
  rate: " The hatched band adds Plinko and Balloon Battle spread evenly (about $108 an hour). The blowout has no duration, so it only shows in the whole-booth average.",
  gap: " The hatched band counts each Plinko drop (~300) and Battle match (~11) as a sale, spread evenly. The blowout has no timestamps, so it's left out here.",
};

function drawCombined() {
  const est = estOn(), c = { ...CFG[state.view] }, sc = DATA.scopes[state.scope], ss = scopeSales();
  if (est && state.view === "total") Object.assign(c, { ymax: 1000, step: 200 });
  if (est && state.view === "rate") Object.assign(c, { ymax: 350, step: 50 });
  const out = frame(c.ymax, c.step, c.fy, c.title, c.endLow);
  const { x, y, wide } = G;
  out.push(HATCH);
  const xk = k => x(START + gridMin(k) * 60000);
  const flat = (v, stroke, dash, w) => `<line x1="${x(START)}" x2="${x(END)}" y1="${y(v)}" y2="${y(v)}" stroke="${stroke}" stroke-width="${w}" stroke-dasharray="${dash}" stroke-linecap="round"/>`;
  const main = pts => `<path d="${pathOf(pts)}" fill="none" stroke="var(--halo)" stroke-width="6.5" stroke-linejoin="round"/>` +
                      `<path d="${pathOf(pts)}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round"/>`;
  // Hatched band between two lines: the estimated booths stacked on the tracked data
  const band = (a, b) => `<path d="${pathOf(a)} L${pathOf(b.slice().reverse()).slice(1)} Z" fill="url(#hatch)" stroke="none"/>`;
  const edge = pts => `<path d="${pathOf(pts)}" fill="none" stroke="var(--brand)" stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round"/>`;
  const labs = [], dots = [];
  if (state.view === "total") {
    let run = 0; const pts = [[x(START), y(0)]], upper = [[x(START), y(0)]];
    for (const s of ss) {
      run += s.tickets; pts.push([x(s.ms), y(run)]); upper.push([x(s.ms), y(run + estTix(s.ms))]);
      dots.push({ s, cx: x(s.ms), cy: y(run), run });
    }
    const goal = est ? DATA.booth.gross : sc.tickets;
    if (est) { upper.push([x(END), y(goal)]); out.push(band(upper, pts), edge(upper)); } // blowout: one step at the last sale
    out.push(`<line x1="${x(START)}" y1="${y(0)}" x2="${x(END)}" y2="${y(goal)}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 4"/>`);
    out.push(main(pts));
    labs.push({ v: sc.tickets, sw: SW.main(), text: est ? `${money(sc.tickets)} tracked (${money(net(sc.tickets))} net)` : `${money(sc.tickets)} by the last sale (${money(net(sc.tickets))} net)` });
    if (est) labs.push({ v: goal, sw: SW.est(), text: `${approx(goal)} all booths (${approx(net(goal))} net)` });
  } else if (state.view === "rate") {
    const pts = sc.tixHr.map((v, k) => [xk(k), y(v)]), avg = est ? sc.perHr + E.perHr : sc.perHr, last = sc.tixHr[sc.tixHr.length - 1];
    if (est) { const upper = sc.tixHr.map((v, k) => [xk(k), y(v + E.perHr)]); out.push(band(upper, pts), edge(upper)); }
    out.push(flat(DATA.booth.perHr, "var(--pin-a)", "0.5 5", 2.5), flat(avg, "var(--muted)", "4 4", 2));
    out.push(main(pts));
    labs.push({ v: DATA.booth.perHr, sw: SW.booth(), text: est ? `Whole booth with blowout ~${money(DATA.booth.perHr)}/hr` : `Whole booth ~${money(DATA.booth.perHr)}/hr (~${money(DATA.booth.netPerHr)} net)` },
              { v: avg, sw: SW.avg(), text: est ? `Day average ~${money(avg)}/hr (~${money(net(avg))} net)` : `Day average ${money(sc.perHr)}/hr (${money(net(sc.perHr))} net)` },
              { v: last, sw: SW.main(), text: est ? "Sales table, tracked" : "Actual pace, rolling 30 min" });
    if (est) labs.push({ v: last + E.perHr, sw: SW.est(), text: "+ Plinko and Battle, estimated" });
  } else {
    for (let j = 1; j < ss.length; j++) {
      const gap = (ss[j].ms - ss[j - 1].ms) / 60000;
      dots.push({ s: ss[j], cx: x(ss[j].ms), cy: y(gap), gap });
    }
    const trk = sc.salesHr.map((v, k) => [xk(k), y(60 / v)]), last = sc.salesHr[sc.salesHr.length - 1];
    const avg = est ? 60 / (sc.salesPerHr + E.salesPerHr) : sc.gapMean;
    if (est) { const lower = sc.salesHr.map((v, k) => [xk(k), y(60 / (v + E.salesPerHr))]); out.push(band(trk, lower), edge(lower)); }
    out.push(...dots.map(D => `<circle cx="${D.cx.toFixed(1)}" cy="${D.cy.toFixed(1)}" r="4" fill="var(--brand)" fill-opacity="0.55" stroke="var(--halo)" stroke-width="1.5"/>`));
    out.push(flat(avg, "var(--muted)", "4 4", 2));
    out.push(main(trk));
    labs.push({ v: avg, sw: SW.avg(), text: est ? `Average ~${mins(avg)} with drops + battles` : `Average ${sc.gapMean.toFixed(1)} min apart (median ${sc.gapMedian.toFixed(1)})` },
              { v: 60 / last, sw: SW.main(), text: est ? "Sales table, tracked" : "Rolling 30-min pace" });
    if (est) labs.push({ v: 60 / (last + E.salesPerHr), sw: SW.est(), text: "With Plinko drops and battles, est." });
  }
  if (state.view === "total") out.push(...dots.map(D => `<circle cx="${D.cx.toFixed(1)}" cy="${D.cy.toFixed(1)}" r="4" fill="var(--brand)" stroke="var(--halo)" stroke-width="2"/>`));
  out.push(`<circle id="focus" r="6" fill="none" stroke="var(--fg)" stroke-width="2" visibility="hidden" pointer-events="none"/>`);
  out.push(...dots.map((D, j) => `<circle cx="${D.cx.toFixed(1)}" cy="${D.cy.toFixed(1)}" r="9" fill="transparent" class="shit" data-j="${j}" style="cursor:pointer"/>`));
  if (wide) { // labels in the right margin, stacked bottom-up so none drop below the axis; ink text with the line's swatch
    labs.sort((a, b) => a.v - b.v);
    let prev = Infinity;
    for (const L of labs) {
      const ly = Math.min(y(L.v) + 4, prev - 18, y(0) + 4); prev = ly;
      out.push(`<line x1="${x(END) + 2}" y1="${y(L.v)}" x2="${x(END) + 10}" y2="${ly - 4}" stroke="var(--faint)" stroke-width="1"/>` +
               `<g transform="translate(${x(END) + 12},${ly - 9})">${L.sw.replace('class="swl"', "")}</g>` +
               `<text x="${x(END) + 34}" y="${ly}" font-size="12.5" fill="var(--fg)">${L.text}</text>`);
    }
  }
  svg.innerHTML = out.join("");
  G.dots = dots;
}
function setFocus(cx, cy) {
  const f = svg.querySelector("#focus");
  if (f) { f.setAttribute("cx", cx); f.setAttribute("cy", cy); f.setAttribute("visibility", "visible"); }
}
function showComboTip(clientX, clientY) {
  const ms = msAt(clientX);
  if (ms == null) { hideTip(); return; }
  setCross(ms);
  const sc = DATA.scopes[state.scope], b = DATA.booth, est = estOn();
  const tot = (k, v) => `<div class="r tot"><span>${k}</span><span>${v}</span></div>`;
  let rows, fy;
  if (state.view === "total") {
    let run = 0; for (const s of scopeSales()) { if (s.ms <= ms) run += s.tickets; else break; }
    if (est) {
      const f = (ms - START) / (END - START), bl = ms >= END ? E.blowout : 0, all = run + estTix(ms) + bl, even = b.gross * f;
      rows = [row(SW.main(), "Sales table, tracked", money(run)), row(SW.est(), "Plinko, est.", approx(PLINKO * f)),
              row(SW.est(), "Battle, est.", approx(E.battle * f)), ...(bl ? [row(SW.est(), "Blowout, est.", approx(bl))] : []),
              tot("All booths so far", `${approx(all)} · ${approx(net(all))} net`), row(SW.avg(), "Even pace", approx(even))];
      fy = all;
    } else {
      const even = sc.tickets * (ms - START) / (END - START);
      rows = [row(SW.main(), "Tracked so far", `${money(run)} · ${money(net(run))} net`), row(SW.avg(), "Even pace", money(even)),
              row("", run >= even ? "Ahead of even pace" : "Behind even pace", money(Math.abs(run - even)))];
      fy = run;
    }
  } else if (state.view === "rate") {
    const p = paceAt(sc.tixHr, ms);
    if (est) {
      const avg = sc.perHr + E.perHr;
      rows = [row(SW.main(), "Sales table, tracked", `${money(p)}/hr`), row(SW.est(), "Plinko, est.", `~${money(E.plinko / HRS)}/hr`),
              row(SW.est(), "Battle, est.", `~${money(E.battle / HRS)}/hr`), tot("Together", `~${money(p + E.perHr)}/hr · ~${money(net(p + E.perHr))} net`),
              row(SW.avg(), "Day average", `~${money(avg)}/hr · ~${money(net(avg))} net`),
              row(SW.booth(), "Whole booth, with blowout", `~${money(b.perHr)}/hr · ~${money(b.netPerHr)} net`)];
      fy = p + E.perHr;
    } else {
      rows = [row(SW.main(), "Actual pace", `${money(p)}/hr · ${money(net(p))} net`),
              row(SW.avg(), "Day average", `${money(sc.perHr)}/hr · ${money(net(sc.perHr))} net`),
              row(SW.booth(), "Whole booth", `~${money(b.perHr)}/hr · ~${money(b.netPerHr)} net`)];
      fy = p;
    }
  } else {
    const sp = paceAt(sc.salesHr, ms);
    if (est) {
      const all = sp + E.salesPerHr;
      rows = [row(SW.main(), "Sales table, tracked", `1 sale every ${mins(60 / sp)}`), row(SW.est(), "Plinko drops, est.", `~${Math.round(E.plinko / HRS)} an hour`),
              row(SW.est(), "Battle matches, est.", `~${Math.round(E.battleMatches / HRS)} an hour`), tot("Together", `~1 every ${mins(60 / all)}`),
              row(SW.avg(), "Day average", `~1 every ${mins(60 / (sc.salesPerHr + E.salesPerHr))}`)];
      fy = 60 / all;
    } else {
      rows = [row(SW.main(), "Rolling pace", `1 sale every ${mins(60 / sp)}`), row(SW.avg(), "Day average", `every ${sc.gapMean.toFixed(1)} min`)];
      fy = 60 / sp;
    }
  }
  setFocus(G.x(ms), G.y(fy));
  tip.innerHTML = `<b>${ampm(ms)}</b>${rows.join("")}`;
  placeTip(clientX, clientY);
}
function showComboSaleTip(j, clientX, clientY) {
  const D = G.dots[j];
  setCross(D.s.ms); setFocus(D.cx, D.cy);
  const extra = state.view === "total" ? row("", "Tracked so far", `${money(D.run)} · ${money(net(D.run))} net`)
                                       : row("", "Since the sale before", `${D.gap.toFixed(1)} min`);
  tip.innerHTML = saleHTML(D.s, null, "") + extra;
  placeTip(clientX, clientY);
}
function stats() {
  const sc = DATA.scopes[state.scope], b = DATA.booth;
  const tile = (k, v, s) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  const parts = `${money(DATA.scopes.table.tickets)} tracked + Plinko ~${money(PLINKO)} + Battle ~${money(E.battle)} + blowout ~${money(E.blowout)}`;
  if (estOn()) {
    const avg = sc.perHr + E.perHr;
    document.getElementById("stats").innerHTML =
      tile("Sales table, tracked", money(sc.tickets), `${sc.sales} sales · ${money(net(sc.tickets))} net after CCA's 10%`) +
      tile("Day average, all booths", `~${money(avg)}/hr`, `sales table ${money(sc.perHr)} + Plinko ~${money(E.plinko / HRS)} + Battle ~${money(E.battle / HRS)} · ~${money(b.perHr)} with the blowout`) +
      tile("Time between sales", `~${mins(60 / (sc.salesPerHr + E.salesPerHr))}`, `counting ~${PLINKO} Plinko drops and ~${E.battleMatches} battles · tracked alone ${sc.gapMean.toFixed(1)} min`) +
      tile("Whole booth, counted at close", `~${money(b.gross)}`, `${parts} · ~${money(b.net)} net`);
    return;
  }
  document.getElementById("stats").innerHTML =
    tile(state.scope === "table" ? "Sales table, tracked" : "Clickers, tracked", money(sc.tickets), `${sc.sales} sales · ${money(net(sc.tickets))} net after CCA's 10%`) +
    tile("Day average pace", `${money(sc.perHr)}/hr`, `${money(net(sc.perHr))}/hr net · ${sc.salesPerHr.toFixed(1)} sales an hour`) +
    tile("Time between sales", `${sc.gapMean.toFixed(1)} min`, `average · median ${sc.gapMedian.toFixed(1)} · longest ${sc.gapMax.toFixed(1)}`) +
    tile("Whole booth, counted at close", `~${money(b.gross)}`, `${b.counted} counted + ~${b.food} food tickets for helpers · ~${money(b.net)} net · ~${money(b.perHr)}/hr`);
}
function legend() {
  const est = estOn();
  const L = state.view === "total" ? [[SW.main(), "Sales table, tracked"], ...(est ? [[SW.est(), "Plinko and Battle spread evenly, blowout at the end (estimated)"]] : []), [SW.avg(), "Even pace to the same total"], [SW.dot(), "One sale"]]
          : state.view === "rate" ? [[SW.main(), est ? "Sales table, tracked (rolling 30 min)" : "Actual pace (rolling 30 min)"], ...(est ? [[SW.est(), "Plinko and Battle spread evenly (estimated)"]] : []), [SW.avg(), "Day average"], [SW.booth(), "Whole booth average, all games spread evenly"]]
          : [[SW.dot(), "One sale: minutes since the one before"], [SW.main(), "Rolling 30-min pace, sales table"], ...(est ? [[SW.est(), "Counting each Plinko drop and battle as a sale (estimated)"]] : []), [SW.avg(), "Day average"]];
  document.getElementById("legend").innerHTML = L.map(([sw, k]) => `<span>${sw}${k}</span>`).join("");
}
function blocksTable() {
  const sc = DATA.scopes[state.scope], est = estOn();
  const blockMin = b => (t(b.to) - t(b.from)) / 60000;
  const estCols = (perHr, sales, m) => est ? `<td>~${money(perHr + E.perHr)}</td><td>~${mins(m / (sales + E.salesPerHr * m / 60))}</td>` : "";
  document.getElementById("blocksum").textContent = `Pace by half hour (${state.scope === "table" ? "whole sales table" : "clickers only"}${est ? ", with Plinko and Battle estimates" : ""})`;
  document.getElementById("blocks").innerHTML =
    `<thead><tr><th>Time</th><th>Sales</th><th>Gross $</th><th>Gross per hour</th><th>Net per hour</th><th>Minutes per sale</th>` +
    (est ? `<th>With Plinko + Battle, per hour (est.)</th><th>Minutes per sale, counting drops + battles (est.)</th>` : "") + `</tr></thead><tbody>` +
    sc.blocks.map(b => `<tr><td>${fmt(t(b.from))} to ${fmt(t(b.to))}</td><td>${b.sales}</td><td>${money(b.tickets)}</td><td>${money(b.perHr)}</td>` +
      `<td>${money(net(b.perHr))}</td><td>${b.minPerSale == null ? "" : b.minPerSale.toFixed(1)}</td>${estCols(b.perHr, b.sales, blockMin(b))}</tr>`).join("") +
    `<tr><th>Whole day</th><td>${sc.sales}</td><td>${money(sc.tickets)}</td><td>${money(sc.perHr)}</td><td>${money(net(sc.perHr))}</td><td>${sc.gapMean.toFixed(1)} (average gap)</td>` +
    `${estCols(sc.perHr, sc.sales, SPAN)}</tr></tbody>`;
}
// Each booth's day average, so no booth's rate reads as a slice of another's
function boothTable() {
  const tb = DATA.scopes.table.tickets, ck = DATA.scopes.clickers.tickets, b = DATA.booth;
  const rows = [["Clickers", "", ck, "Tracked"], ["Clicker blowout", "~", E.blowout, "Estimate; all at the end, so per hour is only for comparison"],
                ["Copters", "", tb - ck, "Tracked"], ["Plinko", "~", PLINKO, "What's left of ~$900; 1 ticket per drop"],
                ["Balloon Battle", "~", E.battle, `Estimate; about ${E.battleMatches} matches`]];
  document.getElementById("booths").innerHTML =
    `<thead><tr><th>Booth</th><th>Gross $</th><th>Share</th><th>Per hour, spread over the day</th><th>Net per hour</th><th>Source</th></tr></thead><tbody>` +
    rows.map(([k, a, v, src]) => `<tr><td>${k}</td><td>${a}${money(v)}</td><td>${a}${Math.round(v / b.gross * 100)}%</td><td>${a}${money(v / HRS)}</td><td>${a}${money(net(v / HRS))}</td><td>${src}</td></tr>`).join("") +
    `<tr><th>Whole booth</th><td>~${money(b.gross)}</td><td>100%</td><td>~${money(b.perHr)}</td><td>~${money(b.netPerHr)}</td><td>${b.counted} counted + ~${b.food} food tickets for helpers</td></tr></tbody>`;
}

// ---------- view + scope switches (kept in the URL hash, e.g. #rate, #gap-clickers or #total-booth) ----------
const wrap = document.getElementById("wrap"), viewsEl = document.getElementById("views"), scopesEl = document.getElementById("scopes");
const estBox = document.getElementById("est"), estWrap = document.getElementById("estwrap");
function syncHash() {
  const tail = state.scope === "clickers" ? "-clickers" : state.est ? "-booth" : "";
  const h = state.view === "design" ? "" : "#" + state.view + tail;
  try { history.replaceState(null, "", location.pathname + location.search + h); } catch (e) { /* file:// in some browsers */ }
}
function refresh() {
  wrap.dataset.view = state.view;
  const V = VIEWS[state.view];
  document.getElementById("h1").textContent = V.h1; svg.setAttribute("aria-label", V.aria);
  document.getElementById("sub").textContent = V.sub + (estOn() && EST_NOTE[state.view] ? EST_NOTE[state.view] : "");
  for (const b of viewsEl.children) b.setAttribute("aria-pressed", b.dataset.view === state.view ? "true" : "false");
  for (const b of scopesEl.children) b.setAttribute("aria-pressed", b.dataset.scope === state.scope ? "true" : "false");
  estWrap.style.display = state.scope === "table" ? "" : "none"; estBox.checked = state.est;
  if (state.view !== "design") { stats(); legend(); }
  blocksTable(); draw();
}
for (const b of viewsEl.children) b.addEventListener("click", () => { state.view = b.dataset.view; state.hover = null; syncHash(); refresh(); });
for (const b of scopesEl.children) b.addEventListener("click", () => { state.scope = b.dataset.scope; syncHash(); refresh(); });
estBox.addEventListener("change", () => { state.est = estBox.checked; syncHash(); refresh(); });
function readHash() {
  const m = /^#(total|rate|gap)(-clickers|-booth)?$/.exec(location.hash);
  if (m) { state.view = m[1]; state.scope = m[2] === "-clickers" ? "clickers" : "table"; state.est = m[2] === "-booth"; }
  else if (!location.hash) state.view = "design";
}
readHash();
addEventListener("hashchange", () => { readHash(); refresh(); });

// ---------- comparison cards ----------
function card(d) {
  const sold = d.stock == null ? `${d.total} (restocked, count unknown)` : `${d.total} of ${d.stock}`;
  const out = d.so ? `${ampm(d.so)}` : (d.stock != null ? `didn't (${d.stock - d.total} left)` : "unknown");
  const proj = d.proj != null ? `<dt>With stock</dt><dd>~${Math.round(d.proj)} (up to ${Math.round(d.projHi)})</dd>` : "";
  return `<div class="card" style="--ring:${colorOf(d)}"><img src="infographic_photos/${d.photo}.jpg" alt=""><div style="min-width:0">` +
         `<h3>${d.name}</h3><dl><dt>Theme</dt><dd>${d.theme}</dd><dt>Sold</dt><dd>${sold}</dd>` +
         `<dt>Rate</dt><dd>${d.rate.toFixed(1)} / hr on the table</dd><dt>Sold out</dt><dd>${out}</dd>${proj}</dl></div></div>`;
}
function cards() {
  const el = document.getElementById("cards");
  const p = state.pins.map(n => byName[n]);
  if (!p.length) { el.innerHTML = `<div class="empty">Click two lines or two photos above to compare them side by side.</div>`; return; }
  let html = p.map(card).join("");
  if (p.length === 2) {
    const [a, b] = p, fast = a.rate >= b.rate ? [a, b] : [b, a];
    const ratio = fast[1].rate > 0 ? (fast[0].rate / fast[1].rate) : null;
    const speed = ratio == null ? "faster than" : ratio < 1.15 ? "about as fast as" : ratio.toFixed(1) + "x as fast as";
    html += `<p class="vs">${fast[0].name} sold ${speed} ${fast[1].name} while on the table ` +
            `(${fast[0].rate.toFixed(1)} vs ${fast[1].rate.toFixed(1)} per hour). Total sold: ${a.name} ${a.total}, ${b.name} ${b.total}.</p>`;
  }
  el.innerHTML = html;
}

// ---------- table ----------
document.getElementById("table").innerHTML =
  `<thead><tr><th>Design</th><th>Theme</th><th>Rate (per hr)</th><th>Sold</th><th>Stock</th><th>Sold out</th><th>With enough stock</th></tr></thead><tbody>` +
  designs.map(d => `<tr><td>${d.name}</td><td>${d.theme}</td><td>${d.rate.toFixed(1)}</td><td>${d.total}</td><td>${d.stock ?? "restocked"}</td>` +
    `<td>${d.so ? ampm(d.so) : "no"}</td><td>${d.proj != null ? "~" + Math.round(d.proj) + " (up to " + Math.round(d.projHi) + ")" : ""}</td></tr>`).join("") + `</tbody>`;

document.getElementById("sales").innerHTML =
  `<thead><tr><th>Sale</th><th>Time</th><th>What was in it</th><th>Tickets</th></tr></thead><tbody>` +
  DATA.sales.map(s => `<tr><td>#${s.id.slice(1)}</td><td>${ampmSec(t(s.t))}</td><td>${s.items.map(([n, q]) => q > 1 ? `${n} ×${q}` : n).join(", ")}</td><td>${s.tickets}</td></tr>`).join("") + `</tbody>`;

boothTable(); refresh(); cards();
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(draw, 120); });
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { draw(); cards(); });
new MutationObserver(() => { draw(); cards(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
</script>
<!-- CHANGELOG
  v1.0 (2026-10-18): Initial release (static).
  v1.1 (2026-10-18): Angled lines between sales instead of steps (Sam).
  v1.2 (2026-10-18): Interactive: hover to highlight, click lines or photos to pin and compare two, projections toggle, cropped photos, data table (Sam).
  v1.3 (2026-10-18): A dot per sale; hover or tap it for the time, what was in the sale and its tickets. Every-sale table (Sam).
  v1.4 (2026-10-18): View switch: combined total, tickets per hour and minutes per sale (actual rolling pace vs day average, whole-booth average), whole sales table vs clickers only, gross with net in tooltips, stat tiles, pace-by-half-hour table, copter sales in the sale table (Sam).
  v1.5 (2026-10-18): "Add Plinko, Battle and blowout" toggle for the whole sales table: hatched estimate band in all three combined views, per-booth tooltip rows, average-per-hour-by-booth table (Sam).
-->
"""


def main():
    src, out = sys.argv[1:3]
    data = build_data(src)
    body = PAGE.replace("__DATA__", json.dumps(data))
    head = ("<!doctype html>\n<!--\n  file: ramathon_2026_clicker_sales_curve_v1.5.html\n  version: 1.5\n  author: Sam Cao\n"
            "  created: 2026-10-18\n  last_updated: 2026-10-18\n"
            "  description: Generated by plot_clicker_sales_curve_v1.5.py; edit the script, not this file.\n"
            "  ai_update: Regenerate from the script; bump both versions together.\n-->\n"
            "<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n")
    page = head + body.replace("<style>", "<style>\n  * { box-sizing: border-box; }", 1).replace("\n<div class=\"wrap\">", "\n</head>\n<body>\n<div class=\"wrap\">", 1) + "</body>\n</html>\n"
    open(out, "w").write(page)
    print("ok", out, len(data["designs"]), "designs")


if __name__ == "__main__":
    main()

# CHANGELOG
# v1.0 (2026-10-18): Initial release.
# v1.1 (2026-10-18): Angled lines between sales instead of steps (Sam).
# v1.2 (2026-10-18): Interactive page: hover highlight, click to pin and compare two lines, projections toggle, cropped photos on chips and comparison cards, data table (Sam).
# v1.3 (2026-10-18): A dot per sale on every line; hover or tap it for the sale's time, items and ticket total. Every-sale table under the chart (Sam).
# v1.4 (2026-10-18): Combined views (total, tickets per hour, minutes per sale) with a whole-table / clickers-only switch, rolling 30-minute pace vs day average, whole-booth average from the end-of-day count, stat tiles and a pace-by-half-hour table. Copter sales now in the data (Sam).
# v1.5 (2026-10-18): Estimate toggle (whole sales table): Plinko and Battle spread evenly plus the blowout at the end, as a hatched band in the total, per-hour and minutes-per-sale views; per-booth tooltip rows and an average-per-hour-by-booth table (Sam).
