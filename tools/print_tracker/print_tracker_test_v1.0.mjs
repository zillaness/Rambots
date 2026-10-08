/**
 * @file print_tracker_test_v1.0.mjs
 * @version 1.0
 * @author Samuel Cao
 * @created 2026-10-08
 * @lastUpdated 2026-10-08
 * @description Node tests for print_tracker_v1.0.gs, run against an in-memory fake of the Sheets API.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 *
 * Run: node --test tools/print_tracker/print_tracker_test_v1.0.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const here = new URL('.', import.meta.url);
const source = readFileSync(new URL('print_tracker_v1.0.gs', here), 'utf8');

/** Minimal in-memory sheet: a 2D array of values plus the methods the script calls. */
class FakeSheet {
  constructor(name, rows) {
    this.name = name;
    this.data = rows.map((r) => [...r]);
    this.width = rows[0].length;
    this.formulas = new Map(); // "row,col" (0-based) -> R1C1 formula
  }
  getName() { return this.name; }
  getLastColumn() { return this.width; }
  getLastRow() {
    for (let r = this.data.length - 1; r >= 0; r--) {
      if (this.data[r].some((v) => v !== '')) return r + 1;
    }
    return 0;
  }
  getMaxRows() { return this.data.length; }
  insertRowsAfter(_after, n) {
    for (let i = 0; i < n; i++) this.data.push(Array(this.width).fill(''));
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    return new FakeRange(this, row, col, numRows, numCols);
  }
}

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    Object.assign(this, { sheet, row, col, numRows, numCols });
  }
  getSheet() { return this.sheet; }
  getRow() { return this.row; }
  getColumn() { return this.col; }
  getLastRow() { return this.row + this.numRows - 1; }
  getLastColumn() { return this.col + this.numCols - 1; }
  cells(fn) {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const line = [];
      for (let c = 0; c < this.numCols; c++) line.push(fn(this.row - 1 + r, this.col - 1 + c, r, c));
      out.push(line);
    }
    return out;
  }
  getValues() { return this.cells((r, c) => this.sheet.data[r]?.[c] ?? ''); }
  setValues(values) {
    this.cells((r, c, i, j) => { this.sheet.data[r][c] = values[i][j]; });
  }
  clearContent() { this.setValues(this.cells(() => '')); }
  getFormulasR1C1() { return this.cells((r, c) => this.sheet.formulas.get(`${r},${c}`) || ''); }
  setFormulasR1C1(f) {
    this.cells((r, c, i, j) => { if (f[i][j]) this.sheet.formulas.set(`${r},${c}`, f[i][j]); });
  }
  getNumberFormats() { return this.cells(() => ''); }
  setNumberFormats() {}
  copyTo() {}
}

function loadScript(sheets) {
  const toasts = [];
  const ss = {
    getSheetByName: (n) => sheets.find((s) => s.getName() === n) || null,
    getRangeByName: () => null,
    toast: (msg) => toasts.push(msg),
  };
  const context = {
    SpreadsheetApp: {
      getActive: () => ss,
      getUi: () => ({ alert: () => 'YES', ButtonSet: { YES_NO: 'YES_NO' }, Button: { YES: 'YES' } }),
      CopyPasteType: { PASTE_DATA_VALIDATION: 'v' },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { gs: context, toasts };
}

// Values created inside the vm context belong to another realm, so compare plain copies.
const plain = (x) => JSON.parse(JSON.stringify(x));
const isDate = (v) => Object.prototype.toString.call(v) === '[object Date]';

const PRINT_HEADERS = ['Part', 'Qty', 'Priority', 'Color', 'Claimed by', 'Status', 'Claimed on', 'Status changed', 'Notes'];
const PART_HEADERS = ['Project', 'Kit', 'Part', 'Priority', 'Qty needed', 'Per kit', 'Per plate'];

function printsSheet(rows, blankRows = 5) {
  const pad = Array.from({ length: blankRows }, () => Array(PRINT_HEADERS.length).fill(''));
  return new FakeSheet('Prints', [PRINT_HEADERS, ...rows, ...pad]);
}

function partsSheet(rows) {
  return new FakeSheet('Parts', [PART_HEADERS, ...rows]);
}

// [Part, Qty, Priority, Color, Claimed by, Status, Claimed on, Status changed, Notes]
const row = (part, qty, by = '', status = 'Unclaimed', notes = '') => [part, qty, '', '', by, status, '', '', notes];

test('planGapRows splits each gap into per-plate batches, Must parts first', () => {
  const { gs } = loadScript([]);
  const parts = [
    { part: 'Flexi rex', priority: 'Stretch', needed: 5, perPlate: 4 },
    { part: 'Handle', priority: 'Must', needed: 25, perPlate: 10 },
  ];
  const rows = gs.planGapRows(parts, [], 10);
  assert.deepEqual(
    plain(rows.map((r) => [r.part, r.qty])),
    [['Handle', 10], ['Handle', 10], ['Handle', 5], ['Flexi rex', 4], ['Flexi rex', 1]]
  );
});

test('planGapRows counts existing rows as covered, except Failed ones', () => {
  const { gs } = loadScript([]);
  const parts = [{ part: 'Gear', priority: 'Must', needed: 20, perPlate: 8 }];
  const prints = [
    { part: 'Gear', qty: 8, status: 'Done' },
    { part: 'Gear', qty: 8, status: 'Failed' },
    { part: 'Gear', qty: 4, status: 'Printing' },
  ];
  assert.deepEqual(plain(gs.planGapRows(parts, prints, 10).map((r) => r.qty)), [8]);
});

test('planGapRows uses the default batch when Per plate is blank and adds nothing when covered', () => {
  const { gs } = loadScript([]);
  const parts = [
    { part: 'Ripcord', priority: 'Must', needed: 12, perPlate: '' },
    { part: 'Sleeve', priority: 'Must', needed: 3, perPlate: 5 },
  ];
  const prints = [{ part: 'Sleeve', qty: 5, status: 'Unclaimed' }];
  assert.deepEqual(plain(gs.planGapRows(parts, prints, 7).map((r) => [r.part, r.qty])), [['Ripcord', 7], ['Ripcord', 5]]);
});

test('planResplit keeps claimed and finished rows and rebuilds the rest at the new plate size', () => {
  const { gs } = loadScript([]);
  const parts = [{ part: 'Handle', priority: 'Must', needed: 30, perPlate: 12 }];
  const prints = [
    { part: 'Handle', qty: 10, claimedBy: '', status: 'Unclaimed', notes: 'old' },
    { part: 'Handle', qty: 10, claimedBy: 'Ava', status: 'Printing' },
    { part: 'Handle', qty: 10, claimedBy: '', status: '' },
  ];
  const out = gs.planResplit(parts, prints, 10);
  assert.deepEqual(out.map((r) => [r.qty, r.claimedBy ?? '', r.status]), [
    [10, 'Ava', 'Printing'],
    [12, '', 'Unclaimed'],
    [8, '', 'Unclaimed'],
  ]);
});

test('applyPrintsEdit: picking a name claims the row and stamps both dates', () => {
  const { gs } = loadScript([]);
  const now = new Date('2026-10-08T18:00:00');
  const c = gs.applyPrintsEdit({ claimedBy: 'Ava', status: 'Unclaimed' }, { claimedBy: true }, now);
  assert.deepEqual({ ...c }, { claimedOn: now, status: 'Claimed', statusChanged: now });
});

test('applyPrintsEdit: clearing the name releases a Claimed row but leaves a Printing row alone', () => {
  const { gs } = loadScript([]);
  const now = new Date();
  assert.deepEqual(
    { ...gs.applyPrintsEdit({ claimedBy: '', status: 'Claimed' }, { claimedBy: true }, now) },
    { claimedOn: '', status: 'Unclaimed', statusChanged: now }
  );
  assert.deepEqual({ ...gs.applyPrintsEdit({ claimedBy: '', status: 'Printing' }, { claimedBy: true }, now) }, { claimedOn: '' });
});

test('applyPrintsEdit: status edits stamp Status changed; setting Unclaimed clears the name', () => {
  const { gs } = loadScript([]);
  const now = new Date();
  assert.deepEqual({ ...gs.applyPrintsEdit({ claimedBy: 'Ava', status: 'Done' }, { status: true }, now) }, { statusChanged: now });
  assert.deepEqual(
    { ...gs.applyPrintsEdit({ claimedBy: 'Ava', status: 'Unclaimed' }, { status: true }, now) },
    { statusChanged: now, claimedBy: '', claimedOn: '' }
  );
});

test('onEdit: filling a name down three rows claims all three in the sheet', () => {
  const prints = printsSheet([row('Handle', 10), row('Handle', 10), row('Gear', 10), row('Gear', 10)]);
  const { gs } = loadScript([prints]);
  // Simulate a fill-down of "Ben" into Claimed by (column 5) for rows 2-4.
  for (let r = 1; r <= 3; r++) prints.data[r][4] = 'Ben';
  gs.onEdit({ range: prints.getRange(2, 5, 3, 1) });
  for (let r = 1; r <= 3; r++) {
    assert.equal(prints.data[r][5], 'Claimed');
    assert.ok(isDate(prints.data[r][6]), 'Claimed on stamped');
    assert.ok(isDate(prints.data[r][7]), 'Status changed stamped');
  }
  assert.equal(prints.data[4][5], 'Unclaimed', 'row outside the edit untouched');
  assert.equal(prints.data[4][6], '');
});

test('onEdit: typing a Part below the pre-filled rows copies row 2 formulas there', () => {
  const prints = printsSheet([row('Handle', 10)], 10);
  prints.formulas.set('1,2', '=INDEX(Parts!C4:C4,R[0]C18)'); // row 2, Priority column
  const { gs } = loadScript([prints]);
  prints.data[8][0] = 'Gear';
  gs.onEdit({ range: prints.getRange(9, 1) });
  assert.equal(prints.formulas.get('8,2'), '=INDEX(Parts!C4:C4,R[0]C18)');
  assert.equal(prints.formulas.get('7,2'), undefined, 'other rows untouched');
});

test('onEdit: edits to other columns or the header row do nothing', () => {
  const prints = printsSheet([row('Handle', 10)]);
  const { gs } = loadScript([prints]);
  prints.data[1][8] = 'note';
  gs.onEdit({ range: prints.getRange(2, 9) });
  gs.onEdit({ range: prints.getRange(1, 5) });
  assert.deepEqual(prints.data[1], ['Handle', 10, '', '', '', 'Unclaimed', '', '', 'note']);
});

test('onEdit: Printers "Since" follows "Currently with"', () => {
  const printers = new FakeSheet('Printers', [['Printer', 'Model', 'Owner', 'Currently with', 'Since'], ['P1S #1', 'P1S', 'Team', 'Ava', '']]);
  const { gs } = loadScript([printers]);
  gs.onEdit({ range: printers.getRange(2, 4) });
  assert.ok(isDate(printers.data[1][4]));
  printers.data[1][3] = '';
  gs.onEdit({ range: printers.getRange(2, 4) });
  assert.equal(printers.data[1][4], '');
});

test('fillGaps appends rows after the last used row', () => {
  const prints = printsSheet([row('Handle', 10, 'Ava', 'Printing')], 0);
  const parts = partsSheet([['Carnival', 'Launcher', 'Handle', 'Must', 25, 1, 10]]);
  const { gs, toasts } = loadScript([prints, parts]);
  gs.fillGaps();
  assert.deepEqual(
    prints.data.slice(1).map((r) => [r[0], r[1], r[4], r[5]]),
    [['Handle', 10, 'Ava', 'Printing'], ['Handle', 10, '', 'Unclaimed'], ['Handle', 5, '', 'Unclaimed']]
  );
  assert.deepEqual(toasts, ['Added 2 row(s).']);
  gs.fillGaps();
  assert.deepEqual(toasts.at(-1), 'Every part is already covered.');
});

test('resplitUnclaimed rewrites the table and clears leftover rows', () => {
  const prints = printsSheet([
    row('Handle', 5),
    row('Handle', 5, 'Ava', 'Done'),
    row('Handle', 5),
    row('Handle', 5),
  ]);
  const parts = partsSheet([['Carnival', 'Launcher', 'Handle', 'Must', 20, 1, 15]]);
  const { gs } = loadScript([prints, parts]);
  gs.resplitUnclaimed();
  assert.deepEqual(
    prints.data.slice(1, 6).map((r) => [r[0], r[1], r[4], r[5]]),
    [['Handle', 5, 'Ava', 'Done'], ['Handle', 15, '', 'Unclaimed'], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']]
  );
});

/** CHANGELOG
 * v1.0 (2026-10-08): Initial release.
 */
