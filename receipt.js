// ===== Hayır Limanı — PDF Makbuz Oluşturucu =====
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const FONT_REGULAR = path.join(__dirname, 'fonts', 'Calibri-Regular.ttf');
const FONT_BOLD    = path.join(__dirname, 'fonts', 'Calibri-Bold.ttf');
const LOGO_PATH    = path.join(__dirname, 'public', 'images', 'logo.png');

// Marka renkleri
const C_BRAND   = '#1a3d5c';
const C_ACCENT  = '#c41230';
const C_LIGHT   = '#f0f4f8';
const C_MUTED   = '#5a6a7e';
const C_TEXT    = '#1a2535';
const C_WHITE   = '#ffffff';
const C_BORDER  = '#cdd6e0';

function generateReceiptPDF(donation, settings = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title:   `Bağış Makbuzu #${String(donation.receipt_number || donation.id).padStart(6, '0')}`,
        Author:  'Hayır Limanı Yardım Derneği',
        Subject: 'Resmi Bağış Makbuzu',
        Keywords: 'bağış, makbuz, hayır limanı'
      }
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Fontları kaydet
    doc.registerFont('R', FONT_REGULAR);
    doc.registerFont('B', FONT_BOLD);

    const W = doc.page.width;   // 595 pt
    const H = doc.page.height;  // 842 pt
    const LM = 44;              // sol/sağ kenar boşluğu
    const CW = W - LM * 2;     // içerik genişliği

    // ──────────────────────────────────────────────────────
    // HEADER: Koyu teal arka plan
    // ──────────────────────────────────────────────────────
    doc.rect(0, 0, W, 130).fill(C_BRAND);

    // Logo (sol üst)
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, LM, 22, { fit: [210, 86], align: 'left', valign: 'center' });
    } else {
      doc.font('B').fontSize(16).fillColor(C_WHITE).text('HAYIR LİMANI', LM, 42);
      doc.font('R').fontSize(10).fillColor('rgba(255,255,255,0.7)').text('YARDIM DERNEĞİ', LM, 62);
    }

    // Dernek iletişim bilgileri (sağ)
    const infoX = W - LM - 240;
    doc.font('B').fontSize(10).fillColor(C_WHITE)
       .text('HAYIR LİMANI YARDIM DERNEĞİ', infoX, 26, { width: 240, align: 'right' });
    doc.font('R').fontSize(8.5).fillColor('rgba(255,255,255,0.75)')
       .text(settings.address || 'Battalgazi Mah. 1017 Cad. 27-A, Altındağ / Ankara', infoX, 43, { width: 240, align: 'right' })
       .text(`Tel: ${settings.phone || '0553 023 2173'}`, infoX, 57, { width: 240, align: 'right' })
       .text(`E-posta: ${settings.email || 'info@hayirlimani.com'}`, infoX, 70, { width: 240, align: 'right' })
       .text(`IBAN: ${settings.iban || 'TR11 0021 0000 0014 7550 3000 01'}`, infoX, 83, { width: 240, align: 'right' })
       .text(settings.iban_holder || 'Hayır Limanı Yardım Derneği', infoX, 96, { width: 240, align: 'right' });

    // ──────────────────────────────────────────────────────
    // KIRMIZI ŞERIT
    // ──────────────────────────────────────────────────────
    doc.rect(0, 130, W, 5).fill(C_ACCENT);

    // ──────────────────────────────────────────────────────
    // BAŞLIK ALANI
    // ──────────────────────────────────────────────────────
    doc.rect(0, 135, W, 58).fill(C_LIGHT);

    doc.font('B').fontSize(22).fillColor(C_BRAND)
       .text('BAĞIŞ MAKBUZU', 0, 147, { align: 'center', width: W });
    doc.font('R').fontSize(9).fillColor(C_MUTED)
       .text(
         `Makbuz No: ${String(donation.receipt_number || donation.id).padStart(6, '0')}    ` +
         `Düzenleme Tarihi: ${new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}`,
         0, 172, { align: 'center', width: W }
       );

    // ──────────────────────────────────────────────────────
    // YARDIMCI FONKSİYONLAR
    // ──────────────────────────────────────────────────────

    // Bölüm başlığı: koyu teal bar
    function sectionBar(label, y) {
      doc.rect(LM, y, CW, 26).fill(C_BRAND);
      doc.font('B').fontSize(9.5).fillColor(C_WHITE)
         .text(label, LM + 12, y + 7, { width: CW - 24 });
      return y + 26;
    }

    // İki sütunlu bilgi satırı
    function infoRow(label, value, x, y, colWidth) {
      doc.font('B').fontSize(8.5).fillColor(C_MUTED)
         .text(label, x, y, { width: colWidth * 0.40, lineBreak: false });
      doc.font('R').fontSize(9).fillColor(C_TEXT)
         .text(String(value || '—'), x + colWidth * 0.40, y, { width: colWidth * 0.60, lineBreak: false });
    }

    // Tam genişlik bilgi satırı
    function infoRowFull(label, value, y) {
      doc.font('B').fontSize(8.5).fillColor(C_MUTED)
         .text(label, LM, y, { width: CW * 0.25, lineBreak: false });
      doc.font('R').fontSize(9).fillColor(C_TEXT)
         .text(String(value || '—'), LM + CW * 0.25, y, { width: CW * 0.75, lineBreak: false });
    }

    // Yatay ayraç çizgisi
    function divider(y) {
      doc.moveTo(LM, y).lineTo(W - LM, y).lineWidth(0.5).strokeColor(C_BORDER).stroke();
    }

    // ──────────────────────────────────────────────────────
    // BAĞIŞÇI BİLGİLERİ
    // ──────────────────────────────────────────────────────
    let y = 210;
    y = sectionBar('BAĞIŞÇI BİLGİLERİ', y);

    const colW = (CW - 20) / 2;
    const col2 = LM + colW + 20;

    // Satır 1
    y += 14;
    infoRow('Ad Soyad',    donation.user_name  || 'Misafir', LM,   y, colW);
    infoRow('E-posta',     donation.user_email || '—',       col2, y, colW);
    divider(y + 18);

    // Satır 2
    y += 26;
    const donateDate  = new Date(donation.created_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const approveDate = donation.approved_at
      ? new Date(donation.approved_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' })
      : '—';
    infoRow('Bağış Tarihi',  donateDate,  LM,   y, colW);
    infoRow('Onay Tarihi',   approveDate, col2, y, colW);

    y += 28;

    // ──────────────────────────────────────────────────────
    // BAĞIŞ DETAYLARI
    // ──────────────────────────────────────────────────────
    y = sectionBar('BAĞIŞ DETAYLARI', y);

    const categoryLabel = donation.category_title || donation.campaign_title || 'Genel Bağış';

    y += 14;
    infoRow('Kategori / Kampanya', categoryLabel,       LM,   y, colW);
    infoRow('Bağış Türü',          'Havale / EFT',      col2, y, colW);
    divider(y + 18);

    y += 26;
    infoRowFull('Açıklama', donation.note || 'Belirtilmedi', y);
    divider(y + 18);

    y += 26;
    infoRowFull('Yönetici Notu', donation.admin_comment || '—', y);

    y += 36;

    // ──────────────────────────────────────────────────────
    // TUTAR KUTUSU — öne çıkan tasarım
    // ──────────────────────────────────────────────────────
    const boxH = 90;
    // Gölge efekti (offset dikdörtgen)
    doc.rect(LM + 4, y + 4, CW, boxH).fill('#d0dbe6');
    // Ana kutu
    doc.rect(LM, y, CW, boxH).fill(C_BRAND);
    // Sol kırmızı şerit
    doc.rect(LM, y, 6, boxH).fill(C_ACCENT);

    doc.font('R').fontSize(10).fillColor('rgba(255,255,255,0.7)')
       .text('ONAYLANAN BAĞIŞ TUTARI', 0, y + 16, { align: 'center', width: W });

    const amountStr = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(donation.amount);

    doc.font('B').fontSize(38).fillColor(C_WHITE)
       .text(amountStr + ' TL', 0, y + 33, { align: 'center', width: W });

    y += boxH + 30;

    // ──────────────────────────────────────────────────────
    // YASAL METİN
    // ──────────────────────────────────────────────────────
    doc.rect(LM, y, CW, 2).fill(C_ACCENT);
    y += 10;

    doc.font('R').fontSize(7.5).fillColor(C_MUTED)
       .text(
         'Bu belge, Hayır Limanı Yardım Derneği tarafından elektronik ortamda düzenlenmiş resmi bağış makbuzudur. ' +
         '5253 Sayılı Dernekler Kanunu ve ilgili mevzuat hükümleri kapsamında geçerli olup vergi beyannamelerine ' +
         'ek olarak sunulabilir. Belgenin aslına uygunluğu www.hayirlimani.com adresinden teyit edilebilir.',
         LM, y, { width: CW, align: 'justify', lineGap: 2 }
       );

    y += 46;

    // ──────────────────────────────────────────────────────
    // İMZA / MÜHÜR ALANLARI
    // ──────────────────────────────────────────────────────
    const sigY = H - 120;
    const sigW = 160;
    const sigH = 65;

    // Sol: Mühür
    doc.rect(LM, sigY, sigW, sigH)
       .lineWidth(1).dash(5, { space: 4 })
       .strokeColor(C_BORDER).stroke().undash();
    doc.font('B').fontSize(8).fillColor(C_MUTED)
       .text('DERNEK MÜHÜRÜ', LM, sigY + 6, { width: sigW, align: 'center' });
    doc.font('R').fontSize(7).fillColor(C_BORDER)
       .text('(resmi mühür)', LM, sigY + sigH - 16, { width: sigW, align: 'center' });

    // Sağ: İmza
    const sig2X = W - LM - sigW;
    doc.rect(sig2X, sigY, sigW, sigH)
       .lineWidth(1).dash(5, { space: 4 })
       .strokeColor(C_BORDER).stroke().undash();
    doc.font('B').fontSize(8).fillColor(C_MUTED)
       .text('YETKİLİ İMZA', sig2X, sigY + 6, { width: sigW, align: 'center' });
    doc.font('R').fontSize(7).fillColor(C_BORDER)
       .text('(ad soyad / unvan)', sig2X, sigY + sigH - 16, { width: sigW, align: 'center' });

    // ──────────────────────────────────────────────────────
    // ALT FOOTER
    // ──────────────────────────────────────────────────────
    doc.rect(0, H - 42, W, 42).fill(C_BRAND);
    doc.rect(0, H - 42, W, 3).fill(C_ACCENT);

    doc.font('R').fontSize(7.5).fillColor('rgba(255,255,255,0.65)')
       .text(
         `Hayır Limanı Yardım Derneği  ·  ${settings.address || 'Battalgazi Mah. 1017 Cad. 27-A, Altındağ/Ankara'}  ·  ${settings.email || 'info@hayirlimani.com'}`,
         0, H - 28, { align: 'center', width: W }
       );
    doc.font('R').fontSize(7).fillColor('rgba(255,255,255,0.45)')
       .text('Bu belge elektronik olarak oluşturulmuştur. · Her mazlumun kıyısında…', 0, H - 16, { align: 'center', width: W });

    doc.end();
  });
}

module.exports = { generateReceiptPDF };
