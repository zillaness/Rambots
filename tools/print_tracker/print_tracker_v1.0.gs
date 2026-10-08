/**
 * @file print_tracker_v1.0.gs
 * @version 1.0
 * @author Samuel Cao
 * @created 2026-10-08
 * @lastUpdated 2026-10-08
 * @description Apps Script for the Print Tracker Google Sheet: stamps dates when prints are claimed or change status, and adds the Fill gaps and Re-split menu items.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 *
 * Install: in the sheet, Extensions > Apps Script, replace Code.gs with this file, save, reload the sheet.
 * onEdit runs as a simple trigger, so editors never see a permission prompt. The first time someone
 * uses the Print Tracker menu, Google asks them to authorize access to this spreadsheet only.
 */

/** @OnlyCurrentDoc */

var SHEETS = { PRINTS: 'Prints', PARTS: 'Parts', PRINTERS: 'Printers' };

var STATUS = {
  UNCLAIMED: 'Unclaimed',
  CLAIMED: 'Claimed',
  PRINTING: 'Printing',
  DONE: 'Done',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
};

// Columns are found by header text, so they can be reordered without touching this script.
var PRINT_COLS = {
  part: 'Part',
  qty: 'Qty',
  color: 'Color',
  claimedBy: 'Claimed by',
  status: 'Status',
  claimedOn: 'Claimed on',
  statusChanged: 'Status changed',
  notes: 'Notes',
};
// The Prints columns people (or this script) type into. Every other Prints column is a formula.
var PRINT_ENTRY_FIELDS = Object.keys(PRINT_COLS);

var PART_COLS = { part: 'Part', priority: 'Priority', needed: 'Qty needed', perPlate: 'Per plate' };
var PRINTER_COLS = { currentlyWith: 'Currently with', since: 'Since' };

var DEFAULT_BATCH = 10;
var HEADER_ROW = 1;
var FIRST_DATA_ROW = 2;

// ---------------------------------------------------------------------------
// Triggers and menu
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Print Tracker')
    .addItem('Fill gaps (add rows for uncovered copies)', 'fillGaps')
    .addItem('Re-split unclaimed rows', 'resplitUnclaimed')
    .addToUi();
}

function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var name = sheet.getName();
  if (name === SHEETS.PRINTS || name === SHEETS.PARTS) {
    // A part typed below the pre-filled rows gets the same formulas and dropdowns as row 2.
    var partCol = columnIndex_(sheet, { part: 'Part' }, false).part;
    var firstRow = Math.max(e.range.getRow(), FIRST_DATA_ROW);
    var numRows = e.range.getLastRow() - firstRow + 1;
    if (partCol >= e.range.getColumn() && partCol <= e.range.getLastColumn() && numRows > 0) {
      ensureRows_(sheet, firstRow, numRows);
    }
  }
  if (name === SHEETS.PRINTS) {
    handleEdit_(sheet, e.range, PRINT_COLS, ['claimedBy', 'status'], applyPrintsEdit);
  } else if (name === SHEETS.PRINTERS) {
    handleEdit_(sheet, e.range, PRINTER_COLS, ['currentlyWith'], applyPrinterEdit);
  }
}

/** Menu: adds Unclaimed rows for every copy that no row covers yet. */
function fillGaps() {
  var ss = SpreadsheetApp.getActive();
  var data = loadTracker_(ss);
  var newRows = planGapRows(data.parts, data.prints, data.batch);
  if (!newRows.length) {
    ss.toast('Every part is already covered.', 'Print Tracker');
    return;
  }
  writePrintRows_(data.sheet, data.cols, data.lastDataRow + 1, newRows);
  ss.toast('Added ' + newRows.length + ' row(s).', 'Print Tracker');
}

/** Menu: rebuilds every unclaimed row using each part's current Per plate. */
function resplitUnclaimed() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    'Re-split unclaimed rows',
    'This clears every Prints row that has no name and is Unclaimed (including any Color or Notes on it), ' +
      'then rebuilds those copies using each part\'s current Per plate. Claimed, printing, finished and failed ' +
      'rows are kept. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return;

  var ss = SpreadsheetApp.getActive();
  var data = loadTracker_(ss);
  var rows = planResplit(data.parts, data.prints, data.batch);
  writePrintRows_(data.sheet, data.cols, FIRST_DATA_ROW, rows);
  var leftover = data.lastDataRow - (FIRST_DATA_ROW - 1) - rows.length;
  if (leftover > 0) clearEntryCells_(data.sheet, data.cols, FIRST_DATA_ROW + rows.length, leftover);
  ss.toast('Prints now has ' + rows.length + ' row(s).', 'Print Tracker');
}

// ---------------------------------------------------------------------------
// Rules (pure functions, covered by print_tracker_test_v1.0.mjs)
// ---------------------------------------------------------------------------

function isBlank_(v) {
  return v === '' || v === null || v === undefined;
}

function num_(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function isEmptyRow_(row) {
  return PRINT_ENTRY_FIELDS.every(function (f) {
    return isBlank_(row[f]);
  });
}

/** A row nobody has taken yet, which Re-split is allowed to rebuild. */
function isResplittable_(row) {
  return (
    !isBlank_(row.part) &&
    isBlank_(row.claimedBy) &&
    (isBlank_(row.status) || row.status === STATUS.UNCLAIMED)
  );
}

/**
 * Rows to add so every part's Qty needed is covered. Failed rows don't count as covered,
 * so their copies come back. Must parts are planned first, then everything else, each in Parts order.
 */
function planGapRows(parts, printRows, defaultBatch) {
  var covered = {};
  printRows.forEach(function (r) {
    if (isBlank_(r.part) || r.status === STATUS.FAILED) return;
    covered[r.part] = (covered[r.part] || 0) + num_(r.qty);
  });

  var ordered = parts
    .filter(function (p) {
      return p.priority === 'Must';
    })
    .concat(
      parts.filter(function (p) {
        return p.priority !== 'Must';
      })
    );

  var seen = {};
  var out = [];
  ordered.forEach(function (p) {
    if (isBlank_(p.part) || seen[p.part]) return;
    seen[p.part] = true;
    var gap = num_(p.needed) - (covered[p.part] || 0);
    var batch = num_(p.perPlate) >= 1 ? Math.floor(num_(p.perPlate)) : defaultBatch;
    while (gap > 0) {
      var qty = Math.min(batch, gap);
      out.push({ part: p.part, qty: qty, status: STATUS.UNCLAIMED });
      gap -= qty;
    }
  });
  return out;
}

/** The full Prints table after Re-split: kept rows in their current order, then the rebuilt ones. */
function planResplit(parts, printRows, defaultBatch) {
  var keep = printRows.filter(function (r) {
    return !isEmptyRow_(r) && !isResplittable_(r);
  });
  return keep.concat(planGapRows(parts, keep, defaultBatch));
}

/**
 * Claim rules for one Prints row after an edit. `edited` names the watched fields the edit touched.
 * Returns only the fields that should change.
 */
function applyPrintsEdit(row, edited, now) {
  var changes = {};
  if (edited.claimedBy) {
    if (!isBlank_(row.claimedBy)) {
      changes.claimedOn = now;
      if (isBlank_(row.status) || row.status === STATUS.UNCLAIMED) {
        changes.status = STATUS.CLAIMED;
        changes.statusChanged = now;
      }
    } else {
      changes.claimedOn = '';
      if (row.status === STATUS.CLAIMED) {
        changes.status = STATUS.UNCLAIMED;
        changes.statusChanged = now;
      }
    }
  }
  if (edited.status && !changes.status) {
    changes.statusChanged = now;
    // Setting a row back to Unclaimed releases it.
    if (row.status === STATUS.UNCLAIMED && !edited.claimedBy && !isBlank_(row.claimedBy)) {
      changes.claimedBy = '';
      changes.claimedOn = '';
    }
  }
  return changes;
}

/** Printers: "Since" follows "Currently with". */
function applyPrinterEdit(row, edited, now) {
  return { since: isBlank_(row.currentlyWith) ? '' : now };
}

// ---------------------------------------------------------------------------
// Sheet I/O
// ---------------------------------------------------------------------------

/** Maps field -> 1-based column by header text. With `required`, a missing header throws. */
function columnIndex_(sheet, colNames, required) {
  var headers = sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  var byName = {};
  headers.forEach(function (h, i) {
    byName[String(h).trim()] = i + 1;
  });
  var cols = {};
  Object.keys(colNames).forEach(function (field) {
    var col = byName[colNames[field]];
    if (!col && required) {
      throw new Error('Tab "' + sheet.getName() + '" needs a column headed "' + colNames[field] + '".');
    }
    cols[field] = col;
  });
  return cols;
}

function readRows_(sheet, cols, firstRow, numRows) {
  if (numRows < 1) return [];
  var values = sheet.getRange(firstRow, 1, numRows, sheet.getLastColumn()).getValues();
  return values.map(function (v) {
    var row = {};
    Object.keys(cols).forEach(function (field) {
      row[field] = cols[field] ? v[cols[field] - 1] : '';
    });
    return row;
  });
}

function handleEdit_(sheet, range, colNames, watched, apply) {
  var cols = columnIndex_(sheet, colNames, false);
  var firstCol = range.getColumn();
  var lastCol = range.getLastColumn();
  var edited = {};
  watched.forEach(function (f) {
    if (cols[f] && cols[f] >= firstCol && cols[f] <= lastCol) edited[f] = true;
  });
  if (!Object.keys(edited).length) return;

  var firstRow = Math.max(range.getRow(), FIRST_DATA_ROW);
  var numRows = range.getLastRow() - firstRow + 1;
  if (numRows < 1) return;

  var rows = readRows_(sheet, cols, firstRow, numRows);
  var now = new Date();
  var changed = {};
  var changes = rows.map(function (row) {
    var c = apply(row, edited, now);
    Object.keys(c).forEach(function (f) {
      if (cols[f]) changed[f] = true;
    });
    return c;
  });

  Object.keys(changed).forEach(function (field) {
    var column = rows.map(function (row, i) {
      return [field in changes[i] ? changes[i][field] : row[field]];
    });
    sheet.getRange(firstRow, cols[field], numRows, 1).setValues(column);
  });
}

function loadTracker_(ss) {
  var prints = ss.getSheetByName(SHEETS.PRINTS);
  var parts = ss.getSheetByName(SHEETS.PARTS);
  if (!prints || !parts) throw new Error('This sheet needs tabs named "Prints" and "Parts".');

  var printCols = columnIndex_(prints, PRINT_COLS, true);
  var partCols = columnIndex_(parts, PART_COLS, true);

  var printRows = readRows_(prints, printCols, FIRST_DATA_ROW, prints.getLastRow() - HEADER_ROW);
  var lastDataRow = HEADER_ROW;
  printRows.forEach(function (r, i) {
    if (!isEmptyRow_(r)) lastDataRow = FIRST_DATA_ROW + i;
  });
  printRows = printRows.slice(0, lastDataRow - HEADER_ROW);

  var partRows = readRows_(parts, partCols, FIRST_DATA_ROW, parts.getLastRow() - HEADER_ROW).filter(function (p) {
    return !isBlank_(p.part);
  });

  var batchCell = ss.getRangeByName('DefaultBatch');
  var batch = batchCell ? num_(batchCell.getValue()) : 0;

  return {
    sheet: prints,
    cols: printCols,
    prints: printRows,
    parts: partRows,
    batch: batch >= 1 ? Math.floor(batch) : DEFAULT_BATCH,
    lastDataRow: lastDataRow,
  };
}

/** Writes the entry columns of `rows` starting at `startRow`. Formula columns are left alone. */
function writePrintRows_(sheet, cols, startRow, rows) {
  if (!rows.length) return;
  ensureRows_(sheet, startRow, rows.length);
  PRINT_ENTRY_FIELDS.forEach(function (field) {
    var column = rows.map(function (r) {
      return [isBlank_(r[field]) ? '' : r[field]];
    });
    sheet.getRange(startRow, cols[field], rows.length, 1).setValues(column);
  });
}

function clearEntryCells_(sheet, cols, startRow, numRows) {
  PRINT_ENTRY_FIELDS.forEach(function (field) {
    sheet.getRange(startRow, cols[field], numRows, 1).clearContent();
  });
}

/**
 * Makes rows startRow..startRow+numRows-1 look like row 2: same formulas, number formats and dropdowns.
 * The workbook ships with about a hundred pre-filled rows per tab; this covers anything past them.
 */
function ensureRows_(sheet, startRow, numRows) {
  var lastRow = startRow + numRows - 1;
  if (lastRow > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), lastRow - sheet.getMaxRows());

  var width = sheet.getLastColumn();
  var template = sheet.getRange(FIRST_DATA_ROW, 1, 1, width);
  var target = sheet.getRange(startRow, 1, numRows, width);

  var templateFormulas = template.getFormulasR1C1()[0];
  var targetFormulas = target.getFormulasR1C1();
  templateFormulas.forEach(function (formula, c) {
    if (!formula) return;
    var missing = targetFormulas.some(function (row) {
      return !row[c];
    });
    if (!missing) return;
    sheet.getRange(startRow, c + 1, numRows, 1).setFormulasR1C1(
      targetFormulas.map(function (row) {
        return [row[c] || formula];
      })
    );
  });

  var formats = template.getNumberFormats()[0];
  target.setNumberFormats(
    targetFormulas.map(function () {
      return formats;
    })
  );
  template.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
}

/** CHANGELOG
 * v1.0 (2026-10-08): Initial release. Claim and status date stamps, Printers "Since" stamp,
 *   Fill gaps and Re-split unclaimed rows menu items.
 */
