// =============================================
//  byhannavi — Google Apps Script
//  Fungsi: Telegram Bot Webhook + Google Sheets
//
//  CARA SETUP:
//  1. Buka script.google.com → New Project
//  2. Copy-paste seluruh kode ini
//  3. Edit konstanta di bagian CONFIG di bawah
//  4. Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone
//  5. Copy URL deployment, paste ke Telegram setWebhook
// =============================================

// ── CONFIG — EDIT BAGIAN INI ──
const TELEGRAM_TOKEN = 'ISI_TOKEN_BOT_TELEGRAM_KAMU';
const SPREADSHEET_ID = 'ISI_ID_SPREADSHEET_KAMU';
const ADMIN_CHAT_ID  = 'ISI_CHAT_ID_TELEGRAM_KAMU';  // chat ID pemilik bot

// Sheet names
const SHEET_PRELOVED  = 'Preloved';
const SHEET_AFFILIATE = 'Affiliate';

// ── State management (per session via Cache)
const cache = CacheService.getScriptCache();

// ─────────────────────────────────────────────
//  WEBHOOK HANDLER
// ─────────────────────────────────────────────
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    // Anti-duplikat / retry Telegram
    if (update.update_id) {
      const lockKey = 'upd_' + update.update_id;
      if (cache.get(lockKey)) {
        return ContentService.createTextOutput('OK');
      }
      cache.put(lockKey, '1', 120);
    }
    handleUpdate(update);
  } catch (err) {
    Logger.log('Error: ' + err.toString());
  }
  return ContentService.createTextOutput('OK');
}


// ─────────────────────────────────────────────
//  COMMANDS
// ─────────────────────────────────────────────
function handleCommand(chatId, text, msg) {
  const cmd = text.split(' ')[0].toLowerCase();

  switch (cmd) {
    case '/start':
    case '/menu':
      clearState(chatId);
      sendMainMenu(chatId);
      break;

    case '/preloved':
      clearState(chatId);
      startPrelovedFlow(chatId);
      break;

    case '/affiliate':
      clearState(chatId);
      startAffiliateFlow(chatId);
      break;

    case '/list':
      sendProductList(chatId, SHEET_PRELOVED);
      break;

    case '/listaffiliate':
      sendProductList(chatId, SHEET_AFFILIATE);
      break;

    case '/sold': {
      const nama = text.replace('/sold', '').trim();
      if (nama) markAsSold(chatId, nama);
      else sendMessage(chatId, '⚠️ Gunakan format: /sold [nama barang]\nContoh: /sold Blazer Cream Vintage');
      break;
    }

    case '/hapus': {
      const nama = text.replace('/hapus', '').trim();
      if (nama) deleteRow(chatId, nama, SHEET_PRELOVED);
      else sendMessage(chatId, '⚠️ Gunakan format: /hapus [nama barang]');
      break;
    }

    default:
      sendMessage(chatId, '❓ Command tidak dikenal. Ketik /menu untuk melihat pilihan.');
  }
}

// ─────────────────────────────────────────────
//  MAIN MENU
// ─────────────────────────────────────────────
function sendMainMenu(chatId) {
  const text = `✨ *byhannavi Bot*\n\nHalo kak! Mau ngapain hari ini?`;
  const keyboard = {
    inline_keyboard: [
      [
        { text: '➕ Tambah Preloved', callback_data: 'add_preloved' },
        { text: '🔗 Tambah Affiliate', callback_data: 'add_affiliate' }
      ],
      [
        { text: '📋 List Preloved', callback_data: 'list_preloved' },
        { text: '📋 List Affiliate', callback_data: 'list_affiliate' }
      ],
      [
        { text: '✅ Mark SOLD', callback_data: 'mark_sold' },
        { text: '🗑️ Hapus Item', callback_data: 'delete_item' }
      ]
    ]
  };
  sendMessage(chatId, text, keyboard);
}

// ─────────────────────────────────────────────
//  CALLBACK QUERY HANDLER
// ─────────────────────────────────────────────
function handleUpdate_callbackQuery(update) {
  if (!update.callback_query) return;
  const query = update.callback_query;
  const chatId = String(query.message.chat.id);
  const data = query.data;

  answerCallbackQuery(query.id);

  switch (data) {
    case 'add_preloved':   startPrelovedFlow(chatId); break;
    case 'add_affiliate':  startAffiliateFlow(chatId); break;
    case 'list_preloved':  sendProductList(chatId, SHEET_PRELOVED); break;
    case 'list_affiliate': sendProductList(chatId, SHEET_AFFILIATE); break;
    case 'mark_sold':      sendMessage(chatId, 'Ketik /sold [nama barang]\nContoh: /sold Blazer Cream'); break;
    case 'delete_item':    sendMessage(chatId, 'Ketik /hapus [nama barang]\nContoh: /hapus Blazer Cream'); break;
  }
}

// Tambah callback query ke doPost handler
function handleUpdate(update) {
  if (update.callback_query) {
    handleUpdate_callbackQuery(update);
    return;
  }
  if (update.message) {
    const msg = update.message;
    const chatId = String(msg.chat.id);
    const text = (msg.text || '').trim();

    console.log('Incoming message from ' + chatId + ': ' + text);

    // Cek admin: jika ADMIN_CHAT_ID diisi dan bukan default, validasi
    if (ADMIN_CHAT_ID && ADMIN_CHAT_ID !== 'ISI_CHAT_ID_TELEGRAM_KAMU' && String(ADMIN_CHAT_ID).trim() !== '') {
      if (chatId !== String(ADMIN_CHAT_ID).trim()) {
        console.warn('Unauthorized chatId: ' + chatId + ', expected: ' + ADMIN_CHAT_ID);
        sendMessage(chatId, `🔒 ID Telegram kamu: \`${chatId}\`\nID ini belum cocok dengan ADMIN_CHAT_ID di script.`);
        return;
      }
    }

    const state = getState(chatId);
    console.log('Current state for ' + chatId + ': ' + JSON.stringify(state));

    if (text.startsWith('/')) {
      handleCommand(chatId, text, msg);
      return;
    }

    if (state && state.flow) {
      handleFlow(chatId, msg, state);
      return;
    }

    sendMainMenu(chatId);
  }
}

// ─────────────────────────────────────────────
//  STEP DEFINITIONS (Aman dari Entity Conflict Telegram)
// ─────────────────────────────────────────────
const PRELOVED_STEPS = [
  { field: 'nama', label: 'nama barang', hint: 'contoh: Blazer Vintage Cream' },
  { field: 'kategori', label: 'kategori barang', hint: 'contoh: Baju, Outer, Tas, Sepatu, dll' },
  { field: 'kondisi', label: 'kondisi barang', hint: 'contoh: Like New, Good, atau Fair' },
  { field: 'ukuran', label: 'ukuran barang', hint: 'contoh: S, M, L, XL, atau - jika all size' },
  { field: 'harga', label: 'harga jual', hint: 'angka saja, contoh: 150000' },
  { field: 'deskripsi', label: 'deskripsi singkat', hint: 'contoh: Baru 1x pakai, bahan tebal premium' },
  { field: 'foto', label: 'foto barang', hint: 'kirim foto, URL gambar, atau ketik - untuk lewati' }
];

const AFFILIATE_STEPS = [
  { field: 'nama', label: 'nama produk', hint: 'contoh: Wardah Lightening Set' },
  { field: 'kategori', label: 'kategori produk', hint: 'contoh: Skincare, Fashion, Perlengkapan Bayi' },
  { field: 'platform', label: 'nama platform', hint: 'contoh: Shopee, Tokopedia, TikTok Shop' },
  { field: 'harga', label: 'harga perkiraan', hint: 'angka saja contoh: 85000, atau - jika skip' },
  { field: 'catatan', label: 'catatan rekomendasi', hint: 'contoh: Bahannya sangat nyaman dan awet' },
  { field: 'link', label: 'link affiliate', hint: 'paste link Shopee atau Tokopedia kamu' },
  { field: 'foto', label: 'foto produk', hint: 'kirim foto, URL gambar, atau ketik - untuk lewati' }
];

function sendStepPrompt(chatId, flowName, stepIndex) {
  const steps = flowName === 'preloved' ? PRELOVED_STEPS : AFFILIATE_STEPS;
  const current = steps[stepIndex];
  const stepNum = stepIndex + 1;
  const total = steps.length;
  const title = flowName === 'preloved' ? '➕ *Tambah Barang Preloved*' : '🔗 *Tambah Produk Affiliate*';

  const text = `${title}\n\nLangkah ${stepNum}/${total}: Kirim *${current.label}*\n_(${current.hint})_`;
  sendMessage(chatId, text);
}

// ─────────────────────────────────────────────
//  FLOW STARTERS
// ─────────────────────────────────────────────
function startPrelovedFlow(chatId) {
  setState(chatId, { flow: 'preloved', step: 'nama', data: {} });
  sendStepPrompt(chatId, 'preloved', 0);
}

function startAffiliateFlow(chatId) {
  setState(chatId, { flow: 'affiliate', step: 'nama', data: {} });
  sendStepPrompt(chatId, 'affiliate', 0);
}

// ─────────────────────────────────────────────
//  FLOW HANDLER (Unified & Bulletproof)
// ─────────────────────────────────────────────
function handleFlow(chatId, msg, state) {
  const text = (msg.text || '').trim();
  const photo = msg.photo;
  const steps = state.flow === 'preloved' ? PRELOVED_STEPS : AFFILIATE_STEPS;
  const stepIndex = steps.findIndex(s => s.field === state.step);

  if (stepIndex === -1) {
    clearState(chatId);
    sendMainMenu(chatId);
    return;
  }

  const current = steps[stepIndex];

  // ── Step terakhir: Foto
  if (current.field === 'foto') {
    let fotoUrl = '';
    if (photo && photo.length > 0) {
      fotoUrl = getFileUrl(photo[photo.length - 1].file_id);
    } else if (text.startsWith('http')) {
      fotoUrl = text;
    } else if (text === '-') {
      fotoUrl = '';
    } else {
      sendMessage(chatId, '⚠️ Kirim foto produk, link gambar, atau ketik - untuk lewati.');
      return;
    }

    if (!state.data) state.data = {};
    state.data.foto = fotoUrl;

    if (state.flow === 'preloved') {
      saveToSheet(SHEET_PRELOVED, [
        state.data.nama || '-', state.data.kategori || '-', state.data.kondisi || '-',
        state.data.ukuran || '-', state.data.harga || '0', state.data.deskripsi || '-',
        fotoUrl, 'Available', new Date().toLocaleDateString('id-ID')
      ]);
      sendMessage(chatId, `✅ *Berhasil Ditambahkan!*\n\n🏷️ ${state.data.nama}\n📦 ${state.data.kategori} · ${state.data.kondisi}\n💰 Rp ${Number(state.data.harga || 0).toLocaleString('id-ID')}\n\nBarang sudah tampil di website byhannavi! 🎉`);
    } else {
      saveToSheet(SHEET_AFFILIATE, [
        state.data.nama || '-', state.data.kategori || '-', state.data.platform || '-',
        state.data.harga || '-', state.data.catatan || '-', state.data.link || '-',
        fotoUrl, new Date().toLocaleDateString('id-ID')
      ]);
      sendMessage(chatId, `✅ *Rekomendasi Ditambahkan!*\n\n🔗 ${state.data.nama}\n🛒 ${state.data.platform}\n\nProduk sudah tampil di halaman Rekomendasi byhannavi! 🎉`);
    }

    clearState(chatId);
    sendMainMenu(chatId);
    return;
  }

  // ── Step input teks
  if (!text) {
    sendMessage(chatId, `⚠️ Tolong kirimkan teks untuk ${current.label}`);
    return;
  }

  if (!state.data) state.data = {};
  state.data[current.field] = text;

  // Lanjut ke step berikutnya
  const nextIndex = stepIndex + 1;
  state.step = steps[nextIndex].field;
  setState(chatId, state);

  sendStepPrompt(chatId, state.flow, nextIndex);
}


// ─────────────────────────────────────────────
//  SHEETS HELPERS
// ─────────────────────────────────────────────
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    // Format header
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a1a1a').setFontColor('#d4af37')
      .setFontWeight('bold');
  }
  return sheet;
}

function saveToSheet(sheetName, data) {
  let headers, sheet;
  if (sheetName === SHEET_PRELOVED) {
    headers = ['nama', 'kategori', 'kondisi', 'ukuran', 'harga', 'deskripsi', 'foto', 'status', 'tanggal'];
    sheet = getOrCreateSheet(sheetName, headers);
  } else {
    headers = ['nama', 'kategori', 'platform', 'harga', 'catatan', 'link', 'foto', 'tanggal'];
    sheet = getOrCreateSheet(sheetName, headers);
  }
  sheet.appendRow(data);
}

function sendProductList(chatId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) { sendMessage(chatId, `Sheet "${sheetName}" belum ada.`); return; }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) { sendMessage(chatId, `📋 Sheet "${sheetName}" masih kosong.`); return; }

    const headers = data[0];
    const rows = data.slice(1).filter(r => r[0]);

    let list = `📋 *${sheetName}* (${rows.length} item)\n\n`;
    rows.slice(0, 20).forEach((row, i) => {
      const nama = row[0] || '-';
      const status = sheetName === SHEET_PRELOVED ? ` · ${row[7] || 'Available'}` : '';
      const harga = row[sheetName === SHEET_PRELOVED ? 4 : 3];
      const hargaStr = harga ? ` · Rp ${Number(harga).toLocaleString('id-ID')}` : '';
      list += `${i + 1}. *${nama}*${hargaStr}${status}\n`;
    });

    if (rows.length > 20) list += `\n_...dan ${rows.length - 20} item lainnya_`;

    sendMessage(chatId, list);
  } catch (err) {
    sendMessage(chatId, '⚠️ Gagal membaca sheet: ' + err.message);
  }
}

function markAsSold(chatId, nama) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_PRELOVED);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const namaIdx = headers.indexOf('nama');
    const statusIdx = headers.indexOf('status');

    let found = false;
    for (let i = 1; i < data.length; i++) {
      if ((data[i][namaIdx] || '').toLowerCase().includes(nama.toLowerCase())) {
        sheet.getRange(i + 1, statusIdx + 1).setValue('Sold');
        found = true;
        sendMessage(chatId, `✅ *${data[i][namaIdx]}* sudah ditandai SOLD!`);
        break;
      }
    }
    if (!found) sendMessage(chatId, `⚠️ Barang "${nama}" tidak ditemukan.`);
  } catch (err) {
    sendMessage(chatId, '⚠️ Error: ' + err.message);
  }
}

function deleteRow(chatId, nama, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const namaIdx = data[0].indexOf('nama');

    let found = false;
    for (let i = data.length - 1; i >= 1; i--) {
      if ((data[i][namaIdx] || '').toLowerCase().includes(nama.toLowerCase())) {
        sheet.deleteRow(i + 1);
        found = true;
        sendMessage(chatId, `🗑️ *${data[i][namaIdx]}* berhasil dihapus dari ${sheetName}.`);
        break;
      }
    }
    if (!found) sendMessage(chatId, `⚠️ "${nama}" tidak ditemukan.`);
  } catch (err) {
    sendMessage(chatId, '⚠️ Error: ' + err.message);
  }
}

// ─────────────────────────────────────────────
//  TELEGRAM API HELPERS
// ─────────────────────────────────────────────

function sendMessage(chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) payload.reply_markup = JSON.stringify(replyMarkup);

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const resultText = res.getContentText();
    console.log('Telegram response: ' + resultText);
    const json = JSON.parse(resultText);
    // Jika format Markdown gagal diparse oleh Telegram, kirim ulang sebagai plain text
    if (!json.ok && json.description && json.description.includes('entities')) {
      delete payload.parse_mode;
      UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    }
  } catch (err) {
    console.error('sendMessage fetch error: ' + err);
  }
}

function answerCallbackQuery(queryId) {
  UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ callback_query_id: queryId }),
    muteHttpExceptions: true
  });
}

function getFileUrl(fileId) {
  try {
    const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json.ok) {
      return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${json.result.file_path}`;
    }
  } catch(e) {}
  return '';
}

// ─────────────────────────────────────────────
//  STATE MANAGEMENT (via PropertiesService - 100% Persisten & Anti-Reset)
// ─────────────────────────────────────────────
function getState(chatId) {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('state_' + chatId);
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    console.error('getState error: ' + e);
    return null;
  }
}

function setState(chatId, state) {
  try {
    PropertiesService.getScriptProperties().setProperty('state_' + chatId, JSON.stringify(state));
  } catch(e) {
    console.error('setState error: ' + e);
  }
}

function clearState(chatId) {
  try {
    PropertiesService.getScriptProperties().deleteProperty('state_' + chatId);
  } catch(e) {
    console.error('clearState error: ' + e);
  }
}


function setWebhook() {
  const webhookUrl = ScriptApp.getService().getUrl();
  const res = UrlFetchApp.fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`,
    { muteHttpExceptions: true }
  );
  Logger.log(res.getContentText());
}

function clearPendingUpdates() {
  const res = UrlFetchApp.fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook?drop_pending_updates=true`,
    { muteHttpExceptions: true }
  );
  Logger.log('Delete webhook & drop pending: ' + res.getContentText());
  setWebhook();
}

// ─────────────────────────────────────────────
//  TEST FUNCTION (untuk debug di Apps Script)
// ─────────────────────────────────────────────
function testSendMessage() {
  sendMessage(ADMIN_CHAT_ID, '✅ Bot byhannavi aktif! Ketik /menu untuk mulai.');
}

