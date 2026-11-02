"""
file: validate_doc_outputs.py
version: 0.3
author: Samuel Cao
created: 2026-11-02
last_updated: 2026-11-02
description: Checks the Phase 2 document outputs: strict PDF parse, image XObject present, only laser colors (plus image grays) in a render, SVG parses, DXF audits clean.
ai_update: Update last_updated and version. Keep the filename. Append changelog at bottom.

Usage: python3 validate_doc_outputs.py <out_dir>
"""
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import ezdxf
from PIL import Image
from pypdf import PdfReader

LASER = {(0, 0, 0), (255, 0, 0), (0, 255, 0), (255, 255, 0), (0, 0, 255), (255, 0, 255), (0, 255, 255), (255, 102, 0), (255, 255, 255)}


def main():
    out = Path(sys.argv[1])
    man = json.loads((out / "manifest.json").read_text())
    bad = []
    r = PdfReader(out / "phase2_everything.pdf", strict=True)
    page = r.pages[0]
    if (float(page.mediabox.width) / 72, float(page.mediabox.height) / 72) != (24.0, 18.0):
        bad.append("page size")
    xo = page["/Resources"].get("/XObject")
    imgs = [xo[k].get_object() for k in xo] if xo else []
    if not imgs or imgs[0]["/ColorSpace"] != "/DeviceGray":
        bad.append("image XObject missing or not grayscale")
    if r.trailer["/Root"]["/ViewerPreferences"]["/PrintScaling"] != "/None":
        bad.append("PrintScaling")
    Image.MAX_IMAGE_PIXELS = None
    subprocess.run(["pdftoppm", "-r", "40", "-aa", "no", "-aaVector", "no", "-png", "-singlefile", str(out / "phase2_everything.pdf"), str(out / "render")], check=True)
    im = Image.open(out / "render.png").convert("RGB")
    colors = {c for _, c in im.getcolors(1 << 24)}
    grays = {c for c in colors if c[0] == c[1] == c[2]}
    stray = colors - LASER - grays
    if stray:
        bad.append(f"non-laser colors {sorted(stray)[:4]}")
    ET.parse(out / "phase2_everything.svg")
    doc = ezdxf.readfile(out / "phase2_everything.dxf")
    if doc.audit().has_errors:
        bad.append("dxf audit")
    n = len(list(doc.modelspace()))
    if n != man["dxf"]["entities"]:
        bad.append(f"dxf entity count {n} vs {man['dxf']['entities']}")
    print(json.dumps({"pdf_images": len(imgs), "render_colors": sorted(colors - grays), "gray_levels": len(grays), "dxf_entities": n, "counts": man["counts"]}))
    print("FAIL " + "; ".join(bad) if bad else "ok   phase 2 document outputs valid")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()

# CHANGELOG
# v0.3 (2026-11-02): Initial release.
