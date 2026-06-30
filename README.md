# 📚 PPDB SMP Muhammadiyah 12 — Panduan Lengkap Pemasangan

## 🗂️ Struktur Proyek

```
ppdb-smpm12/
├── index.html          ← Halaman utama aplikasi
├── css/
│   └── style.css       ← Semua styling (tema Hijau Elegan)
├── js/
│   └── app.js          ← Logic JavaScript (CRUD, PDF, chart)
├── Code.gs             ← Google Apps Script (backend/API)
└── README.md           ← Panduan ini
```

---

## 🛠️ LANGKAH PEMASANGAN (Step-by-Step)

### LANGKAH 1 — Siapkan Google Sheets

1. Buka **Google Sheets** (sheets.google.com) → buat spreadsheet baru
2. Beri nama spreadsheet, contoh: `"Database PPDB SMPM12 2026"`
3. **Salin ID Spreadsheet** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[INI_ADALAH_ID_NYA]/edit
   ```
4. Anda tidak perlu membuat header kolom secara manual —
   Apps Script akan membuatnya otomatis saat pertama dijalankan.

   Namun jika ingin manual, buat header di baris 1 kolom A sampai M:
   ```
   A: nomorFormulir  | B: tanggalDaftar  | C: namaMurid    | D: jenisKelamin
   E: tempatLahir    | F: tanggalLahir   | G: namaOrtu     | H: asalSD
   I: tahunLulus     | J: alamat         | K: noTlp        | L: statusBayar
   M: keterangan
   ```

---

### LANGKAH 2 — Setup Google Apps Script

1. Di Google Sheets, klik menu **Extensions → Apps Script**
2. Hapus semua kode yang ada
3. **Salin semua isi file `Code.gs`** dan tempelkan
4. Edit baris konfigurasi:
   ```javascript
   const CONFIG = {
     SPREADSHEET_ID: 'ISI_ID_SPREADSHEET_ANDA_DISINI',
     SHEET_NAME: 'DataPPDB',
     ADMIN_USERNAME: 'admin',       // ← ganti username
     ADMIN_PASSWORD: 'ppdb2026',    // ← ganti password kuat!
     SECRET_TOKEN: 'SMPM12_SECRET_2026'  // ← ganti token unik
   };
   ```
5. Klik **Save** (ikon disket / Ctrl+S)

---

### LANGKAH 3 — Jalankan Setup Awal (sekali saja)

1. Di editor Apps Script, pilih fungsi `setupSpreadsheet` di dropdown
2. Klik tombol **▶ Run**
3. Izinkan permission yang diminta (klik "Review Permissions" → pilih akun Google Anda → "Allow")
4. Cek di Google Sheets — sheet "DataPPDB" dengan header sudah terbuat otomatis

---

### LANGKAH 4 — Deploy sebagai Web App

1. Di Apps Script, klik **Deploy → New Deployment**
2. Klik ikon ⚙️ di sebelah "Select Type" → pilih **Web App**
3. Isi pengaturan:
   ```
   Description    : PPDB SMPM12 API v1
   Execute as     : Me (akun Google Anda)
   Who has access : Anyone
   ```
4. Klik **Deploy**
5. **Salin URL Web App** yang muncul — bentuknya seperti:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

### LANGKAH 5 — Hubungkan Frontend ke API

1. Buka file **`js/app.js`**
2. Cari baris ini di bagian atas:
   ```javascript
   const API_URL = 'GANTI_DENGAN_URL_APPS_SCRIPT_ANDA';
   ```
3. Ganti dengan URL Web App yang Anda salin:
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```

---

### LANGKAH 6 — Jalankan Aplikasi

**Pilihan A — Buka langsung (paling mudah):**
- Cukup buka file `index.html` di browser Chrome/Edge/Firefox

**Pilihan B — Via Live Server (VS Code):**
1. Install extension "Live Server" di VS Code
2. Klik kanan `index.html` → "Open with Live Server"
3. Aplikasi terbuka di `http://localhost:5500`

**Pilihan C — Upload ke hosting:**
- Upload semua file ke hosting web Anda (shared hosting, Netlify, GitHub Pages, dll.)
- Tidak perlu server khusus — ini adalah static website murni

---

## 🔐 KREDENSIAL LOGIN DEFAULT

```
Username : admin
Password : ppdb2026
```

> ⚠️ Segera ganti password di `Code.gs` bagian CONFIG setelah pertama login!
> Setelah mengubah password, deploy ulang Apps Script (Deploy → Manage Deployments → Edit → Update)

---

## 🔄 CARA UPDATE APPS SCRIPT (Jika Ada Perubahan)

1. Edit kode di Apps Script Editor
2. Klik **Deploy → Manage Deployments**
3. Klik ✏️ Edit pada deployment yang ada
4. Pilih **New version** di dropdown Version
5. Klik **Deploy** — URL tidak berubah

---

## 📋 FITUR LENGKAP

| Fitur | Keterangan |
|-------|------------|
| ✅ Login Admin | Autentikasi dengan username & password |
| ✅ Dashboard Statistik | Widget total, lunas, belum lunas |
| ✅ Grafik Donut | Visualisasi persentase status pembayaran |
| ✅ Data Table | Tampilan rapi dengan pagination 10 data/halaman |
| ✅ Pencarian Real-time | Cari berdasarkan nama, nomor formulir, asal SD |
| ✅ Filter Status | Filter Lunas / Belum Lunas |
| ✅ Tambah Data | Form lengkap 13 field |
| ✅ Edit Data | Update data yang sudah ada |
| ✅ Hapus Data | Dengan konfirmasi modal |
| ✅ Generate Nomor | Otomatis format SMPM12-YYYY-XXX |
| ✅ Cetak PDF | Bukti pendaftaran resmi dengan kop surat |
| ✅ Responsif Mobile | Sidebar collapsible, layout adaptif |
| ✅ WhatsApp Link | Klik nomor WA langsung buka WhatsApp |

---

## 🐛 TROUBLESHOOTING

**Q: "Gagal terhubung ke server" saat login**
→ Pastikan `API_URL` di `app.js` sudah diisi dengan URL Apps Script yang benar
→ Pastikan Apps Script sudah di-deploy dengan pengaturan "Anyone can access"

**Q: Data tidak tersimpan ke Sheets**
→ Cek SPREADSHEET_ID di Code.gs sudah benar
→ Pastikan akun Google yang menjalankan Apps Script memiliki akses ke Sheets

**Q: PDF tidak bisa di-download**
→ Izinkan pop-up/download di browser (cek ikon di address bar)
→ Coba browser lain (Chrome direkomendasikan)

**Q: Login selalu gagal**
→ Cek username & password di CONFIG sudah sesuai
→ Setelah mengubah CONFIG, deploy ulang Apps Script

**Q: Chart tidak muncul**
→ Pastikan koneksi internet aktif (Chart.js dimuat via CDN)
→ Buka Console browser (F12) untuk cek error

---

## 🎨 KUSTOMISASI TEMA WARNA

Edit variabel CSS di `css/style.css` bagian `:root`:

```css
:root {
  --hijau-tua:  #1a5c38;   /* Warna utama (header, tombol) */
  --hijau-mid:  #217a49;   /* Warna menengah */
  --hijau-muda: #2d9e5f;   /* Aksen hijau terang */
  --mint:       #a8e6c2;   /* Mint lembut */
  --mint-pale:  #e8f7ef;   /* Background mint pucat */
}
```

---

## 📞 KETERANGAN KOLOM GOOGLE SHEETS

| Kolom | Nama Field | Keterangan |
|-------|-----------|------------|
| A | nomorFormulir | Nomor unik formulir (SMPM12-YYYY-XXX) |
| B | tanggalDaftar | Tanggal mendaftar (YYYY-MM-DD) |
| C | namaMurid | Nama lengkap calon murid |
| D | jenisKelamin | "Laki-laki" atau "Perempuan" |
| E | tempatLahir | Kota/tempat lahir |
| F | tanggalLahir | Tanggal lahir (YYYY-MM-DD) |
| G | namaOrtu | Nama orang tua/wali |
| H | asalSD | Nama SD/MI asal |
| I | tahunLulus | Tahun lulus SD |
| J | alamat | Alamat lengkap |
| K | noTlp | Nomor telepon/WhatsApp |
| L | statusBayar | "Lunas" atau "Belum Lunas" |
| M | keterangan | Catatan tambahan (opsional) |

---

*Dibuat untuk SMP Muhammadiyah 12 — Sistem PPDB Online 2025/2026*
