// ===== Hayır Limanı Derneği - Main Script =====
const api = async (path, opts = {}) => {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok && res.status !== 401 && res.status !== 400) console.warn('API error', path, res.status);
  return res.json().catch(() => ({}));
};

const svgIcon = (name) => {
  const icons = {
    search: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    user: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    close: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    menu: '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A12 12 0 0 0 3.44 20.36L2 22l1.68-1.42A12 12 0 1 0 20.52 3.48Zm-8.53 18.4a10 10 0 0 1-5.1-1.38l-.36-.22-3.82.98 1-3.72-.24-.38a10 10 0 1 1 8.52 4.72Zm5.76-7.2c-.31-.16-1.85-.91-2.14-1.02s-.5-.16-.7.16-.81 1.02-1 1.23-.37.24-.68.08a8.14 8.14 0 0 1-2.4-1.48 9 9 0 0 1-1.67-2.08c-.17-.3 0-.46.13-.6s.3-.35.45-.52a2 2 0 0 0 .3-.5.55.55 0 0 0 0-.52c-.08-.16-.7-1.68-.96-2.3s-.5-.52-.7-.52h-.6a1.15 1.15 0 0 0-.83.39 3.5 3.5 0 0 0-1.1 2.6 6.08 6.08 0 0 0 1.27 3.23 14 14 0 0 0 5.35 4.72 18 18 0 0 0 1.78.66 4.3 4.3 0 0 0 1.97.13 3.23 3.23 0 0 0 2.1-1.49 2.6 2.6 0 0 0 .18-1.48c-.08-.13-.28-.21-.59-.37Z"/></svg>',
    chat: '<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    send: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>',
    tw: '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    ig: '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.77.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38C1.35 2.68.93 3.35.63 4.14.33 4.9.13 5.77.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13.67.67 1.34 1.08 2.13 1.38.76.3 1.63.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56.79-.3 1.46-.72 2.13-1.38.67-.67 1.08-1.34 1.38-2.13.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91-.3-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.93 19.86.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>',
    fb: '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07"/></svg>',
    yt: '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.5 3.56 12 3.56 12 3.56s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.52 9.4.52 9.4.52s7.5 0 9.4-.52a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.55 15.57V8.43l6.23 3.57z"/></svg>',
    phone: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    mail: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>',
    location: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    iban: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
  };
  return icons[name] || '';
};

let appSettings = {};
let currentUser = null;

async function loadSettings() {
  appSettings = await api('/api/settings');
  return appSettings;
}
async function loadMe() {
  const r = await api('/api/me');
  currentUser = r.user;
  return r.user;
}

function renderHeader() {
  const host = document.getElementById('site-header');
  if (!host) return;
  const s = appSettings;
  const u = currentUser;

  host.innerHTML = `
    <div class="header-top">
      <div class="container header-top-inner">
        <span class="slogan">${s.slogan || 'Her mazlumun kıyısında…'}</span>
        <div class="socials">
          <a href="${s.tw || '#'}" target="_blank" rel="noopener" aria-label="Twitter">${svgIcon('tw')}</a>
          <a href="${s.yt || '#'}" target="_blank" rel="noopener" aria-label="YouTube">${svgIcon('yt')}</a>
          <a href="${s.ig || '#'}" target="_blank" rel="noopener" aria-label="Instagram">${svgIcon('ig')}</a>
          <a href="${s.fb || '#'}" target="_blank" rel="noopener" aria-label="Facebook">${svgIcon('fb')}</a>
        </div>
      </div>
    </div>
    <div class="header">
      <div class="container header-inner">
        <a href="/" class="logo">
          <img src="/images/logo.png" alt="Hayır Limanı Yardım Derneği" class="logo-img" />
        </a>
        <nav class="main-nav" id="main-nav">
          <a href="/">Anasayfa</a>
          <div class="dropdown">
            <button type="button" onclick="this.parentElement.classList.toggle('open')">Kurumsal ▾</button>
            <div class="dropdown-menu">
              <a href="/hakkimizda.html">Hakkımızda</a>
              <a href="/yetkili-kurullar.html">Yetkili Kurullar</a>
              <a href="/belgelerimiz.html">Belgelerimiz</a>
            </div>
          </div>
          <a href="/faaliyetler.html">Faaliyetler</a>
          <a href="/iletisim.html">İletişim</a>
        </nav>
        <div class="header-actions">
          <a href="/bagis-yap.html" class="btn btn-accent">Bağış Yap</a>
          <button class="icon-btn" id="btn-search" aria-label="Ara">${svgIcon('search')}</button>
          ${u ? `
            <div class="profile-menu dropdown">
              <button class="icon-btn" onclick="this.parentElement.classList.toggle('open')">${svgIcon('user')}</button>
              <div class="dropdown-menu">
                <a href="/profil.html">Profilim</a>
                ${(u.role === 'admin' || u.role === 'staff') ? '<a href="/admin.html">Admin Panel</a>' : ''}
                <a href="#" onclick="logout(event)">Çıkış Yap</a>
              </div>
            </div>
          ` : `
            <a href="/giris.html" class="auth-btn">Giriş</a>
            <a href="/kayit.html" class="auth-btn btn btn-outline btn-sm">Kayıt Ol</a>
          `}
          <button class="icon-btn burger" onclick="document.getElementById('main-nav').classList.toggle('open')">${svgIcon('menu')}</button>
        </div>
      </div>
    </div>

    <div class="search-overlay" id="search-overlay">
      <div class="search-box">
        <input type="search" id="search-input" placeholder="Kampanya, faaliyet veya bağış türü ara..." autofocus />
        <button class="close-search btn-ghost" style="color:#fff" onclick="toggleSearch(false)">Kapat ✕</button>
        <div class="search-results" id="search-results"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-search').addEventListener('click', () => toggleSearch(true));
  const si = document.getElementById('search-input');
  si.addEventListener('input', debounce(async (e) => {
    const q = e.target.value.trim();
    const out = document.getElementById('search-results');
    if (!q) { out.innerHTML = ''; return; }
    const r = await api('/api/search?q=' + encodeURIComponent(q));
    let html = '';
    r.campaigns.forEach(c => html += `<a href="/kampanya.html?slug=${c.slug}"><div class="r-title">${c.title}</div><div class="r-desc">Kampanya · ${c.summary || ''}</div></a>`);
    r.activities.forEach(c => html += `<a href="/faaliyet.html?slug=${c.slug}"><div class="r-title">${c.title}</div><div class="r-desc">Faaliyet · ${c.short_description || ''}</div></a>`);
    r.categories.forEach(c => html += `<a href="/bagis-yap.html?kat=${c.slug}"><div class="r-title">${c.title}</div><div class="r-desc">Bağış · ${c.description || ''}</div></a>`);
    out.innerHTML = html || '<div class="empty">Sonuç bulunamadı</div>';
  }, 200));

  // highlight active
  const path = location.pathname;
  document.querySelectorAll('.main-nav a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // desktop dropdown: delay close so cursor can reach submenu
  document.querySelectorAll('.main-nav .dropdown').forEach(d => {
    let closeTimer;
    d.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      if (window.innerWidth > 960) d.classList.add('open');
    });
    d.addEventListener('mouseleave', () => {
      if (window.innerWidth > 960) closeTimer = setTimeout(() => d.classList.remove('open'), 150);
    });
  });
}

function toggleSearch(open) {
  const el = document.getElementById('search-overlay');
  if (!el) return;
  el.classList.toggle('open', open);
  if (open) document.getElementById('search-input').focus();
}

function renderFooter() {
  const host = document.getElementById('site-footer');
  if (!host) return;
  const s = appSettings;
  host.innerHTML = `
    <div class="footer-main">
      <div class="container footer-grid">
        <div class="footer-about">
          <div>
            <img src="/images/logo.png" alt="Hayır Limanı Yardım Derneği" class="logo-img logo-img-footer" />
          </div>
          <p style="margin-top:16px">${s.about_body ? s.about_body.slice(0, 200) + '...' : ''}</p>
          <div class="footer-socials">
            <a href="${s.tw || '#'}" target="_blank" aria-label="Twitter">${svgIcon('tw')}</a>
            <a href="${s.yt || '#'}" target="_blank" aria-label="YouTube">${svgIcon('yt')}</a>
            <a href="${s.ig || '#'}" target="_blank" aria-label="Instagram">${svgIcon('ig')}</a>
            <a href="${s.fb || '#'}" target="_blank" aria-label="Facebook">${svgIcon('fb')}</a>
          </div>
        </div>
        <div>
          <h4>Kurumsal</h4>
          <a href="/hakkimizda.html">Hakkımızda</a>
          <a href="/yetkili-kurullar.html">Yetkili Kurullar</a>
          <a href="/belgelerimiz.html">Belgelerimiz</a>
          <a href="/iletisim.html">İletişim</a>
        </div>
        <div>
          <h4>Bağış</h4>
          <a href="/bagis-yap.html">Bağış Yap</a>
          <a href="/faaliyetler.html">Faaliyetlerimiz</a>
          <a href="/bagis-yap.html?kat=kurban">Kurban</a>
          <a href="/bagis-yap.html?kat=su-kuyusu">Su Kuyusu</a>
        </div>
        <div>
          <h4>Bülten & Bağış</h4>
          <p style="font-size:.85rem">Yardım çalışmalarımızdan haberdar olmak için e-posta aboneliği.</p>
          <form class="newsletter" onsubmit="subscribeNewsletter(event)">
            <input type="email" name="email" placeholder="E-posta adresiniz" required />
            <button type="submit" class="btn btn-accent">Abone Ol</button>
          </form>
          <div class="iban-box">
            <small>Bağış IBAN</small>
            <strong>${s.iban || ''}</strong>
            <div style="font-size:.8rem; margin-top:4px;">${s.iban_holder || ''}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="container footer-bottom">
      <div>© ${new Date().getFullYear()} Hayır Limanı Derneği — Tüm hakları saklıdır.</div>
      <div>${s.address || ''}</div>
    </div>
  `;
}

const CHAT_EMOJIS = ['😊','😂','❤️','👍','🙏','😢','💪','🤔','✅','⭐','🎉','👋','💚','🙌','😍','🥰','😘','🤝','💯','🔥'];
let _chatPendingFileUrl = null;
let _chatBadgeInterval = null;

function renderWidgets() {
  if (document.querySelector('.wa-float')) return;
  const s = appSettings;
  const wa = document.createElement('a');
  wa.className = 'wa-float';
  wa.href = `https://wa.me/${s.whatsapp || '905530232173'}?text=${encodeURIComponent('Merhaba Hayır Limanı Derneği, bilgi almak istiyorum.')}`;
  wa.target = '_blank'; wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'WhatsApp');
  wa.innerHTML = svgIcon('wa');
  document.body.appendChild(wa);

  const chat = document.createElement('button');
  chat.className = 'chat-float';
  chat.setAttribute('aria-label', 'Canlı destek');
  chat.innerHTML = svgIcon('chat') + '<span class="chat-unread-badge" id="chat-unread-badge"></span>';
  chat.addEventListener('click', () => {
    document.getElementById('chat-window').classList.toggle('open');
    loadChatThread();
  });
  document.body.appendChild(chat);

  const fileAccept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip';
  const chatBox = document.createElement('div');
  chatBox.className = 'chat-window';
  chatBox.id = 'chat-window';
  chatBox.innerHTML = `
    <div class="chat-header">
      <div>
        <strong>Canlı Destek</strong>
        <div style="font-size:.75rem; opacity:.85">Size nasıl yardımcı olabiliriz?</div>
      </div>
      <button class="close-chat" onclick="document.getElementById('chat-window').classList.remove('open')">${svgIcon('close')}</button>
    </div>
    <div class="chat-body" id="chat-body">
      <div class="chat-msg admin">Merhaba! Hayır Limanı Derneği canlı destek hattına hoş geldiniz. Mesajınızı yazın, en kısa sürede dönüş yapalım.</div>
    </div>
    <a class="chat-wa-btn" href="https://wa.me/${s.whatsapp || '905530232173'}" target="_blank">WhatsApp'tan İletişime Geç</a>
    <div id="chat-emoji-panel" class="chat-emoji-panel" style="display:none">
      ${CHAT_EMOJIS.map(em => `<button type="button" onclick="chatInsertEmoji('${em}')">${em}</button>`).join('')}
    </div>
    <div id="chat-attach-bar" class="chat-attach-bar" style="display:none">
      <span id="chat-attach-name"></span>
      <button type="button" onclick="clearChatAttach()" title="Kaldır">✕</button>
    </div>
    <form class="chat-input" onsubmit="sendChat(event)">
      <div class="chat-toolbar-row">
        <button type="button" class="chat-emoji-toggle" onclick="toggleChatEmoji()" title="Emoji">😊</button>
        <label class="chat-file-btn" title="Dosya ekle">
          📎<input type="file" id="chat-file-input" style="display:none" accept="${fileAccept}" onchange="onChatFileSelect(this)" />
        </label>
      </div>
      <div class="chat-input-wrap">
        <input type="text" id="chat-text" placeholder="Mesajınız…" />
        <button type="submit" class="chat-send-btn" title="Gönder">${svgIcon('send')}</button>
      </div>
    </form>
  `;
  document.body.appendChild(chatBox);

  if (currentUser) startBadgePolling();
}

async function loadChatThread() {
  const body = document.getElementById('chat-body');
  if (!body) return;
  const rows = await api('/api/messages/thread');
  if (!Array.isArray(rows) || rows.length === 0) return;
  body.innerHTML = rows.map(m =>
    `<div class="chat-msg ${m.from_admin ? 'admin' : 'user'}">${renderMsgContent(m)}<div style="font-size:.65rem;opacity:.6;margin-top:4px">${new Date(m.created_at).toLocaleString('tr-TR')}</div></div>`
  ).join('');
  body.scrollTop = body.scrollHeight;
  const badge = document.getElementById('chat-unread-badge');
  if (badge) { badge.style.display = 'none'; badge.textContent = ''; }
}

async function sendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chat-text');
  const text = input.value.trim();
  if (!text && !_chatPendingFileUrl) return;
  const body = document.getElementById('chat-body');
  body.insertAdjacentHTML('beforeend',
    `<div class="chat-msg user">${renderMsgContent({ body: text, file_url: _chatPendingFileUrl })}<div style="font-size:.65rem;opacity:.6;margin-top:4px">${new Date().toLocaleString('tr-TR')}</div></div>`
  );
  body.scrollTop = body.scrollHeight;
  const fileUrl = _chatPendingFileUrl;
  input.value = '';
  clearChatAttach();

  const payload = { body: text, file_url: fileUrl };
  if (!currentUser) {
    let name = sessionStorage.getItem('chat_name');
    let email = sessionStorage.getItem('chat_email');
    if (!name) { name = prompt('Sizi nasıl çağıralım? İsminiz:') || 'Misafir'; sessionStorage.setItem('chat_name', name); }
    if (!email) { email = prompt('E-posta adresiniz (dönüş için):') || ''; sessionStorage.setItem('chat_email', email); }
    payload.name = name; payload.email = email;
  }
  await api('/api/messages', { method: 'POST', body: payload });
  if (!currentUser) {
    setTimeout(() => {
      body.insertAdjacentHTML('beforeend', `<div class="chat-msg admin">Mesajınız alındı. Yöneticilerimiz en kısa sürede dönüş sağlayacaktır.</div>`);
      body.scrollTop = body.scrollHeight;
    }, 500);
  }
}

function toggleChatEmoji() {
  const p = document.getElementById('chat-emoji-panel');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? 'flex' : 'none';
}
function chatInsertEmoji(em) {
  const inp = document.getElementById('chat-text');
  if (!inp) return;
  const p = inp.selectionStart ?? inp.value.length;
  inp.value = inp.value.slice(0, p) + em + inp.value.slice(p);
  inp.focus();
  inp.selectionStart = inp.selectionEnd = p + em.length;
  document.getElementById('chat-emoji-panel').classList.remove('open');
}
function onChatFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('chat-attach-name').textContent = file.name;
  const bar = document.getElementById('chat-attach-bar');
  if (bar) bar.style.display = 'flex';
  uploadChatFile(file);
}
function clearChatAttach() {
  _chatPendingFileUrl = null;
  const bar = document.getElementById('chat-attach-bar');
  if (bar) bar.style.display = 'none';
  const fi = document.getElementById('chat-file-input');
  if (fi) fi.value = '';
}
async function uploadChatFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await r.json();
    _chatPendingFileUrl = data.url || null;
  } catch { clearChatAttach(); alert('Dosya yüklenemedi.'); }
}
function renderMsgContent(m) {
  let html = m.body ? escapeHtml(m.body) : '';
  if (m.file_url) {
    const ext = (m.file_url.split('.').pop() || '').toLowerCase();
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
      html += `<br><img src="${escapeHtml(m.file_url)}" class="chat-msg-img" alt="görsel">`;
    } else {
      html += `<br><a href="${escapeHtml(m.file_url)}" class="chat-msg-file" target="_blank" rel="noopener">📎 ${escapeHtml(m.file_url.split('/').pop())}</a>`;
    }
  }
  return html;
}
function startBadgePolling() {
  if (_chatBadgeInterval) return;
  const check = async () => {
    try {
      const r = await api('/api/messages/unread-count');
      const badge = document.getElementById('chat-unread-badge');
      if (!badge) return;
      if (r.count > 0) { badge.textContent = r.count; badge.style.display = 'flex'; }
      else badge.style.display = 'none';
    } catch {}
  };
  check();
  _chatBadgeInterval = setInterval(check, 15000);
}

async function subscribeNewsletter(e) {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const r = await api('/api/subscribe', { method: 'POST', body: { email } });
  if (r.ok) { alert('Aboneliğiniz alındı, teşekkürler!'); e.target.reset(); }
  else alert(r.error || 'Bir hata oluştu');
}

async function logout(e) {
  e.preventDefault();
  await api('/api/logout', { method: 'POST' });
  location.href = '/';
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function debounce(fn, wait) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
function formatTL(n) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0); }
function formatNumber(n) { return new Intl.NumberFormat('tr-TR').format(n || 0); }
function qs(k) { return new URLSearchParams(location.search).get(k); }

(async () => {
  await Promise.all([loadSettings(), loadMe()]);
  renderHeader();
  renderFooter();
  renderWidgets();
  window.dispatchEvent(new CustomEvent('app-ready'));
})();
