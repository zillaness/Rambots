"""
file: make_test_card_dxf_v1.1.py
version: 1.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Writes the two laser test card DXFs (colored in inches, raw in millimeters) used for the Step 0 UCP import check.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage: python3 make_test_card_dxf_v1.1.py [output_dir]
Needs ezdxf (pip install ezdxf). The geometry must match GEOMETRY in
laser_test_card_v1.2.html; change both together.
"""

import sys
from pathlib import Path

import ezdxf
from ezdxf import bbox, const

VERSION = "1.1"

# Test card geometry in inches, measured from the top-left of the bed, y down.
CUT_SQUARE = (0.25, 0.25, 4.0, 4.0)        # x, y, w, h  red outline, vector cut
SCORE_LINE = ((4.75, 0.50), (6.75, 0.50))  # blue line, vector score
ENGRAVE_SQUARE = (4.75, 1.00, 0.5, 0.5)    # black fill, raster
COMPOUND_SQUARE = (5.75, 1.00, 1.0, 1.0)   # black fill with a hole
COMPOUND_HOLE = ((6.25, 1.50), 0.25)       # center, radius
LABEL = ((4.75, 2.75), 0.30, "TEST v1")    # baseline start, text height, text

# DXF is y up. Flipping about this line keeps the art in the positive quadrant.
ART_HEIGHT = 4.5

ACI_RED, ACI_BLUE, ACI_BLACK = 1, 5, 7


def pt(x, y, scale):
    return (x * scale, (ART_HEIGHT - y) * scale)


def rect_points(x, y, w, h, scale):
    return [pt(x, y, scale), pt(x + w, y, scale), pt(x + w, y + h, scale), pt(x, y + h, scale)]


def finish(doc):
    """Real drawing extents and limits in the header (ezdxf leaves placeholder values), so an importer
    that centers or scales from the header sees the true size."""
    ext = bbox.extents(doc.modelspace(), fast=False)
    # ezdxf copies the model space layout's values into the header on save, so set them there.
    msp = doc.modelspace()
    msp.dxf.extmin = (ext.extmin.x, ext.extmin.y, 0)
    msp.dxf.extmax = (ext.extmax.x, ext.extmax.y, 0)
    msp.dxf.limmin = (0, 0)
    msp.dxf.limmax = (ext.extmax.x, ext.extmax.y)


def new_doc(insunits):
    # R2000 is the oldest version that has LWPOLYLINE, HATCH and $INSUNITS.
    doc = ezdxf.new("R2000", setup=True)
    doc.header["$INSUNITS"] = insunits
    doc.header["$MEASUREMENT"] = 0 if insunits == 1 else 1
    return doc


def write_colored(path):
    """Colors set on both the layer and the entity, inches, closed loops, real fills."""
    doc = new_doc(insunits=1)
    for name, color in (("CUT", ACI_RED), ("SCORE", ACI_BLUE), ("ENGRAVE", ACI_BLACK)):
        doc.layers.add(name, color=color)
    msp = doc.modelspace()

    msp.add_lwpolyline(rect_points(*CUT_SQUARE, 1), close=True,
                       dxfattribs={"layer": "CUT", "color": ACI_RED})

    (x1, y1), (x2, y2) = SCORE_LINE
    msp.add_line(pt(x1, y1, 1), pt(x2, y2, 1), dxfattribs={"layer": "SCORE", "color": ACI_BLUE})

    hatch = msp.add_hatch(color=ACI_BLACK, dxfattribs={"layer": "ENGRAVE"})
    hatch.paths.add_polyline_path(rect_points(*ENGRAVE_SQUARE, 1), is_closed=True,
                                  flags=const.BOUNDARY_PATH_EXTERNAL)

    # Odd-parity hatch: the circle stays empty, the way an engraved plate keeps its holes.
    compound = msp.add_hatch(color=ACI_BLACK, dxfattribs={"layer": "ENGRAVE"})
    compound.dxf.hatch_style = const.HATCH_STYLE_NESTED
    compound.paths.add_polyline_path(rect_points(*COMPOUND_SQUARE, 1), is_closed=True,
                                     flags=const.BOUNDARY_PATH_EXTERNAL)
    (cx, cy), r = COMPOUND_HOLE
    edges = compound.paths.add_edge_path(flags=const.BOUNDARY_PATH_OUTERMOST)
    edges.add_arc(pt(cx, cy, 1), radius=r, start_angle=0, end_angle=360)

    (lx, ly), height, text = LABEL
    msp.add_text(text, height=height,
                 dxfattribs={"layer": "ENGRAVE", "color": ACI_BLACK, "insert": pt(lx, ly, 1)})

    finish(doc)
    doc.saveas(path)


def write_raw_mm(path):
    """Imitates a Fusion or Onshape export: millimeters, layer 0, no color, loose LINEs, no fills."""
    mm = 25.4
    doc = new_doc(insunits=4)
    msp = doc.modelspace()

    def loose_rect(x, y, w, h):
        p = rect_points(x, y, w, h, mm)
        for i in range(4):
            msp.add_line(p[i], p[(i + 1) % 4])

    loose_rect(*CUT_SQUARE)
    (x1, y1), (x2, y2) = SCORE_LINE
    msp.add_line(pt(x1, y1, mm), pt(x2, y2, mm))
    loose_rect(*ENGRAVE_SQUARE)
    loose_rect(*COMPOUND_SQUARE)
    (cx, cy), r = COMPOUND_HOLE
    msp.add_circle(pt(cx, cy, mm), radius=r * mm)

    finish(doc)
    doc.saveas(path)


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
    write_colored(out / f"laser_test_card_colored_v{VERSION}.dxf")
    write_raw_mm(out / f"laser_test_card_raw_mm_v{VERSION}.dxf")


if __name__ == "__main__":
    main()

# CHANGELOG
# v1.0 (2026-10-30): Initial release. Colored inch DXF and raw millimeter DXF for the Step 0 UCP import check.
# v1.1 (2026-10-30): Header extents and limits set from the drawing instead of ezdxf placeholders; output files now v1.1.
