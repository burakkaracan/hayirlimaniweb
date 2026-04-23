const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { db, setSetting, getSetting } = require('./database');
const { generateReceiptPDF } = require('./receipt');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${ts}-${safe}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'hayirlimani-gizli-anahtar-degistir',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Helpers ----------
const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Yetki yok' });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Yetki yok' });
  const role = db.prepare('SELECT role FROM users WHERE id=?').get(req.session.userId)?.role;
  if (role !== 'admin' && role !== 'staff') return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  next();
};

function mailerSend(to, subject, html) {
  // Stub mailer: stores to console + a local log. Replace with real SMTP config when available.
  const line = `[MAIL] to=${to} subject="${subject}" at=${new Date().toISOString()}\n`;
  fs.appendFile(path.join(__dirname, 'mail.log'), line + html + '\n---\n', () => {});
  console.log(line);
}

// ---------- Public settings/menu ----------
app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  res.json(out);
});

app.get('/api/menu', (_req, res) => {
  const rows = db.prepare('SELECT * FROM menus ORDER BY parent_id ASC, sort_order ASC').all();
  res.json(rows);
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const u = db.prepare('SELECT id,name,email,phone,role FROM users WHERE id=?').get(req.session.userId);
  res.json({ user: u || null });
});

// ---------- Auth ----------
app.post('/api/register', (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Tüm alanlar zorunlu' });
  const exists = db.prepare('SELECT 1 FROM users WHERE email=?').get(email);
  if (exists) return res.status(400).json({ error: 'Bu e-posta zaten kayıtlı' });
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)')
    .run(name, email, phone || '', hash, 'donor');
  req.session.userId = info.lastInsertRowid;
  mailerSend(email, 'Hayır Limanı Derneği\'ne Hoşgeldiniz',
    `<h2>Hoşgeldiniz ${name},</h2><p>Hayır Limanı Derneği bağışçı ailesine katıldığınız için teşekkür ederiz. Bağışlarınızı ve dekontlarınızı profilinizden takip edebilirsiniz.</p><p>Her mazlumun kıyısında… birlikte olmanın gücüyle.</p>`);
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u || !bcrypt.compareSync(password || '', u.password_hash)) return res.status(400).json({ error: 'E-posta veya parola hatalı' });
  req.session.userId = u.id;
  res.json({ ok: true, role: u.role });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ---------- Content (public) ----------
app.get('/api/hero', (_req, res) => {
  res.json(db.prepare('SELECT * FROM hero_slides WHERE active=1 ORDER BY sort_order').all());
});
app.get('/api/categories', (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories WHERE active=1 ORDER BY sort_order').all());
});
app.get('/api/campaigns', (_req, res) => {
  res.json(db.prepare('SELECT * FROM campaigns WHERE active=1 ORDER BY id DESC').all());
});
app.get('/api/campaigns/:slug', (req, res) => {
  const c = db.prepare('SELECT * FROM campaigns WHERE slug=?').get(req.params.slug);
  if (!c) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(c);
});
app.get('/api/activities', (_req, res) => {
  res.json(db.prepare('SELECT * FROM activities WHERE active=1 ORDER BY date DESC').all());
});
app.get('/api/activities/:slug', (req, res) => {
  const a = db.prepare('SELECT * FROM activities WHERE slug=?').get(req.params.slug);
  if (!a) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(a);
});
app.get('/api/boards', (_req, res) => {
  res.json(db.prepare('SELECT * FROM boards ORDER BY sort_order').all());
});
app.get('/api/documents', (_req, res) => {
  res.json(db.prepare('SELECT * FROM documents ORDER BY id DESC').all());
});

app.get('/api/search', (req, res) => {
  const q = `%${(req.query.q || '').toLowerCase()}%`;
  const cats = db.prepare('SELECT slug,title,description FROM categories WHERE lower(title) LIKE ? OR lower(description) LIKE ?').all(q, q);
  const camps = db.prepare('SELECT slug,title,summary FROM campaigns WHERE lower(title) LIKE ? OR lower(summary) LIKE ?').all(q, q);
  const acts = db.prepare('SELECT slug,title,short_description FROM activities WHERE lower(title) LIKE ? OR lower(short_description) LIKE ?').all(q, q);
  res.json({ categories: cats, campaigns: camps, activities: acts });
});

app.post('/api/subscribe', (req, res) => {
  const email = (req.body?.email || '').trim();
  if (!email) return res.status(400).json({ error: 'E-posta zorunlu' });
  try {
    db.prepare('INSERT OR IGNORE INTO subscribers(email) VALUES(?)').run(email);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Kayıt başarısız' }); }
});

// ---------- Donations ----------
app.post('/api/donations', (req, res) => {
  const { amount, category_id, campaign_id, note, name, email } = req.body || {};
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Geçerli bir tutar giriniz' });
  let userId = req.session.userId || null;
  let uName = name, uEmail = email;
  if (userId) {
    const u = db.prepare('SELECT name,email FROM users WHERE id=?').get(userId);
    uName = u.name; uEmail = u.email;
  }
  const info = db.prepare(`INSERT INTO donations(user_id,user_name,user_email,category_id,campaign_id,amount,note)
    VALUES(?,?,?,?,?,?,?)`)
    .run(userId, uName || 'Misafir', uEmail || '', category_id || null, campaign_id || null, amt, note || '');
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.get('/api/my-donations', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT d.*, c.title AS category_title, cp.title AS campaign_title
    FROM donations d LEFT JOIN categories c ON c.id=d.category_id
    LEFT JOIN campaigns cp ON cp.id=d.campaign_id
    WHERE d.user_id=? ORDER BY d.created_at DESC`).all(req.session.userId);
  res.json(rows);
});

// ---------- Messages (live chat) ----------
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya yok' });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname });
});

app.post('/api/messages', (req, res) => {
  const { body, name, email, file_url } = req.body || {};
  if (!body && !file_url) return res.status(400).json({ error: 'Mesaj boş olamaz' });
  const userId = req.session.userId || null;
  let n = name, e = email;
  if (userId) {
    const u = db.prepare('SELECT name,email FROM users WHERE id=?').get(userId);
    n = u.name; e = u.email;
  }
  const info = db.prepare('INSERT INTO messages(user_id,name,email,from_admin,body,file_url) VALUES(?,?,?,?,?,?)')
    .run(userId, n || 'Misafir', e || '', 0, body || '', file_url || null);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.get('/api/messages/thread', (req, res) => {
  if (req.session.userId) {
    const rows = db.prepare('SELECT * FROM messages WHERE user_id=? ORDER BY created_at').all(req.session.userId);
    db.prepare('UPDATE messages SET donor_read=1 WHERE user_id=? AND from_admin=1').run(req.session.userId);
    return res.json(rows);
  }
  const key = req.session.chatKey;
  if (!key) return res.json([]);
  const rows = db.prepare('SELECT * FROM messages WHERE email=? ORDER BY created_at').all(key);
  res.json(rows);
});

app.get('/api/messages/unread-count', requireAuth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM messages WHERE user_id=? AND from_admin=1 AND donor_read=0').get(req.session.userId);
  res.json({ count: count.c });
});

// ---------- Admin ----------
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='donor'").get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM donations WHERE status='pending'").get().c;
  const approved = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM donations WHERE status='approved'").get();
  const campaigns = db.prepare('SELECT COUNT(*) as c FROM campaigns').get().c;
  const newMessages = db.prepare('SELECT COUNT(*) as c FROM messages WHERE read=0 AND from_admin=0').get().c;
  res.json({ totalUsers, pending, approvedCount: approved.c, approvedSum: approved.s, campaigns, newMessages });
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT id,name,email,phone,role,tags,created_at FROM users ORDER BY id DESC').all());
});

app.post('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  db.prepare('UPDATE users SET role=? WHERE id=?').run(req.body.role, req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/tags', requireAdmin, (req, res) => {
  db.prepare('UPDATE users SET tags=? WHERE id=?').run(req.body.tags || '', req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/donations', requireAdmin, (req, res) => {
  const { status } = req.query;
  let sql = `SELECT d.*, c.title AS category_title, cp.title AS campaign_title
    FROM donations d LEFT JOIN categories c ON c.id=d.category_id
    LEFT JOIN campaigns cp ON cp.id=d.campaign_id`;
  const params = [];
  if (status) { sql += ' WHERE d.status=?'; params.push(status); }
  sql += ' ORDER BY d.created_at DESC LIMIT 500';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/admin/donations/:id/approve', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const d = db.prepare('SELECT * FROM donations WHERE id=?').get(id);
  if (!d) return res.status(404).json({ error: 'Bulunamadı' });

  const adminComment = req.body?.adminComment || '';

  // Kategori/kampanya başlıklarını ekle
  const catRow = d.category_id
    ? db.prepare('SELECT title FROM categories WHERE id=?').get(d.category_id) : null;
  const campRow = d.campaign_id
    ? db.prepare('SELECT title FROM campaigns WHERE id=?').get(d.campaign_id) : null;

  const donationWithTitles = {
    ...d,
    admin_comment: adminComment,
    approved_at: new Date().toISOString(),
    category_title: catRow?.title || null,
    campaign_title: campRow?.title || null,
  };

  // Site ayarlarını al
  const settingRows = db.prepare('SELECT key,value FROM settings').all();
  const settings = {};
  settingRows.forEach(r => settings[r.key] = r.value);

  try {
    const pdfBuffer = await generateReceiptPDF(donationWithTitles, settings);
    const receiptName = `makbuz-${id}-${Date.now()}.pdf`;
    fs.writeFileSync(path.join(uploadDir, receiptName), pdfBuffer);

    db.prepare('UPDATE donations SET status=?, approved_at=CURRENT_TIMESTAMP, receipt_file=?, admin_comment=? WHERE id=?')
      .run('approved', `/uploads/${receiptName}`, adminComment, id);

    if (d.user_email) {
      mailerSend(d.user_email, 'Bağışınız Onaylandı',
        `<p>Sayın ${d.user_name},</p><p>${d.amount} TL tutarındaki bağışınız onaylanmıştır. PDF makbuzunuza profil sayfanızdaki "Makbuzlarım" bölümünden ulaşabilirsiniz.</p><p>Hayır Limanı Yardım Derneği</p>`);
    }
    if (d.campaign_id) {
      db.prepare('UPDATE campaigns SET raised=raised+?, donor_count=donor_count+1 WHERE id=?').run(d.amount, d.campaign_id);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('PDF makbuz oluşturma hatası:', err);
    res.status(500).json({ error: 'Makbuz oluşturulamadı: ' + err.message });
  }
});

app.post('/api/admin/donations/:id/reject', requireAdmin, (req, res) => {
  const id = req.params.id;
  const d = db.prepare('SELECT * FROM donations WHERE id=?').get(id);
  if (!d) return res.status(404).json({ error: 'Bulunamadı' });
  db.prepare('UPDATE donations SET status=?, admin_comment=? WHERE id=?')
    .run('rejected', req.body?.adminComment || 'Bildirim doğrulanamadı', id);
  if (d.user_email) {
    mailerSend(d.user_email, 'Bağış Bildiriminiz Hakkında',
      `<p>Sayın ${d.user_name},</p><p>${d.amount} TL tutarındaki bağış bildiriminiz tarafımızca doğrulanamamıştır. Detaylı bilgi için lütfen bizimle iletişime geçin.</p><p>Neden: ${req.body?.adminComment || 'Belirtilmedi'}</p>`);
  }
  res.json({ ok: true });
});

// categories CRUD
app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { slug, title, icon, description, price, sort_order, active } = req.body;
  const info = db.prepare('INSERT INTO categories(slug,title,icon,description,price,sort_order,active) VALUES(?,?,?,?,?,?,?)')
    .run(slug, title, icon || '', description || '', price || 0, sort_order || 0, active ?? 1);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const { slug, title, icon, description, price, sort_order, active } = req.body;
  db.prepare('UPDATE categories SET slug=?,title=?,icon=?,description=?,price=?,sort_order=?,active=? WHERE id=?')
    .run(slug, title, icon || '', description || '', price || 0, sort_order || 0, active ?? 1, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// campaigns CRUD
app.post('/api/admin/campaigns', requireAdmin, (req, res) => {
  const { slug, title, summary, body, cover_image, goal, active } = req.body;
  const info = db.prepare('INSERT INTO campaigns(slug,title,summary,body,cover_image,goal,active) VALUES(?,?,?,?,?,?,?)')
    .run(slug, title, summary || '', body || '', cover_image || '', goal || 0, active ?? 1);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/campaigns/:id', requireAdmin, (req, res) => {
  const { slug, title, summary, body, cover_image, goal, raised, donor_count, active } = req.body;
  db.prepare('UPDATE campaigns SET slug=?,title=?,summary=?,body=?,cover_image=?,goal=?,raised=?,donor_count=?,active=? WHERE id=?')
    .run(slug, title, summary || '', body || '', cover_image || '', goal || 0, raised || 0, donor_count || 0, active ?? 1, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/campaigns/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// activities CRUD
app.post('/api/admin/activities', requireAdmin, (req, res) => {
  const { slug, title, short_description, body, cover_image, location, date, active } = req.body;
  const info = db.prepare('INSERT INTO activities(slug,title,short_description,body,cover_image,location,date,active) VALUES(?,?,?,?,?,?,?,?)')
    .run(slug, title, short_description || '', body || '', cover_image || '', location || '', date || '', active ?? 1);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/activities/:id', requireAdmin, (req, res) => {
  const { slug, title, short_description, body, cover_image, location, date, active } = req.body;
  db.prepare('UPDATE activities SET slug=?,title=?,short_description=?,body=?,cover_image=?,location=?,date=?,active=? WHERE id=?')
    .run(slug, title, short_description || '', body || '', cover_image || '', location || '', date || '', active ?? 1, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/activities/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM activities WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// hero CRUD
app.get('/api/admin/hero', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM hero_slides ORDER BY sort_order').all());
});
app.post('/api/admin/hero', requireAdmin, (req, res) => {
  const { title, subtitle, button_text, button_link, media_url, media_type, sort_order, active } = req.body;
  const info = db.prepare('INSERT INTO hero_slides(title,subtitle,button_text,button_link,media_url,media_type,sort_order,active) VALUES(?,?,?,?,?,?,?,?)')
    .run(title || '', subtitle || '', button_text || 'Destek Ol', button_link || '/bagis-yap.html', media_url || '', media_type || 'image', sort_order || 0, active ?? 1);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/hero/:id', requireAdmin, (req, res) => {
  const { title, subtitle, button_text, button_link, media_url, media_type, sort_order, active } = req.body;
  db.prepare('UPDATE hero_slides SET title=?,subtitle=?,button_text=?,button_link=?,media_url=?,media_type=?,sort_order=?,active=? WHERE id=?')
    .run(title || '', subtitle || '', button_text || '', button_link || '', media_url || '', media_type || 'image', sort_order || 0, active ?? 1, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/hero/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM hero_slides WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// boards CRUD
app.post('/api/admin/boards', requireAdmin, (req, res) => {
  const { board_name, person_name, role, sort_order } = req.body;
  const info = db.prepare('INSERT INTO boards(board_name,person_name,role,sort_order) VALUES(?,?,?,?)')
    .run(board_name, person_name, role || '', sort_order || 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/boards/:id', requireAdmin, (req, res) => {
  const { board_name, person_name, role, sort_order } = req.body;
  db.prepare('UPDATE boards SET board_name=?,person_name=?,role=?,sort_order=? WHERE id=?')
    .run(board_name, person_name, role || '', sort_order || 0, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/boards/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM boards WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// documents CRUD
app.post('/api/admin/documents', requireAdmin, (req, res) => {
  const { title, file_url } = req.body;
  const info = db.prepare('INSERT INTO documents(title,file_url) VALUES(?,?)').run(title, file_url || '#');
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.delete('/api/admin/documents/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM documents WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// menus
app.get('/api/admin/menus', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM menus ORDER BY parent_id,sort_order').all());
});
app.post('/api/admin/menus', requireAdmin, (req, res) => {
  const { label, url, sort_order, parent_id } = req.body;
  const info = db.prepare('INSERT INTO menus(label,url,sort_order,parent_id) VALUES(?,?,?,?)')
    .run(label, url || '#', sort_order || 0, parent_id || 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/menus/:id', requireAdmin, (req, res) => {
  const { label, url, sort_order, parent_id } = req.body;
  db.prepare('UPDATE menus SET label=?,url=?,sort_order=?,parent_id=? WHERE id=?')
    .run(label, url, sort_order || 0, parent_id || 0, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/menus/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM menus WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// settings
app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const entries = req.body || {};
  for (const [k, v] of Object.entries(entries)) setSetting(k, v);
  res.json({ ok: true });
});

// messages (admin chat)
app.get('/api/admin/messages', requireAdmin, (_req, res) => {
  const threads = db.prepare(`
    SELECT name, email, user_id, MAX(created_at) as last_at,
      SUM(CASE WHEN read=0 AND from_admin=0 THEN 1 ELSE 0 END) as unread
    FROM messages
    GROUP BY COALESCE(user_id, email, name)
    ORDER BY last_at DESC LIMIT 200`).all();
  res.json(threads);
});
app.get('/api/admin/messages/:key', requireAdmin, (req, res) => {
  const k = req.params.key;
  const rows = db.prepare(`SELECT * FROM messages WHERE user_id=? OR email=? OR name=? ORDER BY created_at`).all(k, k, k);
  db.prepare(`UPDATE messages SET read=1 WHERE (user_id=? OR email=? OR name=?) AND from_admin=0`).run(k, k, k);
  res.json(rows);
});
app.post('/api/admin/messages/reply', requireAdmin, (req, res) => {
  const { user_id, email, name, body, file_url } = req.body;
  db.prepare('INSERT INTO messages(user_id,name,email,from_admin,body,file_url,read) VALUES(?,?,?,?,?,?,1)')
    .run(user_id || null, name || '', email || '', 1, body || '', file_url || null);
  res.json({ ok: true });
});

// bulk mail
app.post('/api/admin/bulk-mail', requireAdmin, (req, res) => {
  const { tag, subject, html } = req.body;
  let users;
  if (tag) users = db.prepare('SELECT email,name FROM users WHERE tags LIKE ?').all(`%${tag}%`);
  else users = db.prepare('SELECT email,name FROM users').all();
  users.forEach(u => mailerSend(u.email, subject, html.replace(/{name}/g, u.name)));
  res.json({ ok: true, count: users.length });
});

// uploads
app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya yok' });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname });
});

// subscribers
app.get('/api/admin/subscribers', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all());
});

// ---------- Fallback ----------
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const p = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return res.sendFile(p);
  res.sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Hayır Limanı sitesi hazır → http://localhost:${PORT}`);
  console.log('Varsayılan admin: admin@hayirlimani.com / admin123');
});
