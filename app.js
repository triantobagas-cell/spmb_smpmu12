/* ═══════════════════════════════════════════════════════
   PPDB SMP MUHAMMADIYAH 12 — JavaScript Utama v3
   Fixes: Bug index tabel, fitur PDF, fitur Pembayaran
══════════════════════════════════════════════════════════ */

// ─── KONFIGURASI ───────────────────────────────────────
const API_URL = 'https://script.google.com/macros/s/AKfycbws15d0imVW69UOdZ5MBwxdVMVy6x2vpbvzK9o3aFj-ZU00pBR9u2w-dy_YMsCSGbTp/exec';

// ─── STATE APLIKASI ────────────────────────────────────
let state = {
  token: null,
  allData: [],
  filteredData: [],
  pembayaranData: [],
  filteredPembayaran: [],
  currentPage: 1,
  currentPembayaranPage: 1,
  perPage: 10,
  chart: null,
  deleteTarget: null,
  editPembayaranRow: null,
};

// ══════════════════════════════════════════════════════════
// INISIALISASI
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const savedToken = sessionStorage.getItem('ppdb_token');
  if (savedToken) {
    state.token = savedToken;
    showApp();
  }
  setTodayDate();
  document.getElementById('loginPassword').addEventListener('keypress', e => {
    if (e.key === 'Enter') doLogin();
  });
});

// ══════════════════════════════════════════════════════════
// AUTENTIKASI
// ══════════════════════════════════════════════════════════
async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  const btnLogin = document.getElementById('btnLogin');

  if (!username || !password) {
    showLoginError('Username dan password wajib diisi.');
    return;
  }

  btnLogin.disabled = true;
  document.getElementById('loginText').textContent = 'Memverifikasi...';
  document.getElementById('loginSpinner').classList.remove('hidden');
  errorDiv.classList.add('hidden');

  try {
    const res = await apiCall('login', { username, password });
    if (res.success) {
      state.token = res.token;
      sessionStorage.setItem('ppdb_token', res.token);
      showApp();
    } else {
      showLoginError(res.message || 'Login gagal.');
    }
  } catch (err) {
    showLoginError('Gagal terhubung ke server. Periksa URL API Anda.');
  } finally {
    btnLogin.disabled = false;
    document.getElementById('loginText').textContent = 'Masuk';
    document.getElementById('loginSpinner').classList.add('hidden');
  }
}

function showLoginError(msg) {
  const div = document.getElementById('loginError');
  div.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
  div.classList.remove('hidden');
}

function doLogout() {
  if (!confirm('Apakah Anda yakin ingin keluar?')) return;
  state.token = null;
  sessionStorage.removeItem('ppdb_token');
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

function togglePw() {
  const inp = document.getElementById('loginPassword');
  const icon = document.getElementById('eyeIcon');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    inp.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

// ══════════════════════════════════════════════════════════
// TAMPILAN & NAVIGASI
// ══════════════════════════════════════════════════════════
function showApp() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  loadDashboard();
}

function showSection(section, navEl) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  let sectionId, title;
  if (section === 'dashboard') {
    sectionId = 'sectionDashboard';
    title = 'Dashboard';
  } else if (section === 'dataTable') {
    sectionId = 'sectionDataTable';
    title = 'Data Pendaftar';
    loadData();
  } else if (section === 'tambah') {
    sectionId = 'sectionTambah';
    title = 'Tambah Pendaftar';
    resetForm();
  } else if (section === 'pembayaran') {
    sectionId = 'sectionPembayaran';
    title = 'Input Pembayaran';
    loadPembayaran();
  }

  document.getElementById(sectionId).classList.add('active');
  document.getElementById('topbarTitle').textContent = title;
  if (navEl) navEl.classList.add('active');
  closeSidebarMobile();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

function closeSidebarMobile() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }
}

function refreshData() {
  const btn = document.querySelector('.btn-refresh i');
  btn.style.animation = 'spin 0.5s linear';
  setTimeout(() => { btn.style.animation = ''; }, 500);
  const activeSection = document.querySelector('.content-section.active');
  if (activeSection.id === 'sectionDashboard') loadDashboard();
  else if (activeSection.id === 'sectionDataTable') loadData();
  else if (activeSection.id === 'sectionPembayaran') loadPembayaran();
}

// ══════════════════════════════════════════════════════════
// DASHBOARD & STATISTIK
// ══════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const res = await apiCall('getStats', { token: state.token });
    if (res.success) {
      const s = res.stats;
      document.getElementById('statTotal').textContent = s.total;
      document.getElementById('statLunas').textContent = s.lunas;
      document.getElementById('statBelum').textContent = s.belumLunas;
      // Update stat penerimaan jika ada elemennya
      const elPenerimaan = document.getElementById('statPenerimaan');
      if (elPenerimaan && s.totalPenerimaan !== undefined) {
        elPenerimaan.textContent = formatRupiah(s.totalPenerimaan);
      }
      renderChart(s.lunas, s.belumLunas);
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

function renderChart(lunas, belum) {
  const ctx = document.getElementById('paymentChart');
  if (!ctx) return;
  if (state.chart) state.chart.destroy();

  const total = lunas + belum;
  const pctLunas = total > 0 ? Math.round((lunas / total) * 100) : 0;
  const pctBelum = 100 - pctLunas;

  if (total === 0) {
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    document.getElementById('chartLegend').innerHTML = '<p style="color:#aaa;font-size:13px">Belum ada data</p>';
    return;
  }

  state.chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Lunas', 'Belum Lunas'],
      datasets: [{
        data: [lunas, belum],
        backgroundColor: ['#1a5c38', '#e53e3e'],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} orang` }
        }
      }
    }
  });

  document.getElementById('chartLegend').innerHTML = `
    <div class="legend-item">
      <div class="legend-dot" style="background:#1a5c38"></div>
      <div><strong>${lunas}</strong> Lunas <span style="color:#888">(${pctLunas}%)</span></div>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background:#e53e3e"></div>
      <div><strong>${belum}</strong> Belum Lunas <span style="color:#888">(${pctBelum}%)</span></div>
    </div>
    <div class="legend-item" style="margin-top:8px;padding-top:8px;border-top:1px solid #eee">
      <div class="legend-dot" style="background:#888"></div>
      <div><strong>${total}</strong> Total Pendaftar</div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// DATA TABLE — BUG FIX: gunakan _rowIndex & index global
// ══════════════════════════════════════════════════════════
async function loadData() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = `<tr><td colspan="9" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>`;

  try {
    const res = await apiCall('getData', { token: state.token });
    if (res.success) {
      // BUG FIX: pastikan setiap field bertipe string agar method seperti
      // .toLowerCase() / .replace() di filterTable & cleanPhone tidak gagal
      // ketika Google Sheets mengembalikan angka (mis. No. WA / No. Formulir).
      state.allData = (res.data || []).map(normalizeRow);
      filterTable();
    } else {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row"><i class="fas fa-exclamation-triangle"></i> ${res.message}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row"><i class="fas fa-wifi-slash"></i> Gagal memuat data: ${err.message}</td></tr>`;
    console.error(err);
  }
}

// BUG FIX: helper untuk menyamakan tipe data dari backend (Google Sheets
// kadang mengirim Number untuk kolom yang seharusnya teks).
function normalizeRow(row) {
  const out = { ...row };
  ['nomorFormulir', 'namaMurid', 'asalSD', 'namaOrtu', 'noTlp', 'jenisKelamin',
   'statusBayar', 'tanggalDaftar', 'tanggalLahir', 'tempatLahir', 'alamat',
   'keterangan', 'tahunLulus'].forEach(key => {
    if (out[key] !== undefined && out[key] !== null) out[key] = String(out[key]);
  });
  return out;
}

function filterTable() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const status = document.getElementById('filterStatus')?.value || '';

  state.filteredData = state.allData.filter(row => {
    const matchSearch = !q ||
      String(row.namaMurid || '').toLowerCase().includes(q) ||
      String(row.nomorFormulir || '').toLowerCase().includes(q) ||
      String(row.asalSD || '').toLowerCase().includes(q) ||
      String(row.namaOrtu || '').toLowerCase().includes(q);
    const matchStatus = !status || row.statusBayar === status;
    return matchSearch && matchStatus;
  });

  state.currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const start = (state.currentPage - 1) * state.perPage;
  const end = start + state.perPage;
  const pageData = state.filteredData.slice(start, end);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row"><i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:8px"></i> Tidak ada data pendaftar</td></tr>`;
    renderPagination();
    return;
  }

  try {
    tbody.innerHTML = pageData.map((row, idx) => {
      const no = start + idx + 1;
      const tgl = formatDate(row.tanggalDaftar);
      const statusBadge = row.statusBayar === 'Lunas'
        ? `<span class="badge-status badge-lunas"><i class="fas fa-check-circle"></i> Lunas</span>`
        : `<span class="badge-status badge-belum"><i class="fas fa-clock"></i> Belum Lunas</span>`;

      // BUG FIX: simpan _rowIndex di data-attribute, bukan pakai indexOf
      const rowIndex = row._rowIndex;
      const allDataIdx = state.allData.findIndex(r => r._rowIndex === rowIndex);

      return `
        <tr>
          <td style="color:#888;font-size:12px">${no}</td>
          <td><strong style="font-size:12px;color:#1a5c38">${row.nomorFormulir}</strong></td>
          <td style="font-size:12px;color:#666">${tgl}</td>
          <td>
            <div style="font-weight:600">${row.namaMurid}</div>
            <div style="font-size:11px;color:#888">${row.namaOrtu}</div>
          </td>
          <td style="font-size:13px">${row.jenisKelamin === 'Laki-laki' ? '♂ L' : '♀ P'}</td>
          <td style="font-size:12px">${row.asalSD}</td>
          <td style="font-size:12px"><a href="https://wa.me/${cleanPhone(row.noTlp)}" target="_blank" style="color:#1a5c38;text-decoration:none"><i class="fab fa-whatsapp"></i> ${row.noTlp}</a></td>
          <td>${statusBadge}</td>
          <td>
            <div class="action-btns">
              <button class="btn-icon btn-edit" onclick="editRow(${allDataIdx})" title="Edit">
                <i class="fas fa-pen"></i>
              </button>
              <button class="btn-icon btn-delete" onclick="confirmDelete(${allDataIdx})" title="Hapus">
                <i class="fas fa-trash"></i>
              </button>
              <button class="btn-icon btn-pdf" onclick="cetakPDF(${allDataIdx})" title="Unduh Bukti Pendaftaran (PDF)">
                <i class="fas fa-file-pdf"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Gagal merender tabel pendaftar:', err);
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row"><i class="fas fa-exclamation-triangle"></i> Terjadi kesalahan saat menampilkan data: ${err.message}</td></tr>`;
  }

  renderPagination();
}

function renderPagination() {
  const total = state.filteredData.length;
  const pages = Math.ceil(total / state.perPage);
  const cp = state.currentPage;

  document.getElementById('pageInfo').textContent =
    total === 0 ? 'Tidak ada data' :
    `Menampilkan ${Math.min((cp-1)*state.perPage+1, total)}–${Math.min(cp*state.perPage, total)} dari ${total} data`;

  const ctrl = document.getElementById('pageControls');
  if (pages <= 1) { ctrl.innerHTML = ''; return; }

  let btns = `<button class="page-btn" onclick="goPage(${cp-1})" ${cp===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= cp-1 && i <= cp+1)) {
      btns += `<button class="page-btn ${i===cp?'active':''}" onclick="goPage(${i})">${i}</button>`;
    } else if (i === cp-2 || i === cp+2) {
      btns += `<span style="padding:0 4px;color:#888">…</span>`;
    }
  }
  btns += `<button class="page-btn" onclick="goPage(${cp+1})" ${cp===pages?'disabled':''}>›</button>`;
  ctrl.innerHTML = btns;
}

function goPage(p) {
  const pages = Math.ceil(state.filteredData.length / state.perPage);
  if (p < 1 || p > pages) return;
  state.currentPage = p;
  renderTable();
}

// ══════════════════════════════════════════════════════════
// FORM CRUD
// ══════════════════════════════════════════════════════════
function resetForm() {
  document.getElementById('formTitle').textContent = 'Tambah Calon Peserta Didik';
  document.getElementById('submitText').textContent = 'Simpan Data';
  document.getElementById('editMode').value = 'add';
  document.getElementById('editRowIndex').value = '';

  const fields = ['fNomorFormulir','fTanggalDaftar','fNamaMurid','fJenisKelamin',
    'fTempatLahir','fTanggalLahir','fNamaOrtu','fAsalSD',
    'fTahunLulus','fAlamat','fNoTlp','fStatusBayar','fKeterangan',
    'fUangFormulir','fUangSPP','fUangKegiatan'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setTodayDate();
}

function setTodayDate() {
  const el = document.getElementById('fTanggalDaftar');
  if (el) el.value = new Date().toISOString().split('T')[0];
}

function editRow(dataIndex) {
  const row = state.allData[dataIndex];
  if (!row) return;

  document.getElementById('formTitle').textContent = 'Edit Data Pendaftar';
  document.getElementById('submitText').textContent = 'Perbarui Data';
  document.getElementById('editMode').value = 'edit';
  document.getElementById('editRowIndex').value = row._rowIndex;

  document.getElementById('fNomorFormulir').value = row.nomorFormulir || '';
  document.getElementById('fTanggalDaftar').value = row.tanggalDaftar || '';
  document.getElementById('fNamaMurid').value = row.namaMurid || '';
  document.getElementById('fJenisKelamin').value = row.jenisKelamin || '';
  document.getElementById('fTempatLahir').value = row.tempatLahir || '';
  document.getElementById('fTanggalLahir').value = row.tanggalLahir || '';
  document.getElementById('fNamaOrtu').value = row.namaOrtu || '';
  document.getElementById('fAsalSD').value = row.asalSD || '';
  document.getElementById('fTahunLulus').value = row.tahunLulus || '';
  document.getElementById('fAlamat').value = row.alamat || '';
  document.getElementById('fNoTlp').value = row.noTlp || '';
  document.getElementById('fStatusBayar').value = row.statusBayar || '';
  document.getElementById('fKeterangan').value = row.keterangan || '';
  document.getElementById('fUangFormulir').value = row.uangFormulir || '';
  document.getElementById('fUangSPP').value = row.uangSPP || '';
  document.getElementById('fUangKegiatan').value = row.uangKegiatan || '';

  showSection('tambah', null);
  document.getElementById('topbarTitle').textContent = 'Edit Data';
}

async function submitForm() {
  const required = {
    fNomorFormulir: 'Nomor Formulir',
    fTanggalDaftar: 'Tanggal Pendaftaran',
    fNamaMurid: 'Nama Calon Murid',
    fJenisKelamin: 'Jenis Kelamin',
    fTempatLahir: 'Tempat Lahir',
    fTanggalLahir: 'Tanggal Lahir',
    fNamaOrtu: 'Nama Orang Tua',
    fAsalSD: 'Asal SD',
    fTahunLulus: 'Tahun Lulus',
    fAlamat: 'Alamat',
    fNoTlp: 'No. Telepon',
    fStatusBayar: 'Status Pembayaran',
  };

  for (const [id, label] of Object.entries(required)) {
    const val = document.getElementById(id)?.value?.trim();
    if (!val) {
      showToast(`Field "${label}" wajib diisi!`, 'error');
      document.getElementById(id)?.focus();
      return;
    }
  }

  const data = {
    token: state.token,
    nomorFormulir: document.getElementById('fNomorFormulir').value.trim(),
    tanggalDaftar:  document.getElementById('fTanggalDaftar').value,
    namaMurid:      document.getElementById('fNamaMurid').value.trim(),
    jenisKelamin:   document.getElementById('fJenisKelamin').value,
    tempatLahir:    document.getElementById('fTempatLahir').value.trim(),
    tanggalLahir:   document.getElementById('fTanggalLahir').value,
    namaOrtu:       document.getElementById('fNamaOrtu').value.trim(),
    asalSD:         document.getElementById('fAsalSD').value.trim(),
    tahunLulus:     document.getElementById('fTahunLulus').value,
    alamat:         document.getElementById('fAlamat').value.trim(),
    noTlp:          document.getElementById('fNoTlp').value.trim(),
    statusBayar:    document.getElementById('fStatusBayar').value,
    keterangan:     document.getElementById('fKeterangan').value.trim(),
    uangFormulir:   document.getElementById('fUangFormulir').value || 0,
    uangSPP:        document.getElementById('fUangSPP').value || 0,
    uangKegiatan:   document.getElementById('fUangKegiatan').value || 0,
  };

  const editMode = document.getElementById('editMode').value;
  const rowIndex = document.getElementById('editRowIndex').value;

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  document.getElementById('submitSpinner').classList.remove('hidden');

  try {
    let res;
    if (editMode === 'edit') {
      data._rowIndex = rowIndex;
      res = await apiCall('updateData', data);
    } else {
      res = await apiCall('addData', data);
    }

    if (res.success) {
      showToast(editMode === 'edit' ? 'Data berhasil diperbarui!' : 'Data berhasil disimpan!', 'success');
      const navItems = document.querySelectorAll('.nav-item');
      showSection('dataTable', navItems[1]);
    } else {
      showToast(res.message || 'Gagal menyimpan data.', 'error');
    }
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    btn.disabled = false;
    document.getElementById('submitSpinner').classList.add('hidden');
  }
}

// ── HAPUS ──────────────────────────────────────────────────
function confirmDelete(dataIndex) {
  const row = state.allData[dataIndex];
  if (!row) return;
  state.deleteTarget = row;
  document.getElementById('deleteModalText').textContent =
    `Hapus data "${row.namaMurid}" (${row.nomorFormulir})?`;
  document.getElementById('btnConfirmDelete').onclick = () => doDelete();
  document.getElementById('deleteModal').classList.remove('hidden');
}

async function doDelete() {
  const row = state.deleteTarget;
  if (!row) return;
  closeModal('deleteModal');

  try {
    const res = await apiCall('deleteData', { token: state.token, _rowIndex: row._rowIndex });
    if (res.success) {
      showToast('Data berhasil dihapus.', 'success');
      loadData();
      loadDashboard();
    } else {
      showToast(res.message || 'Gagal menghapus.', 'error');
    }
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
  }
}

// ── GENERATE NOMOR FORMULIR ────────────────────────────────
async function generateNomor() {
  try {
    const res = await apiCall('generateNomor', { token: state.token });
    if (res.success) {
      document.getElementById('fNomorFormulir').value = res.nomor;
    }
  } catch (err) {
    const year = new Date().getFullYear();
    const num = String(state.allData.length + 1).padStart(3, '0');
    document.getElementById('fNomorFormulir').value = `SMPM12-${year}-${num}`;
  }
}

// ══════════════════════════════════════════════════════════
// PEMBAYARAN — Menu baru input uang formulir, SPP, kegiatan
// ══════════════════════════════════════════════════════════
async function loadPembayaran() {
  const tbody = document.getElementById('pembayaranTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>`;

  try {
    const res = await apiCall('getPembayaran', { token: state.token });
    if (res.success) {
      state.pembayaranData = res.data;
      filterPembayaran();
    } else {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row">${res.message}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Gagal memuat data pembayaran.</td></tr>`;
  }
}

function filterPembayaran() {
  const q = (document.getElementById('searchPembayaran')?.value || '').toLowerCase();
  state.filteredPembayaran = state.pembayaranData.filter(row =>
    !q ||
    String(row.namaMurid || '').toLowerCase().includes(q) ||
    String(row.nomorFormulir || '').toLowerCase().includes(q)
  );
  state.currentPembayaranPage = 1;
  renderPembayaranTable();
  updateSummaryPembayaran();
}

function updateSummaryPembayaran() {
  const data = state.filteredPembayaran;
  const totalFormulir  = data.reduce((s, r) => s + (r.uangFormulir  || 0), 0);
  const totalSPP       = data.reduce((s, r) => s + (r.uangSPP       || 0), 0);
  const totalKegiatan  = data.reduce((s, r) => s + (r.uangKegiatan  || 0), 0);
  const totalAll       = totalFormulir + totalSPP + totalKegiatan;

  const el = document.getElementById('pembayaranSummary');
  if (el) {
    el.innerHTML = `
      <div class="pay-summary-item">
        <span class="pay-label"><i class="fas fa-file-invoice"></i> Total Uang Formulir</span>
        <span class="pay-value">${formatRupiah(totalFormulir)}</span>
      </div>
      <div class="pay-summary-item">
        <span class="pay-label"><i class="fas fa-graduation-cap"></i> Total Uang SPP</span>
        <span class="pay-value">${formatRupiah(totalSPP)}</span>
      </div>
      <div class="pay-summary-item">
        <span class="pay-label"><i class="fas fa-calendar-check"></i> Total Uang Kegiatan</span>
        <span class="pay-value">${formatRupiah(totalKegiatan)}</span>
      </div>
      <div class="pay-summary-item pay-total">
        <span class="pay-label"><i class="fas fa-coins"></i> Total Penerimaan</span>
        <span class="pay-value">${formatRupiah(totalAll)}</span>
      </div>
    `;
  }
}

function renderPembayaranTable() {
  const tbody = document.getElementById('pembayaranTableBody');
  if (!tbody) return;

  const start = (state.currentPembayaranPage - 1) * state.perPage;
  const end = start + state.perPage;
  const pageData = state.filteredPembayaran.slice(start, end);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row"><i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:8px"></i> Belum ada data pembayaran</td></tr>`;
    renderPembayaranPagination();
    return;
  }

  tbody.innerHTML = pageData.map((row, idx) => {
    const no = start + idx + 1;
    const statusBadge = row.statusBayar === 'Lunas'
      ? `<span class="badge-status badge-lunas"><i class="fas fa-check-circle"></i> Lunas</span>`
      : `<span class="badge-status badge-belum"><i class="fas fa-clock"></i> Belum Lunas</span>`;

    return `
      <tr>
        <td style="color:#888;font-size:12px">${no}</td>
        <td><strong style="font-size:12px;color:#1a5c38">${row.nomorFormulir}</strong></td>
        <td style="font-weight:600">${row.namaMurid}</td>
        <td style="text-align:right;font-family:monospace">${formatRupiah(row.uangFormulir)}</td>
        <td style="text-align:right;font-family:monospace">${formatRupiah(row.uangSPP)}</td>
        <td style="text-align:right;font-family:monospace">${formatRupiah(row.uangKegiatan)}</td>
        <td style="text-align:right;font-family:monospace;font-weight:700;color:#1a5c38">${formatRupiah(row.totalBayar)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-edit" onclick="openEditPembayaran('${row._rowIndex}')" title="Edit Pembayaran">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn-icon btn-pdf" onclick="cetakPDFByRowIndex(${row._rowIndex})" title="Unduh Bukti Pendaftaran (PDF)">
              <i class="fas fa-file-pdf"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPembayaranPagination();
}

function renderPembayaranPagination() {
  const total = state.filteredPembayaran.length;
  const pages = Math.ceil(total / state.perPage);
  const cp = state.currentPembayaranPage;

  const info = document.getElementById('pembayaranPageInfo');
  if (info) info.textContent = total === 0 ? 'Tidak ada data' :
    `Menampilkan ${Math.min((cp-1)*state.perPage+1, total)}–${Math.min(cp*state.perPage, total)} dari ${total} data`;

  const ctrl = document.getElementById('pembayaranPageControls');
  if (!ctrl) return;
  if (pages <= 1) { ctrl.innerHTML = ''; return; }

  let btns = `<button class="page-btn" onclick="goPembayaranPage(${cp-1})" ${cp===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= cp-1 && i <= cp+1)) {
      btns += `<button class="page-btn ${i===cp?'active':''}" onclick="goPembayaranPage(${i})">${i}</button>`;
    } else if (i === cp-2 || i === cp+2) {
      btns += `<span style="padding:0 4px;color:#888">…</span>`;
    }
  }
  btns += `<button class="page-btn" onclick="goPembayaranPage(${cp+1})" ${cp===pages?'disabled':''}>›</button>`;
  ctrl.innerHTML = btns;
}

function goPembayaranPage(p) {
  const pages = Math.ceil(state.filteredPembayaran.length / state.perPage);
  if (p < 1 || p > pages) return;
  state.currentPembayaranPage = p;
  renderPembayaranTable();
}

function openEditPembayaran(rowIndex) {
  const row = state.pembayaranData.find(r => String(r._rowIndex) === String(rowIndex));
  if (!row) return;
  state.editPembayaranRow = row;

  document.getElementById('editPayNama').textContent = row.namaMurid;
  document.getElementById('editPayNomor').textContent = row.nomorFormulir;
  document.getElementById('editPayFormulir').value = row.uangFormulir || '';
  document.getElementById('editPaySPP').value = row.uangSPP || '';
  document.getElementById('editPayKegiatan').value = row.uangKegiatan || '';
  hitungTotalModal();

  document.getElementById('pembayaranModal').classList.remove('hidden');
}

function hitungTotalModal() {
  const f = parseFloat(document.getElementById('editPayFormulir').value) || 0;
  const s = parseFloat(document.getElementById('editPaySPP').value) || 0;
  const k = parseFloat(document.getElementById('editPayKegiatan').value) || 0;
  const el = document.getElementById('editPayTotal');
  if (el) el.textContent = formatRupiah(f + s + k);
}

async function savePembayaran() {
  const row = state.editPembayaranRow;
  if (!row) return;

  const uangFormulir = parseFloat(document.getElementById('editPayFormulir').value) || 0;
  const uangSPP      = parseFloat(document.getElementById('editPaySPP').value) || 0;
  const uangKegiatan = parseFloat(document.getElementById('editPayKegiatan').value) || 0;

  const btn = document.getElementById('btnSavePembayaran');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

  try {
    const res = await apiCall('addPembayaran', {
      token: state.token,
      _rowIndex: row._rowIndex,
      uangFormulir,
      uangSPP,
      uangKegiatan
    });

    if (res.success) {
      showToast(res.message, 'success');
      closeModal('pembayaranModal');
      loadPembayaran();
      loadDashboard();
    } else {
      showToast(res.message || 'Gagal menyimpan pembayaran.', 'error');
    }
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Simpan Pembayaran';
  }
}

// ══════════════════════════════════════════════════════════
// CETAK PDF — Bukti Pendaftaran
// ══════════════════════════════════════════════════════════
function cetakPDF(dataIndex) {
  const row = state.allData[dataIndex];
  if (!row) {
    showToast('Data tidak ditemukan.', 'error');
    return;
  }

  // BUG FIX: jika library jsPDF/autoTable gagal dimuat (mis. CDN diblokir),
  // tombol "Unduh Bukti PDF" sebelumnya tidak memberi tahu apa pun ke
  // pengguna. Sekarang ditangkap dan ditampilkan lewat toast.
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('Gagal membuat PDF: library jsPDF tidak termuat. Periksa koneksi internet Anda.', 'error');
    return;
  }

  try {
    cetakPDFInternal(row);
  } catch (err) {
    console.error('Gagal membuat PDF:', err);
    showToast('Gagal membuat PDF: ' + err.message, 'error');
  }
}

// MENU BARU: unduh bukti pendaftaran PDF dari _rowIndex (dipakai dari menu
// Input Pembayaran, yang tidak menyimpan seluruh field calon murid).
async function cetakPDFByRowIndex(rowIndex) {
  let idx = state.allData.findIndex(r => r._rowIndex === rowIndex);

  if (idx === -1) {
    // Data lengkap belum termuat (mis. baru buka menu Pembayaran) — muat dulu.
    await loadData();
    idx = state.allData.findIndex(r => r._rowIndex === rowIndex);
  }

  if (idx === -1) {
    showToast('Data pendaftar untuk baris ini tidak ditemukan.', 'error');
    return;
  }

  cetakPDF(idx);
}

function cetakPDFInternal(row) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W  = 210;
  const mg = 18;

  const hijauTua  = [26,  92,  56];
  const hijauMuda = [45, 158,  95];
  const mint      = [232, 247, 239];
  const merah     = [229,  62,  62];

  // ── KOP SURAT ──────────────────────────────────────────
  doc.setFillColor(...hijauTua);
  doc.rect(0, 0, W, 44, 'F');

  doc.setFillColor(...hijauMuda);
  doc.rect(0, 44, W, 2.5, 'F');

  // Logo lingkaran
  doc.setFillColor(255, 255, 255);
  doc.circle(mg + 11, 22, 11, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...hijauTua);
  doc.setFont('helvetica', 'bold');
  doc.text('SMP', mg + 7.5, 19);
  doc.text('MUHAM', mg + 5, 23);
  doc.text('12', mg + 9, 27);

  // Nama sekolah
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SMP MUHAMMADIYAH 12', mg + 28, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Jl. Dr. Susilo I Kel.Grogol Kec. Grogol Petamburan Jakarta Barat', mg + 28, 23);
  doc.text('Email: muhammadiyah12.grogol@gmail.com', mg + 28, 29);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 240, 220);
  doc.text('SPMB 2026/2027', W - mg, 36, { align: 'right' });

  // ── JUDUL ──────────────────────────────────────────────
  doc.setFillColor(...mint);
  doc.rect(mg, 52, W - mg*2, 13, 'F');
  doc.setTextColor(...hijauTua);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('BUKTI PENDAFTARAN CALON MURID BARU', W/2, 60.5, { align: 'center' });

  // ── INFO FORMULIR ──────────────────────────────────────
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text(
    `No. Formulir: ${row.nomorFormulir}   |   Tanggal Daftar: ${formatDate(row.tanggalDaftar)}`,
    W/2, 69, { align: 'center' }
  );

  // ── BADGE STATUS ───────────────────────────────────────
  const isLunas   = row.statusBayar === 'Lunas';
  const badgeClr  = isLunas ? hijauTua : merah;
  const badgeBg   = isLunas ? mint     : [255, 238, 238];

  doc.setFillColor(...badgeBg);
  doc.roundedRect(W/2 - 30, 72, 60, 11, 3, 3, 'F');
  doc.setDrawColor(...badgeClr);
  doc.setLineWidth(0.5);
  doc.roundedRect(W/2 - 30, 72, 60, 11, 3, 3, 'S');
  doc.setTextColor(...badgeClr);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(isLunas ? '✓  LUNAS' : '✗  BELUM LUNAS', W/2, 79, { align: 'center' });

  // ── TABEL IDENTITAS ────────────────────────────────────
  doc.autoTable({
    startY: 89,
    margin: { left: mg, right: mg },
    head: [['IDENTITAS CALON PESERTA DIDIK', '']],
    body: [
      ['Nama Lengkap',          row.namaMurid || '-'],
      ['Jenis Kelamin',         row.jenisKelamin || '-'],
      ['Tempat / Tgl Lahir',    `${row.tempatLahir || '-'}, ${formatDate(row.tanggalLahir)}`],
      ['Nama Orang Tua / Wali', row.namaOrtu || '-'],
    ],
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', fillColor: mint, textColor: hijauTua },
      1: { cellWidth: 'auto' }
    },
    headStyles: {
      fillColor: hijauTua, textColor: [255, 255, 255],
      fontStyle: 'bold', fontSize: 9.5, halign: 'left',
    },
    bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [249, 253, 251] },
    theme: 'grid',
  });

  const y2 = doc.lastAutoTable.finalY + 3;

  // ── TABEL ASAL SEKOLAH ─────────────────────────────────
  doc.autoTable({
    startY: y2,
    margin: { left: mg, right: mg },
    head: [['ASAL SEKOLAH & KONTAK', '']],
    body: [
      ['Asal SD / MI',           row.asalSD    || '-'],
      ['Tahun Lulus',            row.tahunLulus || '-'],
      ['Alamat Rumah',           row.alamat     || '-'],
      ['No. Telepon / WA',       row.noTlp      || '-'],
      ['Keterangan',             row.keterangan || '-'],
    ],
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', fillColor: mint, textColor: hijauTua },
      1: { cellWidth: 'auto' }
    },
    headStyles: {
      fillColor: hijauTua, textColor: [255, 255, 255],
      fontStyle: 'bold', fontSize: 9.5, halign: 'left',
    },
    bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [249, 253, 251] },
    theme: 'grid',
  });

  const y3 = doc.lastAutoTable.finalY + 3;

  // ── TABEL PEMBAYARAN ───────────────────────────────────
  const uangFormulir  = parseFloat(row.uangFormulir)  || 0;
  const uangSPP       = parseFloat(row.uangSPP)       || 0;
  const uangKegiatan  = parseFloat(row.uangKegiatan)  || 0;
  const totalBayar    = uangFormulir + uangSPP + uangKegiatan;

  doc.autoTable({
    startY: y3,
    margin: { left: mg, right: mg },
    head: [['RINCIAN PEMBAYARAN', '']],
    body: [
      ['Uang Formulir',  formatRupiah(uangFormulir)],
      ['Uang SPP',       formatRupiah(uangSPP)],
      ['Uang Kegiatan',  formatRupiah(uangKegiatan)],
      ['TOTAL',          formatRupiah(totalBayar)],
    ],
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', fillColor: mint, textColor: hijauTua },
      1: { cellWidth: 'auto', halign: 'right' }
    },
    headStyles: {
      fillColor: hijauTua, textColor: [255, 255, 255],
      fontStyle: 'bold', fontSize: 9.5, halign: 'left',
    },
    bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [249, 253, 251] },
    didParseCell: (data) => {
      // Bold & warna hijau pada baris TOTAL
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = hijauTua;
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
    theme: 'grid',
  });

  // ── AREA TANDA TANGAN ──────────────────────────────────
  const ySign = doc.lastAutoTable.finalY + 12;

  if (ySign + 38 < 275) {
    doc.setDrawColor(...hijauTua);
    doc.setLineWidth(0.3);

    // TTD Ortu
    doc.rect(mg, ySign, 62, 36);
    doc.setTextColor(...hijauTua);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Orang Tua / Wali', mg + 31, ySign + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`(${row.namaOrtu || ''})`, mg + 31, ySign + 32, { align: 'center' });

    // TTD Panitia
    doc.rect(W - mg - 62, ySign, 62, 36);
    doc.setTextColor(...hijauTua);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Panitia PPDB', W - mg - 31, ySign + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('SMP Muhammadiyah 12', W - mg - 31, ySign + 32, { align: 'center' });
  }

  // ── FOOTER ─────────────────────────────────────────────
  doc.setFillColor(...hijauTua);
  doc.rect(0, 285, W, 12, 'F');
  doc.setTextColor(210, 240, 225);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text(
    `Dokumen ini sebagai bukti pendaftaran di SMP Muhammadiyah 12. Dicetak: ${new Date().toLocaleString('id-ID')}`,
    W/2, 292, { align: 'center' }
  );

  // ── WATERMARK ──────────────────────────────────────────
  doc.setTextColor(...badgeClr);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(52);
  doc.setGState(new doc.GState({ opacity: 0.04 }));
  doc.text(isLunas ? 'LUNAS' : 'BELUM LUNAS', W/2, 180, { align: 'center', angle: 45 });
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Simpan PDF
  const namaFile = `BuktiSPMB_${row.nomorFormulir}_${(row.namaMurid || '').replace(/\s+/g,'-')}.pdf`;
  doc.save(namaFile);
  showToast(`PDF "${namaFile}" berhasil diunduh.`, 'success');
}

// ══════════════════════════════════════════════════════════
// API HELPER
// ══════════════════════════════════════════════════════════
async function apiCall(action, params = {}) {
  if (!API_URL || API_URL.includes('GANTI_DENGAN')) {
    return { success: false, message: 'API URL belum dikonfigurasi. Edit variabel API_URL di app.js.' };
  }

  const allParams = { action, ...params };
  Object.keys(allParams).forEach(k => {
    if (allParams[k] === undefined || allParams[k] === null) delete allParams[k];
  });

  const qs  = new URLSearchParams(allParams).toString();
  const url = `${API_URL}?${qs}`;

  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!res.ok) return { success: false, message: `HTTP Error: ${res.status}` };
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, message: 'Response dari server bukan JSON.' };
    }
  } catch (err) {
    return { success: false, message: 'Gagal terhubung: ' + err.message };
  }
}

async function testAPI() {
  console.log('Testing API:', API_URL);
  const r = await apiCall('ping');
  console.log('Ping result:', r);
  return r;
}

// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════
function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return d; }
}

function formatRupiah(num) {
  if (!num && num !== 0) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function cleanPhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').replace(/^0/, '62');
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// CSS spin animation
const styleEl = document.createElement('style');
styleEl.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
document.head.appendChild(styleEl);
