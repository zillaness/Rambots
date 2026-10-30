/**
 * @file ui.js
 * @version 0.2
 * @author Samuel Cao
 * @created 2026-10-30
 * @lastUpdated 2026-10-30
 * @description Page controller for the laser prep app: file loading, units confirmation, bed and tolerance settings, click-to-color preview, checks, and output buttons.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename (the build loads it by name). Append changelog at bottom.
 */
(function (LP) {
  'use strict';

  LP.VERSION = '0.2';
  const $ = id => document.getElementById(id);
  const fmt = (v, d) => Number(v).toFixed(d === undefined ? 2 : d);
  const HEX = { red: '#FF0000', blue: '#0000FF', black: '#000000' };
  const NAMES = { red: 'cut', blue: 'score', black: 'engrave' };
  const MARGIN = 0.25;

  const state = { name: null, parsed: null, rawBox: null, unitOpts: [], unitIdx: 0, confirmed: false, tol: 0.001, job: null, assign: {}, sel: new Set(), showRef: false, note: '' };

  const store = {
    get(k) { try { return localStorage.getItem('laserprep.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('laserprep.' + k, v); } catch (e) { /* storage blocked: settings just are not remembered */ } },
  };

  function bed() {
    const v = $('bed').value;
    if (v === 'custom') return { w: parseFloat($('bw').value) || 24, h: parseFloat($('bh').value) || 12 };
    const [w, h] = v.split('x').map(Number);
    return { w, h };
  }
  const fitsBed = (w, h, b) => w + MARGIN <= b.w + 1e-9 && h + MARGIN <= b.h + 1e-9;

  function setStatus(id, cls, html) { $(id).innerHTML = html ? `<div class="status ${cls}">${html}</div>` : ''; }
  function lock(id, locked) { $(id).classList.toggle('locked', locked); }

  // ---------- loading ----------

  function loadFile(file) {
    const r = new FileReader();
    r.onload = () => loadText(file.name, String(r.result));
    r.onerror = () => setStatus('file-status', 'err', 'Could not read that file.');
    r.readAsText(file);
  }

  function loadText(name, text) {
    let parsed;
    try {
      const isSvg = /\.svg$/i.test(name) || /^\s*(<\?xml|<svg)/i.test(text);
      parsed = isSvg ? LP.parseSVG(text) : LP.parseDXF(text);
      if (!parsed.segs.length) throw new Error('No cuttable geometry was found in this file.');
    } catch (e) {
      setStatus('file-status', 'err', `${escapeHtml(name)}: ${escapeHtml(e.message)}`);
      return;
    }
    state.name = name.replace(/\.[^.]+$/, '');
    state.parsed = parsed;
    state.rawBox = LP.segsBBox(parsed.segs);
    state.confirmed = false;
    state.sel.clear();
    buildUnitOptions();
    const kind = parsed.kind === 'svg' ? 'SVG' : `DXF${parsed.version ? ' ' + parsed.version : ''}`;
    setStatus('file-status', 'ok', `<b>${escapeHtml(name)}</b> (${kind}): ${parsed.segs.length} pieces read.`);
    lock('step-units', false);
    lock('step-setup', false);
    lock('step-colors', false);
    analyze(true);
  }

  function buildUnitOptions() {
    const p = state.parsed, opts = [];
    if (p.kind === 'dxf') {
      for (const code of [1, 4, 5, 6, 2]) opts.push({ label: { 1: 'inches', 4: 'millimeters', 5: 'centimeters', 6: 'meters', 2: 'feet' }[code], scale: LP.UNIT_FACTORS[code], header: code === p.units });
    } else if (p.units) {
      opts.push({ label: `as drawn (${p.unitsLabel})`, scale: 1, header: true });
      opts.push({ label: 'drawing units are mm', scale: (1 / 25.4) / p.perUnit, header: false });
      opts.push({ label: 'drawing units are inches', scale: 1 / p.perUnit, header: false });
    } else {
      opts.push({ label: '96 px per inch (web default)', scale: 1, header: true });
      opts.push({ label: '72 px per inch (some apps)', scale: 96 / 72, header: false });
      opts.push({ label: '1 unit = 1 mm', scale: (1 / 25.4) / p.perUnit, header: false });
      opts.push({ label: '1 unit = 1 inch', scale: 1 / p.perUnit, header: false });
    }
    state.unitOpts = opts;
    const h = opts.findIndex(o => o.header);
    state.unitIdx = h >= 0 ? h : opts.findIndex(o => o.label === 'millimeters');
  }

  function renderUnits() {
    const p = state.parsed, b = bed(), box = state.rawBox;
    const rw = box[2] - box[0], rh = box[3] - box[1];
    const header = state.unitOpts.find(o => o.header);
    let note = p.kind === 'dxf'
      ? (p.units ? `The file says <b>${p.unitsLabel}</b>. CAD exports often get this wrong, so check the size against your part.` : 'The file does not say its units. Pick the one that gives your part its real size.')
      : (p.units ? `The SVG says it is drawn in <b>${p.unitsLabel}</b>.` : 'The SVG has no physical size. Most apps use 96 px per inch.');
    if (header && !fitsBed(rw * header.scale, rh * header.scale, b)) note += ' <b>As read, it does not fit the bed.</b>';
    $('units-note').innerHTML = note;
    $('units').innerHTML = state.unitOpts.map((o, i) => {
      const w = rw * o.scale, h = rh * o.scale, ok = fitsBed(w, h, b);
      return `<label><span><input type="radio" name="u" value="${i}" ${i === state.unitIdx ? 'checked' : ''}> ${o.label}${o.header ? ' <span class="small">(file)</span>' : ''}</span>` +
        `<span>${fmt(w)} x ${fmt(h)} in <span class="${ok ? 'fit' : 'nofit'}">${ok ? 'fits' : 'too big'}</span></span></label>`;
    }).join('');
    const o = state.unitOpts[state.unitIdx];
    if (state.confirmed) setStatus('units-status', 'ok', `Confirmed: ${o.label}. Part is ${fmt(rw * o.scale)} x ${fmt(rh * o.scale)} in.`);
    else setStatus('units-status', 'warn', 'Output stays locked until you confirm the units.');
  }

  // ---------- analysis ----------

  function analyze(resetColors) {
    const o = state.unitOpts[state.unitIdx];
    state.job = LP.analyze(state.parsed, { scale: o.scale, tol: state.tol });
    if (resetColors) {
      state.assign = {};
      for (const L of state.job.loops) state.assign[L.id] = { outline: 'red', inside: null };
      for (const c of state.job.open) state.assign[c.id] = { outline: null };
      state.sel.clear();
    }
    render();
  }

  // ---------- preview ----------

  function render() {
    if (!state.job) return;
    renderUnits();
    const job = state.job, b = bed(), lay = LP.layout(job, b, MARGIN);
    const svg = $('preview');
    $('empty').hidden = true;
    svg.removeAttribute('hidden');   // SVG elements have no .hidden property
    $('legend').hidden = false;
    svg.setAttribute('viewBox', `${-0.15} ${-0.15} ${b.w + 0.3} ${b.h + 0.3}`);
    const out = [`<rect x="0" y="0" width="${b.w}" height="${b.h}" fill="#fff" stroke="#b9bec6" stroke-width="1" vector-effect="non-scaling-stroke"/>`];
    const d = (segs, closed) => LP.svgD(LP.chainCmds(segs, lay.map, closed));

    for (const L of job.loops.slice().sort((x, y) => x.depth - y.depth)) {
      const a = state.assign[L.id] || {}, key = L.id + ':i';
      const path = [L, ...L.children].map(x => d(x.segs, true)).join('');
      out.push(`<path class="hit" data-key="${key}" d="${path}" fill="#000" fill-opacity="${a.inside === 'black' ? 0.82 : 0}" fill-rule="evenodd"/>`);
      if (state.sel.has(key)) out.push(`<path d="${path}" fill="#F4A81C" fill-opacity="0.45" fill-rule="evenodd" pointer-events="none"/>`);
    }
    const items = [...job.loops.map(L => ({ id: L.id, segs: L.segs, closed: true })), ...job.open.map(c => ({ id: c.id, segs: c.segs, closed: false }))];
    for (const it of items) {
      const a = state.assign[it.id] || {}, key = it.id + ':o', path = d(it.segs, it.closed);
      if (state.sel.has(key)) out.push(`<path d="${path}" fill="none" stroke="#F4A81C" stroke-width="7" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
      out.push(`<path d="${path}" fill="none" stroke="${a.outline ? HEX[a.outline] : '#9aa0a6'}" stroke-width="${a.outline ? 1.6 : 1.1}"${a.outline ? '' : ' stroke-dasharray="4 3"'} vector-effect="non-scaling-stroke" pointer-events="none"/>`);
      out.push(`<path class="hit" data-key="${key}" d="${path}" fill="none" stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`);
    }
    if (state.showRef) {
      for (const s of job.ref) out.push(`<path d="${d([s], false)}" fill="none" stroke="#8a5cf6" stroke-width="1" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`);
    }
    const marks = [...job.branchPoints];
    for (const c of job.open) {
      if (c.almostClosed || (state.assign[c.id] || {}).outline === 'red') marks.push(LP.start(c.segs[0]), LP.end(c.segs[c.segs.length - 1]));
    }
    for (const p of marks) { const q = lay.map(p); out.push(`<circle cx="${q[0]}" cy="${q[1]}" r="0.07" fill="#ff7a00" fill-opacity="0.85" pointer-events="none"/>`); }
    svg.innerHTML = out.join('');

    renderSelectionInfo();
    renderChecks(lay);
  }

  function renderSelectionInfo() {
    let o = 0, i = 0;
    for (const k of state.sel) (k.endsWith(':o') ? o++ : i++);
    $('sel-info').textContent = o || i ? `${o} outline${o === 1 ? '' : 's'} and ${i} inside${i === 1 ? '' : 's'} selected.${state.note ? ' ' + state.note : ''}` : (state.note || 'Nothing selected.');
  }

  // ---------- checks and output state ----------

  function renderChecks(lay) {
    const job = state.job, s = job.stats, b = bed(), list = [];
    const pl = LP.plan(job, state.assign);
    const total = pl.counts.cut + pl.counts.score + pl.counts.vectorEngrave + pl.counts.rasterFills;
    if (!state.confirmed) list.push(['err', 'Units not confirmed.']);
    if (!lay.fits) list.push(['err', `Part is ${fmt(lay.w)} x ${fmt(lay.h)} in, which does not fit a ${b.w} x ${b.h} in bed with a ${MARGIN} in margin.`]);
    if (!total) list.push(['err', 'Nothing is set to cut, score, or engrave.']);
    const redOpen = job.open.filter(c => (state.assign[c.id] || {}).outline === 'red').length;
    if (redOpen) list.push(['warn', `${redOpen} open line${redOpen === 1 ? ' is' : 's are'} set to cut. An open cut does not drop a part out (orange dots mark the ends).`]);
    if (s.almostClosed) {
      const gaps = job.open.filter(c => c.almostClosed).map(c => c.gap), g = Math.min(0.01, Math.ceil(Math.max(...gaps) * 10000 * 1.02) / 10000);
      list.push(['warn', `${s.almostClosed} shape${s.almostClosed === 1 ? ' almost closes' : 's almost close'} (gap up to ${fmt(Math.max(...gaps), 4)} in). <button data-tol="${g}">Join gaps up to ${g} in</button>`]);
    }
    if (s.branchPoints) list.push(['warn', `${s.branchPoints} spot${s.branchPoints === 1 ? '' : 's'} where three or more lines meet. Those lines stay open; check the CAD sketch.`]);
    if (s.overlapsReported) list.push(['warn', `${s.overlapsReported} pair${s.overlapsReported === 1 ? '' : 's'} of lines partly overlap. The laser would cut that stretch twice.`]);
    if (s.fitPointSplines) list.push(['warn', `${s.fitPointSplines} spline${s.fitPointSplines === 1 ? '' : 's'} had only fit points; the curve was rebuilt and may differ slightly from CAD.`]);
    if (state.parsed.counts.tilted) list.push(['warn', `${state.parsed.counts.tilted} item${state.parsed.counts.tilted === 1 ? ' was' : 's were'} not flat in the drawing plane and were projected flat.`]);
    if (job.open.length && !redOpen) list.push(['info', `${job.open.length} open line${job.open.length === 1 ? '' : 's'} (not closed shapes), set to none by default.`]);
    if (s.duplicatesRemoved) list.push(['info', `${s.duplicatesRemoved} duplicate line${s.duplicatesRemoved === 1 ? '' : 's'} removed so nothing is cut twice.`]);
    if (s.referenceHidden) list.push(['info', `${s.referenceHidden} item${s.referenceHidden === 1 ? '' : 's'} on bend or reference layers hidden and never output.`]);
    const skipped = Object.entries(s.ignored).map(([k, v]) => `${v} ${k}`);
    if (s.textSkipped) skipped.push(`${s.textSkipped} text`);
    if (skipped.length) list.push(['info', `Skipped: ${skipped.join(', ')}. Text must be exported from CAD as outlines to engrave.`]);
    if (s.overlapCheckSkipped) list.push(['info', 'Overlap check skipped (very many lines).']);
    list.push(['info', `${job.loops.length} closed shape${job.loops.length === 1 ? '' : 's'}, ${job.open.length} open. Joined ${s.joinedPairs} line ends; largest gap closed ${fmt(s.largestGap, 5)} in.`]);
    $('warns').innerHTML = list.map(([c, t]) => `<li class="${c}">${t}</li>`).join('');

    $('c-cut').textContent = pl.counts.cut;
    $('c-score').textContent = pl.counts.score;
    $('c-vec').textContent = pl.counts.vectorEngrave;
    $('c-fill').textContent = pl.counts.rasterFills;
    const ready = state.confirmed && lay.fits && total > 0;
    lock('step-output', !ready);
    ['save-pdf', 'print', 'save-dxf', 'save-svg'].forEach(id => { $(id).disabled = !ready; });
    $('join-note').textContent = `Joined ${s.joinedPairs} line ends; largest gap ${fmt(s.largestGap, 5)} in. Changing this resets colors.`;
  }

  // ---------- selection and colors ----------

  function allOutlineKeys() { return [...state.job.loops.map(L => L.id + ':o'), ...state.job.open.map(c => c.id + ':o')]; }

  function select(keys, add) {
    if (!add) state.sel.clear();
    keys.forEach(k => state.sel.add(k));
    state.note = '';
    render();
  }

  function applyColor(color) {
    if (!state.sel.size) { state.note = 'Select something first.'; renderSelectionInfo(); return; }
    let refused = 0;
    for (const key of state.sel) {
      const [id, part] = key.split(':');
      const a = state.assign[id] || (state.assign[id] = {});
      if (part === 'o') a.outline = color === 'none' ? null : color;
      else if (color === 'black' || color === 'none') a.inside = color === 'none' ? null : 'black';
      else refused++;
    }
    state.note = refused ? `${refused} inside${refused === 1 ? '' : 's'} skipped: insides can only be Engrave or None.` : `Set to ${color === 'none' ? 'none' : NAMES[color]}.`;
    render();
  }

  // ---------- output ----------

  function outOpts() { return { bed: bed(), margin: MARGIN, lineWidth: parseFloat($('lw').value), title: state.name }; }

  function download(data, type, filename) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function savePDF() {
    const r = LP.writePDF(state.job, state.assign, outOpts());
    download(r.bytes, 'application/pdf', `${state.name}_laser.pdf`);
    setStatus('out-status', 'ok', `Saved ${state.name}_laser.pdf. In Reader, print at <b>Actual size</b>; in UCP, import it.`);
  }

  function saveDXF() {
    const r = LP.writeDXF(state.job, state.assign, outOpts());
    download(r.text, 'application/dxf', `${state.name}_laser.dxf`);
    setStatus('out-status', r.droppedFills ? 'warn' : 'ok', `Saved ${state.name}_laser.dxf (R12, inches).${r.droppedFills ? ` ${r.droppedFills} black inside${r.droppedFills === 1 ? ' was' : 's were'} left out: DXF is vectors only. Use the PDF for engraving.` : ''}`);
  }

  function saveSVG() {
    download(LP.writeSVG(state.job, state.assign, outOpts()), 'image/svg+xml', `${state.name}_laser.svg`);
    setStatus('out-status', 'ok', `Saved ${state.name}_laser.svg.`);
  }

  function printJob() {
    const o = outOpts();
    $('print-sheet').innerHTML = LP.writeSVG(state.job, state.assign, o);
    const sheet = $('print-sheet').querySelector('svg');
    sheet.style.width = o.bed.w + 'in';
    sheet.style.height = o.bed.h + 'in';
    $('page-size').textContent = `@page { size: ${o.bed.w}in ${o.bed.h}in; margin: 0; }\n@media print { html, body { width: ${o.bed.w}in; height: ${o.bed.h}in; } }`;
    window.print();
  }

  // ---------- wiring ----------

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  function init() {
    $('ver').textContent = LP.VERSION;
    const bedPref = store.get('bed'), lwPref = store.get('lw');
    if (bedPref && [...$('bed').options].some(o => o.value === bedPref)) $('bed').value = bedPref;
    if (lwPref && [...$('lw').options].some(o => o.value === lwPref)) $('lw').value = lwPref;
    $('custom-bed').hidden = $('bed').value !== 'custom';

    const drop = $('drop');
    drop.addEventListener('click', () => $('file').click());
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
    $('file').addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; });

    $('units').addEventListener('change', e => {
      if (e.target.name !== 'u') return;
      state.unitIdx = parseInt(e.target.value, 10);
      state.confirmed = false;
      analyze(true);
    });
    $('confirm-units').addEventListener('click', () => { if (!state.job) return; state.confirmed = true; render(); });

    $('bed').addEventListener('change', () => { $('custom-bed').hidden = $('bed').value !== 'custom'; store.set('bed', $('bed').value); render(); });
    ['bw', 'bh'].forEach(id => $(id).addEventListener('input', render));
    $('lw').addEventListener('change', () => store.set('lw', $('lw').value));
    $('tol').addEventListener('change', () => {
      const v = Math.min(0.01, Math.max(0.0001, parseFloat($('tol').value) || 0.001));
      $('tol').value = v;
      state.tol = v;
      if (state.parsed) analyze(true);
    });
    $('warns').addEventListener('click', e => {
      const t = e.target.closest('[data-tol]');
      if (!t) return;
      state.tol = parseFloat(t.dataset.tol);
      $('tol').value = state.tol;
      analyze(true);
    });
    $('show-ref').addEventListener('change', e => { state.showRef = e.target.checked; render(); });

    document.querySelectorAll('.palette button').forEach(btn => btn.addEventListener('click', () => applyColor(btn.dataset.color)));
    $('sel-outlines').addEventListener('click', () => select(allOutlineKeys()));
    $('sel-parts').addEventListener('click', () => select(state.job.loops.filter(L => L.depth % 2 === 0).map(L => L.id + ':i')));
    $('sel-color').addEventListener('change', e => {
      const c = e.target.value;
      e.target.value = '';
      if (!c || !state.job) return;
      const keys = [];
      for (const [id, a] of Object.entries(state.assign)) {
        if ((c === 'none' && !a.outline) || a.outline === c) keys.push(id + ':o');
        if (c === 'black' && a.inside === 'black') keys.push(id + ':i');
      }
      select(keys);
    });
    $('sel-clear').addEventListener('click', () => select([]));

    $('preview').addEventListener('click', e => {
      const t = e.target.closest('[data-key]');
      const add = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!t) { if (!add) select([]); return; }
      const k = t.dataset.key;
      if (add && state.sel.has(k)) { state.sel.delete(k); render(); } else select([k], add);
    });

    document.addEventListener('keydown', e => {
      if (!state.job || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'r') applyColor('red');
      else if (k === 'b') applyColor('blue');
      else if (k === 'k') applyColor('black');
      else if (k === 'n' || k === 'delete' || k === 'backspace') applyColor('none');
      else if (k === 'a') { e.preventDefault(); select(allOutlineKeys()); }
      else if (k === 'escape') select([]);
    });

    $('save-pdf').addEventListener('click', savePDF);
    $('save-dxf').addEventListener('click', saveDXF);
    $('save-svg').addEventListener('click', saveSVG);
    $('print').addEventListener('click', printJob);
  }

  LP.ui = { loadText, state };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
})(globalThis.LP = globalThis.LP || {});

/** CHANGELOG
 * v0.1 (2026-10-30): Initial prototype. Load DXF or SVG, confirm units, bed and tolerance settings, click-to-color preview with selection tools and shortcuts, checks list, PDF/DXF/SVG save and true-size print.
 * v0.2 (2026-10-30): Version bump with the writer changes.
 */
