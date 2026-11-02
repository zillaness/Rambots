/**
 * @file shapes.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Basic shapes for the laser prep app (rectangle with rounded corners, circle, ellipse or oval, slot, regular polygon, star) as segments in inches, sized by typed numbers.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const TAU = Math.PI * 2, KAPPA = 0.5522847498;
  const L = (a, b) => ({ k: 'L', a, b, layer: 'shape', eid: 0 });
  const A = (c, r, a0, a1) => ({ k: 'A', c, r, a0, a1, ccw: true, layer: 'shape', eid: 0 });
  const C = p => ({ k: 'C', p, layer: 'shape', eid: 0 });

  const SHAPES = {
    rect: { label: 'Rectangle', params: { w: 2, h: 1, r: 0 } },
    circle: { label: 'Circle', params: { d: 1 } },
    ellipse: { label: 'Ellipse or oval', params: { w: 2, h: 1 } },
    slot: { label: 'Slot (rounded ends)', params: { w: 2, h: 0.5 } },
    polygon: { label: 'Regular polygon', params: { n: 6, d: 1.5 } },
    star: { label: 'Star', params: { n: 5, d: 2, inner: 0.45 } },
  };

  function closedPoly(pts) {
    return pts.map((p, i) => L(p, pts[(i + 1) % pts.length]));
  }

  /** Segments for a shape, lower-left corner of its box at (0, 0). */
  function shapeSegs(type, p) {
    switch (type) {
      case 'rect': {
        const w = +p.w, h = +p.h, r = Math.max(0, Math.min(+p.r || 0, w / 2, h / 2));
        if (r < 1e-9) return closedPoly([[0, 0], [w, 0], [w, h], [0, h]]);
        const q = Math.PI / 2, segs = [];
        if (w - 2 * r > 1e-9) segs.push(L([r, 0], [w - r, 0]));
        segs.push(A([w - r, r], r, -q, 0));
        if (h - 2 * r > 1e-9) segs.push(L([w, r], [w, h - r]));
        segs.push(A([w - r, h - r], r, 0, q));
        if (w - 2 * r > 1e-9) segs.push(L([w - r, h], [r, h]));
        segs.push(A([r, h - r], r, q, 2 * q));
        if (h - 2 * r > 1e-9) segs.push(L([0, h - r], [0, r]));
        segs.push(A([r, r], r, 2 * q, 3 * q));
        return segs;
      }
      case 'circle': {
        const r = +p.d / 2;
        return [A([r, r], r, 0, 0)];
      }
      case 'ellipse': {
        const a = +p.w / 2, b = +p.h / 2, cx = a, cy = b;
        if (Math.abs(a - b) < 1e-9) return [A([cx, cy], a, 0, 0)];
        const ka = KAPPA * a, kb = KAPPA * b;
        return [
          C([[cx + a, cy], [cx + a, cy + kb], [cx + ka, cy + b], [cx, cy + b]]),
          C([[cx, cy + b], [cx - ka, cy + b], [cx - a, cy + kb], [cx - a, cy]]),
          C([[cx - a, cy], [cx - a, cy - kb], [cx - ka, cy - b], [cx, cy - b]]),
          C([[cx, cy - b], [cx + ka, cy - b], [cx + a, cy - kb], [cx + a, cy]]),
        ];
      }
      case 'slot': {
        const w = +p.w, h = +p.h, r = Math.min(w, h) / 2;
        if (w >= h) {
          return [L([r, 0], [w - r, 0]), A([w - r, r], r, -Math.PI / 2, Math.PI / 2), L([w - r, h], [r, h]), A([r, r], r, Math.PI / 2, 1.5 * Math.PI)];
        }
        return [L([w, r], [w, h - r]), A([r, h - r], r, 0, Math.PI), L([0, h - r], [0, r]), A([r, r], r, Math.PI, TAU)];
      }
      case 'polygon': {
        const n = Math.max(3, Math.round(+p.n)), R = +p.d / 2, off = -Math.PI / 2 - Math.PI / n;
        return closedPoly(Array.from({ length: n }, (_, i) => [R + R * Math.cos(off + (i * TAU) / n), R + R * Math.sin(off + (i * TAU) / n)]));
      }
      case 'star': {
        const n = Math.max(3, Math.round(+p.n)), R = +p.d / 2, r = R * Math.max(0.05, Math.min(0.95, +p.inner)), pts = [];
        for (let i = 0; i < 2 * n; i++) {
          const ang = Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R;
          pts.push([R + rr * Math.cos(ang), R + rr * Math.sin(ang)]);
        }
        return closedPoly(pts);
      }
    }
    throw new Error('Unknown shape: ' + type);
  }

  function shapeJob(type, params) {
    const p = Object.assign({}, SHAPES[type].params, params || {});
    return LP.analyze({ kind: 'gen', units: 1, segs: shapeSegs(type, p), counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1 });
  }

  /** A new shape object, or rebuild an existing one with new parameters (keeps its colors and position). */
  function makeShape(type, params, opts) {
    const p = Object.assign({}, SHAPES[type].params, params || {});
    return LP.doc.makeObject('shape', shapeJob(type, p), Object.assign({ name: SHAPES[type].label, params: { type, ...p } }, opts || {}));
  }

  function updateShape(obj, params) {
    Object.assign(obj.params, params);
    const job = shapeJob(obj.params.type, obj.params);
    obj.assign = LP.doc.reassign(obj.job, obj.assign, job);
    obj.job = job;
    obj._frame = null;
    return obj;
  }

  LP.shapes = { SHAPES, shapeSegs, shapeJob, makeShape, updateShape };
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release.
 */
