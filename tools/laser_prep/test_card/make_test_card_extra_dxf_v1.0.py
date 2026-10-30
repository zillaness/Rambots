"""
file: make_test_card_extra_dxf_v1.0.py
version: 1.0
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Writes two extra Step 0 import probes: an R12 copy of the cut and score test, and a curves file with every curve type CAD exports use.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage: python3 make_test_card_extra_dxf_v1.0.py [output_dir]
Needs ezdxf (pip install ezdxf).

R12 probe: if UCP rejects the R2000 test files but takes this one, the app must write R12.
Curves probe: every shape is red (cut). Whatever UCP drops or distorts on import,
the app has to convert to plain lines and arcs before saving.
"""

import math
import sys
from pathlib import Path

import ezdxf

ART_HEIGHT = 4.5   # same flip as make_test_card_dxf_v1.0.py: inches from the top-left, y down
ACI_RED, ACI_BLUE = 1, 5
CUT = {"layer": "CUT", "color": ACI_RED}


def pt(x, y):
    return (x, ART_HEIGHT - y)


def write_r12(path):
    """Cut square and score line only. R12 has no LWPOLYLINE, HATCH, or $INSUNITS."""
    doc = ezdxf.new("R12")
    doc.layers.add("CUT", color=ACI_RED)
    doc.layers.add("SCORE", color=ACI_BLUE)
    msp = doc.modelspace()
    square = [pt(0.25, 0.25), pt(4.25, 0.25), pt(4.25, 4.25), pt(0.25, 4.25)]
    msp.add_polyline2d(square, close=True, dxfattribs=CUT)
    msp.add_line(pt(4.75, 0.50), pt(6.75, 0.50), dxfattribs={"layer": "SCORE", "color": ACI_BLUE})
    doc.saveas(path)


def write_curves(path):
    doc = ezdxf.new("R2000", setup=True)
    doc.header["$INSUNITS"] = 1
    doc.header["$MEASUREMENT"] = 0
    doc.layers.add("CUT", color=ACI_RED)
    msp = doc.modelspace()

    # 1. CIRCLE, 1.000 in diameter.
    msp.add_circle(pt(0.75, 0.75), radius=0.5, dxfattribs=CUT)

    # 2. LWPOLYLINE with bulge arcs: 2.000 x 1.000 in rounded rectangle, 0.250 in corners.
    #    A bulge of tan(90 deg / 4) makes each 90 degree corner arc.
    b = math.tan(math.radians(90) / 4)
    x0, y0, x1, y1, r = 1.75, 0.25, 3.75, 1.25, 0.25
    rounded = [
        (*pt(x0 + r, y0), 0), (*pt(x1 - r, y0), -b),
        (*pt(x1, y0 + r), 0), (*pt(x1, y1 - r), -b),
        (*pt(x1 - r, y1), 0), (*pt(x0 + r, y1), -b),
        (*pt(x0, y1 - r), 0), (*pt(x0, y0 + r), -b),
    ]
    msp.add_lwpolyline(rounded, format="xyb", close=True, dxfattribs=CUT)

    # 3. Slot as loose LINE and ARC entities (how sketch exports often arrive): 2.000 x 0.500 in.
    sx0, sx1, sy0, sy1, sr = 4.50, 6.00, 0.25, 0.75, 0.25
    msp.add_line(pt(sx0, sy0), pt(sx1, sy0), dxfattribs=CUT)
    msp.add_line(pt(sx0, sy1), pt(sx1, sy1), dxfattribs=CUT)
    msp.add_arc(pt(sx1, (sy0 + sy1) / 2), radius=sr, start_angle=-90, end_angle=90, dxfattribs=CUT)
    msp.add_arc(pt(sx0, (sy0 + sy1) / 2), radius=sr, start_angle=90, end_angle=270, dxfattribs=CUT)

    # 4. ELLIPSE, 2.000 x 1.000 in.
    msp.add_ellipse(pt(1.25, 2.50), major_axis=(1.0, 0, 0), ratio=0.5, dxfattribs=CUT)

    # 5. SPLINE (control points and knots, as CAD writes it) closed by a LINE: 2.000 in wide wave.
    fit = [pt(2.75, 3.00), pt(3.25, 2.25), pt(3.75, 2.75), pt(4.25, 2.25), pt(4.75, 3.00)]
    msp.add_cad_spline_control_frame(fit, dxfattribs=CUT)
    msp.add_line(fit[-1], fit[0], dxfattribs=CUT)

    # 6. INSERT: a 0.250 in hole block placed three times, the last at 2x scale (0.500 in).
    hole = doc.blocks.new("HOLE_0_25")
    hole.add_circle((0, 0), radius=0.125, dxfattribs=CUT)
    msp.add_blockref("HOLE_0_25", pt(5.25, 2.25), dxfattribs={"layer": "CUT"})
    msp.add_blockref("HOLE_0_25", pt(5.75, 2.25), dxfattribs={"layer": "CUT"})
    msp.add_blockref("HOLE_0_25", pt(6.40, 2.25), dxfattribs={"layer": "CUT", "xscale": 2, "yscale": 2})

    doc.saveas(path)


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
    write_r12(out / "laser_test_card_colored_r12_v1.0.dxf")
    write_curves(out / "laser_test_card_curves_v1.0.dxf")


if __name__ == "__main__":
    main()

# CHANGELOG
# v1.0 (2026-10-30): Initial release. R12 cut and score probe, and a curves probe (circle, bulge arcs, loose lines and arcs, ellipse, spline, block inserts).
