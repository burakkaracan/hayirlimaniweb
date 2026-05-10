const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const https = require('https');
const { db, setSetting, getSetting } = require('./database');
const { generateReceiptPDF } = require('./receipt');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, 'uploads');
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
  secret: process.env.SESSION_SECRET || 'hayirlimani-gizli-anahtar-degistir',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use((req, res, next) => {
  if (req.hostname && req.hostname.startsWith('www.')) {
    return res.redirect(301, `https://${req.hostname.slice(4)}${req.url}`);
  }
  next();
});

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

function getNextReceiptNumber() {
  const used = db.prepare('SELECT receipt_number FROM donations WHERE receipt_number IS NOT NULL ORDER BY receipt_number').all().map(r => r.receipt_number);
  let n = 1;
  for (const num of used) {
    if (num > n) break;
    n = num + 1;
  }
  return n;
}

const MAIL_SIGNATURE = `
<div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;">
  <a href="https://hayirlimani.com" target="_blank" style="display:inline-block;line-height:0;">
    <img src="https://hayirlimani.com/images/mail-imza.png"
         alt="Hayır Limanı Yardım Derneği"
         width="560"
         style="display:block;border:0;max-width:100%;" />
  </a>
</div>`;

function mailerSend(to, subject, html) {
  const fullHtml = html + MAIL_SIGNATURE;
  const apiKey = process.env.SMTP_PASS;
  if (apiKey && apiKey.startsWith('re_')) {
    const body = JSON.stringify({
      from: process.env.SMTP_FROM || 'noreply@hayirlimani.com',
      to: Array.isArray(to) ? to : [to],
      subject,
      html: fullHtml
    });
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      if (res.statusCode >= 400) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.error('Mail gönderilemedi:', res.statusCode, data));
      }
    });
    req.on('error', err => console.error('Mail gönderilemedi:', err.message));
    req.write(body);
    req.end();
  } else if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, html: fullHtml
    }).catch(err => console.error('Mail gönderilemedi:', err.message));
  } else {
    const line = `[MAIL] to=${to} subject="${subject}" at=${new Date().toISOString()}\n`;
    fs.appendFile(path.join(__dirname, 'mail.log'), line + fullHtml + '\n---\n', () => {});
    console.log(line);
  }
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

app.post('/api/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Tüm alanlar zorunlu' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId);
  if (!bcrypt.compareSync(currentPassword, u.password_hash)) return res.status(400).json({ error: 'Mevcut şifre hatalı' });
  const u2 = db.prepare('SELECT name,email FROM users WHERE id=?').get(req.session.userId);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.session.userId);
  mailerSend(u2.email, 'Şifreniz Değiştirildi',
    `<p>Sayın ${u2.name},</p><p>Hesabınızın şifresi başarıyla güncellendi.</p><p>Bu işlemi siz yapmadıysanız lütfen hemen <a href="/iletisim.html">bizimle iletişime geçin</a>.</p><p>Hayır Limanı Yardım Derneği</p>`);
  res.json({ ok: true });
});

app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'E-posta zorunlu' });
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u) return res.json({ ok: true }); // E-posta varlığını açıklamıyoruz
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let newPw = '';
  for (let i = 0; i < 10; i++) newPw += chars[Math.floor(Math.random() * chars.length)];
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPw, 10), u.id);
  mailerSend(u.email, 'Hayır Limanı — Yeni Şifreniz',
    `<p>Sayın ${u.name},</p><p>Yeni şifreniz: <strong style="font-size:1.2em;letter-spacing:1px">${newPw}</strong></p><p>Giriş yaptıktan sonra profilinizden şifrenizi değiştirmenizi öneririz.</p><p>Hayır Limanı Yardım Derneği</p>`);
  res.json({ ok: true });
});

// ---------- Content (public) ----------
app.get('/api/hero', (_req, res) => {
  res.json(db.prepare('SELECT * FROM hero_slides WHERE active=1 ORDER BY sort_order').all());
});
app.get('/api/categories', (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories WHERE active=1 ORDER BY sort_order').all());
});
app.get('/api/campaigns', (_req, res) => {
  res.json(db.prepare('SELECT * FROM campaigns WHERE active=1 AND completed=0 ORDER BY id DESC').all());
});
app.get('/api/campaigns-all', (_req, res) => {
  res.json(db.prepare('SELECT * FROM campaigns WHERE active=1 ORDER BY completed ASC, id DESC').all());
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
  const { amount, category_id, campaign_id, note, name, email, phone } = req.body || {};
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Geçerli bir tutar giriniz' });
  let userId = req.session.userId || null;
  let uName = name, uEmail = email, uPhone = phone;
  if (userId) {
    const u = db.prepare('SELECT name,email,phone FROM users WHERE id=?').get(userId);
    uName = u.name; uEmail = u.email; uPhone = u.phone || phone;
    if (!u.phone && phone) db.prepare('UPDATE users SET phone=? WHERE id=?').run(phone, userId);
  }
  if (!uPhone) return res.status(400).json({ error: 'Telefon numarası zorunludur' });
  const info = db.prepare(`INSERT INTO donations(user_id,user_name,user_email,user_phone,category_id,campaign_id,amount,note)
    VALUES(?,?,?,?,?,?,?,?)`)
    .run(userId, uName || 'Misafir', uEmail || '', uPhone, category_id || null, campaign_id || null, amt, note || '');
  if (uEmail) {
    const catTitle = category_id ? db.prepare('SELECT title FROM categories WHERE id=?').get(category_id)?.title : null;
    const campTitle = campaign_id ? db.prepare('SELECT title FROM campaigns WHERE id=?').get(campaign_id)?.title : null;
    const target = catTitle || campTitle || 'Genel Bağış';
    mailerSend(uEmail, 'Bağış Bildiriminiz Alındı',
      `<p>Sayın ${uName || 'Bağışçımız'},</p><p><strong>${amt} TL</strong> tutarındaki "${target}" bağış bildiriminiz alınmıştır.</p><p>Ekibimiz dekontunuzu inceledikten sonra bağışınız onaylanacak ve size bilgi verilecektir.</p><p>Hayır Limanı Yardım Derneği</p>`);
  }
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
  const threadKey = String(userId || e || n || 'Misafir');
  ensureThread(threadKey);
  autoLabelThread(threadKey, userId, e);
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

app.get('/api/admin/donations-by-date', requireAdmin, (req, res) => {
  const to    = req.query.to    || new Date().toISOString().slice(0, 10);
  const from  = req.query.from  || (() => { const d = new Date(to); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); })();
  const group = req.query.group || 'day';
  const fmt   = group === 'month'   ? "strftime('%Y-%m', created_at)"
              : group === 'quarter' ? "(strftime('%Y', created_at) || '-Q' || ((CAST(strftime('%m', created_at) AS INTEGER) - 1) / 3 + 1))"
              : "date(created_at)";
  const rows = db.prepare(`
    SELECT ${fmt} as day, COUNT(*) as count, COALESCE(SUM(amount),0) as total
    FROM donations WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY day ORDER BY day
  `).all(from, to);
  res.json({ rows, from, to });
});

app.get('/api/admin/donations-by-category', requireAdmin, (req, res) => {
  const to   = req.query.to   || new Date().toISOString().slice(0, 10);
  const from = req.query.from || (() => { const d = new Date(to); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); })();
  const rows = db.prepare(`
    SELECT
      COALESCE(c.title, ca.title, 'Genel') AS label,
      COUNT(*) AS count,
      COALESCE(SUM(d.amount), 0) AS total
    FROM donations d
    LEFT JOIN categories c  ON d.category_id  = c.id
    LEFT JOIN campaigns  ca ON d.campaign_id  = ca.id
    WHERE date(d.created_at) BETWEEN ? AND ?
    GROUP BY label ORDER BY total DESC
  `).all(from, to);
  res.json({ rows, from, to });
});

app.get('/api/admin/donations-by-campaign', requireAdmin, (req, res) => {
  const to    = req.query.to    || new Date().toISOString().slice(0, 10);
  const from  = req.query.from  || (() => { const d = new Date(to); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); })();
  const group = req.query.group || 'day';
  const cid   = req.query.campaign_id;
  const fmt   = group === 'month'   ? "strftime('%Y-%m', created_at)"
              : group === 'quarter' ? "(strftime('%Y', created_at) || '-Q' || ((CAST(strftime('%m', created_at) AS INTEGER) - 1) / 3 + 1))"
              : "date(created_at)";
  let sql = `SELECT ${fmt} as day, COUNT(*) as count, COALESCE(SUM(amount),0) as total
             FROM donations WHERE date(created_at) BETWEEN ? AND ?`;
  const params = [from, to];
  if (cid && cid !== 'all') { sql += ' AND campaign_id = ?'; params.push(cid); }
  sql += ' GROUP BY day ORDER BY day';
  const rows = db.prepare(sql).all(...params);
  const campaigns = db.prepare('SELECT id, title FROM campaigns ORDER BY title').all();
  res.json({ rows, from, to, campaigns });
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

app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email, phone, password } = req.body;
  if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Ad Soyad ve e-posta zorunludur' });
  const conflict = db.prepare('SELECT id FROM users WHERE email=? AND id!=?').get(email.trim(), id);
  if (conflict) return res.status(400).json({ error: 'Bu e-posta adresi başka bir hesapta kullanılıyor' });
  db.prepare('UPDATE users SET name=?, email=?, phone=? WHERE id=?').run(name.trim(), email.trim(), phone?.trim() || null, id);
  if (password && password.length >= 6) {
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), id);
  }
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.userId) return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  res.json({ ok: true });
});

app.get('/api/admin/users/:id/donations', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT d.*, c.title AS category_title, cp.title AS campaign_title
    FROM donations d
    LEFT JOIN categories c ON c.id=d.category_id
    LEFT JOIN campaigns cp ON cp.id=d.campaign_id
    WHERE d.user_id=?
    ORDER BY d.created_at DESC
  `).all(req.params.id);
  res.json(rows);
});

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Tüm alanlar zorunlu' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId);
  if (!bcrypt.compareSync(currentPassword, u.password_hash)) return res.status(400).json({ error: 'Mevcut şifre hatalı' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.session.userId);
  mailerSend(u.email, 'Şifreniz Değiştirildi',
    `<p>Sayın ${u.name},</p><p>Yönetici hesabınızın şifresi başarıyla güncellendi.</p><p>Bu işlemi siz yapmadıysanız lütfen hemen sistemi kontrol edin.</p><p>Hayır Limanı Yardım Derneği</p>`);
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

  const receiptNumber = getNextReceiptNumber();
  const adminUser = db.prepare('SELECT name FROM users WHERE id=?').get(req.session.userId);

  const donationWithTitles = {
    ...d,
    receipt_number: receiptNumber,
    admin_comment: adminComment,
    approved_at: new Date().toISOString(),
    category_title: catRow?.title || null,
    campaign_title: campRow?.title || null,
    approved_by: adminUser?.name || '',
  };

  // Site ayarlarını al
  const settingRows = db.prepare('SELECT key,value FROM settings').all();
  const settings = {};
  settingRows.forEach(r => settings[r.key] = r.value);

  try {
    const pdfBuffer = await generateReceiptPDF(donationWithTitles, settings);
    const receiptName = `makbuz-${String(receiptNumber).padStart(6, '0')}-${Date.now()}.pdf`;
    fs.writeFileSync(path.join(uploadDir, receiptName), pdfBuffer);

    db.prepare('UPDATE donations SET status=?, approved_at=CURRENT_TIMESTAMP, receipt_file=?, admin_comment=?, receipt_number=? WHERE id=?')
      .run('approved', `/uploads/${receiptName}`, adminComment, receiptNumber, id);

    if (d.user_email) {
      mailerSend(d.user_email, 'Bağışınız Onaylandı',
        `<p>Sayın ${d.user_name},</p><p>${d.amount} TL tutarındaki bağışınız onaylanmıştır. PDF makbuzunuza profil sayfanızdaki "Makbuzlarım" bölümünden ulaşabilirsiniz.</p><p>Hayır Limanı Yardım Derneği</p>`);
    }
    if (d.campaign_id) {
      db.prepare('UPDATE campaigns SET raised=raised+?, donor_count=donor_count+1 WHERE id=?').run(d.amount, d.campaign_id);
      const camp = db.prepare('SELECT raised, goal FROM campaigns WHERE id=?').get(d.campaign_id);
      if (camp && camp.goal > 0 && camp.raised >= camp.goal) {
        db.prepare('UPDATE campaigns SET completed=1 WHERE id=?').run(d.campaign_id);
      }
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

app.delete('/api/admin/donations/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  const d = db.prepare('SELECT * FROM donations WHERE id=?').get(id);
  if (!d) return res.status(404).json({ error: 'Bulunamadı' });
  if (d.receipt_file) {
    const filePath = path.join(uploadDir, path.basename(d.receipt_file));
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
  }
  if (d.status === 'approved' && d.campaign_id) {
    db.prepare('UPDATE campaigns SET raised=MAX(0,raised-?), donor_count=MAX(0,donor_count-1) WHERE id=?').run(d.amount, d.campaign_id);
  }
  db.prepare('DELETE FROM donations WHERE id=?').run(id);
  res.json({ ok: true });
});

// ---------- File Manager ----------
const IMAGE_EXT = new Set(['.jpg','.jpeg','.png','.gif','.webp','.svg','.avif']);
const VIDEO_EXT = new Set(['.mp4','.webm','.mov','.avi','.mkv']);

function scanDir(dir, urlPrefix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map(name => {
    try {
      const fullPath = path.join(dir, name);
      if (fs.statSync(fullPath).isDirectory()) return null;
      const stat = fs.statSync(fullPath);
      const ext = path.extname(name).toLowerCase();
      return {
        name,
        url: `${urlPrefix}/${name}`,
        folder: urlPrefix,
        size: stat.size,
        mtime: stat.mtime,
        type: IMAGE_EXT.has(ext) ? 'image' : VIDEO_EXT.has(ext) ? 'video' : 'other'
      };
    } catch { return null; }
  }).filter(Boolean);
}

app.get('/api/admin/files', requireAdmin, (_req, res) => {
  try {
    const publicImagesDir = path.join(__dirname, 'public', 'images');
    const files = [
      ...scanDir(uploadDir, '/uploads'),
      ...scanDir(publicImagesDir, '/images'),
    ].sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/files/:filename', requireAdmin, (req, res) => {
  const oldName = path.basename(decodeURIComponent(req.params.filename));
  const newName = path.basename(req.body?.newName || '');
  if (!newName) return res.status(400).json({ error: 'Yeni isim boş olamaz' });
  const folder = req.query.folder === '/images'
    ? path.join(__dirname, 'public', 'images')
    : uploadDir;
  const oldPath = path.join(folder, oldName);
  const newPath = path.join(folder, newName);
  if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Dosya bulunamadı' });
  if (fs.existsSync(newPath)) return res.status(409).json({ error: 'Bu isimde dosya zaten var' });
  fs.renameSync(oldPath, newPath);
  const urlPrefix = req.query.folder === '/images' ? '/images' : '/uploads';
  res.json({ ok: true, url: `${urlPrefix}/${newName}`, name: newName });
});

app.delete('/api/admin/files/:filename', requireAdmin, (req, res) => {
  const filename = path.basename(decodeURIComponent(req.params.filename));
  const folder = req.query.folder === '/images'
    ? path.join(__dirname, 'public', 'images')
    : uploadDir;
  const filePath = path.join(folder, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dosya bulunamadı' });
  fs.unlinkSync(filePath);
  res.json({ ok: true });
});

const uploadMulti = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
  })
}).array('files', 20);

app.post('/api/admin/files/upload', requireAdmin, (req, res) => {
  uploadMulti(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ ok: true, count: req.files.length });
  });
});

// categories CRUD
app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY COALESCE(parent_id,id), sort_order, id').all());
});
app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { slug, title, icon, description, price, sort_order, active, parent_id, fixed_price, cover_image } = req.body;
  const info = db.prepare('INSERT INTO categories(slug,title,icon,description,price,sort_order,active,parent_id,fixed_price,cover_image) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(slug, title, icon || '', description || '', price || 0, sort_order || 0, active ?? 1, parent_id || null, fixed_price ? 1 : 0, cover_image || '');
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const { slug, title, icon, description, price, sort_order, active, parent_id, fixed_price, cover_image } = req.body;
  db.prepare('UPDATE categories SET slug=?,title=?,icon=?,description=?,price=?,sort_order=?,active=?,parent_id=?,fixed_price=?,cover_image=? WHERE id=?')
    .run(slug, title, icon || '', description || '', price || 0, sort_order || 0, active ?? 1, parent_id || null, fixed_price ? 1 : 0, cover_image || '', req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE categories SET parent_id=NULL WHERE parent_id=?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// campaigns CRUD
app.get('/api/admin/campaigns', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM campaigns ORDER BY completed ASC, id DESC').all());
});
app.post('/api/admin/campaigns', requireAdmin, (req, res) => {
  const { slug, title, summary, body, cover_image, goal, active, completed } = req.body;
  const info = db.prepare('INSERT INTO campaigns(slug,title,summary,body,cover_image,goal,active,completed) VALUES(?,?,?,?,?,?,?,?)')
    .run(slug, title, summary || '', body || '', cover_image || '', goal || 0, active ?? 1, completed ?? 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/campaigns/:id', requireAdmin, (req, res) => {
  const { slug, title, summary, body, cover_image, goal, raised, donor_count, active, completed } = req.body;
  db.prepare('UPDATE campaigns SET slug=?,title=?,summary=?,body=?,cover_image=?,goal=?,raised=?,donor_count=?,active=?,completed=? WHERE id=?')
    .run(slug, title, summary || '', body || '', cover_image || '', goal || 0, raised || 0, donor_count || 0, active ?? 1, completed ?? 0, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/campaigns/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// activities CRUD
app.post('/api/admin/activities', requireAdmin, (req, res) => {
  const { slug, title, short_description, body, cover_image, location, date, active, regions, category_id } = req.body;
  const info = db.prepare('INSERT INTO activities(slug,title,short_description,body,cover_image,location,date,active,regions,category_id) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(slug, title, short_description || '', body || '', cover_image || '', location || '', date || '', active ?? 1, regions || '', category_id || null);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/activities/:id', requireAdmin, (req, res) => {
  const { slug, title, short_description, body, cover_image, location, date, active, regions, category_id } = req.body;
  db.prepare('UPDATE activities SET slug=?,title=?,short_description=?,body=?,cover_image=?,location=?,date=?,active=?,regions=?,category_id=? WHERE id=?')
    .run(slug, title, short_description || '', body || '', cover_image || '', location || '', date || '', active ?? 1, regions || '', category_id || null, req.params.id);
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
  const { title, subtitle, slide_icon, button_text, button_link, button2_text, button2_link, media_url, media_type, sort_order, active, duration, mobile_media_url, hide_overlay } = req.body;
  const info = db.prepare('INSERT INTO hero_slides(title,subtitle,slide_icon,button_text,button_link,button2_text,button2_link,media_url,media_type,sort_order,active,duration,mobile_media_url,hide_overlay) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(title || '', subtitle || '', slide_icon || '🌙', button_text || 'Bağış Yap', button_link || '/bagis-yap.html', button2_text || '', button2_link || '', media_url || '', media_type || 'image', sort_order || 0, active ?? 1, duration ? parseInt(duration) : null, mobile_media_url || '', hide_overlay ? 1 : 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/hero/:id', requireAdmin, (req, res) => {
  const { title, subtitle, slide_icon, button_text, button_link, button2_text, button2_link, media_url, media_type, sort_order, active, duration, mobile_media_url, hide_overlay } = req.body;
  db.prepare('UPDATE hero_slides SET title=?,subtitle=?,slide_icon=?,button_text=?,button_link=?,button2_text=?,button2_link=?,media_url=?,media_type=?,sort_order=?,active=?,duration=?,mobile_media_url=?,hide_overlay=? WHERE id=?')
    .run(title || '', subtitle || '', slide_icon || '🌙', button_text || '', button_link || '', button2_text || '', button2_link || '', media_url || '', media_type || 'image', sort_order || 0, active ?? 1, duration ? parseInt(duration) : null, mobile_media_url || '', hide_overlay ? 1 : 0, req.params.id);
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
function ensureThread(key) {
  db.prepare('INSERT OR IGNORE INTO msg_threads(thread_key) VALUES(?)').run(String(key));
}
function autoLabelThread(threadKey, userId, email) {
  const t = db.prepare('SELECT label_id FROM msg_threads WHERE thread_key=?').get(String(threadKey));
  if (t?.label_id) return;
  const bLabel = db.prepare("SELECT id FROM msg_labels WHERE name='Bağışçı'").get();
  if (!bLabel) return;
  let has = userId ? !!db.prepare('SELECT id FROM donations WHERE user_id=? LIMIT 1').get(userId) : false;
  if (!has && email) has = !!db.prepare('SELECT id FROM donations WHERE user_email=? LIMIT 1').get(email);
  if (has) db.prepare('UPDATE msg_threads SET label_id=? WHERE thread_key=? AND label_id IS NULL').run(bLabel.id, String(threadKey));
}

app.get('/api/admin/messages', requireAdmin, (req, res) => {
  const archived = req.query.archived === '1' ? 1 : 0;
  const labelId = req.query.label ? parseInt(req.query.label) : null;
  const archiveFilter = archived ? 'AND t.archived=1' : 'AND (t.archived IS NULL OR t.archived=0)';
  const params = [];
  let labelFilter = '';
  if (labelId) { labelFilter = 'AND t.label_id=?'; params.push(labelId); }
  const threads = db.prepare(`
    SELECT m.name, m.email, m.user_id, MAX(m.created_at) as last_at,
      SUM(CASE WHEN m.read=0 AND m.from_admin=0 THEN 1 ELSE 0 END) as unread,
      t.label_id, t.archived, l.name as label_name, l.color as label_color
    FROM messages m
    LEFT JOIN msg_threads t ON t.thread_key=CAST(COALESCE(m.user_id,m.email,m.name) AS TEXT)
    LEFT JOIN msg_labels l ON l.id=t.label_id
    WHERE 1=1 ${archiveFilter} ${labelFilter}
    GROUP BY COALESCE(m.user_id,m.email,m.name)
    ORDER BY last_at DESC LIMIT 200`).all(...params);
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
app.patch('/api/admin/messages/:key/label', requireAdmin, (req, res) => {
  const key = req.params.key;
  ensureThread(key);
  db.prepare('UPDATE msg_threads SET label_id=? WHERE thread_key=?').run(req.body.label_id || null, key);
  res.json({ ok: true });
});
app.patch('/api/admin/messages/:key/archive', requireAdmin, (req, res) => {
  const key = req.params.key;
  ensureThread(key);
  db.prepare('UPDATE msg_threads SET archived=? WHERE thread_key=?').run(req.body.archived ? 1 : 0, key);
  res.json({ ok: true });
});
app.delete('/api/admin/messages/:key', requireAdmin, (req, res) => {
  const k = req.params.key;
  db.prepare('DELETE FROM messages WHERE CAST(COALESCE(user_id,email,name) AS TEXT)=?').run(k);
  db.prepare('DELETE FROM msg_threads WHERE thread_key=?').run(k);
  res.json({ ok: true });
});
app.get('/api/admin/msg-labels', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM msg_labels ORDER BY id').all());
});
app.post('/api/admin/msg-labels', requireAdmin, (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'İsim gerekli' });
  const info = db.prepare('INSERT INTO msg_labels(name,color) VALUES(?,?)').run(name.trim(), color || '#1a3d5c');
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/admin/msg-labels/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE msg_threads SET label_id=NULL WHERE label_id=?').run(req.params.id);
  db.prepare('DELETE FROM msg_labels WHERE id=?').run(req.params.id);
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

// ---------- Project Regions & Projects (public) ----------
app.get('/api/project-regions', (_req, res) => {
  res.json(db.prepare('SELECT * FROM project_regions ORDER BY sort_order').all());
});
app.get('/api/projects', (req, res) => {
  const { region } = req.query;
  let sql = "SELECT * FROM activities WHERE active=1 AND regions IS NOT NULL AND regions != ''";
  const params = [];
  if (region) {
    sql += " AND (',' || regions || ',') LIKE ('%,' || ? || ',%')";
    params.push(region);
  }
  sql += ' ORDER BY date DESC';
  res.json(db.prepare(sql).all(...params));
});

// ---------- Project Regions & Projects (admin) ----------
app.get('/api/admin/project-regions', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM project_regions ORDER BY sort_order').all());
});
app.put('/api/admin/project-regions/:slug', requireAdmin, (req, res) => {
  const { name, description, sort_order } = req.body;
  db.prepare('UPDATE project_regions SET name=?,description=?,sort_order=? WHERE slug=?')
    .run(name || '', description || '', parseInt(sort_order) || 0, req.params.slug);
  res.json({ ok: true });
});
app.get('/api/admin/projects', requireAdmin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM projects ORDER BY region_slug, sort_order, id').all());
});
app.post('/api/admin/projects', requireAdmin, (req, res) => {
  const { slug, title, cover_image, progress, region_slug, link, active, sort_order } = req.body;
  const info = db.prepare('INSERT INTO projects(slug,title,cover_image,progress,region_slug,link,active,sort_order) VALUES(?,?,?,?,?,?,?,?)')
    .run(slug || '', title, cover_image || '', parseInt(progress) || 0, region_slug || '', link || '', active ?? 1, parseInt(sort_order) || 0);
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.put('/api/admin/projects/:id', requireAdmin, (req, res) => {
  const { slug, title, cover_image, progress, region_slug, link, active, sort_order } = req.body;
  db.prepare('UPDATE projects SET slug=?,title=?,cover_image=?,progress=?,region_slug=?,link=?,active=?,sort_order=? WHERE id=?')
    .run(slug || '', title, cover_image || '', parseInt(progress) || 0, region_slug || '', link || '', active ?? 1, parseInt(sort_order) || 0, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/projects/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ ok: true });
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
  console.log('Varsayılan admin: info@hayirlimani.com / admin123');
});
