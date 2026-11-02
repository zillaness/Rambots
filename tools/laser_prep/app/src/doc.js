/**
 * @file doc.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Document model for the laser prep app: objects (files, shapes, text, images, patterns, panels) with position, rotation, and scale; copies, align, distribute, color-preserving rebuilds, and undo snapshots.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  // An object holds geometry in its own local frame (inches, y up, from LP.analyze) and is placed on the
  // bed (inches, y down from the top-left) by scale, then rotation (degrees, clockwise on screen), then a
  // translation chosen so the rotated outline's top-left corner sits at (x, y).

  let nextId = 1;
  const newId = () => 'o' + nextId++;
  const rad = d => (d * Math.PI) / 180;

  function newDoc(bed) {
    return { objects: [], bed: bed || { w: 24, h: 18 }, margin: 0.25, kerf: { value: 0.006, apply: false } };
  }

  function defaultAssign(job) {
    const a = {};
    for (const L of job.loops) a[L.id] = { outline: 'red', inside: null };
    for (const c of job.open) a[c.id] = { outline: null };
    return a;
  }

  function makeObject(kind, job, opts) {
    const o = Object.assign({ name: kind, x: 0.25, y: 0.25, rot: 0, scale: 1, params: {}, tabs: {}, confirmed: true }, opts || {});
    return Object.assign(o, { id: o.id || newId(), kind, job, assign: o.assign || defaultAssign(job) });
  }

  /** Points on an arc at 0, 90, 180, 270 degrees that fall inside its sweep (exact bounds for circles). */
  function arcExtremes(s, out) {
    const sw = LP.arcSweep(s);
    for (let k = 0; k < 4; k++) {
      const ang = (k * Math.PI) / 2;
      let d = s.ccw ? ang - s.a0 : s.a0 - ang;
      d = ((d % LP.TAU) + LP.TAU) % LP.TAU;
      if (d <= sw + 1e-12) out.push([s.c[0] + s.r * Math.cos(ang), s.c[1] + s.r * Math.sin(ang)]);
    }
  }

  /** All flattened points of the object's geometry in its local frame (cached per job). */
  function localPoints(obj) {
    if (obj.job._pts) return obj.job._pts;
    const pts = [];
    for (const L of obj.job.loops) { for (const p of L.poly) pts.push(p); for (const s of L.segs) if (s.k === 'A') arcExtremes(s, pts); }
    for (const c of obj.job.open) { for (const p of c.poly) pts.push(p); for (const s of c.segs) if (s.k === 'A') arcExtremes(s, pts); }
    if (!pts.length) { const b = obj.job.box; pts.push([b[0], b[1]], [b[2], b[3]]); }
    obj.job._pts = pts;
    return pts;
  }

  /** Rotation and scale frame; cached per (job, rot, scale). */
  function frame(obj) {
    const s = obj.scale || 1, rot = obj.rot || 0, key = rot + '|' + s;
    if (obj._frame && obj._frame.key === key && obj._frame.job === obj.job) return obj._frame;
    const b = obj.job.box, c = Math.cos(rad(rot)), sn = Math.sin(rad(rot));
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const p of localPoints(obj)) {
      const d0 = (p[0] - b[0]) * s, d1 = (b[3] - p[1]) * s;
      const x = d0 * c - d1 * sn, y = d0 * sn + d1 * c;
      if (x < minx) minx = x; if (y < miny) miny = y; if (x > maxx) maxx = x; if (y > maxy) maxy = y;
    }
    obj._frame = { key, job: obj.job, s, c, sn, b, minx, miny, maxx, maxy };
    return obj._frame;
  }

  /** Local point (y up) to bed point (inches, y down). */
  function mapper(obj) {
    const f = frame(obj);
    return p => {
      const d0 = (p[0] - f.b[0]) * f.s, d1 = (f.b[3] - p[1]) * f.s;
      return [obj.x + d0 * f.c - d1 * f.sn - f.minx, obj.y + d0 * f.sn + d1 * f.c - f.miny];
    };
  }

  /** Bed point back to the object's local frame (for hit tests and edge picking). */
  function inverse(obj) {
    const f = frame(obj);
    return q => {
      const x = q[0] - obj.x + f.minx, y = q[1] - obj.y + f.miny;
      const d0 = x * f.c + y * f.sn, d1 = -x * f.sn + y * f.c;
      return [d0 / f.s + f.b[0], f.b[3] - d1 / f.s];
    };
  }

  /** The object's outline points on the bed (flattened geometry plus exact arc extremes). */
  function pagePoints(obj) {
    const m = mapper(obj);
    return localPoints(obj).map(m);
  }

  /** Objects that move together: everything sharing a bond id with any of the given objects. */
  function withBonds(doc, objs) {
    const bonds = new Set(objs.map(o => o.bond).filter(Boolean));
    const out = new Set(objs);
    if (bonds.size) for (const o of doc.objects) if (o.bond && bonds.has(o.bond)) out.add(o);
    return [...out];
  }

  function bond(objs) { const id = 'b' + nextId++; objs.forEach(o => { o.bond = id; }); return id; }
  function unbond(objs) { objs.forEach(o => { delete o.bond; }); }

  /** Rotate an object about a bed point by deg degrees (clockwise on screen), keeping its material in place. */
  function rotateAbout(obj, pivot, deg, shift) {
    const ref = [obj.job.box[0], obj.job.box[1]], q = mapper(obj)(ref), th = rad(deg), c = Math.cos(th), sn = Math.sin(th);
    const d = [q[0] - pivot[0], q[1] - pivot[1]];
    const target = [pivot[0] + d[0] * c - d[1] * sn + (shift ? shift[0] : 0), pivot[1] + d[0] * sn + d[1] * c + (shift ? shift[1] : 0)];
    obj.rot = (((obj.rot || 0) + deg) % 360 + 360) % 360;
    obj._frame = null;
    obj.x = 0; obj.y = 0;
    const m0 = mapper(obj)(ref);
    obj.x = target[0] - m0[0];
    obj.y = target[1] - m0[1];
  }

  function bbox(obj) {
    const f = frame(obj);
    return { x: obj.x, y: obj.y, w: f.maxx - f.minx, h: f.maxy - f.miny };
  }

  function groupBBox(objs) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const o of objs) {
      const b = bbox(o);
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /** Outline used for nesting, in the object's rotated frame with its bbox corner at (0, 0). */
  function footprint(obj, rot) {
    const save = obj.rot;
    obj.rot = rot === undefined ? obj.rot : rot;
    const f = frame(obj), xf = p => {
      const d0 = (p[0] - f.b[0]) * f.s, d1 = (f.b[3] - p[1]) * f.s;
      return [d0 * f.c - d1 * f.sn - f.minx, d0 * f.sn + d1 * f.c - f.miny];
    };
    const outers = obj.job.loops.filter(L => L.depth === 0).map(L => L.poly.map(xf));
    let poly;
    if (outers.length === 1 && !obj.job.open.length) poly = outers[0];
    else if (outers.length && LP.clip) {
      const u = LP.clip.union(outers);
      poly = u.length === 1 && !obj.job.open.length ? u[0] : LP.clip.convexHull([].concat(...outers, ...obj.job.open.map(c => c.poly.map(xf))));
    } else poly = [[0, 0], [f.maxx - f.minx, 0], [f.maxx - f.minx, f.maxy - f.miny], [0, f.maxy - f.miny]];
    const out = { poly, w: f.maxx - f.minx, h: f.maxy - f.miny };
    obj.rot = save;
    return out;
  }

  function clone(obj, over) {
    const c = Object.assign({}, obj, {
      id: newId(),
      assign: JSON.parse(JSON.stringify(obj.assign)),
      tabs: JSON.parse(JSON.stringify(obj.tabs || {})),
      params: JSON.parse(JSON.stringify(obj.params || {})),
      _frame: null,
    }, over || {});
    return c;
  }

  /** Copies of a group in a grid. Returns { added, offBed }. The originals stay where they are. */
  function copyGrid(doc, ids, rows, cols, gap) {
    const objs = doc.objects.filter(o => ids.includes(o.id));
    if (!objs.length) return { added: [], offBed: 0 };
    const g = groupBBox(objs), added = [];
    let offBed = 0;
    const group = 'g' + nextId++;
    objs.forEach(o => { o.group = o.group || group; });
    if (objs.length > 1 && !objs.every(o => o.bond && o.bond === objs[0].bond)) bond(objs);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!r && !c) continue;
        const dx = c * (g.w + gap), dy = r * (g.h + gap), copyBond = objs.length > 1 ? 'b' + nextId++ : undefined;
        for (const o of objs) {
          const k = clone(o, { x: o.x + dx, y: o.y + dy, group: o.group, bond: copyBond });
          doc.objects.push(k);
          added.push(k.id);
          const b = bbox(k);
          if (b.x + b.w > doc.bed.w - doc.margin + 1e-9 || b.y + b.h > doc.bed.h - doc.margin + 1e-9) offBed++;
        }
      }
    }
    return { added, offBed };
  }

  /** mode: left | hcenter | right | top | vcenter | bottom; ref: 'selection' or 'bed'. */
  /** Bonded groups count as one unit for align and distribute. */
  function units(doc, objs) {
    const seen = new Set(), out = [];
    for (const o of objs) {
      if (seen.has(o)) continue;
      const members = o.bond ? doc.objects.filter(x => x.bond === o.bond) : [o];
      members.forEach(x => seen.add(x));
      out.push(members);
    }
    return out;
  }
  const moveUnit = (u, dx, dy) => u.forEach(o => { o.x += dx; o.y += dy; });

  function align(doc, ids, mode, ref) {
    const objs = doc.objects.filter(o => ids.includes(o.id));
    if (!objs.length) return;
    const m = doc.margin, us = units(doc, objs);
    const R = ref === 'bed' ? { x: m, y: m, w: doc.bed.w - 2 * m, h: doc.bed.h - 2 * m } : groupBBox([].concat(...us));
    for (const u of us) {
      const b = groupBBox(u);
      if (mode === 'left') moveUnit(u, R.x - b.x, 0);
      else if (mode === 'right') moveUnit(u, R.x + R.w - b.w - b.x, 0);
      else if (mode === 'hcenter') moveUnit(u, R.x + (R.w - b.w) / 2 - b.x, 0);
      else if (mode === 'top') moveUnit(u, 0, R.y - b.y);
      else if (mode === 'bottom') moveUnit(u, 0, R.y + R.h - b.h - b.y);
      else if (mode === 'vcenter') moveUnit(u, 0, R.y + (R.h - b.h) / 2 - b.y);
    }
  }

  /** Equal gaps between objects along an axis ('x' or 'y'); the two ends stay put. */
  function distribute(doc, ids, axis) {
    const us = units(doc, doc.objects.filter(o => ids.includes(o.id)));
    if (us.length < 3) return;
    const key = axis === 'y' ? 'y' : 'x', size = axis === 'y' ? 'h' : 'w';
    const items = us.map(u => ({ u, b: groupBBox(u) })).sort((p, q) => p.b[key] - q.b[key]);
    const first = items[0].b, last = items[items.length - 1].b;
    const span = last[key] + last[size] - first[key], used = items.reduce((s, it) => s + it.b[size], 0);
    const gap = (span - used) / (items.length - 1);
    let pos = first[key];
    for (const it of items) { const d = pos - it.b[key]; moveUnit(it.u, key === 'x' ? d : 0, key === 'y' ? d : 0); pos += it.b[size] + gap; }
  }

  const snap = (v, step) => (step > 0 ? Math.round(v / step) * step : v);

  /** After geometry changes, carry colors over to the loops and lines that match the old ones. */
  function reassign(oldJob, oldAssign, newJob) {
    const out = defaultAssign(newJob);
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const center = box => [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    for (const L of newJob.loops) {
      let best = null, bd = Infinity;
      for (const K of oldJob.loops) {
        if (K.depth !== L.depth) continue;
        const d = near(center(K.box), center(L.box)) + Math.abs(K.area - L.area) / Math.max(K.area, 1e-9);
        if (d < bd) { bd = d; best = K; }
      }
      if (best && oldAssign[best.id]) out[L.id] = Object.assign({}, oldAssign[best.id]);
    }
    for (const c of newJob.open) {
      let best = null, bd = Infinity;
      const cb = LP.bboxOf(c.poly);
      for (const k of oldJob.open) {
        const d = near(center(LP.bboxOf(k.poly)), center(cb));
        if (d < bd) { bd = d; best = k; }
      }
      if (best && bd < 0.05 && oldAssign[best.id]) out[c.id] = Object.assign({}, oldAssign[best.id]);
    }
    return out;
  }

  /** Replace an object's geometry from new local segments, keeping its colors and its top-left corner. */
  function rebuild(obj, segs, counts) {
    const parsed = { kind: 'gen', units: 1, segs, counts: counts || { text: 0, fitOnly: 0, tilted: 0, ignored: {} } };
    const job = LP.analyze(parsed, { scale: 1, tol: obj.tol || 0.001 });
    const assign = reassign(obj.job, obj.assign, job);
    obj.job = job;
    obj.assign = assign;
    obj.tabs = {};
    obj._frame = null;
    return obj;
  }

  /** Segments of an object's current loops and open lines, in its local frame. */
  function segmentsOf(obj) {
    const segs = [];
    for (const L of obj.job.loops) segs.push(...L.segs);
    for (const c of obj.job.open) segs.push(...c.segs);
    return segs;
  }

  /**
   * Colors read from the file (DXF colors or layer names, SVG stroke and fill). Returns null when the file
   * carries no laser colors, so the caller keeps the usual default (every closed outline cut).
   * Geometry without a color is set to none when the rest of the file is colored, and counted.
   */
  function fileAssign(job) {
    const segsOf = item => item.segs;
    const any = [...job.loops, ...job.open].some(it => segsOf(it).some(s => s.color || s.fill));
    if (!any) return null;
    const vote = segs => {
      const n = {};
      for (const s of segs) if (s.color) n[s.color] = (n[s.color] || 0) + 1;
      const best = Object.entries(n).sort((p, q) => q[1] - p[1])[0];
      return best ? best[0] : null;
    };
    const out = {};
    let uncolored = 0;
    for (const L of job.loops) {
      const outline = vote(L.segs), fill = L.segs.every(s => s.fill === 'black') && L.depth % 2 === 0 ? 'black' : null;
      if (!outline && !fill) uncolored++;
      out[L.id] = { outline, inside: fill };
    }
    for (const c of job.open) { const outline = vote(c.segs); if (!outline) uncolored++; out[c.id] = { outline }; }
    return { assign: out, uncolored };
  }

  // Undo: objects are shallow-copied; jobs and image data are shared because edits replace them.
  function snapshot(doc) {
    return {
      objects: doc.objects.map(o => Object.assign({}, o, {
        assign: JSON.parse(JSON.stringify(o.assign)), tabs: JSON.parse(JSON.stringify(o.tabs || {})), params: JSON.parse(JSON.stringify(o.params || {})), _frame: null,
      })),
      bed: Object.assign({}, doc.bed), kerf: Object.assign({}, doc.kerf),
    };
  }
  function restore(doc, snap) {
    doc.objects = snap.objects.map(o => Object.assign({}, o));
    doc.bed = Object.assign({}, snap.bed);
    doc.kerf = Object.assign({}, snap.kerf);
  }

  LP.doc = {
    newDoc, newId, makeObject, defaultAssign, frame, mapper, inverse, bbox, groupBBox, footprint, clone, pagePoints, withBonds, bond, unbond, rotateAbout, units,
    copyGrid, align, distribute, snap, reassign, rebuild, segmentsOf, snapshot, restore, fileAssign,
  };
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release. Bonded groups (move and arrange as one), rotate about a point, bed points.
 */
