const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'data.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'donor',
  tags TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  price REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  cover_image TEXT,
  goal REAL DEFAULT 0,
  raised REAL DEFAULT 0,
  donor_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT,
  body TEXT,
  cover_image TEXT,
  location TEXT,
  date TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  user_email TEXT,
  category_id INTEGER,
  campaign_id INTEGER,
  amount REAL NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'pending', -- pending / approved / rejected
  receipt_file TEXT,
  admin_comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT,
  email TEXT,
  from_admin INTEGER DEFAULT 0,
  body TEXT,
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hero_slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  subtitle TEXT,
  button_text TEXT,
  button_link TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  file_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_name TEXT,
  person_name TEXT,
  role TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT,
  url TEXT,
  sort_order INTEGER DEFAULT 0,
  parent_id INTEGER DEFAULT 0
);
`);

// Migrations for existing databases
try { db.exec('ALTER TABLE messages ADD COLUMN file_url TEXT'); } catch {}
try { db.exec('ALTER TABLE messages ADD COLUMN donor_read INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE donations ADD COLUMN user_phone TEXT'); } catch {}
try { db.exec('ALTER TABLE categories ADD COLUMN parent_id INTEGER DEFAULT NULL'); } catch {}
try { db.exec('ALTER TABLE categories ADD COLUMN fixed_price INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE categories ADD COLUMN cover_image TEXT'); } catch {}
try { db.exec("ALTER TABLE hero_slides ADD COLUMN slide_icon TEXT DEFAULT '🌙'"); } catch {}
try { db.exec('ALTER TABLE hero_slides ADD COLUMN button2_text TEXT'); } catch {}
try { db.exec('ALTER TABLE hero_slides ADD COLUMN button2_link TEXT'); } catch {}
try { db.exec('ALTER TABLE activities ADD COLUMN regions TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE campaigns ADD COLUMN completed INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE donations ADD COLUMN receipt_number INTEGER'); } catch {}
try { db.exec('ALTER TABLE hero_slides ADD COLUMN duration INTEGER DEFAULT NULL'); } catch {}
try { db.exec("ALTER TABLE hero_slides ADD COLUMN mobile_media_url TEXT DEFAULT ''"); } catch {}
try { db.exec('ALTER TABLE hero_slides ADD COLUMN hide_overlay INTEGER DEFAULT 0'); } catch {}
try { db.exec("ALTER TABLE hero_slides ADD COLUMN text_color TEXT DEFAULT '#ffffff'"); } catch {}
try { db.exec('ALTER TABLE activities ADD COLUMN category_id INTEGER DEFAULT NULL'); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN address TEXT DEFAULT ''"); } catch {}
db.prepare("UPDATE users SET email=? WHERE email=? AND role='admin'").run('info@hayirlimani.com', 'admin@hayirlimani.com');

// Mevcut aktivitelere bölge ata (sadece bir kez çalışır)
try {
  const hasRegions = db.prepare("SELECT 1 FROM activities WHERE regions != '' LIMIT 1").get();
  if (!hasRegions) {
    [
      ['turkiye',         'gida-kolisi-dagitimi-2025'],
      ['turkiye',         'kis-yardimi-dogu-anadolu'],
      ['turkiye',         'egitim-bursu-programi'],
      ['ortadogu,afrika', 'kurban-dagitimi-2024'],
      ['turkiye',         'ramazan-iftar-sofralari'],
      ['afrika',          'temiz-su-kuyusu-cad'],
    ].forEach(([regions, slug]) =>
      db.prepare('UPDATE activities SET regions=? WHERE slug=?').run(regions, slug)
    );
    // Balkanlar
    if (!db.prepare("SELECT 1 FROM activities WHERE slug='bosna-kis-yardimi' LIMIT 1").get()) {
      db.prepare('INSERT INTO activities(slug,title,short_description,body,cover_image,location,date,regions,active) VALUES(?,?,?,?,?,?,?,?,?)').run(
        'bosna-kis-yardimi', "Bosna'ya Kış Yardımı",
        "Balkanlar'da kış şartlarından etkilenen ihtiyaç sahibi ailelere battaniye, gıda ve yakacak yardımı ulaştırıldı.",
        "Bosna Hersek'te yaşayan Müslüman ailelere yönelik kış yardım programımız kapsamında 800 haneye kışlık malzeme paketi teslim edildi. Her pakette battaniye, kumanya ve yakacak malzemesi yer aldı.",
        '', 'Bosna Hersek', '2024-12-10', 'balkanlar', 1
      );
    }
    // Türkî Devletler
    if (!db.prepare("SELECT 1 FROM activities WHERE slug='orta-asya-egitim' LIMIT 1").get()) {
      db.prepare('INSERT INTO activities(slug,title,short_description,body,cover_image,location,date,regions,active) VALUES(?,?,?,?,?,?,?,?,?)').run(
        'orta-asya-egitim', 'Orta Asya Eğitim Destek Programı',
        "Kırgızistan ve Kazakistan'da yetim öğrencilere burs ve eğitim materyali desteği sağlandı.",
        "Türkî toplulukların yaşadığı Orta Asya coğrafyasında eğitim imkânı kısıtlı öğrencilere yönelik burs programımız kapsamında 120 öğrenciye destek verildi. Öğrencilere aylık burs, kırtasiye ve kışlık giysi yardımı yapıldı.",
        '', 'Kırgızistan / Kazakistan', '2025-02-15', 'turki-devletler', 1
      );
    }
    // Ortadoğu (ek faaliyet)
    if (!db.prepare("SELECT 1 FROM activities WHERE slug='suriye-insani-yardim' LIMIT 1").get()) {
      db.prepare('INSERT INTO activities(slug,title,short_description,body,cover_image,location,date,regions,active) VALUES(?,?,?,?,?,?,?,?,?)').run(
        'suriye-insani-yardim', 'Suriye İnsani Yardım Paketi',
        "Suriye'deki yerinden edilmiş ailelere acil gıda, çadır ve hijyen malzemeleri ulaştırıldı.",
        "Çatışma bölgelerinden kaçan ve kamplarda yaşayan Suriyeli ailelere yönelik acil insani yardım paketleri teslim edildi. Her paket bir aileye aylık temel gıda ihtiyacını karşılıyor.",
        '', 'Suriye', '2025-01-20', 'ortadogu', 1
      );
    }
  }
} catch(e) { console.error('Regions migration error:', e.message); }

try { db.exec(`CREATE TABLE IF NOT EXISTS project_regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
)`); } catch {}
try { db.exec(`CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  cover_image TEXT DEFAULT '',
  progress INTEGER DEFAULT 0,
  region_slug TEXT DEFAULT '',
  link TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`); } catch {}
try { db.exec(`CREATE TABLE IF NOT EXISTS msg_labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#1a3d5c'
)`); } catch {}
try { db.exec(`CREATE TABLE IF NOT EXISTS msg_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_key TEXT UNIQUE NOT NULL,
  label_id INTEGER,
  archived INTEGER DEFAULT 0
)`); } catch {}
['Bağışçı:#2e7d32','Genel:#1565c0','Teknik:#e65100','Acil:#c41230'].forEach(s => {
  const [name, color] = s.split(':');
  try { db.prepare('INSERT OR IGNORE INTO msg_labels(name,color) VALUES(?,?)').run(name, color); } catch {}
});

function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, String(value ?? ''));
}
function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : fallback;
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
      .run('Site Yöneticisi', 'info@hayirlimani.com', hash, 'admin');

    const donorHash = bcrypt.hashSync('bagisci123', 10);
    db.prepare('INSERT INTO users(name,email,password_hash,role,phone) VALUES(?,?,?,?,?)')
      .run('Örnek Bağışçı', 'bagisci@ornek.com', donorHash, 'donor', '0555 000 00 00');
  }

  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount === 0) {
    const cats = [
      ['kurban', 'Kurban', '🐏', 'İhtiyaç sahiplerine kurban bağışı', 7500, 1],
      ['su-kuyusu', 'Su Kuyusu', '💧', 'Afrika ve Asya\'da temiz su kuyuları', 45000, 2],
      ['kalici-eserler', 'Kalıcı Eserler', '🕌', 'Cami, okul, yetimhane inşaatı', 10000, 3],
      ['zekat', 'Zekat', '🤲', 'Zekatınızı güvenle ulaştırın', 1000, 4],
      ['acil-yardim', 'Acil Yardım', '🚑', 'Afet bölgelerine acil yardım', 500, 5],
      ['egitim', 'Eğitim', '📚', 'Öğrenci bursları ve okul desteği', 750, 6],
      ['yetim', 'Yetim Desteği', '💛', 'Yetim çocuklara aylık destek', 1500, 7],
      ['gida', 'Gıda Kolisi', '🍱', 'Muhtaç ailelere gıda paketi', 2000, 8],
    ];
    const stmt = db.prepare('INSERT INTO categories(slug,title,icon,description,price,sort_order) VALUES(?,?,?,?,?,?)');
    cats.forEach(c => stmt.run(...c));
  }

  const campCount = db.prepare('SELECT COUNT(*) as c FROM campaigns').get().c;
  if (campCount === 0) {
    const camps = [
      {
        slug: 'gazze-icin-seferber-ol',
        title: 'Gazze İçin Seferber Ol',
        summary: 'Gazze\'deki kardeşlerimize acil gıda, ilaç ve barınma yardımı ulaştırıyoruz.',
        body: 'Savaşın gölgesinde hayatta kalmaya çalışan yüz binlerce insan için elimizi uzatıyoruz. Gazze\'ye ulaştırılan her kuruş; sıcak yemek, temiz su, ilaç ve battaniye olarak ihtiyaç sahiplerine teslim ediliyor. Hayır Limanı Derneği olarak sahada çalışan partnerlerimizle birlikte yardımların yerine ulaşmasını titizlikle takip ediyoruz.',
        cover_image: '/images/campaign-gaza.jpg',
        goal: 2500000,
        raised: 1420000,
        donor_count: 3120,
      },
      {
        slug: 'bir-su-kuyusu-bir-hayat',
        title: 'Bir Su Kuyusu Bir Hayat',
        summary: 'Afrika\'da temiz suya erişimi olmayan köylere su kuyusu açıyoruz.',
        body: 'Tek bir su kuyusu, ortalama 500 kişinin hayatına temiz suyla dokunuyor. Açtığımız her kuyunun GPS koordinatları, fotoğrafları ve tamamlanma raporları bağışçılarımızla paylaşılıyor.',
        cover_image: '/images/campaign-water.jpg',
        goal: 900000,
        raised: 612000,
        donor_count: 1820,
      },
      {
        slug: 'yetim-gulucukleri',
        title: 'Yetim Gülücükleri',
        summary: 'Yetim çocuklara aylık düzenli destek ile eğitim ve barınma sağlıyoruz.',
        body: 'Aylık düzenli bağışınızla bir yetim kardeşimizin yanında olun. Eğitim, sağlık ve barınma ihtiyaçlarını birlikte karşılıyoruz.',
        cover_image: '/images/campaign-orphan.jpg',
        goal: 500000,
        raised: 275000,
        donor_count: 945,
      },
    ];
    const stmt = db.prepare('INSERT INTO campaigns(slug,title,summary,body,cover_image,goal,raised,donor_count) VALUES(@slug,@title,@summary,@body,@cover_image,@goal,@raised,@donor_count)');
    camps.forEach(c => stmt.run(c));
  }

  const actCount = db.prepare('SELECT COUNT(*) as c FROM activities').get().c;
  if (actCount === 0) {
    const acts = [
      {
        slug: 'gida-kolisi-dagitimi-2025',
        title: 'Ramazan Gıda Kolisi Dağıtımı',
        short_description: 'Ankara ve çevresinde 2.500 aileye gıda kolisi ulaştırıldı.',
        body: 'Ramazan ayı boyunca devam eden programımızda Altındağ, Keçiören, Mamak ve Sincan başta olmak üzere Ankara genelinde ihtiyaç sahibi ailelere gıda kolisi teslim edildi.',
        cover_image: '/images/activity-food.jpg',
        location: 'Ankara',
        date: '2025-03-20',
      },
      {
        slug: 'kis-yardimi-dogu-anadolu',
        title: 'Kış Yardımı - Doğu Anadolu',
        short_description: 'Soğuk bölgelerdeki ailelere battaniye, bot ve mont desteği.',
        body: 'Van, Bitlis ve Hakkari hattında kış şartlarından etkilenen 1.200 aileye sıcak tutan malzemeler ulaştırıldı.',
        cover_image: '/images/activity-winter.jpg',
        location: 'Van, Bitlis, Hakkari',
        date: '2025-01-15',
      },
      {
        slug: 'egitim-bursu-programi',
        title: 'Eğitim Bursu Programı',
        short_description: 'Üniversite öğrencilerine aylık düzenli burs desteği.',
        body: '180 öğrenciye 9 ay boyunca eğitim bursu sağlandı, kitap ve kırtasiye ihtiyaçları karşılandı.',
        cover_image: '/images/activity-education.jpg',
        location: 'Türkiye Geneli',
        date: '2025-09-01',
      },
      {
        slug: 'kurban-dagitimi-2024',
        title: 'Kurban Bayramı Et Dağıtımı',
        short_description: '12 ülkede kurban kesimi ve et dağıtımı gerçekleştirildi.',
        body: 'Suriye, Yemen, Somali, Filistin, Bangladeş ve Türkiye\'de toplam 3.400 hisse kurban kesimi yapıldı; etler ihtiyaç sahiplerine ulaştırıldı.',
        cover_image: '/images/activity-kurban.jpg',
        location: 'Uluslararası',
        date: '2024-06-16',
      },
      {
        slug: 'ramazan-iftar-sofralari',
        title: 'Ramazan İftar Sofraları',
        short_description: 'Kurulan iftar sofralarında günlük 1.500 kişiye sıcak yemek.',
        body: 'Ramazan ayı boyunca her akşam 1.500 kişinin iftar açtığı sofralar kuruldu, evlere sıcak yemek servisi yapıldı.',
        cover_image: '/images/activity-iftar.jpg',
        location: 'Ankara / İstanbul',
        date: '2025-03-10',
      },
      {
        slug: 'temiz-su-kuyusu-cad',
        title: 'Çad\'da Temiz Su Kuyusu',
        short_description: 'Çad\'ın kurak bölgelerinde 14 su kuyusu açıldı.',
        body: 'Bağışçılarımızın desteğiyle açılan kuyularla 7.000\'den fazla kişi temiz suya kavuştu. Kuyuların bakımı yerel ortaklarımızla sürdürülüyor.',
        cover_image: '/images/activity-water-africa.jpg',
        location: 'Çad',
        date: '2024-11-08',
      },
    ];
    const stmt = db.prepare('INSERT INTO activities(slug,title,short_description,body,cover_image,location,date) VALUES(@slug,@title,@short_description,@body,@cover_image,@location,@date)');
    acts.forEach(a => stmt.run(a));
  }

  const heroCount = db.prepare('SELECT COUNT(*) as c FROM hero_slides').get().c;
  if (heroCount === 0) {
    const slides = [
      ['Gazze İçin Seferber Ol', 'Acil gıda, ilaç ve barınma yardımı için desteğinizi bekliyoruz.', 'Destek Ol', '/faaliyet.html?slug=gazze-icin-seferber-ol', '/images/hero-1.jpg', 'image', 1],
      ['Bir Kuyu, Bin Umut', 'Açtığınız her kuyu yüzlerce insanın hayatına dokunuyor.', 'Kuyu Aç', '/faaliyet.html?slug=bir-su-kuyusu-bir-hayat', '/images/hero-2.jpg', 'image', 2],
      ['Yetimlerin Elini Tut', 'Aylık düzenli bağışla bir yetim kardeşimizin yanında olun.', 'Bağış Yap', '/bagis-yap.html', '/images/hero-3.jpg', 'image', 3],
    ];
    const stmt = db.prepare('INSERT INTO hero_slides(title,subtitle,button_text,button_link,media_url,media_type,sort_order) VALUES(?,?,?,?,?,?,?)');
    slides.forEach(s => stmt.run(...s));
  }

  const boardCount = db.prepare('SELECT COUNT(*) as c FROM boards').get().c;
  if (boardCount === 0) {
    const boards = [
      ['Yönetim Kurulu', 'Ahmet Yılmaz', 'Başkan', 1],
      ['Yönetim Kurulu', 'Mehmet Demir', 'Başkan Yardımcısı', 2],
      ['Yönetim Kurulu', 'Ayşe Kaya', 'Genel Sekreter', 3],
      ['Yönetim Kurulu', 'Fatma Öztürk', 'Sayman', 4],
      ['Yönetim Kurulu', 'Hasan Şahin', 'Üye', 5],
      ['Denetim Kurulu', 'Mustafa Arslan', 'Başkan', 6],
      ['Denetim Kurulu', 'Zeynep Çelik', 'Üye', 7],
      ['Denetim Kurulu', 'Emre Yıldız', 'Üye', 8],
      ['Onur Kurulu', 'Prof. Dr. İbrahim Koç', 'Başkan', 9],
      ['Onur Kurulu', 'Av. Selim Aydın', 'Üye', 10],
    ];
    const stmt = db.prepare('INSERT INTO boards(board_name,person_name,role,sort_order) VALUES(?,?,?,?)');
    boards.forEach(b => stmt.run(...b));
  }

  const docCount = db.prepare('SELECT COUNT(*) as c FROM documents').get().c;
  if (docCount === 0) {
    const docs = [
      ['Dernek Tüzüğü', '#'],
      ['Kuruluş Bildirisi', '#'],
      ['2024 Faaliyet Raporu', '#'],
      ['2024 Mali Denetim Raporu', '#'],
      ['Bağış Toplama İzin Belgesi', '#'],
      ['Kamu Yararı Statüsü', '#'],
    ];
    const stmt = db.prepare('INSERT INTO documents(title,file_url) VALUES(?,?)');
    docs.forEach(d => stmt.run(...d));
  }

  const defaults = {
    site_title: 'Hayır Limanı Derneği',
    slogan: 'Her mazlumun kıyısında…',
    phone: '0553 023 2173',
    whatsapp: '905530232173',
    email: 'info@hayirlimani.com',
    address: 'Battalgazi Mahallesi, 1017 Caddesi, 27-A, Altındağ/Ankara',
    iban: 'TR11 0021 0000 0014 7550 3000 01',
    iban_eur: 'TR97 0021 0000 0014 7550 3001 02',
    iban_usd: 'TR27 0021 0000 0014 7550 3001 01',
    iban_holder: 'Hayır Limanı Derneği',
    about_body: 'Hayır Limanı Derneği, 2015 yılından bu yana Türkiye ve dünyanın dört bir yanında ihtiyaç sahiplerine ulaşan bir yardım kuruluşudur. Afet bölgelerinden yetim çocuklara, su kuyularından eğitim burslarına kadar geniş bir yelpazede çalışmalarımızı sürdürüyoruz.',
    mission: 'Yardımı ihtiyaç sahibine en hızlı, en şeffaf ve en güvenilir şekilde ulaştırmak; insan onurunu koruyan, kalıcı çözümler üreten projeler yürütmek.',
    vision: 'Her mazlumun elinden tutan, gönüllülük kültürünü kurumsallaştırmış, uluslararası ölçekte referans alınan güvenilir bir sivil toplum kuruluşu olmak.',
    tw: 'https://twitter.com/',
    ig: 'https://instagram.com/',
    fb: 'https://facebook.com/',
    yt: 'https://youtube.com/',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!db.prepare('SELECT 1 FROM settings WHERE key=?').get(k)) setSetting(k, v);
  }

  const regionCount = db.prepare('SELECT COUNT(*) as c FROM project_regions').get().c;
  if (regionCount === 0) {
    const regions = [
      ['ortadogu', 'Ortadoğu', 'Ortadoğu\'da süregelen kriz ve çatışmalar nedeniyle büyük acılar yaşayan kardeşlerimize gıda, sağlık ve barınma projelerimizle destek oluyoruz.', 1],
      ['balkanlar', 'Balkanlar', 'Balkanlar\'daki Müslüman toplulukların yanında eğitim, cami inşaatı ve insani yardım projelerimizle var olmaya devam ediyoruz.', 2],
      ['afrika', 'Afrika', 'Afrika\'nın dört bir yanında temiz su kuyuları açıyor, gıda desteği sağlıyor ve eğitim projeleriyle gelecek nesillere umut taşıyoruz.', 3],
      ['turki-devletler', 'Türkî Devletler', 'Orta Asya\'daki Türkî toplulukların kalkınmasına katkı sunmak için insani yardım ve eğitim projelerimizi kararlılıkla sürdürüyoruz.', 4],
      ['turkiye', 'Türkiye', 'Türkiye\'nin dört bir köşesinde ihtiyaç sahibi ailelere, yetimlere ve öğrencilere uzanan projelerimizle destek olmaya devam ediyoruz.', 5],
    ];
    const stmt = db.prepare('INSERT INTO project_regions(slug,name,description,sort_order) VALUES(?,?,?,?)');
    regions.forEach(r => stmt.run(...r));
  }

  const menuCount = db.prepare('SELECT COUNT(*) as c FROM menus').get().c;
  if (menuCount === 0) {
    const items = [
      ['Anasayfa', '/', 1, 0],
      ['Kurumsal', '#', 2, 0],
      ['Hakkımızda', '/hakkimizda.html', 1, 2],
      ['Yetkili Kurullar', '/yetkili-kurullar.html', 2, 2],
      ['Belgelerimiz', '/belgelerimiz.html', 3, 2],
      ['Faaliyetler', '/faaliyetler.html', 3, 0],
      ['İletişim', '/iletisim.html', 4, 0],
    ];
    const stmt = db.prepare('INSERT INTO menus(label,url,sort_order,parent_id) VALUES(?,?,?,?)');
    items.forEach(i => stmt.run(...i));
  }
}

seed();

module.exports = { db, setSetting, getSetting };
