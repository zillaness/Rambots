/**
 * @file images.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Images for the laser prep app: load a photo or logo as grayscale for raster engraving (optional in-app dithering), compress it for the PDF, and trace an offset cut outline around its shape.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  /** RGBA pixels to grayscale, with transparent areas treated as white paper. Also returns the alpha channel. */
  function grayFromRGBA(rgba, w, h) {
    const gray = new Uint8Array(w * h), alpha = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = rgba[4 * i], g = rgba[4 * i + 1], b = rgba[4 * i + 2], a = rgba[4 * i + 3];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i] = Math.round(255 - (a / 255) * (255 - lum));
      alpha[i] = a;
    }
    return { gray, alpha };
  }

  /** Floyd-Steinberg error diffusion to pure black and white. */
  function dither(gray, w, h) {
    const buf = Float32Array.from(gray), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, v = buf[i], q = v < 128 ? 0 : 255, e = v - q;
        out[i] = q;
        if (x + 1 < w) buf[i + 1] += (e * 7) / 16;
        if (y + 1 < h) {
          if (x > 0) buf[i + w - 1] += (e * 3) / 16;
          buf[i + w] += (e * 5) / 16;
          if (x + 1 < w) buf[i + w + 1] += e / 16;
        }
      }
    }
    return out;
  }

  /** zlib (FlateDecode) compression when the browser or Node offers it; otherwise null (stored raw). */
  async function deflate(bytes) {
    if (typeof CompressionStream === 'undefined') return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /** Pixels to send: grayscale, or dithered when the app is asked to dither. Inverted if requested. */
  function pixels(img) {
    let px = img.dither ? dither(img.gray, img.w, img.h) : img.gray;
    if (img.invert) px = px.map(v => 255 - v);
    return px;
  }

  /** Compress the pixels for the PDF writer; call again after changing dither or invert. */
  async function prepare(obj) {
    const img = obj.image, px = pixels(img), z = await deflate(px);
    img.pdf = z ? { data: z, filter: 'FlateDecode' } : { data: px, filter: null };
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = img.w; c.height = img.h;
      const ctx = c.getContext('2d'), id = ctx.createImageData(img.w, img.h);
      for (let i = 0; i < px.length; i++) { id.data[4 * i] = id.data[4 * i + 1] = id.data[4 * i + 2] = px[i]; id.data[4 * i + 3] = 255; }
      ctx.putImageData(id, 0, 0);
      img.png = c.toDataURL('image/png');
    }
    return obj;
  }

  function rectJob(w, h) {
    const segs = LP.joints.polySegs([[0, 0], [w, 0], [w, h], [0, h]], true);
    return LP.analyze({ kind: 'gen', units: 1, segs, counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1 });
  }

  /** An image object from decoded pixels. widthIn sets the engraved width; height keeps the aspect ratio. */
  function makeImage(pixelsIn, widthIn, opts) {
    const { w, h, gray, alpha } = pixelsIn, heightIn = (widthIn * h) / w;
    const job = rectJob(widthIn, heightIn), o = LP.doc.makeObject('image', job, Object.assign({ name: 'Image' }, opts || {}));
    for (const L of job.loops) o.assign[L.id] = { outline: null, inside: null };
    o.image = { w, h, gray, alpha, dither: false, invert: false, widthIn, heightIn, pdf: null, png: null };
    return o;
  }

  function resizeImage(obj, widthIn) {
    const img = obj.image;
    img.widthIn = widthIn;
    img.heightIn = (widthIn * img.h) / img.w;
    obj.job = rectJob(img.widthIn, img.heightIn);
    obj.assign = {};
    for (const L of obj.job.loops) obj.assign[L.id] = { outline: null, inside: null };
    obj._frame = null;
  }

  /** Browser: decode a File into pixels (large images are scaled down to 2000 px on the long side). */
  function decodeFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const k = Math.min(1, 2000 / Math.max(im.naturalWidth, im.naturalHeight));
        const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(Object.assign({ w, h }, grayFromRGBA(ctx.getImageData(0, 0, w, h).data, w, h)));
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image this browser can read (use PNG or JPG).')); };
      im.src = url;
    });
  }

  /**
   * Cut outline around the image's shape: ink is any pixel darker than `threshold` or, for images with
   * transparency, any opaque pixel. The traced shape grows by `offset` inches; only outer edges are kept.
   * Returns polygons in the image's local frame (inches, y up, lower-left corner at 0, 0).
   */
  function outlinePolys(img, offset, threshold) {
    const thr = threshold === undefined ? 200 : threshold;
    const hasAlpha = img.alpha && img.alpha.some(a => a < 250);
    const k = Math.max(1, Math.ceil(Math.max(img.w, img.h) / 400)), W = Math.ceil(img.w / k), H = Math.ceil(img.h / k);
    const mask = new Uint8Array(W * H);
    for (let y = 0; y < img.h; y++) {
      for (let x = 0; x < img.w; x++) {
        const i = y * img.w + x, ink = hasAlpha ? img.alpha[i] >= 128 : img.gray[i] < thr;
        if (ink) mask[Math.floor(y / k) * W + Math.floor(x / k)] = 1;
      }
    }
    const ipp = (img.widthIn / img.w) * k, rects = [];
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        if (!mask[y * W + x]) { x++; continue; }
        const x0 = x;
        while (x < W && mask[y * W + x]) x++;
        const Y0 = (H - y - 1) * ipp, Y1 = (H - y) * ipp;
        rects.push([[x0 * ipp, Y0], [x * ipp, Y0], [x * ipp, Y1], [x0 * ipp, Y1]]);
      }
    }
    if (!rects.length) return [];
    const merged = LP.clip.union(rects);
    const grown = LP.clip.offset(merged, Math.max(0, offset) + ipp * 0.5, { join: 'round', arcTol: 0.002 });
    const outers = LP.clip.rings(grown).map(r => r.outer);
    return LP.clip.clean(outers, ipp * 0.5);
  }

  /** A red cut outline object that sits exactly around an image object. */
  function makeOutline(imgObj, offset, threshold) {
    const polys = outlinePolys(imgObj.image, offset, threshold);
    if (!polys.length) throw new Error('No dark or opaque area found to outline. Try a higher threshold.');
    const segs = [];
    for (const p of polys) segs.push(...LP.joints.polySegs(p, true));
    const job = LP.analyze({ kind: 'gen', units: 1, segs, counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1 });
    const o = LP.doc.makeObject('outline', job, { name: 'Image outline', rot: imgObj.rot, scale: imgObj.scale, x: 0, y: 0 });
    for (const L of job.loops) o.assign[L.id] = { outline: L.depth === 0 ? 'red' : null, inside: null };
    const want = LP.doc.mapper(imgObj)([0, 0]), have = LP.doc.mapper(o)([0, 0]);
    o.x += want[0] - have[0];
    o.y += want[1] - have[1];
    // The outline belongs to its image: they move and arrange together.
    imgObj.bond = imgObj.bond || ('b' + LP.doc.newId());
    o.bond = imgObj.bond;
    return o;
  }

  LP.images = { grayFromRGBA, dither, deflate, pixels, prepare, makeImage, resizeImage, decodeFile, outlinePolys, makeOutline };
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release.
 */
