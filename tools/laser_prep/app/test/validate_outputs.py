"""
file: validate_outputs.py
version: 0.1
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Checks the PDF, SVG, and DXF files from write_outputs.js: strict PDF parse, only the four laser colors in a render, drawn size matches the fixture, and DXF audit and read-back.
ai_update: Update last_updated and version. Keep the filename. Append changelog at bottom.

Usage: python3 validate_outputs.py <out_dir>   (needs pypdf, Pillow, ezdxf, and pdftoppm)
"""
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import ezdxf
from ezdxf import bbox
from PIL import Image
from pypdf import PdfReader

ALLOWED = {(255, 255, 255), (255, 0, 0), (0, 0, 255), (0, 0, 0)}
DPI = 100
Image.MAX_IMAGE_PIXELS = None  # large beds render big at 100 dpi


def main():
    out = Path(sys.argv[1])
    manifest = json.loads((out / "manifest.json").read_text())
    failures = 0
    for m in manifest:
        bad = []
        pdf = out / f"{m['base']}.pdf"
        r = PdfReader(pdf, strict=True)
        page = r.pages[0]
        if abs(float(page.mediabox.width) / 72 - m["bed"]["w"]) > 1e-6:
            bad.append("page width")
        subprocess.run(["pdftoppm", "-r", str(DPI), "-aa", "no", "-aaVector", "no", "-png", "-singlefile", str(pdf), str(out / m["base"])], check=True)
        im = Image.open(out / f"{m['base']}.png").convert("RGB")
        colors = {c for _, c in im.getcolors(1 << 24)}
        if not colors <= ALLOWED:
            bad.append(f"colors {sorted(colors - ALLOWED)[:3]}")
        # Drawn extent of everything non-white, in inches, against the fixture size (1 px slack for line width).
        nonwhite = im.point(lambda v: 255 - v).convert("L").getbbox()
        if nonwhite:
            w = (nonwhite[2] - nonwhite[0] - 1) / DPI
            h = (nonwhite[3] - nonwhite[1] - 1) / DPI
            tol = max(m["sizeTolerance"], 0.02)
            if abs(w - m["size"][0]) > tol or abs(h - m["size"][1]) > tol:
                bad.append(f"drawn {w:.3f} x {h:.3f} vs {m['size'][0]:.3f} x {m['size'][1]:.3f}")
            if abs(nonwhite[0] / DPI - 0.25) > 0.02 or abs(nonwhite[1] / DPI - 0.25) > 0.02:
                bad.append(f"origin {nonwhite[0] / DPI:.2f}, {nonwhite[1] / DPI:.2f}")
        ET.parse(out / f"{m['base']}.svg")
        doc = ezdxf.readfile(out / f"{m['base']}.out.dxf")
        audit = doc.audit()
        if audit.has_errors:
            bad.append(f"dxf audit {len(audit.errors)}")
        ents = list(doc.modelspace())
        if ents:
            ext = bbox.extents(ents, fast=False)
            if abs(ext.size.x - m["size"][0]) > max(m["sizeTolerance"], 0.002) or abs(ext.size.y - m["size"][1]) > max(m["sizeTolerance"], 0.002):
                bad.append(f"dxf size {ext.size.x:.4f} x {ext.size.y:.4f}")
        failures += bool(bad)
        print(("FAIL " if bad else "ok   ") + m["base"] + ("  " + "; ".join(bad) if bad else ""))
    print(f"{len(manifest) - failures}/{len(manifest)} outputs valid")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()

# CHANGELOG
# v0.1 (2026-10-30): Initial release.
