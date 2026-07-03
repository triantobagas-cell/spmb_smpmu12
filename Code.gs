// ============================================================
// PPDB SMP MUHAMMADIYAH 12 - Google Apps Script Backend v3
// ============================================================
// ⚠️  WAJIB DIISI SEBELUM DEPLOY:
//     Ganti nilai SPREADSHEET_ID di bawah ini
// ============================================================

var SPREADSHEET_ID  = '1CWPOt64AeDgnJuRXpsxXnVVog0p6335-o4pCSaz-I0M'; // ← WAJIB GANTI
var SHEET_NAME      = 'DataPPDB';
var ADMIN_USERNAME  = 'admin';
var ADMIN_PASSWORD  = admin1234';   // ← Ganti password Anda
var SECRET_TOKEN    = 'TOKEN_SMPM12_2026'; // ← Bisa diganti string unik apapun

// ============================================================
// ENTRY POINT — semua request masuk ke sini
// ============================================================
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var params = {};
    
    if (e && e.parameter) {
      for (var k in e.parameter) {
        params[k] = e.parameter[k];
      }
    }
    
    if (e && e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        for (var k in body) {
          params[k] = body[k];
        }
      } catch(parseErr) {}
    }

    var action = params.action || '';
    var result;

    switch (action) {
      case 'ping':        result = handlePing();                break;
      case 'login':       result = handleLogin(params);         break;
      case 'getData':     result = handleGetData(params);       break;
      case 'addData':     result = handleAddData(params);       break;
      case 'updateData':  result = handleUpdateData(params);    break;
      case 'deleteData':  result = handleDeleteData(params);    break;
      case 'getStats':    result = handleGetStats(params);      break;
      case 'generateNomor': result = handleGenerateNomor(params); break;
      case 'addPembayaran': result = handleAddPembayaran(params); break;
      case 'getPembayaran': result = handleGetPembayaran(params); break;
      default:
        result = {
          success: false,
          message: 'Action tidak dikenal: "' + action + '"'
        };
    }

    return output(result);

  } catch (err) {
    return output({
      success: false,
      message: 'SERVER ERROR: ' + err.message,
      stack: err.stack
    });
  }
}

function output(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// PING
// ============================================================
function handlePing() {
  var status = 'OK';
  var sheetStatus = 'UNKNOWN';
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    sheetStatus = sheet ? 'SHEET_DITEMUKAN' : 'SHEET_BELUM_ADA';
  } catch (err) {
    status = 'ERROR';
    sheetStatus = 'GAGAL_BUKA_SPREADSHEET: ' + err.message;
  }

  return {
    success: true,
    status: status,
    pesan: 'Server PPDB SMPM12 v3 berjalan normal',
    spreadsheet_id: SPREADSHEET_ID,
    sheet_name: SHEET_NAME,
    sheet_status: sheetStatus,
    waktu_server: new Date().toString()
  };
}

// ============================================================
// LOGIN
// ============================================================
function handleLogin(params) {
  if (params.username === ADMIN_USERNAME && params.password === ADMIN_PASSWORD) {
    return {
      success: true,
      token: SECRET_TOKEN,
      message: 'Login berhasil. Selamat datang, ' + params.username + '!'
    };
  }
  return { success: false, message: 'Username atau password salah.' };
}

// ============================================================
// GET DATA
// ============================================================
function handleGetData(params) {
  if (!cekToken(params)) return aksesditolak();

  var sheet = getOrCreateSheet();
  var allValues = sheet.getDataRange().getValues();

  if (allValues.length <= 1) {
    return { success: true, data: [], total: 0 };
  }

  // BUG FIX: header pada sheet kadang punya spasi tersisa (mis. "nomorFormulir ")
  // sehingga key tidak sama dengan yang dipakai di frontend (row.nomorFormulir).
  // Akibatnya data tidak pernah tampil di menu Pendaftar walau sheet terisi.
  var headers = allValues[0].map(function (h) { return String(h).trim(); });
  var rows = allValues.slice(1);
  var result = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0] && !row[2]) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
      } else if (typeof val === 'number') {
        // BUG FIX: kolom seperti noTlp/nomorFormulir bisa otomatis dibaca
        // sebagai Number oleh Sheets, sehingga method string (.replace,
        // .toLowerCase) di frontend gagal dan menggagalkan render tabel.
        val = String(val);
      }
      obj[headers[j]] = val !== undefined && val !== null ? val : '';
    }
    obj._rowIndex = i + 2;
    result.push(obj);
  }

  return { success: true, data: result, total: result.length };
}

// ============================================================
// ADD DATA — sekarang 16 kolom (tambah uangFormulir, uangSPP, uangKegiatan)
// ============================================================
function handleAddData(params) {
  if (!cekToken(params)) return aksesditolak();

  var sheet = getOrCreateSheet();

  var newRow = [
    params.nomorFormulir  || '',
    params.tanggalDaftar  || '',
    params.namaMurid      || '',
    params.jenisKelamin   || '',
    params.tempatLahir    || '',
    params.tanggalLahir   || '',
    params.namaOrtu       || '',
    params.asalSD         || '',
    params.tahunLulus     || '',
    params.alamat         || '',
    params.noTlp          || '',
    params.statusBayar    || '',
    params.keterangan     || '',
    params.uangFormulir   || 0,
    params.uangSPP        || 0,
    params.uangKegiatan   || 0
  ];

  sheet.appendRow(newRow);

  return {
    success: true,
    message: 'Data "' + params.namaMurid + '" berhasil ditambahkan.'
  };
}

// ============================================================
// UPDATE DATA — 16 kolom
// ============================================================
function handleUpdateData(params) {
  if (!cekToken(params)) return aksesditolak();

  var rowIndex = parseInt(params._rowIndex, 10);
  if (!rowIndex || rowIndex < 2) {
    return { success: false, message: 'Row index tidak valid.' };
  }

  var sheet = getOrCreateSheet();

  sheet.getRange(rowIndex, 1, 1, 16).setValues([[
    params.nomorFormulir  || '',
    params.tanggalDaftar  || '',
    params.namaMurid      || '',
    params.jenisKelamin   || '',
    params.tempatLahir    || '',
    params.tanggalLahir   || '',
    params.namaOrtu       || '',
    params.asalSD         || '',
    params.tahunLulus     || '',
    params.alamat         || '',
    params.noTlp          || '',
    params.statusBayar    || '',
    params.keterangan     || '',
    params.uangFormulir   || 0,
    params.uangSPP        || 0,
    params.uangKegiatan   || 0
  ]]);

  return { success: true, message: 'Data berhasil diperbarui.' };
}

// ============================================================
// DELETE DATA
// ============================================================
function handleDeleteData(params) {
  if (!cekToken(params)) return aksesditolak();

  var rowIndex = parseInt(params._rowIndex, 10);
  if (!rowIndex || rowIndex < 2) {
    return { success: false, message: 'Row index tidak valid.' };
  }

  var sheet = getOrCreateSheet();
  sheet.deleteRow(rowIndex);

  return { success: true, message: 'Data berhasil dihapus.' };
}

// ============================================================
// GET STATISTIK
// ============================================================
function handleGetStats(params) {
  if (!cekToken(params)) return aksesditolak();

  var sheet = getOrCreateSheet();
  var allValues = sheet.getDataRange().getValues();
  var rows = allValues.slice(1).filter(function(r) { return r[0]; });

  var total      = rows.length;
  var lunas      = 0;
  var belumLunas = 0;
  var totalFormulir  = 0;
  var totalSPP       = 0;
  var totalKegiatan  = 0;

  for (var i = 0; i < rows.length; i++) {
    var status = rows[i][11];
    if (status === 'Lunas') lunas++;
    else if (status === 'Belum Lunas') belumLunas++;
    
    totalFormulir  += parseFloat(rows[i][13]) || 0;
    totalSPP       += parseFloat(rows[i][14]) || 0;
    totalKegiatan  += parseFloat(rows[i][15]) || 0;
  }

  return {
    success: true,
    stats: {
      total: total,
      lunas: lunas,
      belumLunas: belumLunas,
      totalFormulir: totalFormulir,
      totalSPP: totalSPP,
      totalKegiatan: totalKegiatan,
      totalPenerimaan: totalFormulir + totalSPP + totalKegiatan
    }
  };
}

// ============================================================
// GENERATE NOMOR FORMULIR
// ============================================================
function handleGenerateNomor(params) {
  if (!cekToken(params)) return aksesditolak();

  var sheet   = getOrCreateSheet();
  var lastRow = sheet.getLastRow();
  var year    = new Date().getFullYear();
  var nomor   = String(lastRow).padStart(3, '0');

  return {
    success: true,
    nomor: 'SMPM12-' + year + '-' + nomor
  };
}

// ============================================================
// ADD PEMBAYARAN (update kolom pembayaran saja)
// ============================================================
function handleAddPembayaran(params) {
  if (!cekToken(params)) return aksesditolak();

  var rowIndex = parseInt(params._rowIndex, 10);
  if (!rowIndex || rowIndex < 2) {
    return { success: false, message: 'Row index tidak valid.' };
  }

  var sheet = getOrCreateSheet();
  
  // Update kolom N (14), O (15), P (16) = uangFormulir, uangSPP, uangKegiatan
  sheet.getRange(rowIndex, 14, 1, 3).setValues([[
    parseFloat(params.uangFormulir)  || 0,
    parseFloat(params.uangSPP)       || 0,
    parseFloat(params.uangKegiatan)  || 0
  ]]);

  // Hitung total dan update status jika diperlukan
  var total = (parseFloat(params.uangFormulir) || 0) +
              (parseFloat(params.uangSPP) || 0) +
              (parseFloat(params.uangKegiatan) || 0);

  return {
    success: true,
    message: 'Data pembayaran berhasil disimpan. Total: Rp ' + total.toLocaleString('id-ID')
  };
}

// ============================================================
// GET PEMBAYARAN
// ============================================================
function handleGetPembayaran(params) {
  if (!cekToken(params)) return aksesditolak();

  var sheet = getOrCreateSheet();
  var allValues = sheet.getDataRange().getValues();
  var headers = allValues[0];
  var rows = allValues.slice(1);
  var result = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0] && !row[2]) continue;
    result.push({
      _rowIndex: i + 2,
      nomorFormulir: row[0] || '',
      namaMurid: row[2] || '',
      statusBayar: row[11] || '',
      uangFormulir: parseFloat(row[13]) || 0,
      uangSPP: parseFloat(row[14]) || 0,
      uangKegiatan: parseFloat(row[15]) || 0,
      totalBayar: (parseFloat(row[13]) || 0) + (parseFloat(row[14]) || 0) + (parseFloat(row[15]) || 0)
    });
  }

  return { success: true, data: result, total: result.length };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getOrCreateSheet() {
  // BUG FIX: jika SPREADSHEET_ID belum diganti dari placeholder, openById()
  // akan melempar error generik yang membuat menu Pendaftar tampak "rusak"
  // tanpa pesan yang jelas. Berikan pesan yang jelas di sini.
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'GANTI_ID_SPREADSHEET_ANDA_DISINI') {
    throw new Error('SPREADSHEET_ID belum diisi di Code.gs. Ganti dengan ID Google Spreadsheet Anda.');
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);

    var headers = [
      'nomorFormulir',
      'tanggalDaftar',
      'namaMurid',
      'jenisKelamin',
      'tempatLahir',
      'tanggalLahir',
      'namaOrtu',
      'asalSD',
      'tahunLulus',
      'alamat',
      'noTlp',
      'statusBayar',
      'keterangan',
      'uangFormulir',
      'uangSPP',
      'uangKegiatan'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1a5c38');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);

    Logger.log('Sheet "' + SHEET_NAME + '" berhasil dibuat dengan ' + headers.length + ' kolom.');
  }

  return sheet;
}

function cekToken(params) {
  return params.token === SECRET_TOKEN;
}

function aksesditolak() {
  return { success: false, message: 'Akses ditolak. Token tidak valid.' };
}

// ============================================================
// SETUP — Jalankan MANUAL sekali saja
// ============================================================
function setupAwal() {
  try {
    var sheet = getOrCreateSheet();
    Logger.log('✅ BERHASIL! Sheet "' + sheet.getName() + '" siap digunakan.');
    Logger.log('   Spreadsheet ID : ' + SPREADSHEET_ID);
    Logger.log('   Jumlah kolom   : ' + sheet.getLastColumn());
    SpreadsheetApp.flush();
  } catch(err) {
    Logger.log('❌ GAGAL: ' + err.message);
  }
}

function testKoneksi() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✅ Spreadsheet: ' + ss.getName());
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (sheet) {
      Logger.log('✅ Sheet "' + SHEET_NAME + '" ditemukan. Baris: ' + sheet.getLastRow());
    } else {
      Logger.log('⚠️  Sheet belum ada. Jalankan setupAwal() dahulu.');
    }
  } catch(err) {
    Logger.log('❌ Gagal: ' + err.message);
  }
}
