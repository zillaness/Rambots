"""
file: reference_check_v1.1.py
version: 1.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Test oracle that applies the core design's joining and nesting rules with ezdxf and checks every fixture against expected_results_v1.1.json.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage: python3 reference_check_v1.1.py [fixtures_dir]
Needs ezdxf. This is not the app. It exists to prove the rules in
laser_prep_core_design_v1.0.md (sections 4 and 5) are well defined and that the
hand-written expected results agree with them. Slow on purpose (pairwise loops);
fixtures are tiny.
"""

import json
import math
import sys
from pathlib import Path

import ezdxf
from ezdxf import path as dxfpath

TOL = 0.001          # join tolerance, inches
NEAR = 0.01          # almost-closed limit, inches
SCALE = {1: 1.0, 4: 1 / 25.4, 5: 1 / 2.54, 6: 39.37007874, 2: 12.0}


IGNORED = {"DIMENSION", "POINT", "HATCH", "LEADER", "MLEADER", "IMAGE", "VIEWPORT"}


def primitives(doc, ref_words):
    """Expand blocks (including MINSERT grids); set aside reference layers, text, and ignored types."""
    out, counts = [], {"text": 0, "ref": 0, "fitonly": 0, "ignored": {}}

    def visit(entities):
        for e in entities:
            t = e.dxftype()
            if any(w in e.dxf.layer.upper() for w in ref_words):
                counts["ref"] += 1
            elif t in ("TEXT", "MTEXT"):
                counts["text"] += 1
            elif t in IGNORED:
                counts["ignored"][t] = counts["ignored"].get(t, 0) + 1
            elif t == "INSERT":
                for ins in e.multi_insert():
                    visit(list(ins.virtual_entities()))
            else:
                if t == "SPLINE" and e.control_point_count() == 0 and e.fit_point_count() > 0:
                    counts["fitonly"] += 1
                out.append(e)

    visit(list(doc.modelspace()))
    return out, counts


def suggestions(size, plaus):
    bw, bh = plaus["bed"]
    fits = lambda w, h: (w <= bw and h <= bh) or (w <= bh and h <= bw)
    if fits(*size):
        return []
    return sorted(f for f in plaus["factors"]
                  if fits(size[0] * f, size[1] * f) and max(size) * f >= plaus["minLargestSide"])


def segments(entities, scale):
    """Explode to segments: dict(kind, start, end, pts, key)."""
    segs = []
    for e in entities:
        t = e.dxftype()
        if t in ("LWPOLYLINE", "POLYLINE"):
            segs.extend(segments(list(e.virtual_entities()), scale))
            continue
        p = dxfpath.make_path(e)
        pts = [(v.x * scale, v.y * scale) for v in p.flattening(TOL / 4 / scale)]
        key = None
        if t == "LINE":
            key = ("LINE",)
        elif t in ("ARC", "CIRCLE"):
            c = e.dxf.center
            key = ("ARC", round(c.x * scale, 4), round(c.y * scale, 4), round(e.dxf.radius * scale, 4))
        segs.append({"kind": t, "start": pts[0], "end": pts[-1], "pts": pts, "key": key})
    return segs


def close(a, b, tol=TOL):
    return math.dist(a, b) <= tol


def dedupe(segs):
    kept, removed = [], 0
    for s in segs:
        dup = any(s["key"] and s["key"] == k["key"] and
                  ((close(s["start"], k["start"]) and close(s["end"], k["end"])) or
                   (close(s["start"], k["end"]) and close(s["end"], k["start"])))
                  for k in kept)
        if dup:
            removed += 1
        else:
            kept.append(s)
    return kept, removed


def overlaps(segs):
    lines = [s for s in segs if s["kind"] == "LINE"]
    count = 0
    for i, a in enumerate(lines):
        for b in lines[i + 1:]:
            (ax, ay), (bx, by) = a["start"], a["end"]
            dx, dy = bx - ax, by - ay
            length = math.hypot(dx, dy)
            if length == 0:
                continue
            ux, uy = dx / length, dy / length
            off = [abs((px - ax) * uy - (py - ay) * ux) for px, py in (b["start"], b["end"])]
            if max(off) > TOL:
                continue
            t = sorted(((px - ax) * ux + (py - ay) * uy) for px, py in (b["start"], b["end"]))
            if min(length, t[1]) - max(0, t[0]) > TOL:
                count += 1
    return count


def analyze(path, spec):
    doc = ezdxf.readfile(path)
    units = doc.header.get("$INSUNITS", 0) if doc.dxfversion != "AC1009" else 0
    scale = SCALE.get(units, 1.0)
    ents, counts = primitives(doc, spec["defaults"]["referenceLayerWords"])
    segs = segments(ents, scale)
    allpts = [p for s in segs for p in s["pts"]]
    xs, ys = [p[0] for p in allpts], [p[1] for p in allpts]
    size = (round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4))

    segs, dup = dedupe(segs)
    ovl = overlaps(segs)

    # Snap endpoints to nodes (union of points within TOL).
    nodes = []
    def node(p):
        for i, q in enumerate(nodes):
            if close(p, q):
                return i
        nodes.append(p)
        return len(nodes) - 1

    loops, edges = [], []
    for s in segs:
        if close(s["start"], s["end"]):          # full circle, ellipse, or closed spline
            loops.append(s["pts"])
        else:
            edges.append((node(s["start"]), node(s["end"]), s))
    degree = [0] * len(nodes)
    for a, b, _ in edges:
        degree[a] += 1
        degree[b] += 1
    adj = {i: [] for i in range(len(nodes))}
    for idx, (a, b, _) in enumerate(edges):
        adj[a].append(idx)
        adj[b].append(idx)

    used = [False] * len(edges)

    def walk(start, first):
        """Follow edges from `start` through degree-2 nodes. Returns (end_node, polygon points)."""
        pts, cur, eid = [], start, first
        while True:
            used[eid] = True
            a, b, s = edges[eid]
            forward = (a == cur)
            pts.extend(s["pts"] if forward else list(reversed(s["pts"])))
            cur = b if forward else a
            if degree[cur] != 2 or cur == start:
                return cur, pts
            eid = next(e for e in adj[cur] if not used[e])

    open_chains, near, branches = 0, 0, sum(1 for d in degree if d >= 3)
    for n in range(len(nodes)):
        if degree[n] != 2:
            for eid in adj[n]:
                if not used[eid]:
                    end, pts = walk(n, eid)
                    open_chains += 1
                    if degree[n] == 1 and degree[end] == 1 and math.dist(nodes[n], nodes[end]) <= NEAR:
                        near += 1
    for eid in range(len(edges)):
        if not used[eid]:
            _, pts = walk(edges[eid][0], eid)
            loops.append(pts)

    # Nesting: parent is the smallest larger loop containing this loop's first point.
    def area(poly):
        return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]))) / 2

    def inside(pt, poly):
        x, y, hit = pt[0], pt[1], False
        for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
            if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                hit = not hit
        return hit

    order = sorted(range(len(loops)), key=lambda i: -area(loops[i]))
    depth = {}
    for k, i in enumerate(order):
        parents = [j for j in order[:k] if inside(loops[i][0], loops[j])]
        depth[i] = depth[parents[-1]] + 1 if parents else 0

    return {"loops": len(loops), "openChains": open_chains, "depths": sorted(depth.values()),
            "branchPoints": branches, "duplicatesRemoved": dup, "overlapsReported": ovl,
            "almostClosed": near, "textSkipped": counts["text"], "unitsMissing": units == 0, "size": size,
            "referenceHidden": counts["ref"], "fitPointSplines": counts["fitonly"], "ignored": counts["ignored"],
            "unitSuggestions": suggestions(size, spec["defaults"]["plausibility"])}


def main():
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
    spec = json.loads((folder / "expected_results_v1.1.json").read_text())
    zero_default = spec["defaults"]["omittedCountsMeanZero"]
    failures = 0
    for fx in spec["fixtures"]:
        got = analyze(folder / fx["file"], spec)
        bad = []
        for key in ["loops", "openChains", "depths", *zero_default]:
            want = fx.get(key, 0 if key in zero_default else None)
            if want is not None and got[key] != want:
                bad.append(f"{key}: got {got[key]} want {want}")
        for key in spec["defaults"]["omittedMeansEmpty"]:
            want = fx.get(key, [] if key == "unitSuggestions" else {})
            if got[key] != want:
                bad.append(f"{key}: got {got[key]} want {want}")
        if fx.get("unitsMissing", False) != got["unitsMissing"]:
            bad.append(f"unitsMissing: got {got['unitsMissing']}")
        if any(abs(g - w) > fx["sizeTolerance"] for g, w in zip(got["size"], fx["size"])):
            bad.append(f"size: got {got['size']} want {fx['size']}")
        failures += bool(bad)
        print(("FAIL " if bad else "ok   ") + fx["file"] + ("  " + "; ".join(bad) if bad else ""))
    print(f"{len(spec['fixtures']) - failures}/{len(spec['fixtures'])} fixtures agree with the rules")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()

# CHANGELOG
# v1.0 (2026-10-30): Initial release. Joining, duplicate and overlap checks, branch and almost-closed counts, nesting depths, and size against expected_results_v1.0.1.json.
# v1.1 (2026-10-30): Reference layers set aside before joining; DIMENSION, POINT, HATCH and similar counted by type; fit-point-only splines counted; unit suggestions from the plausibility rule; reads expected_results_v1.1.json.
