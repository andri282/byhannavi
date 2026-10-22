// =============================================
//  byhannavi — Preloved Page Logic
// =============================================

let allProducts = [];
let activeCategory = 'Semua';
let searchQuery = '';

// ── Parse CSV dari Google Sheets
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
    return obj;
  }).filter(r => r.nama && r.nama.trim() !== '');
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

// ── Format harga Rupiah
function formatRupiah(val) {
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return val;
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ── Condition badge class
function conditionClass(kondisi) {
  const k = (kondisi || '').toLowerCase();
  if (k.includes('like new') || k.includes('baru')) return 'badge-like-new';
  if (k.includes('good') || k.includes('bagus')) return 'badge-good';
  return 'badge-fair';
}

// ── Render skeleton loaders
function renderSkeletons(count = 6) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div style="padding:4px 0">
        <div class="skeleton skeleton-line w80"></div>
        <div class="skeleton skeleton-line w50"></div>
        <div class="skeleton skeleton-price"></div>
      </div>
    </div>
  `).join('');
}

// ── Render product cards
function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  const countEl = document.getElementById('filterCount');
  const filtered = applyFilters(products);

  countEl.textContent = `${filtered.length} item`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛍️</div>
        <h3>Tidak ada item ditemukan</h3>
        <p>Coba kata kunci atau kategori yang berbeda</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const isSold = (p.status || '').toLowerCase() === 'sold';
    const badgeClass = conditionClass(p.kondisi);
    const img = p.foto || 'images/placeholder.jpg';
    const statusBadge = isSold
      ? `<span class="badge-status badge-sold">Sold</span>`
      : `<span class="badge-status badge-available">Available</span>`;

    return `
    <div class="product-card${isSold ? ' sold' : ''} fade-up" 
         style="animation-delay:${i * 0.05}s"
         onclick="openModal(${i})"
         id="product-card-${i}">
      <div class="card-img-wrap">
        <img class="card-img" src="${img}" alt="${p.nama}" loading="lazy" 
             onerror="this.src='images/placeholder.jpg'">
        <span class="card-badge ${badgeClass}">${p.kondisi || 'Good'}</span>
        ${statusBadge}
      </div>
      <div class="card-body">
        <div class="card-category">${p.kategori || 'Lainnya'}</div>
        <div class="card-name">${p.nama}</div>
        <div class="card-desc">${p.deskripsi || ''}</div>
        <div class="card-footer">
          <div class="card-price">
            <small>Harga</small>
            ${formatRupiah(p.harga)}
          </div>
          ${!isSold ? `
          <button class="btn-wa" onclick="event.stopPropagation();contactWA('${p.nama}','${p.harga}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span>Tanya</span>
          </button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Apply filters
function applyFilters(products) {
  return products.filter(p => {
    const matchCat = activeCategory === 'Semua' || 
      (p.kategori || '').toLowerCase() === activeCategory.toLowerCase();
    const matchSearch = searchQuery === '' || 
      (p.nama || '').toLowerCase().includes(searchQuery) ||
      (p.deskripsi || '').toLowerCase().includes(searchQuery) ||
      (p.kategori || '').toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });
}

// ── Build category pills dynamically
function buildCategories(products) {
  const cats = ['Semua', ...new Set(products.map(p => p.kategori).filter(Boolean))];
  const pills = document.getElementById('filterPills');
  pills.innerHTML = cats.map(c => `
    <button class="pill${c === 'Semua' ? ' active' : ''}" 
            onclick="setCategory('${c}')" 
            id="pill-${c.replace(/\s/g,'-')}">
      ${c}
    </button>
  `).join('');
}

function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  const active = document.getElementById(`pill-${cat.replace(/\s/g,'-')}`);
  if (active) active.classList.add('active');
  renderProducts(allProducts);
}

// ── Search handler
function handleSearch(e) {
  searchQuery = e.target.value.toLowerCase().trim();
  renderProducts(allProducts);
}

// ── WhatsApp contact
function contactWA(nama, harga) {
  const msg = encodeURIComponent(
    `Halo kak byhannavi! Saya tertarik dengan *${nama}* (${formatRupiah(harga)}). Apakah masih available? 🙏`
  );
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${msg}`, '_blank');
}

// ── Modal
let modalIndex = -1;
let filteredForModal = [];

function openModal(idx) {
  filteredForModal = applyFilters(allProducts);
  const p = filteredForModal[idx];
  if (!p) return;
  modalIndex = idx;

  const isSold = (p.status || '').toLowerCase() === 'sold';
  document.getElementById('modalImg').src = p.foto || 'images/placeholder.jpg';
  document.getElementById('modalImg').onerror = function() { this.src = 'images/placeholder.jpg'; };
  document.getElementById('modalCategory').textContent = p.kategori || '';
  document.getElementById('modalTitle').textContent = p.nama;
  document.getElementById('modalDesc').textContent = p.deskripsi || 'Tidak ada deskripsi.';
  document.getElementById('modalCondition').textContent = p.kondisi || '-';
  document.getElementById('modalSize').textContent = p.ukuran || '-';
  document.getElementById('modalPrice').textContent = formatRupiah(p.harga);

  const btnWA = document.getElementById('modalBtnWA');
  if (isSold) {
    btnWA.disabled = true;
    btnWA.textContent = 'Sudah Terjual';
    btnWA.style.opacity = '0.5';
  } else {
    btnWA.disabled = false;
    btnWA.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Hubungi via WhatsApp`;
    btnWA.style.opacity = '1';
    btnWA.onclick = () => contactWA(p.nama, p.harga);
  }

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Fetch data
async function fetchProducts() {
  renderSkeletons(6);

  if (CONFIG.sheetUrlPreloved.includes('SHEET_ID')) {
    // Demo mode — tampilkan data contoh
    showConfigBanner();
    allProducts = getDemoProducts();
    buildCategories(allProducts);
    renderProducts(allProducts);
    return;
  }

  try {
    const res = await fetch(CONFIG.sheetUrlPreloved + '&t=' + Date.now());
    if (!res.ok) throw new Error('Gagal mengambil data');
    const text = await res.text();
    allProducts = parseCSV(text);
    buildCategories(allProducts);
    renderProducts(allProducts);
  } catch (err) {
    console.error(err);
    showToast('⚠️ Gagal memuat data. Menampilkan contoh...');
    allProducts = getDemoProducts();
    buildCategories(allProducts);
    renderProducts(allProducts);
  }
}

function showConfigBanner() {
  const banner = document.getElementById('configBanner');
  if (banner) banner.classList.add('show');
}

// ── Demo data (sebelum Google Sheets dikonfigurasi)
function getDemoProducts() {
  return [
    { nama: 'Blazer Cream Vintage', kategori: 'Outer', kondisi: 'Like New', status: 'Available', harga: '180000', ukuran: 'M', deskripsi: 'Blazer cream vintage kondisi like new, beli di brand lokal ternama. Cocok untuk formal maupun semi-formal.', foto: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4089?w=400&q=80' },
    { nama: 'Tas Kulit Mini Tote', kategori: 'Tas', kondisi: 'Good', status: 'Available', harga: '250000', ukuran: '-', deskripsi: 'Tas kulit mini tote warna hitam, muat HP, dompet, & lipstik. Inner masih bersih.', foto: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80' },
    { nama: 'Dress Midi Floral', kategori: 'Dress', kondisi: 'Like New', status: 'Available', harga: '145000', ukuran: 'S', deskripsi: 'Dress midi floral warna pastel, bahan katun adem. Hanya dipakai 1x acara.', foto: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80' },
    { nama: 'Kemeja Linen Putih', kategori: 'Atasan', kondisi: 'Good', status: 'Sold', harga: '95000', ukuran: 'M', deskripsi: 'Kemeja linen warna putih bersih. Bahan adem dan nyaman.', foto: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80' },
    { nama: 'Celana Kulot Hitam', kategori: 'Bawahan', kondisi: 'Good', status: 'Available', harga: '110000', ukuran: 'M', deskripsi: 'Celana kulot hitam bahan crepe, jatuh di badan. Cocok dengan berbagai outfit.', foto: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80' },
    { nama: 'Sepatu Wedges Nude', kategori: 'Sepatu', kondisi: 'Fair', status: 'Available', harga: '85000', ukuran: '37', deskripsi: 'Sepatu wedges nude tinggi 5cm. Ada sedikit scuff di bagian samping kanan.', foto: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80' },
  ];
}

// ── Toast
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Init
document.addEventListener('DOMContentLoaded', () => {
  // Set store name
  document.querySelectorAll('.store-name').forEach(el => el.textContent = CONFIG.storeName);
  document.querySelectorAll('.store-tagline').forEach(el => el.textContent = CONFIG.storeTagline);

  // Search
  const searchEl = document.getElementById('searchInput');
  if (searchEl) searchEl.addEventListener('input', handleSearch);

  // Modal close
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Fetch data
  fetchProducts();
});
