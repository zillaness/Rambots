/**
 * @file rambots_clicker_order_form_v1.1.gs
 * @version 1.1
 * @author Claude
 * @created 2026-10-22
 * @lastUpdated 2026-10-22
 * @description Google Apps Script that builds the Rambots fidget clicker order form (design dropdowns under a numbered lineup picture, 10-clicker minimum) and a linked response sheet with an Order check tab.
 * @aiUpdate Update @lastUpdated and @version. Rename file to match. Append changelog at bottom.
 *
 * How to use: paste into a new project at script.google.com, save, pick
 * buildClickerOrderForm in the toolbar, click Run, and approve the permissions.
 * The links print in the Execution log. Run it once; each run makes a new form.
 */

// ---------- settings: change these, then run ----------
const TITLE = 'Rambots Fidget Clicker Order Form';
const PRICE = 3;      // dollars per clicker
const MIN = 10;       // minimum clickers per order, mix and match
const MAX_LINES = 8;  // most designs one order can list
const CONTACT = 'contact@rambots.org';
const RAW = 'https://raw.githubusercontent.com/zillaness/Rambots/ramathon-carnival/tools/';
const HEADER_URL = RAW + 'ramathon_sales_tracker/clicker_photos/clickerblueswitch.jpg';
const LINEUP_URL = RAW + 'clicker_order_form/clicker_lineup.jpg';  // numbered to match DESIGNS
const DESIGNS = [
  'Dumpling', 'Salmon nigiri', 'Minecraft creeper', 'Avocado', 'Egg tart', 'Chocolate bar',
  'Hot dog bun', 'WD-40', 'Spam musubi', 'LEGO brick', 'Oreo', 'Assorted (we pick the mix)',
];
const TOTAL_TITLE = 'Total number of clickers';
const DATE_TITLE = 'When do you need them by?';
// --------------------------------------------------------

function buildClickerOrderForm() {
  const form = FormApp.create(TITLE);
  form.setDescription(
    '3D-printed fidget clickers, designed and printed by FRC Team 2204, the Rambots. ' +
    '$' + PRICE + ' each, with a minimum order of ' + MIN + ' clickers total. Mix and match any designs. ' +
    'For bulk pricing, email ' + CONTACT + '. Proceeds support our robotics team. ' +
    "After you order, we'll email you to confirm your total, payment and pickup.");
  form.setConfirmationMessage(
    "Thanks for your order! We'll email you to confirm your total, payment and pickup. " +
    'Questions or bulk orders: ' + CONTACT);
  form.setProgressBar(true);
  form.setAllowResponseEdits(false);
  form.setAcceptingResponses(true);
  // School (Workspace) accounts restrict forms to the school by default; this opens it to outside buyers.
  try { form.setRequireLogin(false); } catch (e) { Logger.log('Sign-in setting skipped (personal account): ' + e.message); }

  const header = fetchPhoto_(HEADER_URL), lineup = fetchPhoto_(LINEUP_URL);
  if (header) form.addImageItem().setImage(header).setAlignment(FormApp.Alignment.CENTER).setWidth(320);

  // Section 1: contact info
  form.addSectionHeaderItem().setTitle('Your info');
  form.addTextItem().setTitle('Name').setRequired(true);
  form.addTextItem().setTitle('Email').setRequired(true)
    .setValidation(FormApp.createTextValidation().setHelpText('Enter a valid email address.').requireTextIsEmail().build());
  form.addTextItem().setTitle('Phone');
  form.addTextItem().setTitle("What's the order for?")
    .setHelpText('Example: classroom gifts, party favors, stocking stuffers');

  // Design lines: picture, dropdown, quantity, then "Add another design?" to branch.
  const options = DESIGNS.map(function (d, i) { return (i + 1) + '. ' + d; });
  const qty = FormApp.createTextValidation()
    .setHelpText('Enter a whole number, like 5 or 12.')
    .requireTextMatchesPattern('^[1-9]\\d*$').build();
  const pages = [], asks = [];
  for (let k = 1; k <= MAX_LINES; k++) {
    pages.push(k === 1
      ? form.addPageBreakItem().setTitle('Pick your designs')
          .setHelpText('Pick a design and how many you want. You can add more designs after this. Minimum ' + MIN + ' clickers total.')
      : form.addPageBreakItem().setTitle('Design ' + k).setHelpText('Pick your next design.'));
    if (lineup) form.addImageItem().setImage(lineup).setAlignment(FormApp.Alignment.CENTER).setWidth(k === 1 ? 740 : 480)
      .setTitle(k === 1 ? 'Our designs' : '');
    form.addListItem().setTitle('Design ' + k).setRequired(true).setChoiceValues(options);
    form.addTextItem().setTitle('Quantity ' + k).setHelpText('How many of this design?').setRequired(true).setValidation(qty);
    if (k < MAX_LINES) asks.push(form.addMultipleChoiceItem().setTitle('Add another design?').setRequired(true));
  }

  // Section 3: total, date, notes
  const finish = form.addPageBreakItem().setTitle('Finish your order');
  form.addTextItem().setTitle(TOTAL_TITLE).setRequired(true)
    .setHelpText('Add up your quantities. Your price is the total times $' + PRICE + '. Example: 12 clickers = $' + (12 * PRICE) + '.')
    .setValidation(FormApp.createTextValidation()
      .setHelpText('The minimum order is ' + MIN + ' clickers.')
      .requireNumberGreaterThanOrEqualTo(MIN).build());
  form.addDateItem().setTitle(DATE_TITLE).setRequired(true);
  form.addParagraphTextItem().setTitle('Notes or special requests, like colors');

  // Branching: Yes goes to the next design page, No skips to Finish.
  asks.forEach(function (ask, i) {
    ask.setChoices([ask.createChoice('Yes', pages[i + 1]), ask.createChoice("No, that's everything", finish)]);
  });

  // Newer Forms accounts create forms unpublished; publish if this account supports it.
  try { if (typeof form.setPublished === 'function') form.setPublished(true); } catch (e) { Logger.log('Publish step skipped: ' + e.message); }

  const ss = SpreadsheetApp.create(TITLE + ' (Responses)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  addOrderCheck_(ss);

  Logger.log('Share this link with buyers: ' + form.getPublishedUrl());
  Logger.log('Edit the form: ' + form.getEditUrl());
  Logger.log('Responses sheet: ' + ss.getUrl());
}

// Downloads a photo for the form; logs and returns null if it can't.
function fetchPhoto_(url) {
  const res = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
  if (res.getResponseCode() !== 200) { Logger.log('Photo not added (' + res.getResponseCode() + '): ' + url); return null; }
  return res.getBlob().setName(url.split('/').pop());
}

// Order check tab: lists each order, adds up the quantities, compares with the total they typed, and prices it.
function addOrderCheck_(ss) {
  SpreadsheetApp.flush();
  const resp = ss.getSheets().filter(function (s) { return s.getFormUrl(); })[0];
  if (!resp) { Logger.log('Order check tab skipped: no linked response tab found.'); return; }
  const lastCol = resp.getLastColumn();
  const head = lastCol ? resp.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const col = function (title) { const i = head.indexOf(title); return i < 0 ? null : letter_(i + 1); };
  const name = col('Name'), email = col('Email'), total = col(TOTAL_TITLE), date = col(DATE_TITLE);
  const lines = [];
  for (let k = 1; k <= MAX_LINES; k++) lines.push([col('Design ' + k), col('Quantity ' + k)]);
  if (!name || !email || !total || !date || lines.some(function (l) { return !l[0] || !l[1]; })) {
    Logger.log('Order check tab skipped: the response headers were not ready. The form still works.');
    return;
  }
  const r = "'" + resp.getName().replace(/'/g, "''") + "'!";
  const rng = function (c) { return r + c + '2:' + c; };
  const blank = 'IF(' + r + 'A2:A="",,';
  const order = lines.map(function (l) { return 'IF(LEN(' + rng(l[0]) + '),' + rng(l[0]) + '&" x"&' + rng(l[1]) + '&", ","")'; }).join('&');
  const picks = lines.map(function (l) { return 'IFERROR(VALUE(' + rng(l[1]) + '),0)'; }).join('+');
  const sheet = ss.insertSheet('Order check');
  sheet.getRange(1, 1, 1, 9).setValues([['Ordered', 'Name', 'Email', 'Need by', 'Order', 'Quantities add up to', 'Total they typed', 'Price', 'Check']])
    .setFontWeight('bold');
  sheet.getRange(2, 1, 1, 9).setFormulas([[
    '=ARRAYFORMULA(' + blank + r + 'A2:A))',
    '=ARRAYFORMULA(' + blank + rng(name) + '))',
    '=ARRAYFORMULA(' + blank + rng(email) + '))',
    '=ARRAYFORMULA(' + blank + rng(date) + '))',
    '=ARRAYFORMULA(' + blank + 'REGEXREPLACE(' + order + ',", $","")))',
    '=ARRAYFORMULA(' + blank + picks + '))',
    '=ARRAYFORMULA(' + blank + 'IFERROR(VALUE(' + rng(total) + '),0)))',
    '=ARRAYFORMULA(' + blank + 'G2:G*' + PRICE + '))',
    '=ARRAYFORMULA(' + blank + 'IF(F2:F<>G2:G,"Quantities don\'t match total",IF(G2:G<' + MIN + ',"Under minimum","OK"))))',
  ]]);
  sheet.getRange('A2:A').setNumberFormat('m/d/yyyy h:mm');
  sheet.getRange('D2:D').setNumberFormat('m/d/yyyy');
  sheet.getRange('H2:H').setNumberFormat('$#,##0');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 9);
}

function letter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** CHANGELOG
 * v1.0 (2026-10-22): First version. $3 each, 10-clicker minimum (mix and match), bulk pricing by email, 11 designs plus Assorted with photos, Order check tab.
 * v1.0.1 (2026-10-22): Author set to Claude.
 * v1.1 (2026-10-22): Designs are now a dropdown under one numbered lineup picture (clicker_lineup.jpg). Buyers add up to 8 design lines through "Add another design?" branching. Order check lists each order and sums the quantities.
 */
