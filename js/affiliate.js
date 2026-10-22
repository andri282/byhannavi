// =============================================
//  byhannavi — Affiliate Page Logic
// =============================================

let allAffiliates = [];
let activeAffCat = 'Semua';

function cleanLink(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return '#';
  let str = raw.trim();
  if (!str.startsWith('http://') && !str.startsWith('https://') && !str.startsWith('//')) {
    str = 'https://' + str;
  }
  return str;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { 
      let key = h.trim().toLowerCase();
      // Toleransi typo / nama alternatif header
      if (key === 'lilnk' || key === 'tautan' || key === 'url') key = 'link';
      obj[key] = (vals[i] || '').trim(); 
    });
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

function formatRupiah(val) {
  if (!val || val === '-' || val === '') return '';
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return val;
  return 'Rp ' + num.toLocaleString('id-ID');
}

function platformClass(platform) {
  const p = (platform || '').toLowerCase();
  if (p.includes('tokopedia')) return 'platform-tokopedia';
  if (p.includes('lazada')) return 'platform-lazada';
  return 'platform-shopee';
}

function renderSkeletons(count = 8) {
  const grid = document.getElementById('affiliateGrid');
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

function renderAffiliates(items) {
  const grid = document.getElementById('affiliateGrid');
  const countEl = document.getElementById('affCount');
  const filtered = items.filter(a => {
    return activeAffCat === 'Semua' || 
      (a.kategori || '').toLowerCase() === activeAffCat.toLowerCase();
  });

  if (countEl) countEl.textContent = `${filtered.length} produk rekomendasi`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔗</div>
        <h3>Belum ada rekomendasi</h3>
        <p>Segera hadir produk rekomendasi pilihan byhannavi</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((a, i) => {
    const priceStr = formatRupiah(a.harga);
    const platform = a.platform || 'Shopee';
    const targetUrl = cleanLink(a.link || a.lilnk);
    const hasLink = targetUrl !== '#';

    return `
    <div class="affiliate-card fade-up" style="animation-delay:${i*0.05}s; cursor:${hasLink ? 'pointer' : 'default'}" id="aff-card-${i}"
         ${hasLink ? `onclick="window.open('${targetUrl}', '_blank', 'noopener,noreferrer'); trackClick('${a.nama.replace(/'/g, "\\'")}')"` : ''}>
      <div class="affiliate-img-wrap">
        <img class="affiliate-img" src="${a.foto || 'images/placeholder.jpg'}" 
             alt="${a.nama}" loading="lazy"
             onerror="this.src='images/placeholder.jpg'">
        <span class="affiliate-platform ${platformClass(platform)}">${platform}</span>
      </div>
      <div class="affiliate-body">
        <div class="affiliate-cat">${a.kategori || 'Produk'}</div>
        <div class="affiliate-name">${a.nama}</div>
        <div class="affiliate-note">${a.catatan || a.deskripsi || 'Rekomendasi dari byhannavi ✨'}</div>
        <div class="affiliate-footer">
          ${priceStr ? `<div class="affiliate-price">${priceStr}</div>` : '<div></div>'}
          <a href="${targetUrl}" target="_blank" rel="noopener noreferrer"
             class="btn-shop" id="btn-shop-${i}" onclick="event.stopPropagation(); trackClick('${a.nama.replace(/'/g, "\\'")}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Beli di ${platform}
          </a>
        </div>
      </div>
    </div>`;
  }).join('');
}


function buildAffCategories(items) {
  const cats = ['Semua', ...new Set(items.map(a => a.kategori).filter(Boolean))];
  const pills = document.getElementById('affFilterPills');
  if (!pills) return;
  pills.innerHTML = cats.map(c => `
    <button class="pill${c === 'Semua' ? ' active' : ''}" 
            onclick="setAffCategory('${c}')"
            id="aff-pill-${c.replace(/\s/g,'-')}">
      ${c}
    </button>
  `).join('');
}

function setAffCategory(cat) {
  activeAffCat = cat;
  document.querySelectorAll('#affFilterPills .pill').forEach(p => p.classList.remove('active'));
  const active = document.getElementById(`aff-pill-${cat.replace(/\s/g,'-')}`);
  if (active) active.classList.add('active');
  renderAffiliates(allAffiliates);
}

function trackClick(nama) {
  console.log('[Affiliate Click]', nama);
  // Bisa ditambahkan Google Analytics event disini
}

function getDemoAffiliates() {
  return [
    { nama: 'Wardah Lightening Series Set', kategori: 'Skincare', platform: 'Shopee', harga: '125000', catatan: 'Paket hemat Wardah yang bikin kulit cerah! Udah coba sendiri dan hasilnya bagus 🌟', link: '#', foto: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80' },
    { nama: 'Bantal Memory Foam Premium', kategori: 'Rumah Tangga', platform: 'Shopee', harga: '89000', catatan: 'Tidur jadi lebih nyaman banget pakai ini, recommended buat yang sering pegal leher!', link: '#', foto: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80' },
    { nama: 'Dress Linen Casual Wanita', kategori: 'Fashion', platform: 'Shopee', harga: '75000', catatan: 'Kualitasnya bagus untuk harga segini, bahan adem dan gambarnya sesuai', link: '#', foto: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80' },
    { nama: 'Air Fryer Philips 3.2L', kategori: 'Dapur', platform: 'Tokopedia', harga: '750000', catatan: 'Investasi terbaik buat yang mau masak sehat! Gorengan tanpa minyak 😋', link: '#', foto: 'https://images.unsplash.com/photo-1648920862826-3038c89fed0f?w=400&q=80' },
    { nama: 'Serum Vit C Local Brand', kategori: 'Skincare', platform: 'Shopee', harga: '49000', catatan: 'Murah tapi efektif! Kulit lebih cerah dalam 2 minggu. Brand lokal yang underrated banget', link: '#', foto: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80' },
    { nama: 'Totebag Canvas Aesthetic', kategori: 'Fashion', platform: 'Shopee', harga: '35000', catatan: 'Tasnya kuat dan lucu banget! Worth it buat harga segini', link: '#', foto: 'https://images.unsplash.com/photo-1591085686350-798c0f9faa3f?w=400&q=80' },
    { nama: 'Diffuser Aroma Terapi', kategori: 'Rumah Tangga', platform: 'Shopee', harga: '65000', catatan: 'Bikin kamar jadi wangi seharian, ada LED warna-warni cantik 🕯️', link: '#', foto: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80' },
    { nama: 'Kaus Kaki Katun Anti Slip', kategori: 'Fashion', platform: 'Shopee', harga: '15000', catatan: 'Kualitas oke banget, isi 5 pasang. Belinya banyak sekaligus lebih hemat!', link: '#', foto: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=400&q=80' },
  ];
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function fetchAffiliates() {
  renderSkeletons(8);

  if (CONFIG.sheetUrlAffiliate.includes('SHEET_ID')) {
    showConfigBanner();
    allAffiliates = getDemoAffiliates();
    buildAffCategories(allAffiliates);
    renderAffiliates(allAffiliates);
    return;
  }

  try {
    const res = await fetch(CONFIG.sheetUrlAffiliate + '&t=' + Date.now());
    if (!res.ok) throw new Error('Gagal fetch');
    const text = await res.text();
    allAffiliates = parseCSV(text);
    buildAffCategories(allAffiliates);
    renderAffiliates(allAffiliates);
  } catch (err) {
    console.error(err);
    showToast('⚠️ Gagal memuat data. Menampilkan contoh...');
    allAffiliates = getDemoAffiliates();
    buildAffCategories(allAffiliates);
    renderAffiliates(allAffiliates);
  }
}

function showConfigBanner() {
  const banner = document.getElementById('configBanner');
  if (banner) banner.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.store-name').forEach(el => el.textContent = CONFIG.storeName);
  fetchAffiliates();
});
