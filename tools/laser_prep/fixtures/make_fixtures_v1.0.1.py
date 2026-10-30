"""
file: make_fixtures_v1.0.1.py
version: 1.0.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Writes the DXF fixture library and expected_results_v1.0.1.json used to test the laser prep app's parser, joining, and nesting.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage: python3 make_fixtures_v1.0.1.py [output_dir]
Needs ezdxf (pip install ezdxf).

Expected counts are written by hand from how each fixture is built, so they
check an implementation instead of echoing one. Sizes are measured with
ezdxf and compared against the hand-written size as a self-check.
Rules the expectations assume come from laser_prep_core_design_v1.0.md:
join tolerance 0.001 in; gaps up to 0.01 in are "almost closed"; branch
points leave their chains open; exact duplicates are dropped; TEXT and
MTEXT are skipped with a count.
"""

import json
import math
import sys
from pathlib import Path

import ezdxf
from ezdxf import bbox

VERSION = "1.0"          # fixture DXF files
RESULTS_VERSION = "1.0.1"  # expected results file
RED = {"color": 1}
FIXTURES = []


def fixture(name, description, expect, units="in", size_tol=0.001):
    """Register a builder. `expect` holds hand-written counts and the expected overall size in inches."""
    def wrap(build):
        FIXTURES.append((name, description, expect, units, size_tol, build))
        return build
    return wrap


def new(version="R2000", insunits=1):
    doc = ezdxf.new(version)
    if insunits is not None and version != "R12":
        doc.header["$INSUNITS"] = insunits
    return doc


def lines(msp, pts, close=True):
    n = len(pts)
    for i in range(n if close else n - 1):
        msp.add_line(pts[i], pts[(i + 1) % n], dxfattribs=RED)


SQUARE = [(0, 0), (2, 0), (2, 2), (0, 2)]


@fixture("f01_lines_square_exact", "Four LINEs meeting exactly at the corners.",
         {"loops": 1, "openChains": 0, "depths": [0], "size": [2, 2]})
def _(doc):
    lines(doc.modelspace(), SQUARE)


@fixture("f02_lines_square_gap_tiny", "Four LINEs with 1e-6 in gaps at every corner (floating point noise). Must join.",
         {"loops": 1, "openChains": 0, "depths": [0], "size": [2, 2]})
def _(doc):
    msp, e = doc.modelspace(), 1e-6
    msp.add_line((0, 0), (2 - e, 0), dxfattribs=RED)
    msp.add_line((2, e), (2, 2 - e), dxfattribs=RED)
    msp.add_line((2 - e, 2), (e, 2), dxfattribs=RED)
    msp.add_line((0, 2 - e), (0, e), dxfattribs=RED)


@fixture("f03_lines_square_gap_near", "Square with one 0.005 in gap: past the join tolerance, inside the almost-closed range.",
         {"loops": 0, "openChains": 1, "almostClosed": 1, "size": [2, 2]})
def _(doc):
    msp = doc.modelspace()
    msp.add_line((0.005, 0), (2, 0), dxfattribs=RED)
    lines(msp, [(2, 0), (2, 2), (0, 2), (0, 0)], close=False)


@fixture("f04_open_contour", "Three sides of a square. Open chain; a red cut here should warn.",
         {"loops": 0, "openChains": 1, "almostClosed": 0, "size": [2, 2]})
def _(doc):
    lines(doc.modelspace(), [(0, 0), (2, 0), (2, 2), (0, 2)], close=False)


@fixture("f05_branch_point", "Square whose bottom side is split at its midpoint, with a stub line rising from that point. Degree-3 node.",
         {"loops": 0, "openChains": 2, "branchPoints": 1, "size": [2, 2]})
def _(doc):
    msp = doc.modelspace()
    lines(msp, [(1, 0), (2, 0), (2, 2), (0, 2), (0, 0)], close=False)
    msp.add_line((0, 0), (1, 0), dxfattribs=RED)
    msp.add_line((1, 0), (1, 0.5), dxfattribs=RED)


@fixture("f06_duplicate_line", "Closed LWPOLYLINE square plus a reversed LINE exactly on its top side.",
         {"loops": 1, "openChains": 0, "duplicatesRemoved": 1, "size": [2, 2]})
def _(doc):
    msp = doc.modelspace()
    msp.add_lwpolyline(SQUARE, close=True, dxfattribs=RED)
    msp.add_line((0, 2), (2, 2), dxfattribs=RED)


@fixture("f07_partial_overlap", "Square plus a LINE lying on the bottom side from x=0.5 to 1.5. Reported, not fixed.",
         {"loops": 1, "openChains": 1, "overlapsReported": 1, "size": [2, 2]})
def _(doc):
    msp = doc.modelspace()
    msp.add_lwpolyline(SQUARE, close=True, dxfattribs=RED)
    msp.add_line((0.5, 0), (1.5, 0), dxfattribs=RED)


@fixture("f08_nested_plate", "6 x 4 plate, two round holes, a pocket, and an island inside the pocket.",
         {"loops": 5, "openChains": 0, "depths": [0, 1, 1, 1, 2], "size": [6, 4]})
def _(doc):
    msp = doc.modelspace()
    msp.add_lwpolyline([(0, 0), (6, 0), (6, 4), (0, 4)], close=True, dxfattribs=RED)
    msp.add_circle((1, 1), 0.25, dxfattribs=RED)
    msp.add_circle((1, 3), 0.25, dxfattribs=RED)
    msp.add_lwpolyline([(2.5, 1), (5, 1), (5, 3), (2.5, 3)], close=True, dxfattribs=RED)
    msp.add_circle((3.75, 2), 0.5, dxfattribs=RED)


@fixture("f09_bulge_rounded_rect", "LWPOLYLINE 3 x 2 rectangle with 0.5 in corners made from bulges.",
         {"loops": 1, "openChains": 0, "depths": [0], "size": [3, 2]})
def _(doc):
    b, r = math.tan(math.radians(90) / 4), 0.5
    pts = [(r, 0, 0), (3 - r, 0, b), (3, r, 0), (3, 2 - r, b), (3 - r, 2, 0), (r, 2, b), (0, 2 - r, 0), (0, r, b)]
    doc.modelspace().add_lwpolyline(pts, format="xyb", close=True, dxfattribs=RED)


@fixture("f10_slot_lines_arcs", "2 x 0.5 slot from two LINEs and two ARCs. Joining must mix lines and arcs.",
         {"loops": 1, "openChains": 0, "depths": [0], "size": [2, 0.5]})
def _(doc):
    msp = doc.modelspace()
    msp.add_line((0.25, 0), (1.75, 0), dxfattribs=RED)
    msp.add_line((1.75, 0.5), (0.25, 0.5), dxfattribs=RED)
    msp.add_arc((1.75, 0.25), 0.25, -90, 90, dxfattribs=RED)
    msp.add_arc((0.25, 0.25), 0.25, 90, 270, dxfattribs=RED)


@fixture("f11_mirrored_arc", "Half-disk: an ARC with extrusion (0,0,-1) closed by a LINE in world coordinates. Ignoring the extrusion leaves it open.",
         {"loops": 1, "openChains": 0, "depths": [0], "size": [2, 1]})
def _(doc):
    msp = doc.modelspace()
    # OCS for extrusion (0,0,-1) maps (x, y) to world (-x, y). World arc: center (1, 0), r 1, upper half.
    # In OCS the center is (-1, 0); world angle a corresponds to OCS angle 180 - a, and direction flips,
    # so the world upper half (0..180, ccw) is OCS 0..180 as well.
    msp.add_arc((-1, 0), 1, 0, 180, dxfattribs={**RED, "extrusion": (0, 0, -1)})
    msp.add_line((0, 0), (2, 0), dxfattribs=RED)


@fixture("f12_spline_closed", "Cubic SPLINE (control points and knots) through five points, closed by a LINE.",
         {"loops": 1, "openChains": 0, "depths": [0], "size": [2, 0.767]}, size_tol=0.01)
def _(doc):
    msp = doc.modelspace()
    fit = [(0, 0.75), (0.5, 0), (1, 0.5), (1.5, 0), (2, 0.75)]
    fit = [(x, 0.767 - y) for x, y in fit]
    msp.add_cad_spline_control_frame(fit, dxfattribs=RED)
    msp.add_line(fit[-1], fit[0], dxfattribs=RED)


@fixture("f13_ellipse", "Full ELLIPSE, 3 x 1.5, major axis rotated 0 degrees.",
         {"loops": 1, "openChains": 0, "depths": [0], "size": [3, 1.5]})
def _(doc):
    doc.modelspace().add_ellipse((1.5, 0.75), major_axis=(1.5, 0, 0), ratio=0.5, dxfattribs=RED)


@fixture("f14_nested_blocks", "Block PANEL holds a 1 in square and two copies of block HOLE (r 0.125). PANEL inserted plain and at 2x scale rotated 90.",
         {"loops": 6, "openChains": 0, "depths": [0, 0, 1, 1, 1, 1], "size": [4, 2]})
def _(doc):
    hole = doc.blocks.new("HOLE")
    hole.add_circle((0, 0), 0.125, dxfattribs=RED)
    panel = doc.blocks.new("PANEL")
    panel.add_lwpolyline([(0, 0), (1, 0), (1, 1), (0, 1)], close=True, dxfattribs=RED)
    panel.add_blockref("HOLE", (0.3, 0.5))
    panel.add_blockref("HOLE", (0.7, 0.5))
    msp = doc.modelspace()
    msp.add_blockref("PANEL", (0, 0))
    msp.add_blockref("PANEL", (4, 0), dxfattribs={"xscale": 2, "yscale": 2, "rotation": 90})


@fixture("f15_mm_units", "50 x 30 mm rectangle with $INSUNITS = 4. Size in inches is 1.9685 x 1.1811.",
         {"loops": 1, "openChains": 0, "depths": [0], "size": [50 / 25.4, 30 / 25.4]}, units="mm")
def _(doc):
    doc.modelspace().add_lwpolyline([(0, 0), (50, 0), (50, 30), (0, 30)], close=True, dxfattribs=RED)


@fixture("f16_no_units", "R12 file (no $INSUNITS). 4 x 3 rectangle. The app must ask; size shown is 4 x 3 if inches.",
         {"loops": 1, "openChains": 0, "depths": [0], "unitsMissing": True, "size": [4, 3]}, units=None)
def _(doc):
    doc.modelspace().add_polyline2d([(0, 0), (4, 0), (4, 3), (0, 3)], close=True, dxfattribs=RED)


@fixture("f17_text_skipped", "Rectangle plus one TEXT and one MTEXT. Text is skipped with a count of 2.",
         {"loops": 1, "openChains": 0, "depths": [0], "textSkipped": 2, "size": [3, 1]})
def _(doc):
    msp = doc.modelspace()
    msp.add_lwpolyline([(0, 0), (3, 0), (3, 1), (0, 1)], close=True, dxfattribs=RED)
    msp.add_text("TEAM 2204", height=0.2, dxfattribs={"insert": (0.2, 0.6)})
    msp.add_mtext("RAMBOTS", dxfattribs={"char_height": 0.2, "insert": (1.2, 0.45)})


@fixture("f18_r12_bulge_polyline", "R12 POLYLINE with VERTEX bulges: 2 x 1 obround (full round ends).",
         {"loops": 1, "openChains": 0, "depths": [0], "unitsMissing": True, "size": [2, 1]}, units=None)
def _(doc):
    pl = doc.modelspace().add_polyline2d([(0.5, 0), (1.5, 0), (1.5, 1), (0.5, 1)], close=True, dxfattribs=RED)
    for v, b in zip(pl.vertices, (0, 1, 0, 1)):
        v.dxf.bulge = b


@fixture("f19_minsert_array", "MINSERT: one 0.5 in circle block in a 3 column x 2 row array at 1 in spacing.",
         {"loops": 6, "openChains": 0, "depths": [0, 0, 0, 0, 0, 0], "size": [2.5, 1.5]})
def _(doc):
    blk = doc.blocks.new("DOT")
    blk.add_circle((0.25, 0.25), 0.25, dxfattribs=RED)
    ref = doc.modelspace().add_blockref("DOT", (0, 0))
    ref.dxf.column_count, ref.dxf.row_count = 3, 2
    ref.dxf.column_spacing, ref.dxf.row_spacing = 1.0, 1.0


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
    results, problems = [], []
    for name, description, expect, units, size_tol, build in FIXTURES:
        version = "R12" if units is None else "R2000"
        doc = new(version, {"in": 1, "mm": 4, None: None}[units])
        build(doc)
        path = out / f"{name}_v{VERSION}.dxf"
        doc.saveas(path)

        # Self-check: re-read, audit, and measure the overall size with ezdxf.
        back = ezdxf.readfile(path)
        audit = back.audit()
        ext = bbox.extents(back.modelspace(), fast=False)
        scale = 1 / 25.4 if units == "mm" else 1
        measured = [round(ext.size.x * scale, 4), round(ext.size.y * scale, 4)]
        if audit.has_errors:
            problems.append(f"{name}: audit errors {audit.errors}")
        if any(abs(m - e) > size_tol for m, e in zip(measured, expect["size"])):
            problems.append(f"{name}: size {measured} != expected {expect['size']}")

        record = {"file": path.name, "description": description, "dxfVersion": back.dxfversion,
                  "units": units, "sizeTolerance": size_tol}
        record.update({k: (round(v[0], 4), round(v[1], 4)) if k == "size" else v for k, v in expect.items()})
        results.append(record)

    payload = {
        "_metadata": {
            "file": f"expected_results_v{RESULTS_VERSION}.json",
            "version": RESULTS_VERSION,
            "author": "Samuel Cao",
            "created": "2026-10-30",
            "last_updated": "2026-10-30",
            "description": "Hand-written expected results for each DXF fixture; sizes are overall width x height in inches.",
            "ai_update": "Regenerate with make_fixtures; update last_updated and version. Append to _changelog array.",
        },
        "_changelog": [{"version": "1.0", "date": "2026-10-30", "note": "Initial release, 19 fixtures."},
                       {"version": "1.0.1", "date": "2026-10-30", "note": "f18 marked unitsMissing (R12 has no $INSUNITS); caught by reference_check."}],
        "defaults": {"joinTolerance": 0.001, "almostClosedMax": 0.01,
                     "omittedCountsMeanZero": ["branchPoints", "duplicatesRemoved", "overlapsReported", "almostClosed", "textSkipped"]},
        "fixtures": results,
    }
    (out / f"expected_results_v{RESULTS_VERSION}.json").write_text(json.dumps(payload, indent=2) + "\n")

    if problems:
        print("SELF-CHECK FAILED"); print("\n".join(problems)); sys.exit(1)
    print(f"{len(results)} fixtures written, self-check passed")


if __name__ == "__main__":
    main()

# CHANGELOG
# v1.0 (2026-10-30): Initial release. 19 fixtures covering joining, gaps, branches, duplicates, overlaps, nesting, bulges, mirrored arcs, splines, ellipses, nested blocks, MINSERT, units, R12, and text.
# v1.0.1 (2026-10-30): f18 expected unitsMissing true; results file versioned separately from the unchanged DXFs.
