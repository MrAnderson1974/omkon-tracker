// OMKON Tracker — Apps Script v6
// CHANGE FROM v5: PO is now the primary key (column A). CPO concept removed.
//   - User-supplied PO eliminates client-side ID generation
//   - No more race condition between create and toggle writes
//   - No more "wait for GAS before refresh" localStorage dance
// Deploy: Web app — Execute as Me — Anyone can access

const SHEET_ID = '1ZwrdoIvV63lwGNqo-JiObDU1WnbMAlkPNh-HCmXwrdc';
const FOLDER_NAME = 'OMKON-Tracker-Files';

const COLS = ['PO','Name','Responsible','Email','Phone','KS_Tags','Qty','Price','Total',
  'Pay1Paid','Pay2Paid','Pay3Paid','GoodsReceived','DeliveryApproved','DeliveryRemarks',
  'Deadline','Pickup','PickupConfirmed','KS_DocReceived','KS_DocApproved','KS_Remarks',
  'Pct','OmkonNotes','CPHNotes','Updated','UpdatedBy','Archived','Files',
  'Pay1Date','Pay2Date','Pay3Date','ShippingDate',
  'CBAM_CNCode','CBAM_Route','CBAM_EmDirect','CBAM_EmIndirect','CBAM_Registered',
  'ChangeNote','CBAM_Submitted','Notes',
  'ExtraDesc','ExtraAmount','ExtraPaid','Photos'];

const LARGE_COLS = ['Photos', 'Files'];
const CELL_LIMIT = 45000;

function testAuth() {
  SpreadsheetApp.openById(SHEET_ID).getName();
  DriveApp.getFoldersByName(FOLDER_NAME);
  Logger.log('Auth OK');
}

function doGet() {
  return ContentService.createTextOutput('OMKON Apps Script v6 OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'uploadFiles') return handleUpload(data, 'photos');
    if (data.action === 'uploadDocs')  return handleUpload(data, 'docs');
    return handleWrite(data);
  } catch(err) {
    return ContentService.createTextOutput('error:' + err).setMimeType(ContentService.MimeType.TEXT);
  }
}

function handleWrite(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const all = sheet.getDataRange().getValues();
  const hdrs = all[0].map(String);

  COLS.forEach(col => {
    if (!hdrs.includes(col)) { hdrs.push(col); sheet.getRange(1, hdrs.length).setValue(col); }
  });

  const poCol = hdrs.indexOf('PO');
  if (!data.PO || String(data.PO).trim() === '') {
    return ContentService.createTextOutput('error: PO is required').setMimeType(ContentService.MimeType.TEXT);
  }

  let rowIdx = -1;
  for (let i = 1; i < all.length; i++) {
    if (String(all[i][poCol]).trim() === String(data.PO).trim()) { rowIdx = i; break; }
  }

  if (rowIdx < 0) {
    const rowData = hdrs.map(col => {
      if (LARGE_COLS.includes(col)) return '';
      const v = data[col] !== undefined ? data[col] : '';
      return (typeof v === 'string' && v && /^[+=\-@]/.test(v)) ? ' ' + v : v;
    });
    sheet.appendRow(rowData);
    const nr = sheet.getLastRow();
    writeLargeCols(sheet, nr, hdrs, data, null);
  } else {
    const existing = all[rowIdx];
    const rowData = hdrs.map((col, i) => {
      if (LARGE_COLS.includes(col)) return '';
      return data[col] !== undefined ? data[col] : (existing[i] !== undefined ? existing[i] : '');
    });
    const safeRow = rowData.map(v =>
      (typeof v === 'string' && v && /^[+=\-@]/.test(v)) ? ' ' + v : v
    );
    sheet.getRange(rowIdx + 1, 1, 1, hdrs.length).setValues([safeRow]);
    writeLargeCols(sheet, rowIdx + 1, hdrs, data, existing);
  }

  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}

function writeLargeCols(sheet, rowNum, hdrs, data, existing) {
  LARGE_COLS.forEach(col => {
    const ci = hdrs.indexOf(col);
    if (ci < 0) return;
    let val;
    if (data[col] !== undefined) {
      val = String(data[col]).length <= CELL_LIMIT ? data[col] : '';
    } else {
      val = existing ? (existing[ci] || '') : '';
      if (String(val).length > CELL_LIMIT) val = '';
    }
    try { sheet.getRange(rowNum, ci + 1).setValue(val); } catch(e) { /* skip */ }
  });
}

function handleUpload(data, type) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const all = sheet.getDataRange().getValues();
  const hdrs = all[0].map(String);
  const poCol = hdrs.indexOf('PO');
  const folder = getFolder();
  const SEP = '|||', FSEP = '^^^';

  let result;
  if (type === 'photos') {
    const urls = (data.photos || []).map(ph => {
      if (ph.startsWith('http')) return ph;
      try {
        const mime = ph.split(';')[0].replace('data:', '') || 'image/jpeg';
        const b64  = ph.includes(',') ? ph.split(',')[1] : ph;
        const file = folder.createFile(
          Utilities.newBlob(Utilities.base64Decode(b64), mime, 'photo_' + Date.now() + '.jpg')
        );
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return 'https://drive.google.com/uc?export=view&id=' + file.getId();
      } catch(e) { return null; }
    }).filter(Boolean);
    result = urls.join(SEP);
  } else {
    const files = (data.files || []).map(f => {
      if (f.url.startsWith('http')) return f.name + FSEP + f.url;
      try {
        const mime = f.url.split(';')[0].replace('data:', '') || 'application/octet-stream';
        const b64  = f.url.includes(',') ? f.url.split(',')[1] : f.url;
        const file = folder.createFile(
          Utilities.newBlob(Utilities.base64Decode(b64), mime, f.name)
        );
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return f.name + FSEP + 'https://drive.google.com/uc?export=download&id=' + file.getId();
      } catch(e) { return null; }
    }).filter(Boolean);
    result = files.join(SEP);
  }

  const col = type === 'photos' ? 'Photos' : 'Files';
  if (!hdrs.includes(col)) { hdrs.push(col); sheet.getRange(1, hdrs.length).setValue(col); }
  const colIdx = hdrs.indexOf(col);

  for (let i = 1; i < all.length; i++) {
    if (String(all[i][poCol]).trim() === String(data.po).trim()) {
      sheet.getRange(i + 1, colIdx + 1).setValue(result);
      if (data.updated)   sheet.getRange(i + 1, hdrs.indexOf('Updated')   + 1).setValue(data.updated);
      if (data.updatedBy) sheet.getRange(i + 1, hdrs.indexOf('UpdatedBy') + 1).setValue(data.updatedBy);
      break;
    }
  }
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}

function getFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}
