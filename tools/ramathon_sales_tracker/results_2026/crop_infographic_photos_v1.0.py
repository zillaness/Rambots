"""
file: crop_infographic_photos_v1.0.py
version: 1.0
author: Sam Cao
created: 2026-10-17
last_updated: 2026-10-17
description: Crops the tracker product photos into square thumbnails for the Ram-a-thon 2026 infographic (the HTML rounds and outlines them).
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.

Usage (from tools/ramathon_sales_tracker):
    python3 results_2026/crop_infographic_photos_v1.0.py . results_2026/infographic_photos <preview.png>
"""

import sys
from PIL import Image, ImageDraw
src_root, out_dir, sheet = sys.argv[1:4]
# (source, output name, crop box l,t,r,b) -- boxes are squares on the original photo
CROPS = [
    ("clicker_photos/dumpling.jpg", "dumpling", (33, 179, 293, 439)),
    ("clicker_photos/salmon_nigiri.jpg", "salmon_nigiri", (65, 252, 365, 552)),
    ("clicker_photos/creeper.jpg", "creeper", (130, 40, 670, 580)),
    ("clicker_photos/avocado.jpg", "avocado", (60, 60, 740, 740)),
    ("clicker_photos/egg_tart.jpg", "egg_tart", (427, 200, 727, 500)),
    ("clicker_photos/chocolate_bar.jpg", "chocolate_bar", (93, 300, 353, 560)),
    ("clicker_photos/hot_dog_bun.jpg", "hot_dog_bun", (110, 195, 470, 555)),
    ("clicker_photos/wd40.jpg", "wd40", (208, 100, 548, 440)),
    ("clicker_photos/creeper_cube.jpg", "creeper_cube", (10, 120, 370, 480)),
    ("clicker_photos/musubi.jpg", "spam_musubi", (421, 210, 741, 530)),
    ("clicker_photos/smores.jpg", "smores", (400, 80, 780, 460)),
    ("clicker_photos/lego.jpg", "lego", (130, 180, 470, 520)),
    ("copter_photos/pullcopter.jpg", "pullcopter", (200, 0, 733, 533)),
    ("prize_photos/cheese_squish.jpg", "cheese_squish", (105, 0, 665, 560)),
    ("prize_photos/dino_plush.jpg", "dino_plush", (22, 80, 662, 720)),
]
tiles = []
for src, name, box in CROPS:
    im = Image.open(f"{src_root}/{src}").convert("RGB").crop(box).resize((240, 240), Image.LANCZOS)
    im.save(f"{out_dir}/{name}.jpg", quality=88)
    tiles.append((name, im))
cols = 8
W = 250
sh = Image.new("RGB", (cols * W, ((len(tiles) + cols - 1) // cols) * (W + 20)), "white")
d = ImageDraw.Draw(sh)
for i, (n, im) in enumerate(tiles):
    x, y = (i % cols) * W, (i // cols) * (W + 20)
    mask = Image.new("L", (240, 240), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 239, 239), fill=255)
    sh.paste(im, (x + 5, y + 5), mask)
    d.text((x + 5, y + 247), n, fill="black")
sh.save(sheet)

# CHANGELOG
# v1.0 (2026-10-17): Initial release. Boxes centered on each object, not its keychain.
