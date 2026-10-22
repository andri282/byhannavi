# 🛍️ byhannavi — Panduan Setup Lengkap

## Arsitektur
```
Telegram Bot → Google Apps Script → Google Sheets → Website (GitHub Pages)
```

---

## TAHAP 1: Setup Google Sheets

### 1.1 Buat Spreadsheet Baru
1. Buka [sheets.google.com](https://sheets.google.com)
2. Klik **+ Blank** untuk membuat spreadsheet baru
3. Beri nama: **byhannavi-data**
4. Catat **ID spreadsheet** dari URL:  
   `https://docs.google.com/spreadsheets/d/**[SHEET_ID]**/edit`

### 1.2 Buat Sheet "Preloved"
Buat sheet bernama **Preloved** dengan header di baris 1:

| nama | kategori | kondisi | ukuran | harga | deskripsi | foto | status | tanggal |
|------|----------|---------|--------|-------|-----------|------|--------|---------|

**Keterangan kolom:**
- `nama` — Nama barang (wajib)
- `kategori` — Baju / Tas / Sepatu / Outer / Aksesoris / dll
- `kondisi` — Like New / Good / Fair
- `ukuran` — S / M / L / XL / angka / tanda `-` jika tidak ada
- `harga` — Angka saja, contoh: `150000`
- `deskripsi` — Deskripsi singkat barang
- `foto` — URL foto (bisa dari Google Drive, Imgur, dll)
- `status` — `Available` atau `Sold`
- `tanggal` — Tanggal listing

### 1.3 Buat Sheet "Affiliate"
Buat sheet bernama **Affiliate** dengan header:

| nama | kategori | platform | harga | catatan | link | foto | tanggal |
|------|----------|----------|-------|---------|------|------|---------|

**Keterangan:**
- `platform` — Shopee / Tokopedia / Lazada
- `link` — Link affiliate produk
- `catatan` — Alasan rekomendasi / ulasan singkat

### 1.4 Publish Spreadsheet ke Web
1. Klik **File → Share → Publish to web**
2. Pilih **Seluruh dokumen** → **Comma-separated values (.csv)**
3. Klik **Publish** → **OK**

### 1.5 Ambil URL CSV
Format URL-nya:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/gviz/tq?tqx=out:csv&sheet=Preloved
https://docs.google.com/spreadsheets/d/[SHEET_ID]/gviz/tq?tqx=out:csv&sheet=Affiliate
```

---

## TAHAP 2: Update Config Website

Edit file `js/config.js`:

```javascript
const CONFIG = {
  whatsapp: '6281234567890',  // ← Nomor WA istri (tanpa +)
  
  // ← Ganti SHEET_ID dengan ID spreadsheet kamu
  sheetUrlPreloved: 'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&sheet=Preloved',
  sheetUrlAffiliate: 'https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&sheet=Affiliate',
  
  storeName: 'byhannavi',
  storeTagline: 'Preloved fashion pilihan, curated with love.',
  instagramUsername: 'byhannavi',
  threadsUsername: 'byhannavi',
};
```

---

## TAHAP 3: Setup Bot Telegram

### 3.1 Buat Bot Telegram
1. Buka [@BotFather](https://t.me/BotFather) di Telegram
2. Ketik `/newbot`
3. Ikuti instruksi, berikan nama bot: `byhannavi Bot`
4. Berikan username: `byhannavi_bot` (atau yang tersedia)
5. **Salin token** yang diberikan BotFather

### 3.2 Cari Chat ID kamu
1. Buka [@userinfobot](https://t.me/userinfobot) di Telegram
2. Klik Start
3. Salin **Id** yang ditampilkan (angka saja)

### 3.3 Setup Google Apps Script
1. Buka [script.google.com](https://script.google.com)
2. Klik **New Project**
3. Hapus semua kode yang ada
4. Copy-paste isi file `google-apps-script/Code.gs`
5. Edit 3 baris CONFIG di bagian atas:
   ```javascript
   const TELEGRAM_TOKEN = 'TOKEN_DARI_BOTFATHER';
   const SPREADSHEET_ID = 'ID_SPREADSHEET_KAMU';
   const ADMIN_CHAT_ID  = 'CHAT_ID_KAMU';
   ```

### 3.4 Deploy Apps Script
1. Klik **Deploy → New deployment**
2. Klik ikon ⚙️ di sebelah "Select type" → pilih **Web app**
3. Isi deskripsi: `byhannavi Bot v1`
4. **Execute as**: Me
5. **Who has access**: Anyone
6. Klik **Deploy**
7. Izinkan permissions yang diminta
8. **Salin URL deployment** (mirip: `https://script.google.com/macros/s/.../exec`)

### 3.5 Aktifkan Webhook
1. Di Apps Script editor, pilih function `setWebhook`
2. Klik **▶ Run**
3. Cek log — harus ada `{"ok":true}`

### 3.6 Test Bot
1. Buka bot di Telegram
2. Ketik `/start`
3. Bot akan menampilkan menu utama ✨

---

## TAHAP 4: Deploy ke GitHub Pages

### 4.1 Buat Repository
1. Buka [github.com](https://github.com) → **New repository**
2. Nama repo: `byhannavi` (atau `byhannavi.github.io`)
3. Set ke **Public**
4. Klik **Create repository**

### 4.2 Upload File
```bash
# Di folder project
git init
git add .
git commit -m "🚀 Initial byhannavi website"
git branch -M main
git remote add origin https://github.com/USERNAME/byhannavi.git
git push -u origin main
```

### 4.3 Aktifkan GitHub Pages
1. Buka repository → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → folder: **/ (root)**
4. Klik **Save**
5. Website kamu akan tersedia di:  
   `https://USERNAME.github.io/byhannavi`

---

## CARA PAKAI BOT TELEGRAM (Daily Use)

### Tambah Barang Preloved
Ketik `/preloved` atau klik **➕ Tambah Preloved** di menu.  
Bot akan tanya satu per satu:
1. Nama barang
2. Kategori
3. Kondisi
4. Ukuran
5. Harga
6. Deskripsi
7. Foto (kirim foto atau URL)

### Tambah Link Affiliate
Ketik `/affiliate` atau klik **🔗 Tambah Affiliate**  
Bot akan tanya: nama, kategori, platform, harga, catatan, link, foto

### Update Status Sold
```
/sold Blazer Cream Vintage
```

### Lihat Daftar Barang
```
/list          → daftar preloved
/listaffiliate → daftar affiliate
```

### Hapus Item
```
/hapus Blazer Cream Vintage
```

---

## FAQ

**Q: Foto dari Telegram bisa langsung tampil di web?**  
A: Foto yang dikirim via Telegram Bot akan disimpan URL-nya ke Google Sheets. URL foto dari Telegram berlaku selama bot masih aktif. Untuk jangka panjang, disarankan upload ke Google Drive atau Imgur dulu.

**Q: Berapa lama update data tampil di web?**  
A: Hampir instan! Google Sheets di-publish sebagai CSV dan web membacanya setiap kali halaman dibuka.

**Q: Apakah ada batasan jumlah produk?**  
A: Tidak ada! Google Sheets bisa menampung ribuan baris data secara gratis.

**Q: Bisa custom domain?**  
A: Bisa! Di GitHub Pages Settings, kamu bisa set custom domain seperti `byhannavi.com`.

---

*Made with 🤍 for byhannavi*
