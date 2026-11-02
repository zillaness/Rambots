/**
 * @file ui.js
 * @version 0.3
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-11-02
 * @description Page controller for the laser prep app: add files, shapes, text, images, patterns, and boxes; select, drag, align, copy, repeat, and arrange; colors, tabs, and joints; units confirmation, checks, and output.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build loads it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  LP.VERSION = '0.3';
  const $ = id => document.getElementById(id);
  const fmt = (v, d) => Number(v).toFixed(d === undefined ? 2 : d);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const NAMES = { red: 'cut', blue: 'score', black: 'engrave', green: 'green', yellow: 'yellow', magenta: 'magenta', cyan: 'cyan', orange: 'orange' };
  const SHAPE_FIELDS = { rect: [['w', 'Width'], ['h', 'Height'], ['r', 'Corner radius']], circle: [['d', 'Diameter']], ellipse: [['w', 'Width'], ['h', 'Height']], slot: [['w', 'Width'], ['h', 'Height']], polygon: [['n', 'Sides'], ['d', 'Across corners']], star: [['n', 'Points'], ['d', 'Across points'], ['inner', 'Inner ratio']] };

  const state = { doc: LP.doc.newDoc({ w: 24, h: 18 }), sel: new Set(), edge: null, lastOutline: null, undo: [], redo: [], note: '', showRef: false, drag: null };
  const doc = () => state.doc;

  const store = {
    get(k) { try { return localStorage.getItem('laserprep.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('laserprep.' + k, v); } catch (e) { /* storage blocked: settings are not remembered */ } },
  };

  function setStatus(id, cls, html) { $(id).innerHTML = html ? `<div class="status ${cls}">${html}</div>` : ''; }

  // ---------- undo ----------

  function pushUndo() {
    state.undo.push(LP.doc.snapshot(doc()));
    if (state.undo.length > 80) state.undo.shift();
    state.redo = [];
  }
  function commit(fn) { pushUndo(); fn(); render(); }
  function undo(redo) {
    const from = redo ? state.redo : state.undo, to = redo ? state.undo : state.redo;
    if (!from.length) return;
    to.push(LP.doc.snapshot(doc()));
    LP.doc.restore(doc(), from.pop());
    pruneSelection();
    render();
  }

  // ---------- selection ----------

  const objById = id => doc().objects.find(o => o.id === id);
  const keyObj = k => objById(k.split('|')[0]);
  const selectedObjects = () => [...new Set([...state.sel].map(k => k.split('|')[0]))].map(objById).filter(Boolean);
  /** Selected objects plus the rest of their groups: what moves, copies, arranges, and deletes together. */
  const movingObjects = () => LP.doc.withBonds(doc(), selectedObjects());
  function pruneSelection() {
    for (const k of [...state.sel]) if (!keyObj(k)) state.sel.delete(k);
    if (state.edge && !objById(state.edge.objId)) state.edge = null;
  }
  function selectObjects(objs) {
    state.sel.clear();
    for (const o of objs) state.sel.add(o.id + '|' + (o.kind === 'image' ? 'img' : (o.job.loops[0] ? o.job.loops[0].id + ':o' : o.job.open[0] ? o.job.open[0].id + ':o' : 'img')));
    state.edge = null;
  }

  function bedPoint(evt) {
    const svg = $('preview'), pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [q.x, q.y];
  }

  /** Nearest segment of a loop to a bed point (for picking an edge). */
  function pickEdge(obj, loopId, bedPt) {
    const L = obj.job.loops.find(x => x.id === loopId);
    if (!L) return null;
    const local = LP.doc.inverse(obj)(bedPt);
    let best = null, bd = Infinity;
    L.segs.forEach((s, i) => {
      const pts = LP.flatten(s, 0.002);
      for (let j = 1; j < pts.length; j++) {
        const a = pts[j - 1], b = pts[j], dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy || 1e-12;
        const t = Math.max(0, Math.min(1, ((local[0] - a[0]) * dx + (local[1] - a[1]) * dy) / len2));
        const d = Math.hypot(local[0] - (a[0] + t * dx), local[1] - (a[1] + t * dy));
        if (d < bd) { bd = d; best = i; }
      }
    });
    return best === null ? null : { objId: obj.id, loopId, segIndex: best, straight: L.segs[best].k === 'L' };
  }

  // ---------- placing new objects ----------

  function freeSpot(w, h) {
    const d = doc(), m = d.margin, onBed = d.objects.filter(o => o.x < d.bed.w);
    if (!onBed.length) return [m, m];
    const last = LP.doc.bbox(onBed[onBed.length - 1]);
    if (last.x + last.w + 0.25 + w <= d.bed.w - m) return [last.x + last.w + 0.25, last.y];
    const g = LP.doc.groupBBox(onBed);
    return [m, g.y + g.h + 0.25];
  }
  function addObjects(objs, select) {
    commit(() => {
      const g = LP.doc.groupBBox(objs), [x, y] = freeSpot(g.w, g.h);
      for (const o of objs) { o.x += x - g.x; o.y += y - g.y; doc().objects.push(o); }
      if (select !== false) selectObjects(objs);
    });
  }

  // ---------- files ----------

  function unitOptions(parsed) {
    const opts = [];
    if (parsed.kind === 'dxf') {
      for (const code of [1, 4, 5, 6, 2]) opts.push({ label: { 1: 'inches', 4: 'millimeters', 5: 'centimeters', 6: 'meters', 2: 'feet' }[code], scale: LP.UNIT_FACTORS[code], header: code === parsed.units });
    } else if (parsed.units) {
      opts.push({ label: `as drawn (${parsed.unitsLabel})`, scale: 1, header: true }, { label: 'drawing units are mm', scale: (1 / 25.4) / parsed.perUnit, header: false }, { label: 'drawing units are inches', scale: 1 / parsed.perUnit, header: false });
    } else {
      opts.push({ label: '96 px per inch (web default)', scale: 1, header: true }, { label: '72 px per inch (some apps)', scale: 96 / 72, header: false }, { label: '1 unit = 1 mm', scale: (1 / 25.4) / parsed.perUnit, header: false }, { label: '1 unit = 1 inch', scale: 1 / parsed.perUnit, header: false });
    }
    return opts;
  }

  function analyzeFile(obj) {
    const o = obj.unitOpts[obj.unitIdx];
    obj.job = LP.analyze(obj.parsed, { scale: o.scale, tol: obj.tol || 0.001 });
    const fa = LP.doc.fileAssign(obj.job);
    obj.assign = fa ? fa.assign : LP.doc.defaultAssign(obj.job);
    obj.fileColors = fa ? { uncolored: fa.uncolored } : null;
    obj.tabs = {};
    obj._frame = null;
  }

  function loadText(name, text) {
    let parsed;
    try {
      const isSvg = /\.svg$/i.test(name) || /^\s*(<\?xml|<svg)/i.test(text);
      parsed = isSvg ? LP.parseSVG(text) : LP.parseDXF(text);
      if (!parsed.segs.length) throw new Error('No cuttable geometry was found in this file.');
    } catch (e) {
      setStatus('file-status', 'err', `${esc(name)}: ${esc(e.message)}`);
      return;
    }
    const unitOpts = unitOptions(parsed);
    let unitIdx = unitOpts.findIndex(o => o.header);
    if (unitIdx < 0) unitIdx = unitOpts.findIndex(o => o.label === 'millimeters');
    const obj = LP.doc.makeObject('file', LP.analyze({ kind: 'gen', units: 1, segs: [{ k: 'L', a: [0, 0], b: [1, 0] }], counts: { text: 0, ignored: {} } }, { scale: 1 }), { name: name.replace(/\.[^.]+$/, ''), confirmed: false });
    Object.assign(obj, { parsed, unitOpts, unitIdx, rawBox: LP.segsBBox(parsed.segs), fileName: name });
    analyzeFile(obj);
    const kind = parsed.kind === 'svg' ? 'SVG' : `DXF${parsed.version ? ' ' + parsed.version : ''}`;
    setStatus('file-status', 'ok', `<b>${esc(name)}</b> (${kind}): ${parsed.segs.length} pieces read.${obj.fileColors ? ' Colors taken from the file.' : ''} Confirm its units below.`);
    addObjects([obj]);
    $('step-obj').open = true;
  }

  function loadFile(file) {
    const r = new FileReader();
    r.onload = () => loadText(file.name, String(r.result));
    r.onerror = () => setStatus('file-status', 'err', 'Could not read that file.');
    r.readAsText(file);
  }

  // ---------- rendering ----------

  function render() {
    const d = doc(), b = d.bed, svg = $('preview');
    $('empty').hidden = d.objects.length > 0;
    svg.toggleAttribute('hidden', d.objects.length === 0);
    $('legend').hidden = d.objects.length === 0;
    let x1 = b.w, y1 = b.h;
    for (const o of d.objects) { const bb = LP.doc.bbox(o); x1 = Math.max(x1, bb.x + bb.w); y1 = Math.max(y1, bb.y + bb.h); }
    svg.setAttribute('viewBox', `-0.3 -0.3 ${x1 + 0.6} ${y1 + 0.6}`);
    const out = [`<rect x="0" y="0" width="${b.w}" height="${b.h}" fill="#fff" stroke="#b9bec6" stroke-width="1" vector-effect="non-scaling-stroke" data-bed="1"/>`];
    if ($('grid-on').checked) {
      const st = +$('grid-step').value, lines = [];
      for (let x = st; x < b.w - 1e-9; x += st) lines.push(`M${fmt(x, 4)} 0V${b.h}`);
      for (let y = st; y < b.h - 1e-9; y += st) lines.push(`M0 ${fmt(y, 4)}H${b.w}`);
      out.push(`<path d="${lines.join('')}" stroke="#e4e7eb" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
    }
    out.push(`<rect x="${d.margin}" y="${d.margin}" width="${b.w - 2 * d.margin}" height="${b.h - 2 * d.margin}" fill="none" stroke="#c7ccd3" stroke-dasharray="3 3" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`);

    const items = LP.renderDoc(d), byObj = new Map();
    for (const it of items) { if (!byObj.has(it.obj.id)) byObj.set(it.obj.id, []); byObj.get(it.obj.id).push(it); }
    const selObjs = new Set(movingObjects().map(o => o.id));
    const dPath = (segs, map, closed) => LP.svgD(LP.chainCmds(segs, map, closed));

    for (const obj of d.objects) {
      const map = LP.doc.mapper(obj), its = byObj.get(obj.id) || [];
      if (obj.kind === 'image' && obj.image && obj.image.png) {
        const img = obj.image, Q = (u, v) => map([u * img.widthIn, (1 - v) * img.heightIn]), q00 = Q(0, 0), q10 = Q(1, 0), q01 = Q(0, 1);
        out.push(`<image href="${img.png}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" transform="matrix(${[q10[0] - q00[0], q10[1] - q00[1], q01[0] - q00[0], q01[1] - q00[1], q00[0], q00[1]].join(' ')})" pointer-events="none"/>`);
      }
      for (const it of its) if (it.type === 'fill') out.push(`<path d="${it.rings.map(LP.svgD).join('')}" fill="${LP.hexOf(it.color)}" fill-opacity="0.85" fill-rule="evenodd" pointer-events="none"/>`);
      if (obj.kind === 'image') {
        const bb = LP.doc.bbox(obj), k = obj.id + '|img';
        out.push(`<rect class="hit" data-key="${k}" x="${bb.x}" y="${bb.y}" width="${bb.w}" height="${bb.h}" fill="#000" fill-opacity="0"/>`);
        if (state.sel.has(k)) out.push(`<rect x="${bb.x}" y="${bb.y}" width="${bb.w}" height="${bb.h}" fill="#F4A81C" fill-opacity="0.25" pointer-events="none"/>`);
      }
      for (const L of obj.job.loops.slice().sort((p, q) => p.depth - q.depth)) {
        if (obj.kind === 'image') break;
        const k = `${obj.id}|${L.id}:i`, path = [L, ...L.children].map(x => dPath(x.segs, map, true)).join('');
        out.push(`<path class="hit" data-key="${k}" d="${path}" fill="#000" fill-opacity="0" fill-rule="evenodd"/>`);
        if (state.sel.has(k)) out.push(`<path d="${path}" fill="#F4A81C" fill-opacity="0.45" fill-rule="evenodd" pointer-events="none"/>`);
      }
      const lines = [...obj.job.loops.map(L => ({ id: L.id, segs: L.segs, closed: true })), ...obj.job.open.map(c => ({ id: c.id, segs: c.segs, closed: false }))];
      for (const ln of lines) {
        if (obj.kind === 'image') break;
        const k = `${obj.id}|${ln.id}:o`, a = obj.assign[ln.id] || {}, path = dPath(ln.segs, map, ln.closed);
        if (state.sel.has(k)) out.push(`<path d="${path}" fill="none" stroke="#F4A81C" stroke-width="7" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
        if (!a.outline) out.push(`<path d="${path}" fill="none" stroke="#9aa0a6" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
      }
      for (const it of its) if (it.type === 'stroke') out.push(`<path d="${LP.svgD(it.cmds)}" fill="none" stroke="${LP.hexOf(it.color)}" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
      for (const ln of lines) {
        if (obj.kind === 'image') break;
        out.push(`<path class="hit" data-key="${obj.id}|${ln.id}:o" d="${dPath(ln.segs, map, ln.closed)}" fill="none" stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`);
      }
      if (state.showRef) for (const s of obj.job.ref) out.push(`<path d="${dPath([s], map, false)}" fill="none" stroke="#8a5cf6" stroke-width="1" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
      const marks = [...obj.job.branchPoints];
      for (const c of obj.job.open) if (c.almostClosed || (obj.assign[c.id] || {}).outline === 'red') marks.push(LP.start(c.segs[0]), LP.end(c.segs[c.segs.length - 1]));
      for (const p of marks) { const q = map(p); out.push(`<circle cx="${q[0]}" cy="${q[1]}" r="0.07" fill="#ff7a00" fill-opacity="0.85" pointer-events="none"/>`); }
      if (selObjs.has(obj.id)) {
        const bb = LP.doc.bbox(obj);
        out.push(`<rect x="${bb.x - 0.05}" y="${bb.y - 0.05}" width="${bb.w + 0.1}" height="${bb.h + 0.1}" fill="none" stroke="#2b6fd6" stroke-dasharray="5 3" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
      }
    }
    if (state.edge) {
      const o = objById(state.edge.objId), L = o && o.job.loops.find(x => x.id === state.edge.loopId);
      if (L && L.segs[state.edge.segIndex]) out.push(`<path d="${dPath([L.segs[state.edge.segIndex]], LP.doc.mapper(o), false)}" fill="none" stroke="#ff7a00" stroke-width="5" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
    }
    svg.innerHTML = out.join('');
    renderObjPanel();
    renderSelectionInfo();
    renderChecks(items);
  }

  function renderSelectionInfo() {
    let o = 0, i = 0;
    for (const k of state.sel) (k.endsWith(':o') ? o++ : k.endsWith(':i') ? i++ : 0);
    const n = selectedObjects().length;
    const edge = state.edge ? ` Edge picked${state.edge.straight ? '' : ' (curved: fingers and tabs need a straight edge)'}.` : '';
    $('sel-info').textContent = (n ? `${n} object${n === 1 ? '' : 's'}; ${o} outline${o === 1 ? '' : 's'} and ${i} inside${i === 1 ? '' : 's'} selected.${edge}` : 'Nothing selected.') + (state.note ? ' ' + state.note : '');
  }

  // ---------- object panel ----------

  function show(id, on) { $(id).classList.toggle('hidden', !on); }

  function renderObjPanel() {
    const objs = movingObjects();
    show('obj-none', !objs.length);
    show('obj-panel', objs.length > 0);
    if (!objs.length) return;
    const one = objs.length === 1 ? objs[0] : null, g = LP.doc.groupBBox(objs);
    $('obj-name').textContent = one ? one.name : `${objs.length} objects${objs.every(o => o.bond && o.bond === objs[0].bond) ? ' (grouped)' : ''}`;
    $('obj-ungroup').disabled = !objs.some(o => o.bond);
    $('obj-group').disabled = objs.length < 2;
    if (document.activeElement !== $('obj-x')) $('obj-x').value = fmt(g.x, 3);
    if (document.activeElement !== $('obj-y')) $('obj-y').value = fmt(g.y, 3);
    $('obj-size').textContent = `${fmt(g.w, 3)} x ${fmt(g.h, 3)} in${one && one.scale !== 1 ? ` (resized to ${Math.round(one.scale * 100)}%)` : ''}`;
    const rot = one ? one.rot : 0;
    $('obj-rot').value = [0, 90, 180, 270].includes(rot) ? String(rot) : 'custom';
    $('obj-rot').disabled = !one;
    show('units-box', one && one.kind === 'file');
    show('resize-box', one && one.kind === 'file' && one.confirmed);
    show('shape-box', one && one.kind === 'shape' && one.params.type);
    show('text-box', one && one.kind === 'text');
    show('image-box', one && one.kind === 'image');
    if (!one) return;
    if (one.kind === 'file') renderUnits(one);
    if (one.kind === 'shape' && one.params.type) {
      const f = SHAPE_FIELDS[one.params.type];
      if ($('shape-fields').dataset.for !== one.id + one.params.type) {
        $('shape-fields').innerHTML = f.map(([k, label]) => `<label class="field">${label}<input data-shape="${k}" type="number" step="${k === 'n' ? 1 : 0.01}" value="${one.params[k]}"></label>`).join('');
        $('shape-fields').dataset.for = one.id + one.params.type;
      }
    }
    if (one.kind === 'text') {
      const p = one.params;
      if (document.activeElement !== $('text-value')) $('text-value').value = p.text;
      fillFonts(p.fontId);
      if (document.activeElement !== $('text-cap')) $('text-cap').value = p.cap;
      if (document.activeElement !== $('text-spacing')) $('text-spacing').value = p.spacing;
      if (document.activeElement !== $('text-line')) $('text-line').value = p.line;
      $('text-align').value = p.align;
      $('text-mode').value = p.mode || (LP.fonts.get(p.fontId).kind === 'stroke' ? 'outline' : 'fill');
      $('text-path').value = p.pathMode || 'none';
      setStatus('text-status', one.missing && one.missing.length ? 'warn' : '', one.missing && one.missing.length ? `This font has no ${one.missing.map(esc).join(' ')}; those characters are left out.` : '');
    }
    if (one.kind === 'image') {
      if (document.activeElement !== $('img-w')) $('img-w').value = fmt(one.image.widthIn, 3);
      $('img-dither').checked = !!one.image.dither;
      $('img-invert').checked = !!one.image.invert;
    }
  }

  function fillFonts(current) {
    const sel = $('text-font'), reg = LP.fonts.init();
    const sig = reg.map(f => f.id).join('|');
    if (sel.dataset.sig !== sig) {
      sel.innerHTML = reg.map(f => `<option value="${esc(f.id)}">${esc(f.name)}${f.source === 'pc' ? ' (PC)' : ''}</option>`).join('');
      sel.dataset.sig = sig;
    }
    sel.value = current;
  }

  function renderUnits(obj) {
    const b = doc().bed, rw = obj.rawBox[2] - obj.rawBox[0], rh = obj.rawBox[3] - obj.rawBox[1], p = obj.parsed;
    const fits = (w, h) => (w + doc().margin <= b.w && h + doc().margin <= b.h) || (h + doc().margin <= b.w && w + doc().margin <= b.h);
    const header = obj.unitOpts.find(o => o.header);
    let note = p.kind === 'dxf'
      ? (p.units ? `The file says <b>${p.unitsLabel}</b>. CAD exports often get this wrong, so check the size against your part.` : 'The file does not say its units. Pick the one that gives your part its real size.')
      : (p.units ? `The SVG says it is drawn in <b>${p.unitsLabel}</b>.` : 'The SVG has no physical size. Most apps use 96 px per inch.');
    if (header && !fits(rw * header.scale, rh * header.scale)) note += ' <b>As read, it does not fit the bed.</b>';
    $('units-note').innerHTML = note;
    $('units').innerHTML = obj.unitOpts.map((o, i) => {
      const w = rw * o.scale, h = rh * o.scale, ok = fits(w, h);
      return `<label><span><input type="radio" name="u" value="${i}" ${i === obj.unitIdx ? 'checked' : ''}> ${o.label}${o.header ? ' <span class="small">(file)</span>' : ''}</span><span>${fmt(w)} x ${fmt(h)} in <span class="${ok ? 'fit' : 'nofit'}">${ok ? 'fits' : 'too big'}</span></span></label>`;
    }).join('');
    const o = obj.unitOpts[obj.unitIdx];
    if (obj.confirmed) setStatus('units-status', 'ok', `Confirmed: ${o.label}. Part is ${fmt(rw * o.scale)} x ${fmt(rh * o.scale)} in.`);
    else setStatus('units-status', 'warn', 'Output stays locked until you confirm the units.');
  }

  // ---------- checks ----------

  function renderChecks(items) {
    const d = doc(), list = [], m = d.margin;
    const counts = LP.docCounts(items), total = counts.cut + counts.score + counts.vectorEngrave + counts.otherVector + counts.rasterFills + counts.images;
    const unconfirmed = d.objects.filter(o => o.kind === 'file' && !o.confirmed);
    if (unconfirmed.length) list.push(['err', `Units not confirmed: ${unconfirmed.map(o => esc(o.name)).join(', ')}.`]);
    const off = d.objects.filter(o => { const b = LP.doc.bbox(o); return b.x < m - 1e-6 || b.y < m - 1e-6 || b.x + b.w > d.bed.w - m + 1e-6 || b.y + b.h > d.bed.h - m + 1e-6; });
    if (off.length) list.push(['err', `Off the bed or inside the ${m} in margin: ${off.map(o => esc(o.name)).join(', ')}. Move, arrange, or delete ${off.length === 1 ? 'it' : 'them'}.`]);
    if (d.objects.length && !total) list.push(['err', 'Nothing is set to cut, score, or engrave.']);
    const pendingImg = d.objects.filter(o => o.kind === 'image' && !o.image.pdf);
    if (pendingImg.length) list.push(['warn', 'An image is still being prepared.']);
    for (const o of d.objects) {
      const s = o.job.stats, n = esc(o.name);
      const redOpen = o.job.open.filter(c => (o.assign[c.id] || {}).outline === 'red').length;
      if (redOpen && o.kind !== 'pattern' && o.kind !== 'text') list.push(['warn', `${n}: ${redOpen} open line${redOpen === 1 ? ' is' : 's are'} set to cut; an open cut does not drop a part out.`]);
      if (s.almostClosed) {
        const gaps = o.job.open.filter(c => c.almostClosed).map(c => c.gap), g = Math.min(0.01, Math.ceil(Math.max(...gaps) * 10000 * 1.02) / 10000);
        list.push(['warn', `${n}: ${s.almostClosed} shape${s.almostClosed === 1 ? ' almost closes' : 's almost close'} (gap up to ${fmt(Math.max(...gaps), 4)} in). <button data-tol="${g}" data-obj="${o.id}">Join gaps up to ${g} in</button>`]);
      }
      if (s.branchPoints) list.push(['warn', `${n}: ${s.branchPoints} spot${s.branchPoints === 1 ? '' : 's'} where three or more lines meet.`]);
      if (s.overlapsReported) list.push(['warn', `${n}: ${s.overlapsReported} pair${s.overlapsReported === 1 ? '' : 's'} of lines partly overlap.`]);
      if (s.fitPointSplines) list.push(['warn', `${n}: ${s.fitPointSplines} spline${s.fitPointSplines === 1 ? '' : 's'} rebuilt from fit points.`]);
      if (o.kind === 'file' && o.scale !== 1) list.push(['warn', `${n} is resized to ${Math.round(o.scale * 100)}%: hole sizes, slots, and press fits changed too.`]);
      if (o.fileColors && o.fileColors.uncolored) list.push(['info', `${n}: colors taken from the file; ${o.fileColors.uncolored} item${o.fileColors.uncolored === 1 ? '' : 's'} with no laser color set to none.`]);
      if (s.duplicatesRemoved) list.push(['info', `${n}: ${s.duplicatesRemoved} duplicate line${s.duplicatesRemoved === 1 ? '' : 's'} removed.`]);
      if (s.referenceHidden) list.push(['info', `${n}: ${s.referenceHidden} item${s.referenceHidden === 1 ? '' : 's'} on bend or reference layers hidden and never output.`]);
      const skipped = Object.entries(s.ignored || {}).map(([k, v]) => `${v} ${k}`);
      if (s.textSkipped) skipped.push(`${s.textSkipped} text`);
      if (skipped.length) list.push(['info', `${n}: skipped ${skipped.join(', ')}.`]);
      if (o.missing && o.missing.length) list.push(['warn', `${n}: the font has no ${o.missing.map(esc).join(' ')}.`]);
    }
    const onBed = d.objects.filter(o => !off.includes(o)), boxes = onBed.map(o => ({ o, b: LP.doc.bbox(o) }));
    let overlaps = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const p = boxes[i].b, q = boxes[j].b;
      if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) overlaps++;
    }
    if (overlaps) list.push(['info', `${overlaps} pair${overlaps === 1 ? '' : 's'} of objects overlap. Fine when intended (text on a part, an image and its outline); otherwise use Arrange.`]);
    if (d.kerf.apply) list.push(['info', `Kerf compensation on: cut outlines move ${fmt(d.kerf.value / 2, 4)} in outward on parts and inward on holes.`]);
    $('warns').innerHTML = list.length ? list.map(([c, t]) => `<li class="${c}">${t}</li>`).join('') : '<li class="info">No problems found.</li>';
    $('c-cut').textContent = counts.cut;
    $('c-score').textContent = counts.score;
    $('c-vec').textContent = counts.vectorEngrave + counts.otherVector;
    $('c-fill').textContent = counts.rasterFills;
    $('c-img').textContent = counts.images;
    const ready = d.objects.length > 0 && !unconfirmed.length && !off.length && total > 0 && !pendingImg.length;
    ['save-pdf', 'print', 'save-dxf', 'save-svg'].forEach(id => { $(id).disabled = !ready; });
  }

  // ---------- colors ----------

  function applyColor(color) {
    if (!state.sel.size) { state.note = 'Select something first.'; renderSelectionInfo(); return; }
    let refused = 0;
    commit(() => {
      for (const key of state.sel) {
        const [id, part] = key.split('|'), obj = objById(id);
        if (!obj || part === 'img') continue;
        const lid = part.slice(0, -2), a = obj.assign[lid] || (obj.assign[lid] = {});
        if (part.endsWith(':o')) a.outline = color === 'none' ? null : color;
        else if (color === 'none' || !['red', 'blue'].includes(color)) a.inside = color === 'none' ? null : color;
        else refused++;
      }
    });
    state.note = refused ? `${refused} inside${refused === 1 ? '' : 's'} skipped: insides can be engraved (black or another ULS color) or none, not cut or scored.` : `Set to ${color === 'none' ? 'none' : NAMES[color]}.`;
    renderSelectionInfo();
  }

  function selectBy(fn) {
    state.sel.clear();
    for (const o of doc().objects) {
      for (const L of o.job.loops) fn(o, L, 'loop');
      for (const c of o.job.open) fn(o, c, 'open');
    }
    state.note = '';
    render();
  }

  // ---------- output ----------

  const outOpts = title => ({ lineWidth: parseFloat($('lw').value), title });
  const jobName = () => { const f = doc().objects.find(o => o.kind === 'file'); return (f ? f.name : 'laser_job').replace(/[^\w.-]+/g, '_'); };
  function download(data, type, filename) {
    const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function savePDF() {
    const name = jobName() + '_laser.pdf', r = LP.writeDocPDF(doc(), outOpts(name));
    download(r.bytes, 'application/pdf', name);
    setStatus('out-status', 'ok', `Saved ${esc(name)}. In Reader, print at <b>Actual size</b>; in UCP, import it.`);
  }
  function saveDXF() {
    const name = jobName() + '_laser.dxf', r = LP.writeDocDXF(doc());
    download(r.text, 'application/dxf', name);
    const lost = r.droppedFills + r.droppedImages;
    setStatus('out-status', lost ? 'warn' : 'ok', `Saved ${esc(name)} (R12, inches).${lost ? ` ${r.droppedFills} raster fill${r.droppedFills === 1 ? '' : 's'} and ${r.droppedImages} image${r.droppedImages === 1 ? '' : 's'} left out: DXF is vectors only. Use the PDF for engraving.` : ''}`);
  }
  function saveSVG() {
    const name = jobName() + '_laser.svg';
    download(LP.writeDocSVG(doc(), outOpts(name)), 'image/svg+xml', name);
    setStatus('out-status', 'ok', `Saved ${esc(name)}.`);
  }
  function printJob() {
    const d = doc();
    $('print-sheet').innerHTML = LP.writeDocSVG(d, outOpts('print'));
    const sheet = $('print-sheet').querySelector('svg');
    sheet.style.width = d.bed.w + 'in';
    sheet.style.height = d.bed.h + 'in';
    $('page-size').textContent = `@page { size: ${d.bed.w}in ${d.bed.h}in; margin: 0; }\n@media print { html, body { width: ${d.bed.w}in; height: ${d.bed.h}in; } }`;
    window.print();
  }

  // ---------- layout tools ----------

  function parseList(text) {
    const out = [];
    for (const raw of String(text).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^(-?\d+)\s*-\s*(-?\d+)$/);
      if (m) { const a = +m[1], b = +m[2], step = a <= b ? 1 : -1; for (let v = a; step > 0 ? v <= b : v >= b; v += step) out.push(String(v)); }
      else out.push(line);
    }
    return out;
  }

  function repeatWithList() {
    const objs = movingObjects(), lines = parseList($('repeat-list').value);
    if (!objs.some(o => o.kind === 'text')) { state.note = 'Select a group that includes a text to repeat.'; renderSelectionInfo(); return; }
    if (!lines.length) return;
    const cols = Math.max(1, parseInt($('copy-cols').value, 10) || 1), gap = +$('copy-gap').value || 0.25, g = LP.doc.groupBBox(objs);
    commit(() => {
      lines.forEach((line, i) => {
        const r = Math.floor(i / cols), c = i % cols, dx = c * (g.w + gap), dy = r * (g.h + gap);
        const version = [];
        for (const o of objs) {
          const k = i === 0 ? o : LP.doc.clone(o, { x: o.x + dx, y: o.y + dy });
          version.push(k);
          if (k.kind === 'text') {
            k.params.template = k.params.template || o.params.text;
            const t = k.params.template;
            LP.fonts.updateText(k, { text: t.includes('{}') ? t.split('{}').join(line) : line });
          }
          if (i > 0) doc().objects.push(k);
        }
        // Each version (for example a plate and its name) moves and arranges as one group.
        if (version.length > 1) LP.doc.bond(version);
      });
    });
    state.note = `${lines.length} versions made.`;
    renderSelectionInfo();
  }

  async function runArrange() {
    const ids = movingObjects().length ? movingObjects().map(o => o.id) : doc().objects.map(o => o.id);
    if (!ids.length) return;
    const rot = $('nest-rot').value, engine = $('nest-engine').value;
    pushUndo();
    $('nest-run').disabled = true;
    setStatus('nest-status', 'warn', engine === 'svgnest' ? 'Searching…' : 'Arranging…');
    try {
      const res = await LP.nest.arrange(doc(), ids, {
        engine, rotation: rot === 'free' ? 'free' : +rot, gap: +$('nest-gap').value || 0.1, timeMs: (+$('nest-time').value || 8) * 1000,
        onProgress: p => setStatus('nest-status', 'warn', `Searching: ${p.evaluated} layouts tried…`),
      });
      const msg = `${res.placed} placed with ${res.engine === 'rect' ? 'the rectangle packer' : res.engine === 'svgnest' ? `SVGnest (${res.evaluated} layouts tried)` : 'the true-outline nester'}.` +
        (res.unplaced.length ? ` ${res.unplaced.length} did not fit and sit to the right of the bed: ${res.unplaced.map(esc).join(', ')}.` : '') +
        (res.problems.length ? ` Check failed: ${res.problems.map(esc).join('; ')}.` : ' No overlaps.');
      setStatus('nest-status', res.unplaced.length || res.problems.length ? 'warn' : 'ok', msg);
    } catch (e) {
      setStatus('nest-status', 'err', 'Arrange failed: ' + esc(e.message));
    }
    $('nest-run').disabled = false;
    render();
  }

  // ---------- joints ----------

  function selectedLoops() {
    const out = [];
    for (const k of state.sel) {
      const [id, part] = k.split('|'), o = objById(id);
      if (!o || !part.endsWith(':o')) continue;
      const L = o.job.loops.find(x => x.id === part.slice(0, -2));
      if (L) out.push({ o, L });
    }
    return out;
  }

  function jointAction(kind) {
    const e = state.edge;
    if (!e) { setStatus('joint-status', 'warn', 'Click a straight edge of a part first.'); return; }
    const obj = objById(e.objId);
    try {
      pushUndo();
      if (kind === 'finger') {
        const r = LP.joints.fingerEdge(obj, e.loopId, e.segIndex, { thickness: +$('j-t').value, finger: +$('j-f').value, start: $('j-start').value });
        setStatus('joint-status', 'ok', `${r.fingers} fingers, ${fmt(r.width, 3)} in each. Use the opposite "start with" on the mating edge.`);
      } else {
        const r = LP.joints.tabAndSlot(obj, e.loopId, e.segIndex, { thickness: +$('j-t').value, width: +$('ts-w').value, count: +$('ts-n').value, clearance: +$('ts-c').value });
        const job = LP.analyze({ kind: 'gen', units: 1, segs: r.slots, counts: { text: 0, fitOnly: 0, tilted: 0, ignored: {} } }, { scale: 1 });
        const slots = LP.doc.makeObject('slots', job, { name: obj.name + ' slots' });
        const g = LP.doc.bbox(obj);
        slots.x = g.x; slots.y = g.y + g.h + 0.4;
        doc().objects.push(slots);
        setStatus('joint-status', 'ok', 'Tabs added. A matching strip of slots was placed below the part: move it onto the mating part.');
      }
      state.edge = null;
      state.sel.clear();
      render();
    } catch (err) {
      state.undo.pop();
      setStatus('joint-status', 'err', esc(err.message));
    }
  }

  // ---------- text helpers ----------

  function textPathFrom(obj) {
    const mode = $('text-path').value, r = +$('text-path-r').value || 2;
    if (mode === 'arc-top') return { type: 'arc', radius: r, side: 'top' };
    if (mode === 'arc-bottom') return { type: 'arc', radius: r, side: 'bottom' };
    if (mode === 'line') return { type: 'line', angle: r };
    if (mode === 'outline') {
      const k = state.lastOutline, src = k && keyObj(k);
      if (!src || src === obj) throw new Error('Click the outline the text should follow (on another part), then pick "Selected outline" again.');
      const part = k.split('|')[1].slice(0, -2), item = src.job.loops.find(L => L.id === part) || src.job.open.find(c => c.id === part);
      const map = LP.doc.mapper(src), pts = item.poly.map(map).map(q => [q[0], -q[1]]);
      return { type: 'polyline', pts, closed: !!src.job.loops.find(L => L.id === part), align: 'center' };
    }
    return { type: 'none' };
  }

  function updateTextFromPanel(obj) {
    let path;
    try { path = textPathFrom(obj); } catch (e) { setStatus('text-status', 'warn', esc(e.message)); $('text-path').value = obj.params.pathMode || 'none'; return; }
    commit(() => {
      const prevMode = obj.params.pathMode;
      LP.fonts.updateText(obj, {
        text: $('text-value').value, fontId: $('text-font').value, cap: +$('text-cap').value || 0.25, spacing: +$('text-spacing').value || 0,
        line: +$('text-line').value || 1.6, align: $('text-align').value, mode: $('text-mode').value, path, pathMode: $('text-path').value,
      });
      if (path.type === 'polyline') { obj.rot = 0; obj.scale = 1; obj._frame = null; obj.x = obj.job.box[0]; obj.y = -obj.job.box[3]; }
      else if (prevMode === 'outline') { const [x, y] = freeSpot(1, 1); obj.x = x; obj.y = y; }
    });
  }

  // ---------- wiring ----------

  function bedSize() {
    const v = $('bed').value;
    if (v === 'custom') return { w: parseFloat($('bw').value) || 24, h: parseFloat($('bh').value) || 18 };
    const [w, h] = v.split('x').map(Number);
    return { w, h };
  }

  function init() {
    $('ver').textContent = LP.VERSION;
    LP.fonts.init();
    for (const [id, key] of [['bed', 'bed3'], ['lw', 'lw'], ['grid-step', 'grid']]) {
      const v = store.get(key);
      if (v && [...$(id).options].some(o => o.value === v)) $(id).value = v;
    }
    $('custom-bed').hidden = $('bed').value !== 'custom';
    doc().bed = bedSize();

    const drop = $('drop');
    drop.addEventListener('click', () => $('file').click());
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = '#1d1d1f'; });
    drop.addEventListener('dragleave', () => { drop.style.borderColor = ''; });
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.style.borderColor = '';
      const f = e.dataTransfer.files[0];
      if (!f) return;
      if (/^image\//.test(f.type)) addImageFile(f); else loadFile(f);
    });
    $('file').addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; });

    $('add-shape').addEventListener('change', e => { const t = e.target.value; e.target.value = ''; if (t) addObjects([LP.shapes.makeShape(t)]); });
    $('add-text').addEventListener('click', () => { addObjects([LP.fonts.makeText({ pathMode: 'none' })]); $('text-value').focus(); $('text-value').select(); });
    $('add-image').addEventListener('click', () => $('image-file').click());
    $('image-file').addEventListener('change', e => { if (e.target.files[0]) addImageFile(e.target.files[0]); e.target.value = ''; });
    $('add-pattern').addEventListener('change', e => {
      const t = e.target.value; e.target.value = '';
      if (!t) return;
      const o = t === 'fit' ? LP.patterns.fitComb({ thickness: +$('fit-t').value || 0.125 }) : LP.patterns.PATTERNS[t].make();
      addObjects([o]);
      if (t === 'colors') state.note = 'Color grid: black, red, green, yellow, blue, magenta, cyan, orange from left to right. Orange (255,102,0) is unverified; compare it with your UCP color table.';
      renderSelectionInfo();
    });
    $('add-box').addEventListener('click', () => show('box-panel', $('box-panel').classList.contains('hidden')));
    $('box-make').addEventListener('click', () => {
      const panels = LP.joints.makeBox({ w: +$('box-w').value, d: +$('box-d').value, h: +$('box-h').value, thickness: +$('box-t').value, finger: +$('box-f').value, inside: $('box-inside').checked, openTop: $('box-open').checked }, 0, 0);
      addObjects(panels);
    });

    // Selected object fields
    const moveGroupTo = (axis, v) => {
      const objs = movingObjects(); if (!objs.length || !isFinite(v)) return;
      const g = LP.doc.groupBBox(objs), dv = v - g[axis];
      commit(() => objs.forEach(o => { o[axis] += dv; }));
    };
    $('obj-x').addEventListener('change', e => moveGroupTo('x', parseFloat(e.target.value)));
    $('obj-y').addEventListener('change', e => moveGroupTo('y', parseFloat(e.target.value)));
    $('obj-rot').addEventListener('change', e => {
      const o = selectedObjects()[0]; if (!o) return;
      let v = e.target.value;
      if (v === 'custom') { const a = parseFloat(window.prompt('Rotation in degrees (clockwise):', String(o.rot)) || ''); if (!isFinite(a)) { render(); return; } v = a; }
      const b0 = LP.doc.bbox(o);
      commit(() => { o.rot = ((+v % 360) + 360) % 360; o._frame = null; const b1 = LP.doc.bbox(o); o.x += (b0.w - b1.w) / 2; o.y += (b0.h - b1.h) / 2; });
    });
    $('units').addEventListener('change', e => {
      if (e.target.name !== 'u') return;
      const o = selectedObjects()[0]; if (!o || o.kind !== 'file') return;
      commit(() => { o.unitIdx = parseInt(e.target.value, 10); o.confirmed = false; analyzeFile(o); selectObjects([o]); });
    });
    $('confirm-units').addEventListener('click', () => { const o = selectedObjects()[0]; if (o && o.kind === 'file') commit(() => { o.confirmed = true; }); });
    $('resize-apply').addEventListener('click', () => {
      const o = selectedObjects()[0]; if (!o || o.kind !== 'file') return;
      if (!$('resize-ok').checked) { state.note = 'Tick the box to confirm that holes and fits change too.'; renderSelectionInfo(); return; }
      const pct = Math.max(1, Math.min(1000, +$('resize-pct').value || 100));
      commit(() => { o.scale = pct / 100; o._frame = null; });
      $('resize-ok').checked = false;
    });
    $('shape-fields').addEventListener('change', e => {
      const o = selectedObjects()[0], k = e.target.dataset.shape; if (!o || !k) return;
      const v = parseFloat(e.target.value); if (!(v > 0)) return;
      commit(() => LP.shapes.updateShape(o, { [k]: v }));
    });
    for (const id of ['text-value', 'text-font', 'text-cap', 'text-spacing', 'text-line', 'text-align', 'text-mode', 'text-path', 'text-path-r']) {
      $(id).addEventListener('change', () => { const o = selectedObjects()[0]; if (o && o.kind === 'text') updateTextFromPanel(o); });
    }
    $('pc-fonts').addEventListener('click', async () => {
      try {
        const list = await LP.fonts.listLocal();
        state.pcFonts = list;
        $('pc-font-list').innerHTML = '<option value="">Pick a font on this PC…</option>' + list.map((f, i) => `<option value="${i}">${esc(f.fullName)}</option>`).join('');
        show('pc-font-list', true);
        setStatus('text-status', 'ok', `${list.length} fonts found on this PC.`);
      } catch (e) { setStatus('text-status', 'warn', esc(e.message)); }
    });
    $('pc-font-list').addEventListener('change', async e => {
      const entry = state.pcFonts && state.pcFonts[+e.target.value]; if (!entry) return;
      try {
        const id = await LP.fonts.addLocal(entry);
        fillFonts(id); $('text-font').value = id;
        const o = selectedObjects()[0]; if (o && o.kind === 'text') updateTextFromPanel(o);
      } catch (err) { setStatus('text-status', 'warn', esc(err.message)); }
    });
    $('img-w').addEventListener('change', e => { const o = selectedObjects()[0], v = +e.target.value; if (o && o.kind === 'image' && v > 0) commit(() => LP.images.resizeImage(o, v)); });
    for (const id of ['img-dither', 'img-invert']) {
      $(id).addEventListener('change', async e => {
        const o = selectedObjects()[0]; if (!o || o.kind !== 'image') return;
        pushUndo();
        o.image[id === 'img-dither' ? 'dither' : 'invert'] = e.target.checked;
        o.image.pdf = null; render();
        await LP.images.prepare(o); render();
      });
    }
    $('img-outline').addEventListener('click', () => {
      const o = selectedObjects()[0]; if (!o || o.kind !== 'image') return;
      try {
        const out = LP.images.makeOutline(o, +$('img-offset').value || 0, +$('img-thr').value || 200);
        commit(() => { doc().objects.push(out); selectObjects([out]); });
      } catch (e) { state.note = e.message; renderSelectionInfo(); }
    });
    $('obj-dup').addEventListener('click', () => {
      const objs = movingObjects(); if (!objs.length) return;
      commit(() => { const k = objs.map(o => LP.doc.clone(o, { x: o.x + 0.25, y: o.y + 0.25, bond: undefined })); if (k.length > 1 && objs.every(o => o.bond && o.bond === objs[0].bond)) LP.doc.bond(k); doc().objects.push(...k); selectObjects(k); });
    });
    $('obj-group').addEventListener('click', () => { const objs = movingObjects(); if (objs.length > 1) commit(() => LP.doc.bond(objs)); });
    $('obj-ungroup').addEventListener('click', () => { const objs = movingObjects(); commit(() => LP.doc.unbond(objs)); });
    $('obj-del').addEventListener('click', deleteSelected);

    // Colors
    document.querySelectorAll('.palette button').forEach(btn => btn.addEventListener('click', () => applyColor(btn.dataset.color)));
    $('more-color').addEventListener('change', e => { const c = e.target.value; e.target.value = ''; if (c) applyColor(c); });
    $('sel-outlines').addEventListener('click', () => selectBy((o, it) => { if (o.kind !== 'image') state.sel.add(`${o.id}|${it.id}:o`); }));
    $('sel-parts').addEventListener('click', () => selectBy((o, it, t) => { if (t === 'loop' && it.depth % 2 === 0 && o.kind !== 'image') state.sel.add(`${o.id}|${it.id}:i`); }));
    $('sel-color').addEventListener('change', e => {
      const c = e.target.value; e.target.value = '';
      if (!c) return;
      selectBy((o, it) => {
        const a = o.assign[it.id] || {};
        if ((c === 'none' && !a.outline) || a.outline === c) state.sel.add(`${o.id}|${it.id}:o`);
        if (c === 'black' && a.inside) state.sel.add(`${o.id}|${it.id}:i`);
      });
    });
    $('sel-clear').addEventListener('click', () => { state.sel.clear(); state.edge = null; render(); });

    // Layout
    $('copy-make').addEventListener('click', () => {
      const ids = movingObjects().map(o => o.id); if (!ids.length) return;
      let res;
      commit(() => { res = LP.doc.copyGrid(doc(), ids, Math.max(1, +$('copy-rows').value | 0), Math.max(1, +$('copy-cols').value | 0), +$('copy-gap').value || 0); });
      state.note = `${res.added.length} copies made${res.offBed ? `, ${res.offBed} off the bed` : ''}.`;
      renderSelectionInfo();
    });
    $('repeat-make').addEventListener('click', repeatWithList);
    $('nest-run').addEventListener('click', runArrange);
    document.querySelectorAll('[data-align]').forEach(b => b.addEventListener('click', () => {
      const ids = movingObjects().map(o => o.id); if (!ids.length) return;
      commit(() => LP.doc.align(doc(), ids, b.dataset.align, $('align-ref').value));
    }));
    document.querySelectorAll('[data-dist]').forEach(b => b.addEventListener('click', () => {
      const ids = movingObjects().map(o => o.id); if (LP.doc.units(doc(), movingObjects()).length < 3) { state.note = 'Pick three or more objects to space evenly.'; renderSelectionInfo(); return; }
      commit(() => LP.doc.distribute(doc(), ids, b.dataset.dist));
    }));

    // Joints
    $('tab-apply').addEventListener('click', () => {
      const loops = selectedLoops(); if (!loops.length) { setStatus('joint-status', 'warn', 'Select one or more outlines first.'); return; }
      commit(() => loops.forEach(({ o, L }) => { o.tabs[L.id] = { count: Math.max(0, +$('tab-count').value | 0), width: +$('tab-width').value || 0.08 }; }));
      setStatus('joint-status', 'ok', `Holding tabs on ${loops.length} outline${loops.length === 1 ? '' : 's'} (cut outlines only).`);
    });
    $('tab-clear').addEventListener('click', () => { const loops = selectedLoops(); commit(() => loops.forEach(({ o, L }) => { delete o.tabs[L.id]; })); });
    $('finger-apply').addEventListener('click', () => jointAction('finger'));
    $('tabslot-apply').addEventListener('click', () => jointAction('tabslot'));

    // Output and view
    $('kerf-on').addEventListener('change', e => commit(() => { doc().kerf.apply = e.target.checked; }));
    $('kerf').addEventListener('change', e => commit(() => { doc().kerf.value = Math.max(0, +e.target.value || 0); }));
    $('lw').addEventListener('change', () => store.set('lw', $('lw').value));
    $('bed').addEventListener('change', () => { $('custom-bed').hidden = $('bed').value !== 'custom'; store.set('bed3', $('bed').value); commit(() => { doc().bed = bedSize(); }); });
    ['bw', 'bh'].forEach(id => $(id).addEventListener('change', () => commit(() => { doc().bed = bedSize(); })));
    $('grid-on').addEventListener('change', render);
    $('grid-step').addEventListener('change', () => { store.set('grid', $('grid-step').value); render(); });
    $('show-ref').addEventListener('change', e => { state.showRef = e.target.checked; render(); });
    $('warns').addEventListener('click', e => {
      const t = e.target.closest('[data-tol]'); if (!t) return;
      const o = objById(t.dataset.obj); if (!o) return;
      commit(() => {
        o.tol = parseFloat(t.dataset.tol);
        if (o.kind === 'file') analyzeFile(o); else LP.doc.rebuild(o, LP.doc.segmentsOf(o));
      });
    });
    $('undo').addEventListener('click', () => undo(false));
    $('redo').addEventListener('click', () => undo(true));
    $('save-pdf').addEventListener('click', savePDF);
    $('save-dxf').addEventListener('click', saveDXF);
    $('save-svg').addEventListener('click', saveSVG);
    $('print').addEventListener('click', printJob);

    // Pointer: select, pick edges, drag
    const svg = $('preview');
    svg.addEventListener('pointerdown', e => {
      const t = e.target.closest('[data-key]'), add = e.shiftKey || e.ctrlKey || e.metaKey, p = bedPoint(e);
      if (!t) { if (!add) { state.sel.clear(); state.edge = null; render(); } return; }
      const k = t.dataset.key, obj = keyObj(k);
      if (add) { if (state.sel.has(k)) state.sel.delete(k); else state.sel.add(k); }
      else if (!state.sel.has(k)) { state.sel.clear(); state.sel.add(k); }
      const part = k.split('|')[1];
      if (part.endsWith(':o')) {
        state.lastOutline = k;
        const isLoop = obj.job.loops.some(L => L.id === part.slice(0, -2));
        state.edge = isLoop ? pickEdge(obj, part.slice(0, -2), p) : null;
      } else state.edge = null;
      state.note = '';
      const objs = movingObjects();
      state.drag = { start: p, client: [e.clientX, e.clientY], moved: false, pos: objs.map(o => ({ o, x: o.x, y: o.y })) };
      svg.setPointerCapture(e.pointerId);
      render();
    });
    let raf = 0;
    svg.addEventListener('pointermove', e => {
      const dr = state.drag; if (!dr) return;
      if (!dr.moved && Math.hypot(e.clientX - dr.client[0], e.clientY - dr.client[1]) < 4) return;
      if (!dr.moved) { pushUndo(); dr.moved = true; svg.classList.add('dragging'); }
      const p = bedPoint(e);
      let dx = p[0] - dr.start[0], dy = p[1] - dr.start[1];
      if ($('snap-on').checked && dr.pos.length) {
        // Snap the group's top-left corner to the grid and move every object by the same amount.
        const st = +$('grid-step').value;
        const gx = dr.pos.reduce((m, q) => Math.min(m, q.x), Infinity), gy = dr.pos.reduce((m, q) => Math.min(m, q.y), Infinity);
        dx = LP.doc.snap(gx + dx, st) - gx; dy = LP.doc.snap(gy + dy, st) - gy;
      }
      for (const q of dr.pos) { q.o.x = q.x + dx; q.o.y = q.y + dy; }
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
    });
    const endDrag = () => { if (state.drag) { state.drag = null; svg.classList.remove('dragging'); render(); } };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);

    document.addEventListener('keydown', e => {
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (mod && k === 'z') { e.preventDefault(); undo(e.shiftKey); return; }
      if (mod && k === 'y') { e.preventDefault(); undo(true); return; }
      if (mod && k === 'd') { e.preventDefault(); $('obj-dup').click(); return; }
      if (!doc().objects.length) return;
      if (k === 'r') applyColor('red');
      else if (k === 'b') applyColor('blue');
      else if (k === 'k') applyColor('black');
      else if (k === 'n') applyColor('none');
      else if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSelected(); }
      else if (k === 'a') { e.preventDefault(); $('sel-outlines').click(); }
      else if (k === 'escape') { state.sel.clear(); state.edge = null; render(); }
      else if (k.startsWith('arrow')) {
        const objs = movingObjects(); if (!objs.length) return;
        e.preventDefault();
        const st = $('snap-on').checked ? +$('grid-step').value : 0.01, s = e.shiftKey ? st * 4 : st;
        const dx = k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0, dy = k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0;
        commit(() => objs.forEach(o => { o.x += dx; o.y += dy; }));
      }
    });
    render();
  }

  function deleteSelected() {
    const ids = movingObjects().map(o => o.id); if (!ids.length) return;
    commit(() => { doc().objects = doc().objects.filter(o => !ids.includes(o.id)); state.sel.clear(); state.edge = null; });
  }

  async function addImageFile(file) {
    try {
      const px = await LP.images.decodeFile(file);
      const o = LP.images.makeImage(px, Math.min(4, doc().bed.w / 3), { name: file.name.replace(/\.[^.]+$/, '') });
      addObjects([o]);
      await LP.images.prepare(o);
      render();
    } catch (e) { setStatus('file-status', 'err', esc(e.message)); }
  }

  LP.ui = { loadText, state, render, doc };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.1 (2026-10-30): Initial prototype. Load DXF or SVG, confirm units, bed and tolerance settings, click-to-color preview with selection tools and shortcuts, checks list, PDF/DXF/SVG save and true-size print.
 * v0.2 (2026-10-30): Version bump with the writer changes.
 * v0.3 (2026-11-02): Groups (image outlines, repeat versions, multi-object copies, Group button) move, copy, arrange, align, and delete as one. Rewritten for Phase 2: many objects (files, shapes, text, images, patterns, box panels) with drag, nudge, snap, undo and redo; copies, repeat with a list, arrange (rectangles, true outlines, SVGnest), align and distribute; colors including the other ULS pens; holding tabs, fingers and tab-and-slot on a picked edge; per-file units and resize with a warning; checks for off-bed and overlapping objects; multi-object output. Delete now removes objects (N sets none).
 */
