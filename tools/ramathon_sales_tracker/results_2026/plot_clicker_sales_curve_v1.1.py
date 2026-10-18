"""
file: plot_clicker_sales_curve_v1.1.py
version: 1.1
author: Sam Cao
created: 2026-10-18
last_updated: 2026-10-18
description: Draws cumulative clicker sales through Ram-a-thon 2026, with dotted "if we had enough stock" projections for designs that sold out early.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage:
    python3 plot_clicker_sales_curve_v1.1.py <sales.csv> <out.html>
    node render_infographic_v1.1.cjs <out.html> <out.png> 900 1400

Projection: from each early sell-out to the last sale of the day (1:20 PM), at the
design's own on-table rate (same math as the findings' lost-sales table). The shaded
wedge runs up to the faster pace it was selling at in the second half of its time on
the table.
"""

import csv
import sys
from datetime import datetime, timedelta

CAP_PER_SALE = 3  # one bulk buyer counts as 3 toward a rate, like the workbook
HIGHLIGHT = {  # sold out before the end; colors are the validated theme slots. Drawn in this order, Creeper on top
    "Avocado": "#D18E00",
    "Dumpling": "#A31F36",
    "Creeper": "#1BAF7A",
}
SKIP = {"Oreo", "Burger"}  # not ranked: never put out / not in the stock count
STOCK = {"Creeper": 10, "Dumpling": 24, "Avocado": 12}

W, H = 1400, 900
L, R, T, B = 96, 1070, 168, 770  # plot area
X0 = datetime(2026, 10, 17, 10, 0)
X1 = datetime(2026, 10, 17, 13, 30)
YMAX = 32


def x(t):
    return L + (t - X0).total_seconds() / (X1 - X0).total_seconds() * (R - L)


def y(v):
    return B - v / YMAX * (B - T)


def parse(s):
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")


def hours(td):
    return td.total_seconds() / 3600


def main():
    src, out = sys.argv[1:3]
    rows = [r for r in csv.DictReader(open(src)) if r["category"] != "Copters"]
    start = min(parse(r["opened_at"]) for r in rows)
    end = max(parse(r["closed_at"]) for r in rows)

    events = {}
    for r in rows:
        events.setdefault(r["item"], []).append((parse(r["closed_at"]), int(r["qty"])))
    for v in events.values():
        v.sort()

    svg = []
    add = svg.append

    # Grid and axes
    for v in range(0, YMAX + 1, 4):
        add(f'<line x1="{L}" x2="{R}" y1="{y(v):.1f}" y2="{y(v):.1f}" class="grid"/>')
        add(f'<text x="{L - 12}" y="{y(v) + 6:.1f}" class="tick" text-anchor="end">{v}</text>')
    t = X0
    while t <= X1:
        add(f'<line x1="{x(t):.1f}" x2="{x(t):.1f}" y1="{B}" y2="{B + 6}" class="axis"/>')
        label = t.strftime("%-I:%M")
        add(f'<text x="{x(t):.1f}" y="{B + 30}" class="tick" text-anchor="middle">{label}</text>')
        t += timedelta(minutes=30)
    add(f'<line x1="{L}" x2="{R}" y1="{B}" y2="{B}" class="axis"/>')
    add(f'<text x="{L}" y="{T - 22}" class="axislab">Clickers sold (running total)</text>')
    add(f'<line x1="{x(end):.1f}" x2="{x(end):.1f}" y1="{T}" y2="{B}" class="endline"/>')
    add(f'<text x="{x(end) - 6:.1f}" y="{T + 18}" class="tick" text-anchor="end">last sale 1:20</text>')

    labels = []  # (value, text, color, bold)

    def sales_path(ev, stop):
        # Straight lines from sale to sale (Sam: angled, not steps); flat after the last sale.
        pts = [(x(start), y(0))]
        c = 0
        for t, q in ev:
            c += q
            pts.append((x(t), y(c)))
        if stop > ev[-1][0]:
            pts.append((x(stop), y(c)))
        return "M" + " L".join(f"{a:.1f},{b:.1f}" for a, b in pts), c

    # Other designs first (gray, behind)
    for item, ev in sorted(events.items()):
        if item in HIGHLIGHT or item in SKIP:
            continue
        d, total = sales_path(ev, ev[-1][0] if item in ("Salmon nigiri", "Spam musubi") else end)
        add(f'<path d="{d}" class="other"/>')
        note = " (sold out 1:20)" if item in ("Salmon nigiri", "Spam musubi") else ""
        labels.append((total, f"{item} {total}{note}", "#8A8984", False))

    # Sold-out designs: actual, projection wedge, dotted projection
    for item, color in HIGHLIGHT.items():
        ev = events[item]
        sold_out = ev[-1][0]
        d, total = sales_path(ev, sold_out)
        on_table = hours(sold_out - start)
        rate = sum(min(q, CAP_PER_SALE) for _, q in ev) / on_table
        mid = start + (sold_out - start) / 2
        late = sum(min(q, CAP_PER_SALE) for t, q in ev if t > mid) / hours(sold_out - mid)
        gone = hours(end - sold_out)
        proj, proj_hi = total + rate * gone, total + late * gone
        sx, sy = x(sold_out), y(total)
        add(f'<polygon points="{sx:.1f},{sy:.1f} {x(end):.1f},{y(proj):.1f} {x(end):.1f},{y(proj_hi):.1f}" '
            f'fill="{color}" fill-opacity="0.14"/>')
        add(f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{x(end):.1f}" y2="{y(proj):.1f}" stroke="{color}" '
            f'stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>')
        add(f'<path d="{d}" fill="none" stroke="#FCFCFB" stroke-width="7" stroke-linejoin="round"/>')
        add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="3" stroke-linejoin="round"/>')
        add(f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="7" fill="{color}" stroke="#FCFCFB" stroke-width="2.5"/>')
        add(f'<text x="{sx - 12:.1f}" y="{sy - 14:.1f}" class="soldout" text-anchor="end" fill="{color}">'
            f'out {sold_out:%-I:%M}</text>')
        labels.append((proj, f"{item}: {total} sold, ~{proj:.0f} with stock (up to {proj_hi:.0f})", color, True))

    # Right-side labels, nudged apart so none overlap
    labels.sort(key=lambda l: -l[0])
    placed = []
    for v, text, color, bold in labels:
        ly = y(v) + 6
        if placed and ly < placed[-1] + 22:
            ly = placed[-1] + 22
        placed.append(ly)
        weight = "700" if bold else "400"
        add(f'<line x1="{x(end) + 2:.1f}" y1="{y(v):.1f}" x2="{x(end) + 14:.1f}" y2="{ly - 6:.1f}" stroke="{color}" stroke-width="1"/>')
        add(f'<text x="{x(end) + 18:.1f}" y="{ly:.1f}" class="lab" fill="{color}" font-weight="{weight}">{text}</text>')

    html = f"""<!doctype html>
<!--
  file: ramathon_2026_clicker_sales_curve_v1.1.html
  version: 1.1
  author: Sam Cao
  created: 2026-10-18
  last_updated: 2026-10-18
  description: Generated by plot_clicker_sales_curve_v1.1.py; edit the script, not this file.
  ai_update: Regenerate from the script; bump both versions together.
-->
<html lang="en"><head><meta charset="utf-8"><title>Clicker Sales Curve</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ background: #FCFCFB; }}
  body {{ width: {W}px; height: {H}px; overflow: hidden; color: #1B1B1B;
         font-family: FreeSans, "Helvetica Neue", Helvetica, Arial, sans-serif; }}
  h1 {{ position: absolute; left: {L}px; top: 30px; font-size: 32px; font-weight: 800; }}
  .sub {{ position: absolute; left: {L}px; top: 76px; font-size: 19px; color: #4A4A48; }}
  .key {{ position: absolute; left: {L}px; top: 108px; font-size: 17px; color: #4A4A48; display: flex; gap: 26px; align-items: center; }}
  .key span {{ display: inline-flex; align-items: center; gap: 8px; }}
  svg {{ position: absolute; left: 0; top: 0; }}
  .grid {{ stroke: #ECEAE5; stroke-width: 1; }}
  .axis {{ stroke: #9C9A94; stroke-width: 1.5; }}
  .endline {{ stroke: #9C9A94; stroke-width: 1; stroke-dasharray: 4 4; }}
  .tick {{ font-size: 16px; fill: #75746F; }}
  .axislab {{ font-size: 17px; fill: #4A4A48; font-weight: 700; }}
  .other {{ fill: none; stroke: #C9C7C1; stroke-width: 2; stroke-linejoin: round; }}
  .lab {{ font-size: 16px; }}
  .soldout {{ font-size: 15px; font-weight: 700; }}
  footer {{ position: absolute; left: {L}px; bottom: 22px; font-size: 14px; color: #8A8984; }}
</style></head><body>
<h1>Clicker sales through the day</h1>
<div class="sub">Running total per design. Dotted = what the early sell-outs would have sold with enough stock, at their own pace.</div>
<div class="key">
  <span><svg width="34" height="10" style="position:static"><line x1="0" y1="5" x2="34" y2="5" stroke="#1B1B1B" stroke-width="3"/></svg>actual</span>
  <span><svg width="34" height="10" style="position:static"><line x1="2" y1="5" x2="32" y2="5" stroke="#1B1B1B" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/></svg>projected if we had enough stock</span>
  <span><svg width="34" height="14" style="position:static"><rect width="34" height="14" fill="#1B1B1B" fill-opacity="0.14"/></svg>up to their late-game pace</span>
  <span><svg width="34" height="10" style="position:static"><line x1="0" y1="5" x2="34" y2="5" stroke="#C9C7C1" stroke-width="2"/></svg>other designs</span>
</div>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">
{chr(10).join(svg)}
</svg>
<footer>Ram-a-thon 2026 · sales laptop export, 64 clicker sales, 10:01 AM to 1:20 PM · a sale counts at most 3 of one design toward a rate · internal</footer>
</body></html>
<!-- CHANGELOG
  v1.0 (2026-10-18): Initial release.
  v1.1 (2026-10-18): Angled lines between sales instead of steps (Sam).
-->
"""
    open(out, "w").write(html)
    print("ok", out)


if __name__ == "__main__":
    main()

# CHANGELOG
# v1.0 (2026-10-18): Initial release.
# v1.1 (2026-10-18): Angled lines between sales instead of steps (Sam).
