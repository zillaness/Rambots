"""
file: build_site.py
version: 1.2
author: Sam Cao
created: 2026-10-14
last_updated: 2026-10-14
description: Builds the static presentations site (slide images, PDFs, GIF overlays, viewer pages, index) from tools/site.json.
ai_update: Update last_updated and version. Append changelog at bottom.

Usage (from the repo root):
    python3 tools/build_site.py            # build everything that changed
    python3 tools/build_site.py --force    # re-render every item

Needs LibreOffice (soffice), poppler-utils (pdftoppm, pdftotext), Pillow,
and Node + Playwright for screenshots of the HTML study sheets.
"""
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'tools' / 'site.json'
THUMBS = ROOT / 'assets' / 'thumbs'
SLIDE_WIDTH = 1920      # px, rendered width of 16:9 slides
PAGE_DPI = 160          # rendering resolution for portrait documents
THUMB_WIDTH = 480
WEBP_QUALITY = 80

NS = {
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
PKG_REL = '{http://schemas.openxmlformats.org/package/2006/relationships}'
# 1x1 fully transparent GIF; swapped in for animated GIFs before rendering so the
# static slide image has a hole where the live GIF overlay will sit.
BLANK_GIF = bytes.fromhex('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b')


def esc(s):
    return html.escape(s, quote=True)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def run(cmd, **kw):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, **kw)


def soffice_to_pdf(src, outdir):
    """Convert an Office file to PDF with LibreOffice; returns the PDF path."""
    profile = Path(outdir) / 'lo-profile'
    run(['soffice', f'-env:UserInstallation=file://{profile}', '--headless',
         '--convert-to', 'pdf', '--outdir', str(outdir), str(src)], timeout=600)
    return Path(outdir) / (Path(src).stem + '.pdf')


def rasterize(pdf, outdir, slides):
    """Render PDF pages to PNG; returns the sorted list of PNG paths."""
    args = ['-scale-to-x', str(SLIDE_WIDTH), '-scale-to-y', '-1'] if slides else ['-r', str(PAGE_DPI)]
    run(['pdftoppm', '-png', *args, str(pdf), str(Path(outdir) / 'page')])
    return sorted(Path(outdir).glob('page-*.png'), key=lambda p: int(re.findall(r'\d+', p.stem)[-1]))


def pdf_page_texts(pdf, count):
    texts = []
    for n in range(1, count + 1):
        out = subprocess.run(['pdftotext', '-layout', '-f', str(n), '-l', str(n), str(pdf), '-'],
                             check=True, capture_output=True, text=True).stdout
        texts.append(re.sub(r'\n{3,}', '\n\n', out).strip())
    return texts


# ---------------------------------------------------------------- pptx parsing
def pptx_structure(path):
    """Return visible slides in presentation order with their text and GIF overlays."""
    z = zipfile.ZipFile(path)
    pres = ET.fromstring(z.read('ppt/presentation.xml'))
    sx = int(pres.find('p:sldSz', NS).get('cx'))
    sy = int(pres.find('p:sldSz', NS).get('cy'))
    prels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))}
    slides = []
    for sid in pres.find('p:sldIdLst', NS):
        target = prels[sid.get('{%s}id' % NS['r'])]
        name = 'ppt/' + target.lstrip('/').replace('ppt/', '', 1) if not target.startswith('slides/') else 'ppt/' + target
        root = ET.fromstring(z.read(name))
        if root.get('show') == '0':
            continue  # LibreOffice leaves hidden slides out of the PDF too
        rel_name = name.replace('slides/', 'slides/_rels/') + '.rels'
        rels = {}
        if rel_name in z.namelist():
            for r in ET.fromstring(z.read(rel_name)):
                rels[r.get('Id')] = r.get('Target')
        paras = []
        for p in root.iter('{%s}p' % NS['a']):
            t = ''.join(x.text or '' for x in p.iter('{%s}t' % NS['a'])).strip()
            if t:
                paras.append(t)
        overlays = []
        walk_shapes(root.find('p:cSld/p:spTree', NS), (0, 0, 1, 1), rels, name, z, sx, sy, overlays)
        slides.append({'xml': name, 'text': '\n'.join(paras), 'overlays': overlays})
    return slides, (sx, sy)


def walk_shapes(tree, xf, rels, slide_name, z, sx, sy, overlays):
    """Walk a shape tree, tracking group transforms, collecting animated GIF pictures."""
    ox, oy, kx, ky = xf
    for el in tree:
        tag = el.tag.split('}')[1]
        if tag == 'grpSp':
            g = el.find('p:grpSpPr/a:xfrm', NS)
            off, ext = g.find('a:off', NS), g.find('a:ext', NS)
            choff, chext = g.find('a:chOff', NS), g.find('a:chExt', NS)
            gx, gy = int(off.get('x')), int(off.get('y'))
            gcx, gcy = int(ext.get('cx')), int(ext.get('cy'))
            cx0, cy0 = int(choff.get('x')), int(choff.get('y'))
            ccx, ccy = int(chext.get('cx')) or 1, int(chext.get('cy')) or 1
            # child coord c maps to: gx + (c - cx0) * gcx/ccx, then through the parent transform
            nkx, nky = kx * gcx / ccx, ky * gcy / ccy
            nox = ox + kx * gx - nkx * cx0
            noy = oy + ky * gy - nky * cy0
            walk_shapes(el, (nox, noy, nkx, nky), rels, slide_name, z, sx, sy, overlays)
        elif tag == 'pic':
            blip = el.find('p:blipFill/a:blip', NS)
            if blip is None:
                continue
            target = rels.get(blip.get('{%s}embed' % NS['r']), '')
            media = os.path.normpath(os.path.join(os.path.dirname(slide_name), target)).replace(os.sep, '/')
            if media not in z.namelist() or z.read(media)[:4] != b'GIF8':
                continue
            if el.find('p:blipFill/a:srcRect', NS) is not None and el.find('p:blipFill/a:srcRect', NS).attrib:
                print(f'  warning: cropped GIF on {slide_name}; overlay shows the uncropped image', file=sys.stderr)
            x = el.find('p:spPr/a:xfrm', NS)
            off, ext = x.find('a:off', NS), x.find('a:ext', NS)
            ax = ox + kx * int(off.get('x'))
            ay = oy + ky * int(off.get('y'))
            aw, ah = kx * int(ext.get('cx')), ky * int(ext.get('cy'))
            overlays.append({'media': media,
                             'x': 100 * ax / sx, 'y': 100 * ay / sy,
                             'w': 100 * aw / sx, 'h': 100 * ah / sy})


def pptx_without_gifs(src, dst, media_names):
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = BLANK_GIF if item.filename in media_names else zin.read(item.filename)
            zout.writestr(item, data)


# ------------------------------------------------------------------ rendering
def save_images(pngs, slug_dir):
    """Write full-size and thumbnail WebP images; returns [(w, h)] of the full images."""
    for sub in ('slides', 'thumbs'):
        d = slug_dir / sub
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True)
    sizes = []
    for i, png in enumerate(pngs, 1):
        im = Image.open(png).convert('RGB')
        im.save(slug_dir / 'slides' / f'{i:03d}.webp', 'WEBP', quality=WEBP_QUALITY, method=6)
        sizes.append(im.size)
        t = im.copy()
        t.thumbnail((THUMB_WIDTH, THUMB_WIDTH * 2))
        t.save(slug_dir / 'thumbs' / f'{i:03d}.webp', 'WEBP', quality=70, method=6)
    return sizes


def render_item(item, force):
    slug, kind = item['slug'], item['kind']
    src = ROOT / item['source']
    slug_dir = ROOT / slug
    stamp = slug_dir / 'build.json'
    digest = sha256(src)
    if not force and stamp.exists():
        data = json.loads(stamp.read_text())
        if data.get('sha256') == digest:
            return data
    print(f'rendering {slug} ({kind})')
    slug_dir.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        overlays_by_page = {}
        texts = None
        if kind == 'slides':
            slides, _ = pptx_structure(src)
            gif_media = sorted({o['media'] for s in slides for o in s['overlays']})
            render_src = src
            if gif_media:
                render_src = tmp / ('render-' + src.name)
                pptx_without_gifs(src, render_src, set(gif_media))
            pdf_download = soffice_to_pdf(src, tmp / 'download')
            pdf_render = soffice_to_pdf(render_src, tmp / 'render') if gif_media else pdf_download
            texts = [s['text'] for s in slides]
            ov_dir = slug_dir / 'overlays'
            if ov_dir.exists():
                shutil.rmtree(ov_dir)
            if gif_media:
                ov_dir.mkdir()
                with zipfile.ZipFile(src) as z:
                    for m in gif_media:
                        (ov_dir / Path(m).name).write_bytes(z.read(m))
            for i, s in enumerate(slides, 1):
                if s['overlays']:
                    overlays_by_page[i] = [dict(o, src='overlays/' + Path(o['media']).name) for o in s['overlays']]
        elif kind == 'document':
            pdf_download = soffice_to_pdf(src, tmp / 'download')
            pdf_render = pdf_download
        elif kind == 'pdf':
            pdf_download = None
            pdf_render = src
        else:
            raise ValueError(kind)
        (tmp / 'png').mkdir()
        pngs = rasterize(pdf_render, tmp / 'png', slides=(kind == 'slides'))
        if texts is None:
            texts = pdf_page_texts(pdf_render, len(pngs))
        if len(texts) != len(pngs):
            raise SystemExit(f'{slug}: {len(texts)} slides parsed but {len(pngs)} pages rendered')
        sizes = save_images(pngs, slug_dir)
        if pdf_download is not None:
            shutil.copyfile(pdf_download, ROOT / item['pdf'])
    pages = [{'w': w, 'h': h, 'text': t, 'overlays': overlays_by_page.get(i, [])}
             for i, ((w, h), t) in enumerate(zip(sizes, texts), 1)]
    data = {'sha256': digest, 'pages': pages}
    stamp.write_text(json.dumps(data, indent=1))
    THUMBS.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(slug_dir / 'thumbs' / '001.webp', THUMBS / f'{slug}.webp')
    return data


def screenshot_html_items(items, force):
    todo = [i for i in items if i['kind'] == 'html' and (force or not (THUMBS / f"{i['slug']}.jpg").exists())]
    if not todo:
        return
    THUMBS.mkdir(parents=True, exist_ok=True)
    jobs = [[str(ROOT / i['slug'] / 'index.html'), str(THUMBS / f"{i['slug']}.jpg")] for i in todo]
    subprocess.run(['node', str(ROOT / 'tools' / 'thumbs.cjs'), json.dumps(jobs)], check=True)


# ------------------------------------------------------------------- HTML out
def head(title, description, depth, noindex=False):
    up = '../' * depth
    robots = '\n<meta name="robots" content="noindex, nofollow">' if noindex else ''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">{robots}
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="stylesheet" href="{up}assets/site.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230b7a66'/%3E%3Crect x='7' y='9' width='18' height='12' rx='2' fill='%23fff'/%3E%3Crect x='14' y='21' width='4' height='4' fill='%23fff'/%3E%3C/svg%3E">
</head>'''


GENERATED = '''<!--
  file: {file}
  version: {version}
  author: Sam Cao
  created: 2026-10-14
  last_updated: {updated}
  description: {description}
  ai_update: Generated by tools/build_site.py from tools/site.json. Edit those and rebuild; do not edit this file by hand.
-->'''

KIND_LABEL = {'slides': 'Slides', 'document': 'Handout', 'pdf': 'PDF', 'html': 'Study sheet', 'link': 'Web app'}
# Filter buckets on the landing page, in display order.
TYPES = [('slides', 'Slides'), ('sheet', 'Study sheets'), ('game', 'Games & quizzes'), ('handout', 'Handouts')]
DEFAULT_TYPE = {'slides': 'slides', 'document': 'handout', 'pdf': 'handout', 'html': 'sheet', 'link': 'handout'}


def label(item):
    return item.get('label') or KIND_LABEL[item['kind']]


def item_type(item):
    return item.get('type') or DEFAULT_TYPE[item['kind']]


def placeholder_thumb(path, title, subtitle):
    """Plain text card for items with nothing to screenshot (external links)."""
    from PIL import ImageDraw, ImageFont
    im = Image.new('RGB', (640, 360), (233, 233, 228))
    d = ImageDraw.Draw(im)
    try:
        big = ImageFont.truetype('DejaVuSans-Bold.ttf', 34)
        small = ImageFont.truetype('DejaVuSans.ttf', 22)
    except OSError:
        big = small = ImageFont.load_default()
    d.rectangle((0, 0, 640, 8), fill=(10, 117, 99))
    lines, line = [], ''
    for word in title.split():
        trial = (line + ' ' + word).strip()
        if d.textlength(trial, font=big) > 568 and line:
            lines.append(line)
            line = word
        else:
            line = trial
    lines.append(line)
    y = 180 - 23 * len(lines)
    for ln in lines:
        d.text((36, y), ln, font=big, fill=(24, 25, 28))
        y += 46
    d.text((36, y + 12), subtitle, font=small, fill=(91, 95, 102))
    im.save(path, 'WEBP', quality=80)


def viewer_page(item, site, data):
    slug, kind = item['slug'], item['kind']
    pages = data['pages']
    unit = 'slide' if kind == 'slides' else 'page'
    downloads = []
    if item.get('pdf'):
        downloads.append(('PDF', '../' + item['pdf']))
    if kind != 'pdf':
        downloads.append((Path(item['source']).suffix.lstrip('.').upper(), '../' + item['source']))
    else:
        downloads.append(('PDF', '../' + item['source']))
    dl_html = ''.join(f'<a class="btn" href="{esc(h)}" download>{esc(l)}</a>' for l, h in downloads)
    figs = []
    for i, pg in enumerate(pages, 1):
        ar = pg['w'] / pg['h']
        ovs = ''.join(
            f'<img class="overlay" src="{esc(o["src"])}" alt="" style="left:{o["x"]:.3f}%;top:{o["y"]:.3f}%;'
            f'width:{o["w"]:.3f}%;height:{o["h"]:.3f}%">' for o in pg['overlays'])
        text = esc(pg['text']) if pg['text'] else '<span class="muted">(no text on this %s)</span>' % unit
        figs.append(
            f'<figure class="slide" id="{unit}-{i}" data-thumb="thumbs/{i:03d}.webp" style="--ar:{ar:.4f}">'
            f'<div class="frame"><img src="slides/{i:03d}.webp" width="{pg["w"]}" height="{pg["h"]}" '
            f'loading="{"eager" if i == 1 else "lazy"}" decoding="async" alt="{unit.title()} {i} of {len(pages)}">{ovs}</div>'
            f'<figcaption class="slide-text"><span class="slide-no">{unit.title()} {i}</span>{text}</figcaption></figure>')
    default_mode = 'show' if kind == 'slides' else 'scroll'
    meta = GENERATED.format(file=f'{slug}/index.html', version=item['version'], updated=site['updated'],
                            description=f'Viewer page for {item["title"]}.')
    return f'''{head(item["title"] + " | " + site["title"], item["description"], 1, noindex=item.get("gated", False))}
{meta}
<body class="viewer" data-default-mode="{default_mode}" data-unit="{unit}">
<a class="skip" href="#deck">Skip to {unit}s</a>
<header class="bar">
  <a class="back" href="../">&larr; <span>All materials</span></a>
  <div class="bar-title"><span class="kicker">{esc(item["topic"])} &middot; {esc(label(item))}</span><h1>{esc(item["title"])}</h1></div>
  <div class="bar-actions gated" hidden>{dl_html}</div>
</header>
<main>
  <div class="toolbar" hidden>
    <div class="seg" role="group" aria-label="Layout">
      <button type="button" data-mode="show" aria-pressed="false">Slideshow</button>
      <button type="button" data-mode="scroll" aria-pressed="false">All {unit}s</button>
    </div>
    <label class="toggle"><input type="checkbox" id="show-text"> Show text</label>
    <button type="button" class="btn ghost" id="fullscreen" aria-label="Full screen (F)">Full screen</button>
  </div>
  <section id="deck" class="deck" aria-label="{esc(item["title"])}" tabindex="-1">
    {"".join(figs)}
  </section>
  <nav class="controls" aria-label="{unit.title()} navigation" hidden>
    <button type="button" class="nav prev" aria-label="Previous {unit}">&larr;</button>
    <span class="counter" aria-live="polite"><span class="cur">1</span> / {len(pages)}</span>
    <button type="button" class="nav next" aria-label="Next {unit}">&rarr;</button>
  </nav>
  <section class="strip" aria-label="All {unit}s" hidden></section>
</main>
<footer class="foot"><a href="../">All materials</a></footer>
<script src="../assets/viewer.js" defer></script>
<script src="../assets/unlock.js" defer></script>
</body>
</html>
'''


def index_page(site, items, renders):
    sections = []
    nav = []
    for topic in site['topics']:
        group = [i for i in items if i['topic'] == topic]
        if not group:
            continue
        tid = re.sub(r'[^a-z0-9]+', '-', topic.lower()).strip('-')
        nav.append(f'<a href="#{tid}">{esc(topic)}</a>')
        cards = []
        for it in group:
            kind = it['kind']
            external = kind == 'link'
            href = it['url'] if external else f'{it["slug"]}/'
            thumb = f'assets/thumbs/{it["slug"]}.{"jpg" if kind == "html" else "webp"}'
            count = ''
            if it['slug'] in renders:
                n = len(renders[it['slug']]['pages'])
                count = f' &middot; {n} {"slides" if kind == "slides" else ("page" if n == 1 else "pages")}'
            links = []
            if it.get('pdf'):
                links.append(f'<a href="{esc(it["pdf"])}" download>PDF</a>')
            if kind in ('slides', 'document'):
                links.append(f'<a href="{esc(it["source"])}" download>{Path(it["source"]).suffix.lstrip(".").upper()}</a>')
            if kind == 'pdf':
                links.append(f'<a href="{esc(it["source"])}" download>PDF</a>')
            extras = ' '.join(f'<a class="ext" href="{esc(x["url"])}" rel="noopener">{esc(x["label"])}</a>'
                              for x in it.get('extra_links', []))
            parts = []
            if links:
                parts.append('<span class="gated" hidden>Download: ' + ' '.join(links) + '</span>')
            for g in it.get('gated_links', []):
                parts.append(f'<span class="gated" hidden><a href="{esc(g["url"])}">{esc(g["label"])}</a></span>')
            if extras:
                parts.append('<span>' + extras + '</span>')
            footer = ' '.join(parts)
            portrait = ' portrait' if (it['slug'] in renders and renders[it['slug']]['pages'][0]['h'] > renders[it['slug']]['pages'][0]['w']) else ''
            search = ' '.join([it['title'], it['description'], topic, label(it), ' '.join(it.get('tags', []))]).lower()
            rel = ' rel="noopener"' if external else ''
            arrow = ' <span class="arrow" aria-hidden="true">&#8599;</span><span class="sr-only">(external site)</span>' if external else ''
            locked = ' data-locked hidden' if it.get('gated') else ''
            cards.append(f'''<article class="card" data-search="{esc(search)}" data-type="{item_type(it)}"{locked}>
  <div class="thumb{portrait}"><img src="{esc(thumb)}" alt="" loading="lazy" decoding="async"></div>
  <div class="card-body">
    <p class="kind">{esc(label(it))}{count}</p>
    <h3><a class="stretch" href="{esc(href)}"{rel}>{esc(it["title"])}{arrow}</a></h3>
    <p class="desc">{esc(it["description"])}</p>
    {('<p class="dl">' + footer + '</p>') if footer else ''}
  </div>
</article>''')
        sections.append(f'<section class="topic" id="{tid}" aria-labelledby="{tid}-h">'
                        f'<h2 id="{tid}-h">{esc(topic)}</h2><div class="grid">{"".join(cards)}</div></section>')
    # Counts in the HTML describe the locked view (gated items hidden); index.js recounts after unlock.
    public = [i for i in items if not i.get('gated')]
    counts = {t: sum(1 for i in public if item_type(i) == t) for t, _ in TYPES}
    present = [t for t, _ in TYPES if any(item_type(i) == t for i in items)]
    noun = {'slides': 'slide decks', 'sheet': 'study sheets', 'game': 'games & quizzes', 'handout': 'handouts'}
    stats = ' &middot; '.join(f'{counts[t]} {esc(noun[t])}' for t in present if counts[t])
    filters = '<button type="button" data-filter="" aria-pressed="true">All <span>{}</span></button>'.format(len(public))
    filters += ''.join(f'<button type="button" data-filter="{t}" data-noun="{esc(noun[t])}" aria-pressed="false"'
                       f'{"" if counts[t] else " hidden"}>{esc(name)} <span>{counts[t]}</span></button>'
                       for t, name in TYPES if t in present)
    meta = GENERATED.format(file='index.html', version=site['version'], updated=site['updated'],
                            description='Landing page listing every presentation, study sheet, game, and handout.')
    return f'''{head(site["title"], site["description"], 0)}
{meta}
<body class="home">
<header class="hero">
  <h1>{esc(site["title"])}</h1>
  <p class="lede">{esc(site["description"])}</p>
  <p class="stats">{stats}</p>
  <div class="finder">
    <div class="search"><label for="q" class="sr-only">Search materials</label>
    <input id="q" type="search" placeholder="Search {len(public)} items  ( / )" autocomplete="off"></div>
    <div class="filters" role="group" aria-label="Filter by type">{filters}</div>
  </div>
  <nav class="chips" aria-label="Jump to topic">{"".join(nav)}</nav>
</header>
<main id="main">
{"".join(sections)}
<p class="empty" hidden>Nothing matches that search.</p>
</main>
<footer class="foot">{site["footer"]}</footer>
<script src="assets/index.js" defer></script>
<script src="assets/unlock.js" defer></script>
</body>
</html>
'''


def main():
    force = '--force' in sys.argv
    site = json.loads(MANIFEST.read_text())
    items = site['items']
    slugs = [i['slug'] for i in items]
    assert len(slugs) == len(set(slugs)), 'duplicate slugs in site.json'
    renders = {}
    for it in items:
        if it['kind'] == 'html':
            assert (ROOT / it['slug'] / 'index.html').exists(), it['slug']
            continue
        if it['kind'] == 'link':
            thumb = THUMBS / f"{it['slug']}.webp"
            if not thumb.exists():
                THUMBS.mkdir(parents=True, exist_ok=True)
                host = re.sub(r'^https?://(www\.)?', '', it['url']).split('/')[0]
                placeholder_thumb(thumb, it['title'], 'External link: ' + host)
            continue
        renders[it['slug']] = render_item(it, force)
        (ROOT / it['slug'] / 'index.html').write_text(viewer_page(it, site, renders[it['slug']]))
    screenshot_html_items(items, force)
    (ROOT / 'index.html').write_text(index_page(site, items, renders))
    (ROOT / '.nojekyll').touch()
    print(f'built {len(items)} items')


if __name__ == '__main__':
    main()

# CHANGELOG
# v1.0 (2026-10-14): Initial release.
# v1.1 (2026-10-14): Items with "gated": true are hidden on the landing page until the Konami unlock; their viewer pages get noindex.
# v1.2 (2026-10-14): Locked cards also carry a static hidden attribute so they stay hidden with neither JS nor CSS.
