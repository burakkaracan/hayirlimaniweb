// ===== Admin Panel Script =====
let adminState = { section: 'dashboard', data: {} };

const ADMIN_EMOJIS = ['😊','😂','❤️','👍','🙏','😢','💪','🤔','✅','⭐','🎉','👋','💚','🙌','😍','🥰','😘','🤝','💯','🔥'];
let _adminBadgeInterval = null;
let _adminAttachFileUrl = null;
let _currentThread = null;
let _msgFilter = { label: null, archived: 0 };
let _msgLabels = [];
let _msgThreads = [];

window.addEventListener('app-ready', async () => {
  if (!currentUser) { location.href = '/giris.html'; return; }
  if (currentUser.role !== 'admin' && currentUser.role !== 'staff') {
    document.getElementById('admin-root').innerHTML = '<div class="empty">Bu sayfaya erişim yetkiniz yok.</div>';
    return;
  }
  renderShell();
  const hash = location.hash.replace('#', '') || 'dashboard';
  switchSection(hash);
  window.addEventListener('hashchange', () => switchSection(location.hash.replace('#', '') || 'dashboard'));
  startAdminPolling();
});

const _si = (paths) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const NAV_ICONS = {
  dashboard:  _si('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  donations:  _si('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
  users:      _si('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  messages:   _si('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  categories: _si('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
  campaigns:  _si('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'),
  activities: _si('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
  hero:       _si('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
  boards:     _si('<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>'),
  documents:  _si('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
  menus:      _si('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
  bulk:       _si('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/>'),
  settings:   _si('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  external:   _si('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'),
  projects:   _si('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
};

function renderShell() {
  document.getElementById('admin-root').innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a href="/" class="logo" style="display:block; padding: 10px 14px 20px;">
          <img src="/images/logo-white.png" alt="Hayır Limanı" class="logo-img" style="max-height:44px;" />
        </a>
        <nav class="admin-nav">
          <a href="#dashboard" data-s="dashboard">${NAV_ICONS.dashboard} Panel</a>
          <a href="#donations" data-s="donations">${NAV_ICONS.donations} Bağış Onayları</a>
          <a href="#users" data-s="users">${NAV_ICONS.users} Bağışçılar</a>
          <a href="#messages" data-s="messages">${NAV_ICONS.messages} Mesajlar <span class="admin-msg-badge" id="admin-msg-badge" style="display:none"></span></a>
          <a href="#categories" data-s="categories">${NAV_ICONS.categories} Bağış Kategorileri</a>
          <a href="#campaigns" data-s="campaigns">${NAV_ICONS.campaigns} Kampanyalar</a>
          <a href="#activities" data-s="activities">${NAV_ICONS.activities} Faaliyetler</a>
          <a href="#hero" data-s="hero">${NAV_ICONS.hero} Hero Slider</a>
          <a href="#boards" data-s="boards">${NAV_ICONS.boards} Yetkili Kurullar</a>
          <a href="#documents" data-s="documents">${NAV_ICONS.documents} Belgeler</a>
          <a href="#menus" data-s="menus">${NAV_ICONS.menus} Menü Yönetimi</a>
          <a href="#bulk" data-s="bulk">${NAV_ICONS.bulk} Toplu Mail</a>
          <a href="#settings" data-s="settings">${NAV_ICONS.settings} Site Ayarları</a>
          <a href="/" target="_blank">${NAV_ICONS.external} Siteye Dön</a>
        </nav>
      </aside>
      <main class="admin-main" id="admin-main">
        <div class="loader">Yükleniyor…</div>
      </main>
    </div>
  `;
}

function switchSection(s) {
  adminState.section = s;
  document.querySelectorAll('.admin-nav a[data-s]').forEach(a => a.classList.toggle('active', a.dataset.s === s));
  const render = sections[s] || sections.dashboard;
  render();
}

const sections = {
  async dashboard() {
    const stats = await api('/api/admin/stats');
    const recent = await api('/api/admin/donations?status=pending');
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head">
        <h2>Genel Bakış</h2>
        <span class="muted">Hoşgeldiniz, ${currentUser.name}</span>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Toplam Bağışçı</div><div class="stat-value">${stats.totalUsers}</div></div>
        <div class="stat-card"><div class="stat-label">Onaylı Bağış Toplamı</div><div class="stat-value">${formatTL(stats.approvedSum)}</div></div>
        <div class="stat-card"><div class="stat-label">Onaylanan Bağış</div><div class="stat-value">${stats.approvedCount}</div></div>
        <div class="stat-card"><div class="stat-label">Bekleyen Bildirim</div><div class="stat-value">${stats.pending}</div></div>
        <div class="stat-card"><div class="stat-label">Aktif Kampanya</div><div class="stat-value">${stats.campaigns}</div></div>
        <div class="stat-card"><div class="stat-label">Yeni Mesaj</div><div class="stat-value">${stats.newMessages}</div></div>
      </div>
      <div class="admin-section">
        <h3>Bekleyen Bağış Bildirimleri (${recent.length})</h3>
        ${recent.length === 0 ? '<div class="empty">Bekleyen bildirim yok.</div>' : `
          <div class="table-wrap"><table>
            <thead><tr><th>Tarih</th><th>Bağışçı</th><th>Telefon</th><th>Tutar</th><th>Kategori</th><th>İşlem</th></tr></thead>
            <tbody>
              ${recent.slice(0, 10).map(d => `
                <tr>
                  <td>${new Date(d.created_at).toLocaleString('tr-TR')}</td>
                  <td><strong>${escapeHtml(d.user_name)}</strong><div class="muted" style="font-size:.8rem">${escapeHtml(d.user_email)}</div></td>
                  <td>${d.user_phone ? `<a href="https://wa.me/${d.user_phone.replace(/\D/g,'')}" target="_blank" rel="noopener" style="color:#25D366;font-weight:600">${escapeHtml(d.user_phone)}</a>` : '<span class="muted">—</span>'}</td>
                  <td><strong>${formatTL(d.amount)}</strong></td>
                  <td>${d.category_title || d.campaign_title || 'Genel'}</td>
                  <td>
                    <button class="btn btn-primary btn-sm" onclick="approveDonation(${d.id})">Onayla</button>
                    <button class="btn btn-outline btn-sm" onclick="rejectDonation(${d.id})">Reddet</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table></div>`}
      </div>
    `;
  },

  async donations() {
    const all = await api('/api/admin/donations');
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head"><h2>Bağış Onayları</h2></div>
      <div class="tab-bar">
        <button onclick="filterDonations('all', this)" class="active">Tümü (${all.length})</button>
        <button onclick="filterDonations('pending', this)">Bekleyen (${all.filter(d => d.status === 'pending').length})</button>
        <button onclick="filterDonations('approved', this)">Onaylanmış (${all.filter(d => d.status === 'approved').length})</button>
        <button onclick="filterDonations('rejected', this)">Reddedilmiş (${all.filter(d => d.status === 'rejected').length})</button>
      </div>
      <div class="admin-section"><div id="donations-list"></div></div>
    `;
    adminState.data.donations = all;
    renderDonationList('all');
  },

  async users() {
    const users = await api('/api/admin/users');
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head"><h2>Bağışçılar / Kullanıcılar</h2></div>
      <div class="admin-section">
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Ad</th><th>E-posta</th><th>Telefon</th><th>Rol</th><th>Etiketler</th><th>Kayıt</th><th>İşlem</th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.phone || '-')}</td>
                <td>
                  <select onchange="updateRole(${u.id}, this.value)">
                    <option ${u.role === 'donor' ? 'selected' : ''} value="donor">Bağışçı</option>
                    <option ${u.role === 'staff' ? 'selected' : ''} value="staff">Personel</option>
                    <option ${u.role === 'admin' ? 'selected' : ''} value="admin">Yönetici</option>
                  </select>
                </td>
                <td><input type="text" value="${u.tags || ''}" onblur="updateTags(${u.id}, this.value)" placeholder="vip,aylik" style="padding:6px;border:1px solid var(--border);border-radius:6px;font-size:.85rem;" /></td>
                <td>${new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
                <td><a href="#messages" class="btn btn-ghost btn-sm">Mesajlar</a></td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  },

  async messages() {
    _msgLabels = await api('/api/admin/msg-labels');
    _msgFilter = { label: null, archived: 0 };
    await renderMsgList();
  },

  async categories() { await renderCategoriesSection(); },

  async campaigns() { await renderCrudSection({
    key: 'campaigns', title: 'Kampanyalar', publicEndpoint: '/api/admin/campaigns',
    fields: [
      { k: 'title', label: 'Başlık', wide: true },
      { k: 'slug', label: 'Slug' },
      { k: 'cover_image', label: 'Kapak Görseli URL' },
      { k: 'goal', label: 'Hedef (₺)', type: 'number' },
      { k: 'raised', label: 'Toplanan (₺)', type: 'number' },
      { k: 'donor_count', label: 'Bağışçı Sayısı', type: 'number' },
      { k: 'active', label: 'Aktif (kaldırınca siteden gizlenir)', type: 'checkbox' },
      { k: 'completed', label: 'Durum', type: 'select', options: [['0', 'Devam Ediyor'], ['1', 'Tamamlandı']] },
      { k: 'summary', label: 'Özet', type: 'textarea', wide: true },
      { k: 'body', label: 'Detay Metni', type: 'textarea', wide: true },
    ],
    list: (rows) => `
      <div class="table-wrap"><table>
        <thead><tr><th>Başlık</th><th>Hedef</th><th>Toplanan</th><th>Bağışçı</th><th>Durum</th><th>Aktif</th><th>İşlem</th></tr></thead>
        <tbody>
          ${rows.map(r => {
            const pct = r.goal > 0 ? Math.min(100, Math.round((r.raised / r.goal) * 100)) : 0;
            const statusBadge = r.completed
              ? '<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:999px;font-size:.78rem;font-weight:600">Tamamlandı</span>'
              : '<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:999px;font-size:.78rem;font-weight:600">Devam Ediyor</span>';
            return `
            <tr>
              <td><strong>${r.title}</strong><div class="muted" style="font-size:.8rem">${r.slug}</div></td>
              <td>${formatTL(r.goal)}</td>
              <td>${formatTL(r.raised)}<div style="margin-top:3px;height:4px;background:#e2e8f0;border-radius:2px;width:80px"><div style="height:4px;background:var(--brand);border-radius:2px;width:${pct}%"></div></div><div class="muted" style="font-size:.72rem">${pct}%</div></td>
              <td>${formatNumber(r.donor_count)}</td>
              <td>${statusBadge}</td>
              <td>${r.active ? '✅' : '❌'}</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick='editItem("campaigns", ${JSON.stringify(r).replace(/'/g, "&#39;")})'>Düzenle</button>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteItem('campaigns', ${r.id})">Sil</button>
              </td>
            </tr>`;}).join('')}
        </tbody>
      </table></div>`
  }); },

  async activities() { await renderCrudSection({
    key: 'activities', title: 'Faaliyetler',
    fields: [
      { k: 'title', label: 'Başlık', wide: true },
      { k: 'slug', label: 'Slug' },
      { k: 'cover_image', label: 'Kapak Görseli URL' },
      { k: 'location', label: 'Lokasyon' },
      { k: 'date', label: 'Tarih', type: 'date' },
      { k: 'active', label: 'Aktif', type: 'checkbox' },
      { k: 'regions', label: 'Güncel Projeler Bölgeleri', type: 'regions', wide: true },
      { k: 'short_description', label: 'Kısa Açıklama', type: 'textarea', wide: true },
      { k: 'body', label: 'Detay Metni', type: 'textarea', wide: true },
    ],
    list: (rows) => `
      <div class="table-wrap"><table>
        <thead><tr><th>Başlık</th><th>Lokasyon</th><th>Tarih</th><th>Bölgeler</th><th>Aktif</th><th>İşlem</th></tr></thead>
        <tbody>
          ${rows.map(r => {
            const regionLabels = { ortadogu:'Ortadoğu', balkanlar:'Balkanlar', afrika:'Afrika', 'turki-devletler':'Türkî Devletler', turkiye:'Türkiye' };
            const regionBadges = (r.regions || '').split(',').filter(Boolean)
              .map(s => `<span style="background:rgba(26,61,92,.1);color:var(--brand);padding:2px 8px;border-radius:999px;font-size:.72rem;white-space:nowrap">${regionLabels[s]||s}</span>`).join(' ');
            return `
            <tr>
              <td><strong>${r.title}</strong><div class="muted" style="font-size:.8rem">${r.slug}</div></td>
              <td>${r.location || '-'}</td>
              <td>${r.date || '-'}</td>
              <td style="min-width:130px">${regionBadges || '<span class="muted">—</span>'}</td>
              <td>${r.active ? '✅' : '❌'}</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick='editItem("activities", ${JSON.stringify(r).replace(/'/g, "&#39;")})'>Düzenle</button>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteItem('activities', ${r.id})">Sil</button>
              </td>
            </tr>`;}).join('')}
        </tbody>
      </table></div>`
  }); },

  async hero() { await renderCrudSection({
    key: 'hero', title: 'Hero Slider', endpoint: 'hero',
    fields: [
      { k: 'title', label: 'Başlık', wide: true },
      { k: 'subtitle', label: 'Alt Metin', type: 'textarea', wide: true },
      { k: 'slide_icon', label: 'Slide İkonu (emoji — dots göstergesi için)' },
      { k: 'button_text', label: '1. Buton Metni (Bağış Yap)' },
      { k: 'button_link', label: '1. Buton Linki' },
      { k: 'button2_text', label: '2. Buton Metni (Daha Fazla — boş bırakılabilir)' },
      { k: 'button2_link', label: '2. Buton Linki' },
      { k: 'media_url', label: 'Görsel/Video URL', wide: true },
      { k: 'media_type', label: 'Medya Tipi', type: 'select', options: [['image', 'Görsel'], ['video', 'Video']] },
      { k: 'sort_order', label: 'Sıra', type: 'number' },
      { k: 'active', label: 'Aktif', type: 'checkbox' },
    ],
    list: (rows) => `
      <div class="table-wrap"><table>
        <thead><tr><th>Sıra</th><th>Başlık</th><th>Tip</th><th>Aktif</th><th>İşlem</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.sort_order}</td>
              <td><strong>${r.title || ''}</strong><div class="muted" style="font-size:.8rem">${r.subtitle || ''}</div></td>
              <td>${r.media_type}</td>
              <td>${r.active ? '✅' : '❌'}</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick='editItem("hero", ${JSON.stringify(r).replace(/'/g, "&#39;")})'>Düzenle</button>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteItem('hero', ${r.id})">Sil</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`,
    publicEndpoint: '/api/admin/hero'
  }); },

  async boards() { await renderCrudSection({
    key: 'boards', title: 'Yetkili Kurullar',
    fields: [
      { k: 'board_name', label: 'Kurul Adı' },
      { k: 'person_name', label: 'Ad Soyad' },
      { k: 'role', label: 'Görev' },
      { k: 'sort_order', label: 'Sıra', type: 'number' },
    ],
    list: (rows) => `
      <div class="table-wrap"><table>
        <thead><tr><th>Kurul</th><th>Ad</th><th>Görev</th><th>Sıra</th><th>İşlem</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.board_name}</td>
              <td><strong>${r.person_name}</strong></td>
              <td>${r.role || '-'}</td>
              <td>${r.sort_order}</td>
              <td>
                <button class="btn btn-outline btn-sm" onclick='editItem("boards", ${JSON.stringify(r).replace(/'/g, "&#39;")})'>Düzenle</button>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteItem('boards', ${r.id})">Sil</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`,
    publicEndpoint: '/api/boards'
  }); },

  async documents() {
    const rows = await api('/api/documents');
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head">
        <h2>Belgeler</h2>
        <button class="btn btn-primary" onclick="uploadDoc()">Dosya Yükle</button>
      </div>
      <div class="admin-section">
        <div class="doc-list">
          ${rows.map(r => `
            <div class="doc-item">
              <div class="doc-title">${r.title}</div>
              <div class="flex gap-2">
                <a href="${r.file_url}" target="_blank" class="btn btn-outline btn-sm">Görüntüle</a>
                <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteDoc(${r.id})">Sil</button>
              </div>
            </div>`).join('')}
        </div>
      </div>
    `;
  },

  async menus() {
    const rows = await api('/api/admin/menus');
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head">
        <h2>Menü Yönetimi</h2>
        <button class="btn btn-primary" onclick="newMenu()">Menü Öğesi Ekle</button>
      </div>
      <div class="admin-section">
        <p class="muted" style="margin-bottom:16px;">Sürükleyerek sıralama yerine sıra numarası girerek düzenleyebilirsiniz. parent_id=0 ana menüde görünür; diğerleri alt menü olur.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Etiket</th><th>URL</th><th>Sıra</th><th>Üst Menü ID</th><th>İşlem</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.label}</td>
                <td class="muted">${r.url}</td>
                <td>${r.sort_order}</td>
                <td>${r.parent_id}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick='editMenu(${JSON.stringify(r).replace(/'/g, "&#39;")})'>Düzenle</button>
                  <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteMenu(${r.id})">Sil</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  },

  async bulk() {
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head"><h2>Toplu Mail</h2></div>
      <div class="admin-section">
        <p class="muted" style="margin-bottom:16px;">Bağışçılarınıza toplu duyuru e-postası gönderin. Boş bırakırsanız tüm kayıtlı kullanıcılara gider. Etiket girerseniz yalnızca ilgili kullanıcılara gider.</p>
        <div class="form-group"><label>Etiket (opsiyonel)</label><input type="text" id="tag" placeholder="örn: vip" /></div>
        <div class="form-group"><label>Konu</label><input type="text" id="subject" /></div>
        <div class="form-group"><label>İçerik (HTML destekler)</label><textarea id="html" rows="8" placeholder="Merhaba {name}, ..."></textarea></div>
        <button class="btn btn-primary" onclick="sendBulk()">Gönder</button>
      </div>
    `;
  },

  async settings() {
    const s = await api('/api/settings');
    const keys = [
      ['site_title', 'Site Başlığı'],
      ['slogan', 'Slogan'],
      ['phone', 'Telefon'],
      ['whatsapp', 'WhatsApp (9055...) '],
      ['email', 'E-posta'],
      ['address', 'Adres'],
      ['iban', 'IBAN'],
      ['iban_holder', 'IBAN Sahibi'],
      ['tw', 'Twitter URL'],
      ['ig', 'Instagram URL'],
      ['fb', 'Facebook URL'],
      ['yt', 'YouTube URL'],
    ];
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head"><h2>Site Ayarları</h2></div>
      <div class="admin-section">
        <div class="data-form">
          ${keys.map(([k, l]) => `<div><label>${l}</label><input type="text" name="${k}" value="${escapeHtml(s[k] || '')}" /></div>`).join('')}
          <div class="wide"><label>Hakkımızda Metni</label><textarea name="about_body" rows="4">${escapeHtml(s.about_body || '')}</textarea></div>
          <div><label>Misyon</label><textarea name="mission" rows="3">${escapeHtml(s.mission || '')}</textarea></div>
          <div><label>Vizyon</label><textarea name="vision" rows="3">${escapeHtml(s.vision || '')}</textarea></div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="saveSettings()">Ayarları Kaydet</button>
      </div>
    `;
  },
};

// ===== Categories (hierarchical) =====
async function renderCategoriesSection() {
  const rows = await api('/api/admin/categories');
  const parents = rows.filter(r => !r.parent_id);
  const childrenOf = id => rows.filter(r => r.parent_id === id);

  const tableRows = parents.map(p => {
    const subs = childrenOf(p.id);
    const pRow = `
      <tr style="background:#f8fafc">
        <td style="font-size:1.4rem">${p.icon || ''}</td>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td class="muted" style="font-size:.8rem">${escapeHtml(p.slug)}</td>
        <td>${p.cover_image ? `<img src="${p.cover_image}" style="width:48px;height:36px;object-fit:cover;border-radius:4px" />` : '<span class="muted">—</span>'}</td>
        <td>${formatTL(p.price)}</td>
        <td>${p.sort_order}</td>
        <td>${p.active ? '✅' : '❌'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick='openCategoryForm(null,${JSON.stringify(p).replace(/'/g,"&#39;")})'>Düzenle</button>
          <button class="btn btn-outline btn-sm" onclick="openCategoryForm(${p.id},null)">+ Alt</button>
          <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteCategoryItem(${p.id})">Sil</button>
        </td>
      </tr>`;
    const subRows = subs.map(s => `
      <tr>
        <td style="font-size:1.2rem;padding-left:28px">${s.icon || ''}</td>
        <td style="padding-left:28px"><span style="color:var(--muted);margin-right:4px">↳</span>${escapeHtml(s.title)}</td>
        <td class="muted" style="font-size:.8rem">${escapeHtml(s.slug)}</td>
        <td>${s.cover_image ? `<img src="${s.cover_image}" style="width:48px;height:36px;object-fit:cover;border-radius:4px" />` : '<span class="muted">—</span>'}</td>
        <td>${formatTL(s.price)}</td>
        <td>${s.sort_order}</td>
        <td>${s.active ? '✅' : '❌'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick='openCategoryForm(${p.id},${JSON.stringify(s).replace(/'/g,"&#39;")})'>Düzenle</button>
          <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteCategoryItem(${s.id})">Sil</button>
        </td>
      </tr>`).join('');
    return pRow + subRows;
  }).join('');

  // Orphan subcategories (parent deleted)
  const orphans = rows.filter(r => r.parent_id && !parents.find(p => p.id === r.parent_id));
  const orphanRows = orphans.map(s => `
    <tr>
      <td style="font-size:1.2rem">${s.icon || ''}</td>
      <td><em class="muted">[Üst kategori yok]</em> ${escapeHtml(s.title)}</td>
      <td class="muted" style="font-size:.8rem">${escapeHtml(s.slug)}</td>
      <td>${s.cover_image ? `<img src="${s.cover_image}" style="width:48px;height:36px;object-fit:cover;border-radius:4px" />` : '<span class="muted">—</span>'}</td>
      <td>${formatTL(s.price)}</td>
      <td>${s.sort_order}</td>
      <td>${s.active ? '✅' : '❌'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick='openCategoryForm(null,${JSON.stringify(s).replace(/'/g,"&#39;")})'>Düzenle</button>
        <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteCategoryItem(${s.id})">Sil</button>
      </td>
    </tr>`).join('');

  document.getElementById('admin-main').innerHTML = `
    <div class="admin-head">
      <h2>Bağış Kategorileri</h2>
      <button class="btn btn-primary" onclick="openCategoryForm(null,null)">+ Yeni Ana Kategori</button>
    </div>
    <div class="admin-section">
      ${rows.length === 0 ? '<div class="empty">Henüz kategori yok</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>İkon</th><th>Başlık</th><th>Slug</th><th>Görsel</th><th>Tutar</th><th>Sıra</th><th>Aktif</th><th>İşlem</th></tr></thead>
          <tbody>${tableRows}${orphanRows}</tbody>
        </table></div>`}
    </div>`;
  window._catRows = rows;
}

function openCategoryForm(parentId, row) {
  const parents = (window._catRows || []).filter(r => !r.parent_id);
  const isEdit = !!row;
  const r = row || {};
  const currentParent = isEdit ? (r.parent_id || '') : (parentId || '');

  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h3>${isEdit ? 'Kategori Düzenle' : (parentId ? 'Alt Kategori Ekle' : 'Yeni Ana Kategori')}</h3>
    <div class="data-form" id="cat-form">
      <div class="wide">
        <label>Üst Kategori</label>
        <select name="parent_id">
          <option value="">— Ana Kategori (üst kategori yok) —</option>
          ${parents.filter(p => !isEdit || p.id !== r.id).map(p =>
            `<option value="${p.id}" ${currentParent==p.id?'selected':''}>${escapeHtml(p.title)}</option>`
          ).join('')}
        </select>
      </div>
      <div><label>Başlık *</label><input type="text" name="title" value="${escapeHtml(r.title||'')}" /></div>
      <div><label>Slug</label><input type="text" name="slug" value="${escapeHtml(r.slug||'')}" placeholder="otomatik oluşturulur" /></div>
      <div><label>İkon (emoji)</label><input type="text" name="icon" value="${escapeHtml(r.icon||'')}" placeholder="🎁" /></div>
      <div><label>Birim Tutar (₺)</label><input type="number" name="price" value="${r.price||0}" /></div>
      <div><label>Sıra</label><input type="number" name="sort_order" value="${r.sort_order||0}" /></div>
      <div class="wide"><label>Açıklama (panel metni)</label><textarea name="description" rows="3">${escapeHtml(r.description||'')}</textarea></div>
      <div class="wide">
        <label>Kapak Görseli</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" name="cover_image" id="upload_url_cover_image" value="${escapeHtml(r.cover_image||'')}" style="flex:1" placeholder="URL girin veya dosya yükleyin" />
          <label class="btn btn-outline btn-sm" style="cursor:pointer;white-space:nowrap">Dosya Seç<input type="file" accept="image/*" style="display:none" onchange="uploadMediaFile(this,'cover_image')" /></label>
        </div>
        ${r.cover_image ? `<img src="${escapeHtml(r.cover_image)}" style="margin-top:8px;max-height:80px;border-radius:6px;max-width:100%" />` : ''}
      </div>
      <div class="wide"><label><input type="checkbox" name="fixed_price" ${r.fixed_price?'checked':''} /> Sabit Tutar — bağışçı tutarı değiştiremez</label></div>
      <div class="wide"><label><input type="checkbox" name="active" ${(r.active??1)?'checked':''} /> Aktif</label></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveCategoryForm(${r.id||'null'})">Kaydet</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

async function saveCategoryForm(id) {
  const form = document.getElementById('cat-form');
  const get = name => form.querySelector(`[name="${name}"]`);
  let slug = get('slug').value.trim();
  const title = get('title').value.trim();
  if (!title) return alert('Başlık zorunludur');
  if (!slug) slug = title.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const data = {
    title, slug,
    icon: get('icon').value.trim(),
    price: parseFloat(get('price').value) || 0,
    sort_order: parseInt(get('sort_order').value) || 0,
    description: get('description').value.trim(),
    cover_image: get('cover_image').value.trim(),
    fixed_price: get('fixed_price').checked ? 1 : 0,
    active: get('active').checked ? 1 : 0,
    parent_id: get('parent_id').value ? parseInt(get('parent_id').value) : null,
  };
  const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
  const r = await api(url, { method: id ? 'PUT' : 'POST', body: data });
  if (r.ok) { closeModal(); await renderCategoriesSection(); }
  else alert(r.error || 'Kaydetme başarısız');
}

async function deleteCategoryItem(id) {
  if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?\n(Alt kategoriler varsa bağlantısı kaldırılır, silinmez)')) return;
  await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
  await renderCategoriesSection();
}

async function renderCrudSection({ key, title, fields, list, publicEndpoint }) {
  const rows = await api(publicEndpoint || '/api/' + key);
  adminState.data[key] = rows;
  document.getElementById('admin-main').innerHTML = `
    <div class="admin-head">
      <h2>${title}</h2>
      <button class="btn btn-primary" onclick='newItem("${key}", ${JSON.stringify(fields)})'>Yeni Ekle</button>
    </div>
    <div class="admin-section">${list(rows)}</div>
  `;
  window._crudFields = window._crudFields || {};
  window._crudFields[key] = fields;
}

function newItem(key, fields) {
  openFormModal(key, fields, {}, 'Yeni Ekle');
}
function editItem(key, row) {
  openFormModal(key, window._crudFields[key], row, 'Düzenle');
}

function openFormModal(key, fields, row, title) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h3>${title}</h3>
    <div class="data-form" id="form-fields">
      ${fields.map(f => {
        const v = row[f.k] ?? (f.type === 'checkbox' ? 1 : '');
        const cls = f.wide ? 'wide' : '';
        if (f.type === 'textarea') return `<div class="${cls}"><label>${f.label}</label><textarea name="${f.k}" rows="3">${escapeHtml(v)}</textarea></div>`;
        if (f.type === 'checkbox') return `<div class="${cls}"><label><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''}/> ${f.label}</label></div>`;
        if (f.type === 'select') return `<div class="${cls}"><label>${f.label}</label><select name="${f.k}">${f.options.map(([val, lbl]) => `<option value="${val}" ${v === val ? 'selected' : ''}>${lbl}</option>`).join('')}</select></div>`;
        if (f.type === 'regions') {
          const REGIONS = [
            { slug: 'ortadogu', name: 'Ortadoğu' },
            { slug: 'balkanlar', name: 'Balkanlar' },
            { slug: 'afrika', name: 'Afrika' },
            { slug: 'turki-devletler', name: 'Türkî Devletler' },
            { slug: 'turkiye', name: 'Türkiye' },
          ];
          window._regionVals = window._regionVals || {};
          window._regionVals[f.k] = v || '';
          const selected = (v || '').split(',').filter(Boolean);
          return `<div class="${cls}">
            <label style="display:block;margin-bottom:8px">${f.label}</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${REGIONS.map(r => {
                const on = selected.includes(r.slug);
                return `<button type="button"
                  onclick="toggleRegionPill(this,'${r.slug}','${f.k}')"
                  style="padding:7px 16px;border-radius:999px;cursor:pointer;font-size:.88rem;font-weight:${on?'600':'400'};border:2px solid ${on?'var(--brand)':'var(--border)'};background:${on?'var(--brand)':'var(--bg)'};color:${on?'#fff':'var(--text)'};transition:all .15s"
                  data-active="${on?'1':'0'}"
                  data-slug="${r.slug}">${r.name}</button>`;
              }).join('')}
            </div>
          </div>`;
        }
        if (f.k === 'media_url' || f.k === 'cover_image') return `<div class="${cls}">
          <label>${f.label}</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" name="${f.k}" id="upload_url_${f.k}" value="${escapeHtml(v)}" style="flex:1" placeholder="URL girin veya dosya yükleyin" />
            <label class="btn btn-outline btn-sm" style="cursor:pointer;white-space:nowrap;margin:0">
              📁 Yükle
              <input type="file" accept="image/*,video/*" style="display:none" onchange="uploadMediaFile(this, '${f.k}')">
            </label>
          </div>
        </div>`;
        return `<div class="${cls}"><label>${f.label}</label><input type="${f.type || 'text'}" name="${f.k}" value="${escapeHtml(v)}" /></div>`;
      }).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick='saveItem("${key}", ${row.id || 'null'})'>Kaydet</button>
    </div>
  `;
  document.getElementById('modal').classList.add('open');
}

async function uploadMediaFile(input, fieldKey) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch('/api/admin/upload', { method: 'POST', body: fd }).then(res => res.json());
  if (r.url) {
    const inp = document.getElementById('upload_url_' + fieldKey);
    if (inp) inp.value = r.url;
  } else {
    alert('Dosya yükleme başarısız: ' + (r.error || 'Bilinmeyen hata'));
  }
}

async function saveItem(key, id) {
  const fields = window._crudFields[key];
  const form = document.getElementById('form-fields');
  const data = {};
  fields.forEach(f => {
    if (f.type === 'regions') {
      data[f.k] = (window._regionVals && window._regionVals[f.k] !== undefined)
        ? window._regionVals[f.k]
        : '';
      return;
    }
    const el = form.querySelector(`[name="${f.k}"]`);
    if (!el) return;
    if (f.type === 'checkbox') data[f.k] = el.checked ? 1 : 0;
    else if (f.type === 'number') data[f.k] = parseFloat(el.value) || 0;
    else data[f.k] = el.value;
  });
  if (!data.slug && data.title) {
    data.slug = data.title.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  const url = id ? `/api/admin/${key}/${id}` : `/api/admin/${key}`;
  const method = id ? 'PUT' : 'POST';
  const r = await api(url, { method, body: data });
  if (r.ok) { closeModal(); switchSection(key); }
  else alert(r.error || 'Kaydetme başarısız');
}

async function deleteItem(key, id) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  await api(`/api/admin/${key}/${id}`, { method: 'DELETE' });
  switchSection(key);
}

function toggleRegionPill(btn, slug, fieldKey) {
  const active = btn.dataset.active === '1';
  const nowActive = !active;
  btn.dataset.active = nowActive ? '1' : '0';
  btn.style.borderColor = nowActive ? 'var(--brand)' : 'var(--border)';
  btn.style.background  = nowActive ? 'var(--brand)' : 'var(--bg)';
  btn.style.color       = nowActive ? '#fff'         : 'var(--text)';
  btn.style.fontWeight  = nowActive ? '600'          : '400';

  window._regionVals = window._regionVals || {};
  const vals = (window._regionVals[fieldKey] || '').split(',').filter(Boolean);
  if (nowActive) { if (!vals.includes(slug)) vals.push(slug); }
  else           { const i = vals.indexOf(slug); if (i > -1) vals.splice(i, 1); }
  window._regionVals[fieldKey] = vals.join(',');
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }

// Donation actions
function renderDonationList(filter) {
  const all = adminState.data.donations || [];
  const rows = filter === 'all' ? all : all.filter(d => d.status === filter);
  document.getElementById('donations-list').innerHTML = rows.length === 0
    ? '<div class="empty">Kayıt yok</div>'
    : `<div class="table-wrap"><table>
      <thead><tr><th>Tarih</th><th>Bağışçı</th><th>Telefon</th><th>Tutar</th><th>Kategori</th><th>Durum</th><th>İşlem</th></tr></thead>
      <tbody>
        ${rows.map(d => `
          <tr>
            <td>${new Date(d.created_at).toLocaleString('tr-TR')}</td>
            <td><strong>${escapeHtml(d.user_name)}</strong><div class="muted" style="font-size:.8rem">${escapeHtml(d.user_email)}</div>${d.note ? `<div class="muted" style="font-size:.75rem">📝 ${escapeHtml(d.note)}</div>` : ''}</td>
            <td>${d.user_phone ? `<a href="https://wa.me/${d.user_phone.replace(/\D/g,'')}" target="_blank" rel="noopener" title="WhatsApp'ta Yaz" style="color:#25D366;font-weight:600">${escapeHtml(d.user_phone)}</a>` : '<span class="muted">—</span>'}</td>
            <td><strong>${formatTL(d.amount)}</strong></td>
            <td>${d.category_title || d.campaign_title || 'Genel'}</td>
            <td><span class="badge ${d.status}">${{ pending: 'Bekliyor', approved: 'Onaylı', rejected: 'Red' }[d.status]}</span></td>
            <td>
              ${d.status === 'pending' ? `
                <button class="btn btn-primary btn-sm" onclick="approveDonation(${d.id})">Onayla</button>
                <button class="btn btn-outline btn-sm" onclick="rejectDonation(${d.id})">Reddet</button>
              ` : ''}
              ${d.receipt_file ? `<a href="${d.receipt_file}" target="_blank" class="btn btn-ghost btn-sm">Makbuz</a>` : ''}
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}
function filterDonations(f, el) {
  document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderDonationList(f);
}
async function approveDonation(id) {
  const comment = prompt('Açıklama/Not (opsiyonel, makbuza yazılacak):') || '';
  await api(`/api/admin/donations/${id}/approve`, { method: 'POST', body: { adminComment: comment } });
  switchSection(adminState.section);
}
async function rejectDonation(id) {
  const comment = prompt('Red sebebi:') || '';
  await api(`/api/admin/donations/${id}/reject`, { method: 'POST', body: { adminComment: comment } });
  switchSection(adminState.section);
}

async function updateRole(id, role) {
  await api(`/api/admin/users/${id}/role`, { method: 'POST', body: { role } });
}
async function updateTags(id, tags) {
  await api(`/api/admin/users/${id}/tags`, { method: 'POST', body: { tags } });
}

// Messages
async function renderMsgList() {
  const { label, archived } = _msgFilter;
  let url = '/api/admin/messages?archived=' + (archived ? '1' : '0');
  if (label) url += '&label=' + label;
  _msgThreads = await api(url);

  const filterBar = `
    <div class="msg-filter-bar">
      <button class="msg-chip${!label && !archived ? ' active' : ''}" onclick="setMsgFilter(null,0)">Tümü</button>
      ${_msgLabels.map(l => `
        <button class="msg-chip${label==l.id && !archived ? ' active' : ''}"
          onclick="setMsgFilter(${l.id},0)"
          style="${label==l.id && !archived ? `background:${l.color};color:#fff;border-color:${l.color}` : `border-color:${l.color};color:${l.color}`}">
          ${escapeHtml(l.name)}
        </button>`).join('')}
      <button class="msg-chip${archived ? ' active' : ''}" onclick="setMsgFilter(null,1)">📁 Arşiv</button>
      <button class="btn btn-ghost btn-sm" onclick="toggleLabelManager()" style="margin-left:auto;font-size:.85rem">⚙ Kategoriler</button>
    </div>
    <div id="label-manager" style="display:none" class="admin-section" style="padding:12px;margin:0 0 12px;border:1px dashed var(--border)">
      <h4 style="margin-bottom:10px">Kategori Yönetimi</h4>
      <div id="label-list">
        ${_msgLabels.map(l => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
            <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${l.color};flex-shrink:0"></span>
            <span style="flex:1">${escapeHtml(l.name)}</span>
            <button class="btn btn-sm" style="background:var(--danger);color:#fff;padding:3px 8px" onclick="deleteMsgLabel(${l.id})">Sil</button>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;align-items:center">
        <input id="new-label-name" placeholder="Yeni kategori adı" style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:.9rem" />
        <input id="new-label-color" type="color" value="#1565c0" title="Renk" style="width:36px;height:32px;padding:2px;border:1px solid var(--border);border-radius:6px;cursor:pointer" />
        <button class="btn btn-primary btn-sm" onclick="addMsgLabel()">Ekle</button>
      </div>
    </div>`;

  const threadList = _msgThreads.length === 0
    ? '<div class="empty">Mesaj yok</div>'
    : `<div class="doc-list">${_msgThreads.map(t => {
        const key = String(t.user_id || t.email || t.name);
        const labelBadge = t.label_name
          ? `<span style="background:${t.label_color};color:#fff;border-radius:999px;padding:1px 7px;font-size:.7rem;white-space:nowrap">${escapeHtml(t.label_name)}</span>`
          : '';
        return `
          <div class="doc-item msg-thread-item" style="cursor:pointer" onclick="openThread('${escapeHtml(key)}','${escapeHtml(t.name)}','${escapeHtml(t.email||'')}',${t.user_id||'null'})">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
                <strong>${escapeHtml(t.name)}</strong>
                ${t.unread > 0 ? `<span class="badge" style="background:var(--danger);color:#fff">${t.unread}</span>` : ''}
                ${labelBadge}
              </div>
              <div class="muted" style="font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.email||'-')} · ${new Date(t.last_at).toLocaleString('tr-TR')}</div>
            </div>
            <div style="display:flex;gap:2px;flex-shrink:0" onclick="event.stopPropagation()">
              <button class="btn btn-ghost btn-sm" onclick="toggleArchiveThread('${escapeHtml(key)}',${t.archived?0:1})" title="${t.archived?'Arşivden Çıkar':'Arşivle'}" style="padding:4px 6px">${t.archived?'📤':'📁'}</button>
              <button class="btn btn-ghost btn-sm" onclick="deleteThread('${escapeHtml(key)}')" title="Sil" style="padding:4px 6px;color:var(--danger)">🗑</button>
            </div>
          </div>`;
      }).join('')}</div>`;

  const main = document.getElementById('admin-main');
  const existingPanel = document.getElementById('thread-panel');
  const panelHtml = existingPanel ? existingPanel.outerHTML : `<div class="admin-section" id="thread-panel" style="margin-bottom:0"><div class="empty">Soldan bir konuşma seçin</div></div>`;

  main.innerHTML = `
    <div class="admin-head"><h2>Mesajlar (Canlı Destek)</h2></div>
    ${filterBar}
    <div class="grid-2">
      <div class="admin-section" style="margin-bottom:0">
        <h3>Konuşmalar</h3>
        ${threadList}
      </div>
      ${panelHtml}
    </div>`;
}

async function setMsgFilter(labelId, archived) {
  _msgFilter = { label: labelId, archived };
  await renderMsgList();
}

function toggleLabelManager() {
  const el = document.getElementById('label-manager');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function addMsgLabel() {
  const name = document.getElementById('new-label-name')?.value?.trim();
  const color = document.getElementById('new-label-color')?.value || '#1565c0';
  if (!name) return;
  await api('/api/admin/msg-labels', { method: 'POST', body: { name, color } });
  _msgLabels = await api('/api/admin/msg-labels');
  await renderMsgList();
  const lm = document.getElementById('label-manager');
  if (lm) lm.style.display = 'block';
}

async function deleteMsgLabel(id) {
  if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
  await api(`/api/admin/msg-labels/${id}`, { method: 'DELETE' });
  _msgLabels = await api('/api/admin/msg-labels');
  if (_msgFilter.label == id) _msgFilter.label = null;
  await renderMsgList();
  const lm = document.getElementById('label-manager');
  if (lm) lm.style.display = 'block';
}

async function setThreadLabel(key, labelId) {
  await api(`/api/admin/messages/${encodeURIComponent(key)}/label`, { method: 'PATCH', body: { label_id: labelId || null } });
  const t = _msgThreads.find(x => String(x.user_id||x.email||x.name) === key);
  if (t) {
    t.label_id = labelId || null;
    const l = _msgLabels.find(x => x.id == labelId);
    t.label_name = l?.name || null;
    t.label_color = l?.color || null;
  }
}

async function toggleArchiveThread(key, archived) {
  await api(`/api/admin/messages/${encodeURIComponent(key)}/archive`, { method: 'PATCH', body: { archived } });
  await renderMsgList();
}

async function deleteThread(key) {
  if (!confirm('Bu konuşmayı ve tüm mesajları silmek istediğinize emin misiniz?')) return;
  await api(`/api/admin/messages/${encodeURIComponent(key)}`, { method: 'DELETE' });
  if (_currentThread?.key === key) _currentThread = null;
  await renderMsgList();
}

async function openThread(key, name, email, userId) {
  _currentThread = { key, userId, email, name };
  _adminAttachFileUrl = null;
  const rows = await api('/api/admin/messages/' + encodeURIComponent(key));
  const fileAccept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip';
  const threadMeta = _msgThreads.find(t => String(t.user_id||t.email||t.name) === key);
  const currentLabelId = threadMeta?.label_id || '';

  const labelSelect = `
    <select onchange="setThreadLabel('${escapeHtml(key)}', this.value)" style="font-size:.8rem;padding:3px 6px;border:1px solid var(--border);border-radius:6px;max-width:130px">
      <option value="">— Kategori —</option>
      ${_msgLabels.map(l => `<option value="${l.id}" ${currentLabelId==l.id?'selected':''}>${escapeHtml(l.name)}</option>`).join('')}
    </select>`;

  document.getElementById('thread-panel').innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <div style="flex:1;min-width:0">
        <h3 style="margin:0">${escapeHtml(name)} ${email ? `<small class="muted" style="font-size:.8rem">· ${escapeHtml(email)}</small>` : ''}</h3>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        ${labelSelect}
        <button class="btn btn-ghost btn-sm" onclick="toggleArchiveThread('${escapeHtml(key)}',${threadMeta?.archived?0:1})" title="${threadMeta?.archived?'Arşivden Çıkar':'Arşivle'}" style="padding:5px 8px">${threadMeta?.archived?'📤 Arşivden Çıkar':'📁 Arşivle'}</button>
        <button class="btn btn-sm" onclick="deleteThread('${escapeHtml(key)}')" style="background:var(--danger);color:#fff;padding:5px 8px">🗑 Sil</button>
      </div>
    </div>
    <div class="chat-thread" id="admin-chat-thread">
      ${rows.map(m => `<div class="chat-msg ${m.from_admin?'admin':'user'}">${renderAdminMsgContent(m)}<div style="font-size:.65rem;opacity:.6;margin-top:4px">${new Date(m.created_at).toLocaleString('tr-TR')}</div></div>`).join('')}
    </div>
    <div id="admin-emoji-panel" class="chat-emoji-panel" style="display:none;border-top:1px solid var(--border)">
      ${ADMIN_EMOJIS.map(em => `<button type="button" onclick="adminInsertEmoji('${em}')">${em}</button>`).join('')}
    </div>
    <div id="admin-attach-bar" class="chat-attach-bar" style="display:none">
      <span id="admin-attach-name"></span>
      <button type="button" onclick="clearAdminAttach()" title="Kaldır">✕</button>
    </div>
    <form onsubmit="reply(event)" style="margin-top:8px">
      <div class="form-group" style="margin-bottom:6px">
        <textarea id="admin-reply-body" rows="3" placeholder="Yanıtınız…" style="width:100%"></textarea>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button type="button" class="chat-emoji-toggle" onclick="toggleAdminEmoji()" title="Emoji" style="font-size:1.2rem;background:none;border:none;cursor:pointer">😊</button>
        <label style="cursor:pointer;font-size:1.1rem" title="Dosya ekle">📎<input type="file" accept="${fileAccept}" style="display:none" onchange="onAdminFileSelect(this)"></label>
        <button class="btn btn-primary" type="submit" style="margin-left:auto">Yanıt Gönder</button>
      </div>
    </form>
  `;
  const thread = document.getElementById('admin-chat-thread');
  if (thread) thread.scrollTop = thread.scrollHeight;
}

async function reply(e) {
  e.preventDefault();
  if (!_currentThread) return;
  const bodyText = document.getElementById('admin-reply-body').value.trim();
  if (!bodyText && !_adminAttachFileUrl) return;
  const { userId, email, name } = _currentThread;
  await api('/api/admin/messages/reply', { method: 'POST', body: { user_id: userId, email, name, body: bodyText, file_url: _adminAttachFileUrl } });
  clearAdminAttach();
  await openThread(_currentThread.key, _currentThread.name, _currentThread.email, _currentThread.userId);
}

function toggleAdminEmoji() {
  const p = document.getElementById('admin-emoji-panel');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? 'flex' : 'none';
}
function adminInsertEmoji(em) {
  const ta = document.getElementById('admin-reply-body');
  if (!ta) return;
  const p = ta.selectionStart ?? ta.value.length;
  ta.value = ta.value.slice(0, p) + em + ta.value.slice(p);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = p + em.length;
  document.getElementById('admin-emoji-panel')?.classList.remove('open');
}
function onAdminFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('admin-attach-name').textContent = file.name;
  const bar = document.getElementById('admin-attach-bar');
  if (bar) bar.style.display = 'flex';
  uploadAdminFile(file);
}
function clearAdminAttach() {
  _adminAttachFileUrl = null;
  const bar = document.getElementById('admin-attach-bar');
  if (bar) bar.style.display = 'none';
}
async function uploadAdminFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await r.json();
    _adminAttachFileUrl = data.url || null;
  } catch { clearAdminAttach(); alert('Dosya yüklenemedi.'); }
}
function renderAdminMsgContent(m) {
  let html = m.body ? escapeHtml(m.body) : '';
  if (m.file_url) {
    const ext = (m.file_url.split('.').pop() || '').toLowerCase();
    const fname = escapeHtml(m.file_url.split('/').pop());
    const dlBtn = `<a href="${escapeHtml(m.file_url)}" download title="İndir" style="margin-left:6px;font-size:.85rem;opacity:.8">⬇</a>`;
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
      html += `<br><img src="${escapeHtml(m.file_url)}" class="chat-msg-img" alt="görsel"><br>
        <a href="${escapeHtml(m.file_url)}" download style="font-size:.8rem">⬇ İndir</a>`;
    } else {
      html += `<br><span style="display:inline-flex;align-items:center;gap:4px">
        <a href="${escapeHtml(m.file_url)}" class="chat-msg-file" target="_blank" rel="noopener">📎 ${fname}</a>${dlBtn}
      </span>`;
    }
  }
  return html;
}
function startAdminPolling() {
  if (_adminBadgeInterval) return;
  const check = async () => {
    try {
      const stats = await api('/api/admin/stats');
      const badge = document.getElementById('admin-msg-badge');
      if (!badge) return;
      if (stats.newMessages > 0) { badge.textContent = stats.newMessages; badge.style.display = 'inline-flex'; }
      else badge.style.display = 'none';
    } catch {}
  };
  check();
  _adminBadgeInterval = setInterval(check, 15000);
}

// Documents
function uploadDoc() {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h3>Belge Yükle</h3>
    <div class="form-group"><label>Başlık</label><input type="text" id="d-title" /></div>
    <div class="form-group"><label>Dosya</label><input type="file" id="d-file" /></div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveDoc()">Yükle</button>
    </div>
  `;
  document.getElementById('modal').classList.add('open');
}
async function saveDoc() {
  const title = document.getElementById('d-title').value;
  const file = document.getElementById('d-file').files[0];
  if (!title) return alert('Başlık gerekli');
  let url = '#';
  if (file) {
    const fd = new FormData(); fd.append('file', file);
    const up = await fetch('/api/admin/upload', { method: 'POST', body: fd }).then(r => r.json());
    url = up.url;
  }
  await api('/api/admin/documents', { method: 'POST', body: { title, file_url: url } });
  closeModal();
  switchSection('documents');
}
async function deleteDoc(id) {
  if (!confirm('Silinsin mi?')) return;
  await api('/api/admin/documents/' + id, { method: 'DELETE' });
  switchSection('documents');
}

// Menus
function newMenu() { editMenu({ label: '', url: '/', sort_order: 0, parent_id: 0 }); }
function editMenu(row) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h3>${row.id ? 'Menü Düzenle' : 'Yeni Menü Öğesi'}</h3>
    <div class="data-form">
      <div class="wide"><label>Etiket</label><input type="text" id="m-label" value="${escapeHtml(row.label || '')}" /></div>
      <div class="wide"><label>URL</label><input type="text" id="m-url" value="${escapeHtml(row.url || '')}" /></div>
      <div><label>Sıra</label><input type="number" id="m-sort" value="${row.sort_order || 0}" /></div>
      <div><label>Üst Menü ID (0=ana)</label><input type="number" id="m-parent" value="${row.parent_id || 0}" /></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveMenu(${row.id || 'null'})">Kaydet</button>
    </div>
  `;
  document.getElementById('modal').classList.add('open');
}
async function saveMenu(id) {
  const data = {
    label: document.getElementById('m-label').value,
    url: document.getElementById('m-url').value,
    sort_order: parseInt(document.getElementById('m-sort').value) || 0,
    parent_id: parseInt(document.getElementById('m-parent').value) || 0,
  };
  const url = id ? `/api/admin/menus/${id}` : '/api/admin/menus';
  const method = id ? 'PUT' : 'POST';
  await api(url, { method, body: data });
  closeModal();
  switchSection('menus');
}
async function deleteMenu(id) {
  if (!confirm('Silinsin mi?')) return;
  await api('/api/admin/menus/' + id, { method: 'DELETE' });
  switchSection('menus');
}

// Bulk mail
async function sendBulk() {
  const payload = {
    tag: document.getElementById('tag').value,
    subject: document.getElementById('subject').value,
    html: document.getElementById('html').value,
  };
  if (!payload.subject || !payload.html) return alert('Konu ve içerik zorunlu');
  const r = await api('/api/admin/bulk-mail', { method: 'POST', body: payload });
  alert(`${r.count} adrese gönderildi.`);
}

// Settings
async function saveSettings() {
  const form = document.querySelector('.admin-section .data-form');
  const data = {};
  form.querySelectorAll('input, textarea').forEach(el => data[el.name] = el.value);
  await api('/api/admin/settings', { method: 'POST', body: data });
  alert('Kaydedildi');
}
