"""
file: make_test_card_extra_dxf_v1.2.py
version: 1.2
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Writes four extra Step 0 import probes (a plain red and blue file, an R12 copy, a curves file, and a color-code file) for the UCP import check.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage: python3 make_test_card_extra_dxf_v1.2.py [output_dir]
Needs ezdxf (pip install ezdxf).

R12 probe: if UCP rejects the R2000 test files but takes this one, the app must write R12.
Curves probe: every shape is red (cut). Whatever UCP drops or distorts on import,
the app has to convert to plain lines and arcs before saving.
Color-code probe: nine 2 in lines, one per way a DXF can say red, blue, or black
(entity color index, layer color, 24-bit true color). Which ones keep their
color in UCP decides how the app must write DXF color.
"""

import math
import sys
from pathlib import Path

import ezdxf
from ezdxf import bbox

ART_HEIGHT = 4.5   # same flip as make_test_card_dxf_v1.0.py: inches from the top-left, y down
ACI_RED, ACI_BLUE = 1, 5
CUT = {"layer": "CUT", "color": ACI_RED}


def pt(x, y):
    return (x, ART_HEIGHT - y)


def finish(doc, inches=True):
    """Real extents and limits in the header instead of ezdxf placeholders."""
    ext = bbox.extents(doc.modelspace(), fast=False)
    # ezdxf copies the model space layout's values into the header on save, so set them there.
    msp = doc.modelspace()
    msp.dxf.extmin = (ext.extmin.x, ext.extmin.y, 0)
    msp.dxf.extmax = (ext.extmax.x, ext.extmax.y, 0)
    msp.dxf.limmin = (0, 0)
    msp.dxf.limmax = (ext.extmax.x, ext.extmax.y)
    if inches and doc.dxfversion != "AC1009":
        doc.header["$MEASUREMENT"] = 0


def write_plain(path):
    """Only a closed LWPOLYLINE in red and a LINE in blue, R2000, inches. Nothing that could make an importer
    reject the file except color itself, so a failure here is about color or version, not exotic entities."""
    doc = ezdxf.new("R2000")
    doc.header["$INSUNITS"] = 1
    doc.layers.add("CUT", color=ACI_RED)
    doc.layers.add("SCORE", color=ACI_BLUE)
    msp = doc.modelspace()
    msp.add_lwpolyline([pt(0.25, 0.25), pt(4.25, 0.25), pt(4.25, 4.25), pt(0.25, 4.25)], close=True, dxfattribs=CUT)
    msp.add_line(pt(4.75, 0.50), pt(6.75, 0.50), dxfattribs={"layer": "SCORE", "color": ACI_BLUE})
    finish(doc)
    doc.saveas(path)


def write_r12(path):
    """Cut square and score line only. R12 has no LWPOLYLINE, HATCH, or $INSUNITS."""
    doc = ezdxf.new("R12")
    doc.layers.add("CUT", color=ACI_RED)
    doc.layers.add("SCORE", color=ACI_BLUE)
    msp = doc.modelspace()
    square = [pt(0.25, 0.25), pt(4.25, 0.25), pt(4.25, 4.25), pt(0.25, 4.25)]
    msp.add_polyline2d(square, close=True, dxfattribs=CUT)
    msp.add_line(pt(4.75, 0.50), pt(6.75, 0.50), dxfattribs={"layer": "SCORE", "color": ACI_BLUE})
    finish(doc)
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

    finish(doc)
    doc.saveas(path)


# Color-code probe, top to bottom. Line i is 2.0 - 0.2 i inches long, so each one can be told apart even if UCP flips the drawing. (label, entity ACI or None for BYLAYER, layer, layer ACI, true color or None)
COLOR_LINES = [
    ("ACI 1 on entity", 1, "0", 7, None),
    ("ACI 5 on entity", 5, "0", 7, None),
    ("ACI 7 on entity", 7, "0", 7, None),
    ("BYLAYER, layer color 1", None, "LAYER_RED", 1, None),
    ("BYLAYER, layer color 5", None, "LAYER_BLUE", 5, None),
    ("true color FF0000 only", None, "0", 7, 0xFF0000),
    ("true color 0000FF only", None, "0", 7, 0x0000FF),
    ("true color 000000 only", None, "0", 7, 0x000000),
    ("ACI 1 plus true color 0000FF", 1, "0", 7, 0x0000FF),
]


def write_color_codes(path):
    """R2004 is the oldest DXF version with 24-bit true color (group 420)."""
    doc = ezdxf.new("R2004")
    doc.header["$INSUNITS"] = 1
    doc.layers.add("LAYER_RED", color=1)
    doc.layers.add("LAYER_BLUE", color=5)
    msp = doc.modelspace()
    for i, (_, aci, layer, _, rgb) in enumerate(COLOR_LINES):
        y = 0.25 + 0.25 * i
        attribs = {"layer": layer}
        if aci is not None:
            attribs["color"] = aci
        line = msp.add_line(pt(0.25, y), pt(0.25 + 2.0 - 0.2 * i, y), dxfattribs=attribs)
        if rgb is not None:
            line.dxf.true_color = rgb
    finish(doc)
    doc.saveas(path)


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
    write_plain(out / "laser_test_card_plain_v1.0.dxf")
    write_r12(out / "laser_test_card_colored_r12_v1.1.dxf")
    write_curves(out / "laser_test_card_curves_v1.1.dxf")
    write_color_codes(out / "laser_test_card_color_codes_v1.1.dxf")


if __name__ == "__main__":
    main()

# CHANGELOG
# v1.0 (2026-10-30): Initial release. R12 cut and score probe, and a curves probe (circle, bulge arcs, loose lines and arcs, ellipse, spline, block inserts).
# v1.1 (2026-10-30): Added the color-code probe (entity ACI, layer color, true color, and a 62-vs-420 conflict line).
# v1.2 (2026-10-30): From the independent review: added a plain red and blue R2000 file, real header extents and limits, $MEASUREMENT 0 for inch files, color-code lines of different lengths. R12, curves, and color-code files now v1.1.
