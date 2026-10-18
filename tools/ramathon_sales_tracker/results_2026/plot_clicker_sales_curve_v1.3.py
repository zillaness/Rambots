"""
file: plot_clicker_sales_curve_v1.3.py
version: 1.3
author: Sam Cao
created: 2026-10-18
last_updated: 2026-10-18
description: Builds the interactive Ram-a-thon 2026 clicker sales chart (hover to highlight, click two lines to compare, hover a dot for one sale, dotted "if we had enough stock" projections).
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage:
    python3 plot_clicker_sales_curve_v1.3.py <sales.csv> <out.html>
    node render_infographic_v1.1.cjs <out.html> <out.png> <height> 1400   (static PNG of the default view)

The page is one self-contained HTML file. Photos load from infographic_photos/ next to it.

Projection: from each early sell-out to the last sale of the day (1:20 PM), at the
design's own on-table rate (same math as the findings' lost-sales table). The shaded
wedge runs up to the faster pace it sold at in the second half of its time on the table.
A sale counts at most 3 of one design toward a rate, like the workbook.

Each dot is one sale. The page shows its time, what was in it and its ticket total;
age and gender stay out because the page is on a public URL.
"""

import csv
import json
import sys
from datetime import datetime

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


def parse(s):
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")


def hours(td):
    return td.total_seconds() / 3600


def build_data(src):
    rows = [r for r in csv.DictReader(open(src)) if r["category"] != "Copters"]
    start = min(parse(r["opened_at"]) for r in rows)
    end = max(parse(r["closed_at"]) for r in rows)
    sales, index = [], {}
    for r in sorted(rows, key=lambda r: (parse(r["closed_at"]), int(r["record"][1:]))):
        if r["record"] not in index:
            index[r["record"]] = len(sales)
            sales.append({"id": r["record"], "t": parse(r["closed_at"]).strftime("%H:%M:%S"),
                          "tickets": int(r["record_total_tickets"]), "items": []})
        sales[index[r["record"]]]["items"].append([r["item"], int(r["qty"])])
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
    return {"start": start.strftime("%H:%M:%S"), "end": end.strftime("%H:%M:%S"),
            "early": EARLY, "designs": designs, "sales": sales}


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
  @media (prefers-reduced-motion: no-preference) { .ln, .lab { transition: opacity .15s ease; } }
</style>

<div class="wrap">
  <header>
    <div>
      <h1>Clicker sales through the day</h1>
      <p class="sub">Running total per design at Ram-a-thon 2026. Each dot is one sale: hover or tap it for the time, what was in the sale and its tickets. Hover a line to highlight it. Click lines or the photos to pin up to two and compare them. Dotted lines show what the early sell-outs would have sold with enough stock.</p>
    </div>
    <span class="tag">INTERNAL · DO NOT SHARE</span>
  </header>

  <div class="controls" id="chips" role="group" aria-label="Designs"></div>
  <div class="row2">
    <span class="hint" id="pinhint">Pick up to two designs to compare.</span>
    <div class="controls">
      <label class="toggle"><input type="checkbox" id="proj" checked> Show "enough stock" projections</label>
      <button class="btn" id="clear" type="button">Clear</button>
    </div>
  </div>

  <div class="chart" id="chartbox">
    <svg id="svg" role="img" aria-label="Running total of clickers sold by design, 10 AM to 1:20 PM"></svg>
    <div class="tip" id="tip" hidden></div>
  </div>

  <div class="cards" id="cards"></div>

  <details>
    <summary>All designs as a table</summary>
    <div class="tablewrap"><table id="table"></table></div>
  </details>

  <details>
    <summary>Every clicker sale</summary>
    <div class="tablewrap"><table id="sales"></table></div>
  </details>

  <footer>Ram-a-thon 2026, Rambots (Team 2204). Sales laptop export: 64 clicker sales, 10:01 AM to 1:20 PM. Rate = clickers sold per hour while the design was on the table; one sale counts at most 3 of a design. Oreo and Burger are left out. Internal estimates, do not share or repost.</footer>
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
const state = { pins: [], hover: null, proj: true };

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
  const W = Math.max(320, box.clientWidth - 12);
  const wide = W >= 760;
  const M = { l: 44, r: wide ? 270 : 16, t: 16, b: 38 };
  const H = wide ? 540 : Math.round(Math.min(520, Math.max(340, W * 0.95)));
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const x = ms => M.l + (ms - X0) / (X1 - X0) * pw;
  const y = v => M.t + ph - v / YMAX * ph;
  G = { W, H, M, x, y, wide, pw, ph };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
  const out = [];
  for (let v = 0; v <= YMAX; v += 4) {
    out.push(`<line x1="${M.l}" x2="${M.l + pw}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/>`);
    out.push(`<text x="${M.l - 8}" y="${y(v) + 4}" font-size="12" fill="var(--faint)" text-anchor="end">${v}</text>`);
  }
  const step = wide ? 30 : 60;
  for (let m = 0; m <= 210; m += step) {
    const ms = X0 + m * 60000;
    out.push(`<text x="${x(ms)}" y="${M.t + ph + 24}" font-size="12" fill="var(--faint)" text-anchor="middle">${fmt(ms)}</text>`);
  }
  out.push(`<line x1="${M.l}" x2="${M.l + pw}" y1="${y(0)}" y2="${y(0)}" stroke="var(--faint)"/>`);
  out.push(`<line x1="${x(END)}" x2="${x(END)}" y1="${M.t}" y2="${y(0)}" stroke="var(--faint)" stroke-dasharray="4 4"/>`);
  out.push(`<text x="${x(END) - 6}" y="${M.t + 14}" font-size="12" fill="var(--faint)" text-anchor="end">last sale 1:20</text>`);
  out.push(`<line id="cross" x1="0" x2="0" y1="${M.t}" y2="${y(0)}" stroke="var(--faint)" visibility="hidden"/>`);

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
function showTip(clientX, clientY) {
  if (!G) return;
  const r = svg.getBoundingClientRect(), sx = (clientX - r.left) * (G.W / r.width);
  const ms = X0 + (sx - G.M.l) / G.pw * (X1 - X0);
  if (ms < START || ms > END) { hideTip(); return; }
  const cross = svg.querySelector("#cross");
  cross.setAttribute("x1", G.x(ms)); cross.setAttribute("x2", G.x(ms)); cross.setAttribute("visibility", "visible");
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
function showSaleTip(d, k, clientX, clientY) {
  if (!G) return;
  const [tm, , i] = d.ev[k], s = DATA.sales[i];
  let run = 0; for (let j = 0; j <= k; j++) run += d.ev[j][1];
  const cross = svg.querySelector("#cross");
  cross.setAttribute("x1", G.x(tm)); cross.setAttribute("x2", G.x(tm)); cross.setAttribute("visibility", "visible");
  const items = s.items.map(([n, q]) => {
    const me = n === d.name;
    return `<div class="r${me ? " me" : ""}"><span><i class="sw" style="background:${me ? colorOf(d) : "transparent"}"></i>${n}</span><span>×${q}</span></div>`;
  }).join("");
  const units = s.items.reduce((a, [, q]) => a + q, 0);
  const sofar = d.stock == null ? `${run}` : `${run} of ${d.stock}${run >= d.stock ? ", sold out" : ""}`;
  tip.innerHTML = `<b>${ampmSec(tm)} · sale #${s.id.slice(1)}</b>${items}` +
    `<div class="r tot"><span>Sale total</span><span>${s.tickets} tickets${units > 1 ? ` · ${units} clickers` : ""}</span></div>` +
    `<div class="r"><span>${d.name} sold so far</span><span>${sofar}</span></div>`;
  placeTip(clientX, clientY);
}
function hideTip() { tip.hidden = true; const c = svg.querySelector("#cross"); if (c) c.setAttribute("visibility", "hidden"); }
svg.addEventListener("pointermove", e => {
  const s = e.target.closest && e.target.closest(".shit");
  if (s) showSaleTip(byName[s.parentNode.dataset.name], +s.dataset.k, e.clientX, e.clientY);
  else showTip(e.clientX, e.clientY);
});
svg.addEventListener("pointerleave", hideTip);
svg.addEventListener("click", e => showTip(e.clientX, e.clientY));

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

draw(); cards();
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(draw, 120); });
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { draw(); cards(); });
new MutationObserver(() => { draw(); cards(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
</script>
<!-- CHANGELOG
  v1.0 (2026-10-18): Initial release (static).
  v1.1 (2026-10-18): Angled lines between sales instead of steps (Sam).
  v1.2 (2026-10-18): Interactive: hover to highlight, click lines or photos to pin and compare two, projections toggle, cropped photos, data table (Sam).
  v1.3 (2026-10-18): A dot per sale; hover or tap it for the time, what was in the sale and its tickets. Every-sale table (Sam).
-->
"""


def main():
    src, out = sys.argv[1:3]
    data = build_data(src)
    body = PAGE.replace("__DATA__", json.dumps(data))
    head = ("<!doctype html>\n<!--\n  file: ramathon_2026_clicker_sales_curve_v1.3.html\n  version: 1.3\n  author: Sam Cao\n"
            "  created: 2026-10-18\n  last_updated: 2026-10-18\n"
            "  description: Generated by plot_clicker_sales_curve_v1.3.py; edit the script, not this file.\n"
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
