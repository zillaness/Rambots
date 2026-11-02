/**
 * @file clip.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-11-02
 * @lastUpdated 2026-11-02
 * @description Thin wrapper over the vendored Clipper library (Boost license): polygon offsets, booleans, areas, and outer/hole rings, in inches.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build and tests load it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  const C = globalThis.ClipperLib;
  const SCALE = 1e5;            // Clipper works in integers: 1 unit = 0.00001 in
  const JOIN = { miter: 'jtMiter', round: 'jtRound', square: 'jtSquare' };

  const toPath = pts => pts.map(p => ({ X: Math.round(p[0] * SCALE), Y: Math.round(p[1] * SCALE) }));
  const fromPath = path => path.map(p => [p.X / SCALE, p.Y / SCALE]);
  // Every input polygon is a solid region, so wind them all the same way before any boolean; otherwise
  // a clockwise tab overlapping a counterclockwise plate cancels out under the nonzero rule.
  const toPaths = polys => polys.filter(p => p.length >= 3).map(p => {
    const path = toPath(p);
    if (!C.Clipper.Orientation(path)) path.reverse();
    return path;
  });
  const fromPaths = paths => paths.map(fromPath).filter(p => p.length >= 3);

  /** Grow (delta > 0) or shrink closed polygons by delta inches. */
  function offset(polys, delta, opts) {
    const o = Object.assign({ join: 'miter', miter: 4, arcTol: 0.0005 }, opts || {});
    const co = new C.ClipperOffset(o.miter, o.arcTol * SCALE);
    co.AddPaths(toPaths(polys), C.JoinType[JOIN[o.join]], C.EndType.etClosedPolygon);
    const out = new C.Paths();
    co.Execute(out, delta * SCALE);
    return fromPaths(out);
  }

  function boolean(type, subj, clipPolys, fill) {
    const c = new C.Clipper();
    c.AddPaths(toPaths(subj), C.PolyType.ptSubject, true);
    if (clipPolys && clipPolys.length) c.AddPaths(toPaths(clipPolys), C.PolyType.ptClip, true);
    const out = new C.Paths();
    const ft = C.PolyFillType[fill === 'evenodd' ? 'pftEvenOdd' : 'pftNonZero'];
    c.Execute(C.ClipType[type], out, ft, ft);
    return fromPaths(out);
  }

  const union = (polys, fill) => boolean('ctUnion', polys, null, fill);
  const difference = (subj, cut) => boolean('ctDifference', subj, cut);
  const intersection = (a, b) => boolean('ctIntersection', a, b);

  /** Signed area in square inches (Clipper's sign convention: positive = outer ring). */
  const area = poly => C.Clipper.Area(toPath(poly)) / (SCALE * SCALE);
  const totalArea = polys => polys.reduce((s, p) => s + Math.abs(area(p)), 0);

  /** Union, then split into { outer, holes } groups. Keeps each input's winding, so holes stay holes. */
  function rings(polys, fill) {
    const c = new C.Clipper();
    c.AddPaths(polys.filter(p => p.length >= 3).map(toPath), C.PolyType.ptSubject, true);
    const tree = new C.PolyTree();
    const ft = C.PolyFillType[fill === 'evenodd' ? 'pftEvenOdd' : 'pftNonZero'];
    c.Execute(C.ClipType.ctUnion, tree, ft, ft);
    return C.JS.PolyTreeToExPolygons(tree).map(ex => ({ outer: fromPath(ex.outer), holes: ex.holes.map(fromPath) }));
  }

  /** Remove points closer than tol inches and near-collinear points. */
  function clean(polys, tol) {
    return fromPaths(C.Clipper.CleanPolygons(toPaths(polys), (tol || 0.0005) * SCALE));
  }

  function convexHull(points) {
    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return pts;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }

  LP.clip = { SCALE, toPath, fromPath, offset, union, difference, intersection, area, totalArea, rings, clean, convexHull };
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.3 (2026-11-02): Initial release. Inputs are wound the same way before booleans and offsets (fixes tab unions).
 */
