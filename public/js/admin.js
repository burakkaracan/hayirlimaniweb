// ===== Admin Panel Script =====
let adminState = { section: 'dashboard', data: {} };

const ADMIN_EMOJIS = ['😊','😂','❤️','👍','🙏','😢','💪','🤔','✅','⭐','🎉','👋','💚','🙌','😍','🥰','😘','🤝','💯','🔥'];
let _adminBadgeInterval = null;
let _adminAttachFileUrl = null;
let _currentThread = null;
let _msgFilter = { label: null, archived: 0 };
let _msgLabels = [];
let _msgThreads = [];
let _usersMap = {};

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
  files:      _si('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
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
  const NAV_LABELS = {
    dashboard:'Panel', donations:'Bağış Onayları', users:'Bağışçılar',
    messages:'Mesajlar', categories:'Bağış Kategorileri', campaigns:'Kampanyalar',
    activities:'Faaliyetler', files:'Dosya Yöneticisi', hero:'Hero Slider',
    boards:'Yetkili Kurullar', documents:'Belgeler', menus:'Menü Yönetimi',
    bulk:'Toplu Mail', settings:'Site Ayarları'
  };
  document.getElementById('admin-root').innerHTML = `
    <div class="admin-shell">
      <header class="admin-topbar">
        <button class="admin-burger" id="admin-burger" onclick="toggleAdminNav()" aria-label="Menüyü Aç">
          <span></span><span></span><span></span>
        </button>
        <a href="/" style="display:flex;align-items:center;line-height:0;">
          <img src="/images/logo-white.png" alt="Hayır Limanı" style="height:30px;" />
        </a>
        <span id="admin-section-title" class="admin-topbar-title"></span>
      </header>
      <div class="admin-overlay" id="admin-overlay" onclick="closeAdminNav()"></div>
      <aside class="admin-sidebar" id="admin-sidebar">
        <a href="/" class="logo" style="display:block; padding: 10px 14px 20px;">
          <img src="/images/logo-white.png" alt="Hayır Limanı" class="logo-img" style="max-height:44px;" />
        </a>
        <nav class="admin-nav">
          <a href="#dashboard"  data-s="dashboard"  onclick="closeAdminNav()">${NAV_ICONS.dashboard} Panel</a>
          <a href="#donations"  data-s="donations"  onclick="closeAdminNav()">${NAV_ICONS.donations} Bağış Onayları</a>
          <a href="#users"      data-s="users"      onclick="closeAdminNav()">${NAV_ICONS.users} Bağışçılar</a>
          <a href="#messages"   data-s="messages"   onclick="closeAdminNav()">${NAV_ICONS.messages} Mesajlar <span class="admin-msg-badge" id="admin-msg-badge" style="display:none"></span></a>
          <a href="#categories" data-s="categories" onclick="closeAdminNav()">${NAV_ICONS.categories} Bağış Kategorileri</a>
          <a href="#campaigns"  data-s="campaigns"  onclick="closeAdminNav()">${NAV_ICONS.campaigns} Kampanyalar</a>
          <a href="#activities" data-s="activities" onclick="closeAdminNav()">${NAV_ICONS.activities} Faaliyetler</a>
          <a href="#files"      data-s="files"      onclick="closeAdminNav()">${NAV_ICONS.files} Dosya Yöneticisi</a>
          <a href="#hero"       data-s="hero"       onclick="closeAdminNav()">${NAV_ICONS.hero} Hero Slider</a>
          <a href="#boards"     data-s="boards"     onclick="closeAdminNav()">${NAV_ICONS.boards} Yetkili Kurullar</a>
          <a href="#documents"  data-s="documents"  onclick="closeAdminNav()">${NAV_ICONS.documents} Belgeler</a>
          <a href="#menus"      data-s="menus"      onclick="closeAdminNav()">${NAV_ICONS.menus} Menü Yönetimi</a>
          <a href="#bulk"       data-s="bulk"       onclick="closeAdminNav()">${NAV_ICONS.bulk} Toplu Mail</a>
          <a href="#settings"   data-s="settings"   onclick="closeAdminNav()">${NAV_ICONS.settings} Site Ayarları</a>
          <a href="/" target="_blank">${NAV_ICONS.external} Siteye Dön</a>
        </nav>
      </aside>
      <main class="admin-main" id="admin-main">
        <div class="loader">Yükleniyor…</div>
      </main>
    </div>
  `;
  window._adminNavLabels = NAV_LABELS;
}

function toggleAdminNav() {
  document.getElementById('admin-sidebar').classList.toggle('open');
  document.getElementById('admin-overlay').classList.toggle('open');
  document.getElementById('admin-burger').classList.toggle('open');
}
function closeAdminNav() {
  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.getElementById('admin-overlay')?.classList.remove('open');
  document.getElementById('admin-burger')?.classList.remove('open');
}

function switchSection(s) {
  adminState.section = s;
  document.querySelectorAll('.admin-nav a[data-s]').forEach(a => a.classList.toggle('active', a.dataset.s === s));
  const titleEl = document.getElementById('admin-section-title');
  if (titleEl && window._adminNavLabels) titleEl.textContent = window._adminNavLabels[s] || '';
  const render = sections[s] || sections.dashboard;
  render();
}

const sections = {
  async dashboard() {
    const [stats, recent, chartData] = await Promise.all([
      api('/api/admin/stats'),
      api('/api/admin/donations?status=pending'),
      api('/api/admin/donations-by-date'),
    ]);

    const si = (path) => `<svg viewBox="0 0 24 24">${path}</svg>`;
    const ICONS = {
      user:     si('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
      money:    si('<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>'),
      check:    si('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
      clock:    si('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
      campaign: si('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'),
      msg:      si('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    };

    const card = (cls, icon, label, value) => `
      <div class="stat-card ${cls}">
        <div class="stat-card-head">
          <div class="stat-label">${label}</div>
          <div class="stat-icon">${icon}</div>
        </div>
        <div class="stat-value">${value}</div>
      </div>`;

    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head">
        <h2>Genel Bakış</h2>
        <span class="muted">Hoşgeldiniz, ${currentUser.name}</span>
      </div>
      <div class="stat-grid">
        ${card('c-teal',   ICONS.user,     'Toplam Bağışçı',      stats.totalUsers)}
        ${card('c-green',  ICONS.money,    'Onaylı Bağış Toplamı',formatTL(stats.approvedSum))}
        ${card('c-blue',   ICONS.check,    'Onaylanan Bağış',     stats.approvedCount)}
        ${card('c-amber',  ICONS.clock,    'Bekleyen Bildirim',   stats.pending)}
        ${card('c-purple', ICONS.campaign, 'Aktif Kampanya',      stats.campaigns)}
        ${card('c-rose',   ICONS.msg,      'Yeni Mesaj',          stats.newMessages)}
      </div>
      <div class="charts-row">
        <div class="chart-card" style="flex:2;min-width:0">
          <h3>Bağış Yoğunluğu</h3>
          <div class="chart-range-bar">
            <button class="active" onclick="dcRange(7,this)">7 Gün</button>
            <button onclick="dcRange(30,this)">30 Gün</button>
            <button onclick="dcRange(90,this)">90 Gün</button>
            <span class="sep">|</span>
            <input type="date" id="dc-from" /><span class="sep">—</span><input type="date" id="dc-to" />
            <button onclick="dcCustom()">Uygula</button>
            <span class="sep">|</span>
            <button class="active" onclick="dcGroup('day',this)">Günlük</button>
            <button onclick="dcGroup('month',this)">Aylık</button>
            <button onclick="dcGroup('quarter',this)">3 Aylık</button>
          </div>
          <div id="donation-chart"></div>
        </div>
        <div class="chart-card" style="flex:1;min-width:280px">
          <h3>Bağış Türü Dağılımı</h3>
          <div class="chart-range-bar">
            <button class="active" onclick="dpRange(7,this)">7 Gün</button>
            <button onclick="dpRange(30,this)">30 Gün</button>
            <button onclick="dpRange(90,this)">90 Gün</button>
            <span class="sep">|</span>
            <input type="date" id="dp-from" /><span class="sep">—</span><input type="date" id="dp-to" />
            <button onclick="dpCustom()">Uygula</button>
          </div>
          <div id="donut-chart"></div>
        </div>
      </div>
      <div class="chart-card" style="margin-bottom:24px">
        <h3>Kampanyaya Göre Bağış</h3>
        <div class="chart-range-bar">
          <select id="dk-campaign" onchange="dkReload()" style="padding:5px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:.82rem"></select>
          <span class="sep">|</span>
          <button class="active" onclick="dkRange(7,this)">7 Gün</button>
          <button onclick="dkRange(30,this)">30 Gün</button>
          <button onclick="dkRange(90,this)">90 Gün</button>
          <span class="sep">|</span>
          <input type="date" id="dk-from" /><span class="sep">—</span><input type="date" id="dk-to" />
          <button onclick="dkCustom()">Uygula</button>
          <span class="sep">|</span>
          <button class="active" onclick="dkGroup('day',this)">Günlük</button>
          <button onclick="dkGroup('month',this)">Aylık</button>
          <button onclick="dkGroup('quarter',this)">3 Aylık</button>
        </div>
        <div id="campaign-chart"></div>
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

    // ── Ortak yardımcılar ──────────────────────────────────────
    let _dcChart = null, _dkChart = null;
    let _dcGroup = 'day', _dkGroup = 'day';

    function buildLabels(from, to, group) {
      if (group === 'month') {
        const list = []; const cur = new Date(from.slice(0,7)+'-01'); const end = new Date(to.slice(0,7)+'-01');
        while (cur <= end) { list.push(cur.toISOString().slice(0,7)); cur.setMonth(cur.getMonth()+1); }
        return list;
      }
      if (group === 'quarter') {
        const list = []; let y = +from.slice(0,4), q = Math.ceil(+from.slice(5,7)/3);
        const ey = +to.slice(0,4), eq = Math.ceil(+to.slice(5,7)/3);
        while (y < ey || (y===ey && q<=eq)) { list.push(`${y}-Q${q}`); q++; if(q>4){q=1;y++;} }
        return list;
      }
      // day
      const list=[]; const cur=new Date(from); const end=new Date(to);
      while(cur<=end){list.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1);}
      return list;
    }

    function fmtLabel(key, group) {
      if (group === 'month') {
        const [y,m] = key.split('-');
        return new Date(+y,+m-1,1).toLocaleString('tr-TR',{month:'short',year:'numeric'});
      }
      if (group === 'quarter') return key.replace('-',' ');
      const [,m,d] = key.split('-'); return `${d}/${m}`;
    }

    function buildDateRange(from, to) { return buildLabels(from, to, 'day'); }

    function makeApexBar(el, counts, totals, keys, group, color1='#0d9488', color2='#2563eb') {
      const labels  = keys.map(k => fmtLabel(k, group));
      const tickAmt = keys.length > 60 ? 10 : keys.length > 20 ? 15 : keys.length;
      const chart = new ApexCharts(el, {
        chart: { type:'bar', height:260, toolbar:{show:false}, fontFamily:'Inter, sans-serif', animations:{enabled:true,speed:400} },
        series: [
          { name:'Bağış Sayısı', type:'bar',  data:counts },
          { name:'Tutar (₺)',    type:'line', data:totals },
        ],
        xaxis: { categories:labels, tickAmount:tickAmt, labels:{style:{fontSize:'11px',colors:'#888'}}, axisBorder:{show:false}, axisTicks:{show:false} },
        yaxis: [
          { title:{text:'Adet',style:{color:color1}}, min:0, forceNiceScale:true, labels:{formatter:v=>Math.round(v)} },
          { opposite:true, title:{text:'₺',style:{color:color2}}, min:0, labels:{formatter:v=>v>=1000?(v/1000).toFixed(0)+'K':v} },
        ],
        colors:[color1,color2],
        fill:{ type:['gradient','gradient'], gradient:{type:'vertical',shadeIntensity:.4,opacityFrom:[.9,.4],opacityTo:[.6,.1]} },
        stroke:{ width:[0,2.5], curve:'smooth' },
        markers:{ size:[0, keys.length>30?0:4] },
        dataLabels:{ enabled:false },
        grid:{ borderColor:'#f0f0f0', strokeDashArray:4 },
        tooltip:{ shared:true, intersect:false, y:[{formatter:v=>v+' adet'},{formatter:v=>'₺'+v.toLocaleString('tr-TR')}] },
        legend:{ position:'top', horizontalAlign:'right', fontSize:'13px' },
        plotOptions:{ bar:{ borderRadius:4, columnWidth:keys.length>30?'70%':'45%' } },
      });
      chart.render();
      return chart;
    }

    async function renderDonationChart(from, to) {
      const res  = await api(`/api/admin/donations-by-date?from=${from}&to=${to}&group=${_dcGroup}`);
      const data = res.rows || res;
      const keys = buildLabels(from, to, _dcGroup);
      const countMap={}, totalMap={};
      data.forEach(r => { countMap[r.day]=r.count; totalMap[r.day]=r.total; });
      if (_dcChart) { _dcChart.destroy(); _dcChart=null; }
      const el = document.getElementById('donation-chart');
      if (!el) return;
      _dcChart = makeApexBar(el, keys.map(k=>countMap[k]||0), keys.map(k=>totalMap[k]||0), keys, _dcGroup);
      const fi=document.getElementById('dc-from'), ti=document.getElementById('dc-to');
      if(fi) fi.value=from; if(ti) ti.value=to;
    }

    window.dcRange = function(days, btn) {
      btn.closest('.chart-card').querySelectorAll('.chart-range-bar button[onclick*="dcRange"]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const to=new Date().toISOString().slice(0,10);
      const from=new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10);
      renderDonationChart(from,to);
    };
    window.dcCustom = function() {
      const from=document.getElementById('dc-from')?.value, to=document.getElementById('dc-to')?.value;
      if(!from||!to||from>to) return alert('Geçerli bir tarih aralığı seçin.');
      renderDonationChart(from,to);
    };
    window.dcGroup = function(g, btn) {
      _dcGroup = g;
      btn.closest('.chart-range-bar').querySelectorAll('button[onclick*="dcGroup"]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const from=document.getElementById('dc-from')?.value, to=document.getElementById('dc-to')?.value;
      if(from&&to) renderDonationChart(from,to);
    };

    // --- Donut grafik ---
    let _dpChart = null;

    async function renderDonutChart(from, to) {
      const res  = await api(`/api/admin/donations-by-category?from=${from}&to=${to}`);
      const data = res.rows || res;
      const el   = document.getElementById('donut-chart');
      if (!el) return;

      if (_dpChart) { _dpChart.destroy(); _dpChart = null; }

      if (!data.length) {
        el.innerHTML = '<div style="height:260px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:.9rem">Bu aralıkta bağış yok</div>';
        return;
      }

      _dpChart = new ApexCharts(el, {
        chart: { type: 'donut', height: 300, fontFamily: 'Inter, sans-serif', animations: { speed: 400 } },
        series: data.map(r => r.total),
        labels: data.map(r => r.label),
        colors: ['#0d9488','#2563eb','#7c3aed','#d97706','#e11d48','#16a34a','#0891b2','#9333ea'],
        plotOptions: {
          pie: {
            donut: {
              size: '65%',
              labels: {
                show: true,
                value: { formatter: v => '₺' + Number(v).toLocaleString('tr-TR') },
                total: { show: true, label: 'Toplam', formatter: w => '₺' + w.globals.seriesTotals.reduce((a,b) => a+b, 0).toLocaleString('tr-TR') },
              },
            },
          },
        },
        dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + '%' },
        legend: { position: 'bottom', fontSize: '12px' },
        tooltip: { y: { formatter: v => '₺' + v.toLocaleString('tr-TR') } },
      });
      _dpChart.render();

      const fi = document.getElementById('dp-from');
      const ti = document.getElementById('dp-to');
      if (fi) fi.value = from;
      if (ti) ti.value = to;
    }

    window.dpRange = function(days, btn) {
      document.querySelectorAll('#donut-chart').forEach(() => {});
      btn.closest('.chart-card').querySelectorAll('.chart-range-bar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const to   = new Date().toISOString().slice(0,10);
      const from = new Date(Date.now() - (days-1)*86400000).toISOString().slice(0,10);
      renderDonutChart(from, to);
    };

    window.dpCustom = function() {
      const from = document.getElementById('dp-from')?.value;
      const to   = document.getElementById('dp-to')?.value;
      if (!from || !to || from > to) return alert('Geçerli bir tarih aralığı seçin.');
      renderDonutChart(from, to);
    };

    // ── Kampanya grafiği ──────────────────────────────────────
    let _dkCampaignId = 'all';

    async function renderCampaignChart(from, to) {
      const res  = await api(`/api/admin/donations-by-campaign?campaign_id=${_dkCampaignId}&from=${from}&to=${to}&group=${_dkGroup}`);
      const data = res.rows || [];
      const campaigns = res.campaigns || [];

      // Dropdown'u doldur (ilk seferinde)
      const sel = document.getElementById('dk-campaign');
      if (sel && sel.options.length <= 1) {
        sel.innerHTML = '<option value="all">Tüm Kampanyalar</option>' +
          campaigns.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
        sel.value = _dkCampaignId;
      }

      const keys = buildLabels(from, to, _dkGroup);
      const countMap={}, totalMap={};
      data.forEach(r => { countMap[r.day]=r.count; totalMap[r.day]=r.total; });

      if (_dkChart) { _dkChart.destroy(); _dkChart=null; }
      const el = document.getElementById('campaign-chart');
      if (!el) return;
      _dkChart = makeApexBar(el, keys.map(k=>countMap[k]||0), keys.map(k=>totalMap[k]||0), keys, _dkGroup, '#7c3aed', '#d97706');
      const fi=document.getElementById('dk-from'), ti=document.getElementById('dk-to');
      if(fi) fi.value=from; if(ti) ti.value=to;
    }

    window.dkReload = function() {
      _dkCampaignId = document.getElementById('dk-campaign')?.value || 'all';
      const from=document.getElementById('dk-from')?.value, to=document.getElementById('dk-to')?.value;
      if(from&&to) renderCampaignChart(from,to);
    };
    window.dkRange = function(days, btn) {
      btn.closest('.chart-card').querySelectorAll('.chart-range-bar button[onclick*="dkRange"]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const to=new Date().toISOString().slice(0,10);
      const from=new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10);
      renderCampaignChart(from,to);
    };
    window.dkCustom = function() {
      const from=document.getElementById('dk-from')?.value, to=document.getElementById('dk-to')?.value;
      if(!from||!to||from>to) return alert('Geçerli bir tarih aralığı seçin.');
      renderCampaignChart(from,to);
    };
    window.dkGroup = function(g, btn) {
      _dkGroup = g;
      btn.closest('.chart-range-bar').querySelectorAll('button[onclick*="dkGroup"]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const from=document.getElementById('dk-from')?.value, to=document.getElementById('dk-to')?.value;
      if(from&&to) renderCampaignChart(from,to);
    };

    // Sayfa açılışında 7 günü göster
    const today = new Date().toISOString().slice(0,10);
    const week  = new Date(Date.now() - 6*86400000).toISOString().slice(0,10);
    renderDonationChart(week, today);
    renderDonutChart(week, today);
    renderCampaignChart(week, today);
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
    _usersMap = {};
    users.forEach(u => { _usersMap[u.id] = u; });
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head"><h2>Bağışçılar / Kullanıcılar</h2></div>
      <div class="admin-section">
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Ad</th><th>E-posta</th><th>Telefon</th><th>Rol</th><th>Etiketler</th><th>Kayıt</th><th>İşlemler</th></tr></thead>
          <tbody id="users-tbody">
            ${users.map(u => `
              <tr id="user-row-${u.id}">
                <td>${u.id}</td>
                <td id="user-name-${u.id}">${escapeHtml(u.name)}</td>
                <td id="user-email-${u.id}">${escapeHtml(u.email)}</td>
                <td id="user-phone-${u.id}">${escapeHtml(u.phone || '-')}</td>
                <td>
                  <select onchange="updateRole(${u.id}, this.value)">
                    <option ${u.role === 'donor' ? 'selected' : ''} value="donor">Bağışçı</option>
                    <option ${u.role === 'staff' ? 'selected' : ''} value="staff">Personel</option>
                    <option ${u.role === 'admin' ? 'selected' : ''} value="admin">Yönetici</option>
                  </select>
                </td>
                <td><input type="text" value="${u.tags || ''}" onblur="updateTags(${u.id}, this.value)" placeholder="vip,aylik" style="padding:6px;border:1px solid var(--border);border-radius:6px;font-size:.85rem;" /></td>
                <td>${new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
                <td style="white-space:nowrap;display:flex;gap:6px;flex-wrap:wrap">
                  <button class="btn btn-ghost btn-sm" onclick="editUser(${u.id})">Düzenle</button>
                  <button class="btn btn-ghost btn-sm" onclick="toggleUserDonations(${u.id})">Bağışlar</button>
                  <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteUser(${u.id}, '${escapeHtml(u.name).replace(/'/g,'\\&#39;')}')">Sil</button>
                </td>
              </tr>
              <tr id="user-donations-${u.id}" style="display:none">
                <td colspan="8" style="padding:0;background:#f8fafc">
                  <div id="user-donations-content-${u.id}" style="padding:16px">Yükleniyor…</div>
                </td>
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

  async activities() {
    window._adminCats = await api('/api/admin/categories');
    await renderCrudSection({
    key: 'activities', title: 'Faaliyetler',
    fields: [
      { k: 'title', label: 'Başlık', wide: true },
      { k: 'slug', label: 'Slug' },
      { k: 'cover_image', label: 'Kapak Görseli URL' },
      { k: 'location', label: 'Lokasyon' },
      { k: 'date', label: 'Tarih', type: 'date' },
      { k: 'active', label: 'Aktif', type: 'checkbox' },
      { k: 'regions', label: 'Güncel Projeler Bölgeleri', type: 'regions', wide: true },
      { k: 'category_id', label: 'Bağış Türü (faaliyet sayfasında şablon belirler)', type: 'category', wide: true },
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
      { k: 'mobile_media_url', label: 'Mobil Görsel URL (boş bırakılırsa ana görsel kullanılır)', wide: true },
      { k: 'media_type', label: 'Medya Tipi', type: 'select', options: [['image', 'Görsel'], ['video', 'Video']] },
      { k: 'duration', label: 'Slide Süresi (saniye — boş bırakılırsa varsayılan 6 sn)', type: 'number' },
      { k: 'text_color', label: 'Metin Rengi', type: 'color' },
      { k: 'sort_order', label: 'Sıra', type: 'number' },
      { k: 'hide_overlay', label: 'Alt Gölgeyi Gizle', type: 'checkbox' },
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

  async files() {
    document.getElementById('admin-main').innerHTML = `
      <div class="admin-head"><h2>Dosya Yöneticisi</h2>
        <label class="btn btn-primary" style="cursor:pointer">
          + Dosya Yükle <input type="file" id="file-upload-input" multiple accept="image/*,video/*" style="display:none" onchange="uploadFiles(this)">
        </label>
      </div>
      <div class="tab-bar" style="margin-bottom:16px">
        <button class="active" onclick="filterFiles('all',this)">Tümü</button>
        <button onclick="filterFiles('image',this)">Görseller</button>
        <button onclick="filterFiles('video',this)">Videolar</button>
        <button onclick="filterFiles('other',this)">Diğer</button>
      </div>
      <div id="files-grid" class="fm-grid">Yükleniyor…</div>
    `;
    await loadFiles();
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
      ['iban', 'IBAN (₺ TL)'],
      ['iban_eur', 'IBAN (€ Euro)'],
      ['iban_usd', 'IBAN ($ Dolar)'],
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
      <div class="admin-section" style="margin-top:24px">
        <h3 style="margin-bottom:16px">Şifremi Değiştir</h3>
        <div id="admin-pw-msg" class="form-msg" style="display:none"></div>
        <div class="data-form">
          <div><label>Mevcut Şifre</label><input type="password" id="admin-pw-current" /></div>
          <div><label>Yeni Şifre</label><input type="password" id="admin-pw-new" /></div>
          <div><label>Yeni Şifre Tekrar</label><input type="password" id="admin-pw-confirm" /></div>
        </div>
        <button class="btn btn-primary" onclick="adminChangePassword()">Şifremi Güncelle</button>
      </div>
    `;
  },
};

// ===== Dosya Yöneticisi =====
let _allFiles = [];
let _activeFilter = 'all';

function fmFormatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function loadFiles() {
  const grid = document.getElementById('files-grid');
  if (!grid) return;
  try {
    const result = await api('/api/admin/files');
    if (!Array.isArray(result)) throw new Error(result?.error || 'API hatası');
    _allFiles = result;
    filterFiles('all');
  } catch (e) {
    grid.innerHTML = `<div class="empty" style="color:var(--danger)">Dosyalar yüklenemedi: ${e.message}</div>`;
  }
}

function filterFiles(type, el) {
  _activeFilter = type;
  document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  const rows = type === 'all' ? _allFiles : _allFiles.filter(f => f.type === type);
  const grid = document.getElementById('files-grid');
  if (!grid) return;
  if (rows.length === 0) { grid.innerHTML = '<div class="empty">Dosya yok</div>'; return; }
  grid.innerHTML = rows.map(f => `
    <div class="fm-item" id="fm-${CSS.escape(f.name + f.folder)}">
      <div class="fm-menu">
        <button class="fm-menu-btn" onclick="fmMenuToggle(this)" title="İşlemler">⋯</button>
        <div class="fm-menu-dropdown">
          <button onclick="fmCopyUrl('${f.url}',this)">URL Kopyala</button>
          <button onclick="renameFile('${escapeHtml(f.name)}','${f.folder}')">Yeniden Adlandır</button>
          <button class="fm-danger" onclick="deleteFile('${escapeHtml(f.name)}','${f.folder}')">Sil</button>
        </div>
      </div>
      <div class="fm-thumb" onclick="window.open('${f.url}','_blank')">
        ${f.type === 'image'
          ? `<img src="${f.url}" alt="" loading="lazy" />`
          : f.type === 'video'
          ? `<video src="${f.url}" muted preload="metadata"></video><div class="fm-play">▶</div>`
          : `<div class="fm-file-icon">📄</div>`}
      </div>
      <div class="fm-info">
        <div class="fm-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name.replace(/^\d+-/, ''))}</div>
        <div class="fm-meta">${fmFormatSize(f.size)} · ${new Date(f.mtime).toLocaleDateString('tr-TR')}</div>
        <div class="fm-meta" style="color:var(--brand);opacity:.7">${f.folder}</div>
      </div>
    </div>
  `).join('');
}

async function deleteFile(name, folder) {
  if (!confirm(`"${name.replace(/^\d+-/, '')}" silinecek. Emin misiniz?`)) return;
  const r = await api(`/api/admin/files/${encodeURIComponent(name)}?folder=${encodeURIComponent(folder)}`, { method: 'DELETE' });
  if (r.ok) {
    _allFiles = _allFiles.filter(f => !(f.name === name && f.folder === folder));
    const el = document.getElementById('fm-' + CSS.escape(name + folder));
    if (el) el.remove();
  }
}

async function renameFile(name, folder) {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const baseName = name.replace(/^\d+-/, '').replace(ext, '');
  const newBaseName = prompt('Yeni dosya adı:', baseName);
  if (!newBaseName || !newBaseName.trim()) return;
  const newName = newBaseName.trim() + ext;
  const r = await api(`/api/admin/files/${encodeURIComponent(name)}?folder=${encodeURIComponent(folder)}`, {
    method: 'PATCH', body: { newName }
  });
  if (r.ok) {
    const file = _allFiles.find(f => f.name === name && f.folder === folder);
    if (file) { file.name = r.name; file.url = r.url; }
    filterFiles(_activeFilter || 'all');
  } else {
    alert(r.error || 'Yeniden adlandırma başarısız');
  }
}

function fmMenuToggle(btn) {
  const dropdown = btn.nextElementSibling;
  const isOpen = dropdown.classList.contains('open');
  document.querySelectorAll('.fm-menu-dropdown.open').forEach(d => d.classList.remove('open'));
  if (!isOpen) dropdown.classList.add('open');
}
document.addEventListener('click', function(e) {
  if (!e.target.closest('.fm-menu-btn')) {
    document.querySelectorAll('.fm-menu-dropdown.open').forEach(d => d.classList.remove('open'));
  }
});

async function fmCopyUrl(url, btn) {
  document.querySelectorAll('.fm-menu-dropdown.open').forEach(d => d.classList.remove('open'));
  await navigator.clipboard.writeText(window.location.origin + url);
  const orig = btn.textContent;
  btn.textContent = 'Kopyalandı!';
  setTimeout(() => btn.textContent = orig, 1500);
}

async function uploadFiles(input) {
  const formData = new FormData();
  for (const file of input.files) formData.append('files', file);
  const res = await fetch('/api/admin/files/upload', { method: 'POST', body: formData });
  const r = await res.json();
  if (r.ok) await loadFiles();
  input.value = '';
}

async function adminChangePassword() {
  const current = document.getElementById('admin-pw-current').value;
  const newPw   = document.getElementById('admin-pw-new').value;
  const confirm = document.getElementById('admin-pw-confirm').value;
  const msg = document.getElementById('admin-pw-msg');
  const show = (text, ok) => {
    msg.textContent = text;
    msg.className = 'form-msg ' + (ok ? 'success' : 'error');
    msg.style.display = 'block';
  };
  if (!current || !newPw || !confirm) return show('Tüm alanları doldurun.', false);
  if (newPw !== confirm) return show('Yeni şifreler eşleşmiyor.', false);
  if (newPw.length < 6) return show('Yeni şifre en az 6 karakter olmalı.', false);
  const r = await api('/api/admin/change-password', { method: 'POST', body: { currentPassword: current, newPassword: newPw } });
  if (r.ok) {
    show('Şifreniz başarıyla güncellendi.', true);
    document.getElementById('admin-pw-current').value = '';
    document.getElementById('admin-pw-new').value = '';
    document.getElementById('admin-pw-confirm').value = '';
  } else {
    show(r.error || 'Bir hata oluştu.', false);
  }
}

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
        const v = row[f.k] ?? (f.type === 'checkbox' ? 1 : f.type === 'color' ? '#ffffff' : '');
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
        if (f.type === 'category') {
          const cats = (window._adminCats || []).filter(c => !c.parent_id);
          return `<div class="${cls}"><label>${f.label}</label>
            <select name="${f.k}">
              <option value="">— Bağış türü bağlama (isteğe bağlı) —</option>
              ${cats.map(c => `<option value="${c.id}" ${String(v) === String(c.id) ? 'selected' : ''}>${c.title}</option>`).join('')}
            </select></div>`;
        }
        if (f.k === 'media_url' || f.k === 'cover_image' || f.k === 'mobile_media_url') return `<div class="${cls}">
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
    else if (f.type === 'category') data[f.k] = el.value ? parseInt(el.value) : null;
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
            <td style="white-space:nowrap">
              ${d.status === 'pending' ? `
                <button class="btn btn-primary btn-sm" onclick="approveDonation(${d.id})">Onayla</button>
                <button class="btn btn-outline btn-sm" onclick="rejectDonation(${d.id})">Reddet</button>
              ` : ''}
              ${d.receipt_file ? `<a href="${d.receipt_file}" target="_blank" class="btn btn-ghost btn-sm">Makbuz</a>` : ''}
              <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="deleteDonation(${d.id}, '${escapeHtml(d.user_name).replace(/'/g,"\\'")}')">Sil</button>
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
async function deleteDonation(id, name) {
  if (!confirm(`"${name}" adlı kişinin bağışı kalıcı olarak silinecek. Emin misiniz?`)) return;
  if (!confirm('Bu işlem geri alınamaz. Onaylıyor musunuz?')) return;
  await api(`/api/admin/donations/${id}`, { method: 'DELETE' });
  switchSection(adminState.section);
}

function editUser(id) {
  const u = _usersMap[id];
  if (!u) return;
  document.getElementById('modal-body').innerHTML = `
    <h3>Kullanıcı Düzenle</h3>
    <div class="data-form">
      <div><label>Ad Soyad</label><input id="eu-name" type="text" value="${escapeHtml(u.name)}" /></div>
      <div><label>E-posta</label><input id="eu-email" type="email" value="${escapeHtml(u.email)}" /></div>
      <div><label>Telefon</label><input id="eu-phone" type="tel" value="${escapeHtml(u.phone || '')}" placeholder="05XX XXX XX XX" /></div>
      <div><label>Yeni Şifre <span class="muted" style="font-weight:400;font-size:.82rem">(boş bırakılırsa değişmez)</span></label><input id="eu-pw" type="password" placeholder="En az 6 karakter" /></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">İptal</button>
      <button class="btn btn-primary" onclick="saveUserEdit(${id})">Kaydet</button>
    </div>
  `;
  document.getElementById('modal').classList.add('open');
}

async function saveUserEdit(id) {
  const name  = document.getElementById('eu-name').value.trim();
  const email = document.getElementById('eu-email').value.trim();
  const phone = document.getElementById('eu-phone').value.trim();
  const pw    = document.getElementById('eu-pw').value;
  if (!name || !email) return alert('Ad Soyad ve e-posta zorunludur.');
  const body = { name, email, phone };
  if (pw) body.password = pw;
  const r = await api(`/api/admin/users/${id}`, { method: 'PATCH', body });
  if (r.ok) {
    closeModal();
    _usersMap[id] = { ..._usersMap[id], name, email, phone };
    const n = document.getElementById(`user-name-${id}`);
    const e = document.getElementById(`user-email-${id}`);
    const p = document.getElementById(`user-phone-${id}`);
    if (n) n.textContent = name;
    if (e) e.textContent = email;
    if (p) p.textContent = phone || '-';
  } else {
    alert(r.error || 'Güncelleme başarısız.');
  }
}

async function updateRole(id, role) {
  await api(`/api/admin/users/${id}/role`, { method: 'POST', body: { role } });
}
async function updateTags(id, tags) {
  await api(`/api/admin/users/${id}/tags`, { method: 'POST', body: { tags } });
}

async function toggleUserDonations(id) {
  const row = document.getElementById(`user-donations-${id}`);
  const content = document.getElementById(`user-donations-content-${id}`);
  if (row.style.display !== 'none') { row.style.display = 'none'; return; }
  row.style.display = '';
  const donations = await api(`/api/admin/users/${id}/donations`);
  if (!donations.length) {
    content.innerHTML = '<span class="muted">Bu kullanıcıya ait bağış kaydı bulunmuyor.</span>';
    return;
  }
  const total = donations.filter(d => d.status === 'approved').reduce((a, b) => a + b.amount, 0);
  content.innerHTML = `
    <div style="font-weight:600;margin-bottom:10px">
      Toplam ${donations.length} bağış &nbsp;·&nbsp; Onaylı toplam: <span style="color:var(--brand)">${formatTL(total)}</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Tarih</th><th>Kategori / Kampanya</th><th>Tutar</th><th>Durum</th><th>Not</th></tr></thead>
      <tbody>
        ${donations.map(d => `
          <tr>
            <td>${new Date(d.created_at).toLocaleDateString('tr-TR')}</td>
            <td>${escapeHtml(d.category_title || d.campaign_title || 'Genel Bağış')}</td>
            <td><strong>${formatTL(d.amount)}</strong></td>
            <td><span class="badge ${d.status}">${{pending:'Bekliyor',approved:'Onaylandı',rejected:'Reddedildi'}[d.status]||d.status}</span></td>
            <td class="muted" style="font-size:.82rem">${escapeHtml(d.note || '-')}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

async function deleteUser(id, name) {
  if (!confirm(`"${name}" adlı kullanıcıyı silmek istediğinizden emin misiniz?\nBu işlem geri alınamaz.`)) return;
  if (!confirm(`UYARI: "${name}" hesabı kalıcı olarak silinecek.\nOnaylamak için Tamam'a basın.`)) return;
  const r = await api(`/api/admin/users/${id}`, { method: 'DELETE' });
  if (r.ok) {
    const row = document.getElementById(`user-row-${id}`);
    const dRow = document.getElementById(`user-donations-${id}`);
    if (row) row.remove();
    if (dRow) dRow.remove();
  } else {
    alert(r.error || 'Silme işlemi başarısız.');
  }
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
