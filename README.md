# Hayır Limanı Derneği Web Sitesi

Hayır Limanı Derneği için geliştirilmiş çok sayfalı kurumsal ve bağış platformu.

## Kurulum

```bash
npm install
npm start
```

Site `http://localhost:3000` adresinde yayınlanır.

## Varsayılan Hesaplar

Veritabanı ilk çalıştırmada otomatik olarak oluşturulur ve örnek verilerle doldurulur.

- **Admin**: `admin@hayirlimani.com` / `admin123`
- **Bağışçı**: `bagisci@ornek.com` / `bagisci123`

## Proje Yapısı

```
hayirlimani/
├── server.js              # Express sunucu
├── database.js            # SQLite şema ve seed
├── public/
│   ├── index.html         # Anasayfa
│   ├── hakkimizda.html
│   ├── yetkili-kurullar.html
│   ├── belgelerimiz.html
│   ├── faaliyetler.html   # Faaliyet listesi
│   ├── faaliyet.html      # Faaliyet/kampanya detayı
│   ├── iletisim.html
│   ├── bagis-yap.html     # IBAN ödeme sayfası
│   ├── bagis-bildirimi.html
│   ├── giris.html
│   ├── kayit.html
│   ├── profil.html
│   ├── admin.html
│   ├── css/style.css
│   └── js/
│       ├── main.js        # Header, footer, chat widget, arama
│       └── admin.js       # Admin panel mantığı
├── uploads/               # Yüklenen belgeler ve makbuzlar
└── data.sqlite            # Otomatik oluşur
```

## Özellikler

### Ön Yüz

- Kurumsal renklerde (yeşil + altın) responsive tasarım
- Hero slider (görsel/video destekli, admin panelden yönetilir)
- Hızlı bağış alanı (kategori dropdown + tutar)
- Bağış kategorileri grid
- Hazır tutar seçici + özel tutar
- Kampanya kartları (hedef, toplanan, bağışçı sayısı, ilerleme çubuğu)
- Arama overlay (kampanya, faaliyet, kategori)
- Kurumsal sayfalar: Hakkımızda, Yetkili Kurullar, Belgelerimiz
- Faaliyet listesi ve detay sayfaları
- İletişim sayfası + Google Maps + mesaj formu
- Header top: slogan + sosyal medya ikonları
- Footer: IBAN, bülten aboneliği, sosyal medya
- WhatsApp hızlı iletişim butonu (0553 023 2173)
- Canlı destek chat widget (admin panel ile entegre)

### Kullanıcı (Bağışçı)

- Kayıt / Giriş / Çıkış
- Profil sayfası:
  - Bağış geçmişi tablosu
  - Onaylı bağışların dekontları
  - Hesap bilgileri
- Kayıt sonrası otomatik karşılama e-postası
- Misafir bağışı desteği

### Bağış Akışı

1. Kullanıcı "Bağış Yap"a tıklar
2. IBAN'ı kopyalar ve havale yapar
3. Tutar ve bağış türü girerek "Bağış Yaptım" butonuna basar
4. Bildirim sayfası + 5 saniyeli yönlendirme
5. Admin panelde bekleyen olarak görünür
6. Admin onayladığında bağışçıya makbuzlu bilgilendirme maili gider

### Admin Panel (`/admin.html`)

- 📊 Panel: İstatistikler + bekleyen bildirimler
- 💚 Bağış Onayları: Onayla / Reddet + açıklama + otomatik dekont üretimi
- 👥 Bağışçılar: Rol değiştirme, etiket atama (segment için)
- 💬 Mesajlar: Canlı destek konuşmaları + yanıtlama
- 🏷️ Bağış Kategorileri: CRUD (icon, fiyat, sıra)
- 📣 Kampanyalar: CRUD (hedef, toplanan, bağışçı sayısı, görsel)
- 🌍 Faaliyetler: CRUD (lokasyon, tarih, görsel)
- 🎞️ Hero Slider: Görsel/video slide ekle-çıkar
- 🏛️ Yetkili Kurullar: CRUD (kurul, isim, görev)
- 📄 Belgeler: Dosya yükleme
- 📋 Menü Yönetimi: Ana menü öğeleri + alt menüler
- 📧 Toplu Mail: Etikete göre filtreli toplu gönderim
- ⚙️ Site Ayarları: Slogan, iletişim, IBAN, sosyal medya, hakkımızda/misyon/vizyon

### Otomasyon

- Kayıt sonrası karşılama maili
- Bağış onay/red e-postaları
- Onaylanan bağış için otomatik dekont üretimi (bağışçı profilinde ve admin panelde görülebilir)

**Not**: E-posta gönderimi `mail.log` dosyasına yazılır (stub). Gerçek SMTP bağlamak için `server.js` içindeki `mailerSend` fonksiyonunu nodemailer transport ile değiştirin.

## Sanal POS Entegrasyonu

Ödeme sayfası şu an IBAN tabanlıdır (manuel havale + onay akışı). Gerçek sanal pos entegrasyonu için:
- `/api/donations` endpoint'ini ödeme sağlayıcı webhook'u ile uzatabilirsiniz.
- `status` alanı başarılı ödemede otomatik `approved` olarak set edilebilir.

## İçerik Yönetimi

Tüm statik metinler (hakkımızda, misyon, vizyon, slogan, iletişim) admin panel → Site Ayarları'ndan düzenlenebilir. Sayfaların dinamik içerikleri (faaliyetler, kampanyalar, kategoriler) kendi yönetim ekranlarından güncellenir.
