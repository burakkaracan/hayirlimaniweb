// ===== Hayır Limanı — Dernek Gelirleri Alındı Belgesi =====
const PDFDocument = require('pdfkit');
const path = require('path');
const fs   = require('fs');

const FONT_R    = path.join(__dirname, 'fonts', 'Calibri-Regular.ttf');
const FONT_B    = path.join(__dirname, 'fonts', 'Calibri-Bold.ttf');
const LOGO      = path.join(__dirname, 'public', 'images', 'logo.png');
const LOGO_WHITE = path.join(__dirname, 'public', 'images', 'logo-white.png');

const C_BRAND  = '#1a3d5c';
const C_ACCENT = '#c41230';
const C_LIGHT  = '#f0f4f8';
const C_MUTED  = '#5a6a7e';
const C_TEXT   = '#1a2535';
const C_WHITE  = '#ffffff';
const C_BORDER = '#cdd6e0';

// Türk derneklerinde standart: her ciltte 50 alındı belgesi
const FORMS_PER_CILT = 50;

function generateReceiptPDF(donation, settings = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4', margin: 0,
      info: {
        Title:   `Alındı Belgesi #${String(donation.receipt_number || donation.id).padStart(6,'0')}`,
        Author:  'Hayır Limanı Yardım Derneği',
        Subject: 'Dernek Gelirleri Alındı Belgesi',
      }
    });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('R', FONT_R);
    doc.registerFont('B', FONT_B);

    const W  = doc.page.width;   // 595
    const H  = doc.page.height;  // 842
    const LM = 44;
    const CW = W - LM * 2;      // 507

    // ── helpers ──────────────────────────────────────────────
    function divider(y, color = C_BORDER) {
      doc.moveTo(LM, y).lineTo(W - LM, y).lineWidth(0.5).strokeColor(color).stroke();
    }
    function sectionBar(label, y) {
      doc.rect(LM, y, CW, 26).fill(C_BRAND);
      doc.font('B').fontSize(9.5).fillColor(C_WHITE)
         .text(label, LM + 12, y + 7, { width: CW - 24 });
      return y + 26;
    }
    function infoRow(label, value, x, y, colW) {
      doc.font('B').fontSize(8.5).fillColor(C_MUTED)
         .text(label, x, y, { width: colW * 0.42, lineBreak: false });
      doc.font('R').fontSize(9).fillColor(C_TEXT)
         .text(String(value || '—'), x + colW * 0.42, y, { width: colW * 0.58, lineBreak: false });
    }

    const receiptNo = donation.receipt_number || donation.id;
    const ciltNo    = Math.ceil(receiptNo / FORMS_PER_CILT);

    let y = 0;

    // ════════════════════════════════════════════════════════
    // HEADER — 3 sütun: logo | başlık | iletişim
    // ════════════════════════════════════════════════════════
    doc.rect(0, 0, W, 130).fill(C_BRAND);

    // Sol: Logo (beyaz versiyon koyu arka plan üzerinde)
    const logoColW = 170;
    const logoFile = fs.existsSync(LOGO_WHITE) ? LOGO_WHITE : LOGO;
    doc.image(logoFile, LM, 12, { fit: [logoColW - 10, 106], align: 'left', valign: 'center' });

    // Orta: Başlık (logonun sağında, iletişim bilgisinin solunda)
    const titleX = LM + logoColW + 8;
    const contactW = 168;
    const titleW = W - titleX - contactW - LM - 8;

    doc.font('B').fontSize(14).fillColor(C_WHITE)
       .text('DERNEK GELİRLERİ', titleX, 22, { width: titleW, align: 'center' });
    doc.font('B').fontSize(14).fillColor(C_WHITE)
       .text('ALINDI BELGESİ',   titleX, 42, { width: titleW, align: 'center' });
    doc.moveTo(titleX, 63).lineTo(titleX + titleW, 63)
       .lineWidth(0.5).strokeColor('rgba(255,255,255,0.3)').stroke();
    doc.font('R').fontSize(8).fillColor('rgba(255,255,255,0.55)')
       .text('Hayır Limanı Yardım Derneği', titleX, 70, { width: titleW, align: 'center' });
    doc.font('R').fontSize(8).fillColor('rgba(255,255,255,0.45)')
       .text('Resmi Bağış Makbuzu', titleX, 84, { width: titleW, align: 'center' });

    // Sağ: İletişim
    const infoX = W - LM - contactW;
    doc.font('R').fontSize(8).fillColor('rgba(255,255,255,0.7)')
       .text(settings.address || 'Battalgazi Mah. 1017 Cad. 27-A, Altındağ/Ankara',
             infoX, 18, { width: contactW, align: 'right' })
       .text(`Tel: ${settings.phone || '0553 023 2173'}`, infoX, 44, { width: contactW, align: 'right' })
       .text(settings.email || 'info@hayirlimani.com', infoX, 57, { width: contactW, align: 'right' })
       .text('Kütük No: 06-161-029', infoX, 70, { width: contactW, align: 'right' });

    // Kırmızı şerit
    doc.rect(0, 130, W, 5).fill(C_ACCENT);
    y = 135;

    // ════════════════════════════════════════════════════════
    // BELGE BİLGİSİ BANDI
    // ════════════════════════════════════════════════════════
    doc.rect(0, y, W, 52).fill(C_LIGHT);

    const issueDate = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    const bandCols = [
      { label: 'SERİ',             value: 'A'                                          },
      { label: 'SIRA NO',          value: String(receiptNo).padStart(6, '0')           },
      { label: 'DÜZENLEME TARİHİ', value: issueDate                                    },
      { label: 'CİLT NO',          value: String(ciltNo)                               },
    ];
    const bandW = CW / 4;
    bandCols.forEach((col, i) => {
      const bx = LM + i * bandW;
      if (i > 0) {
        doc.moveTo(bx, y + 8).lineTo(bx, y + 44).lineWidth(0.5).strokeColor(C_BORDER).stroke();
      }
      doc.font('B').fontSize(7.5).fillColor(C_MUTED)
         .text(col.label, bx + 4, y + 10, { width: bandW - 8, align: 'center' });
      doc.font('B').fontSize(12).fillColor(C_BRAND)
         .text(col.value, bx + 4, y + 25, { width: bandW - 8, align: 'center' });
    });
    doc.rect(LM, y + 48, CW, 2).fill(C_ACCENT);
    y += 56;

    // ════════════════════════════════════════════════════════
    // PARAYI YATIRANIN — BAĞIŞÇI BİLGİLERİ
    // ════════════════════════════════════════════════════════
    y = sectionBar('PARAYI YATIRANIN — BAĞIŞÇI BİLGİLERİ', y);

    const colW = (CW - 20) / 2;
    const col2 = LM + colW + 20;

    y += 14;
    infoRow('Adı ve Soyadı (*)', donation.user_name  || '—', LM,   y, colW);
    infoRow('E-posta',           donation.user_email || '—', col2, y, colW);
    divider(y + 17);

    y += 25;
    infoRow('T.C. Kimlik No.',   '—',  LM,   y, colW);
    infoRow('Yerleşim Yeri (*)', '—',  col2, y, colW);
    divider(y + 17);

    y += 25;
    const donateDate  = new Date(donation.created_at).toLocaleDateString('tr-TR',
      { day: '2-digit', month: 'long', year: 'numeric' });
    const approveDate = donation.approved_at
      ? new Date(donation.approved_at).toLocaleDateString('tr-TR',
          { day: '2-digit', month: 'long', year: 'numeric' })
      : '—';
    infoRow('Bağış Tarihi', donateDate,  LM,   y, colW);
    infoRow('Onay Tarihi',  approveDate, col2, y, colW);

    y += 18;
    doc.font('R').fontSize(7.5).fillColor(C_MUTED)
       .text('(*) Bağış yapanın isteğine bağlı olarak doldurulur.', LM, y, { width: CW });
    y += 20;

    // ════════════════════════════════════════════════════════
    // GELİRİN ÇEŞİDİ TABLOSU
    // ════════════════════════════════════════════════════════
    y = sectionBar('GELİRİN ÇEŞİDİ', y);

    const COL1 = Math.floor(CW * 0.74);
    const COL2 = CW - COL1;

    // Tablo başlığı
    doc.rect(LM, y, CW, 22).fill(C_LIGHT);
    doc.moveTo(LM + COL1, y).lineTo(LM + COL1, y + 22)
       .lineWidth(0.5).strokeColor(C_BORDER).stroke();
    doc.font('B').fontSize(8.5).fillColor(C_BRAND)
       .text('Açıklama', LM + 6, y + 6, { width: COL1 - 12 });
    doc.font('B').fontSize(8.5).fillColor(C_BRAND)
       .text('TL. - kr.', LM + COL1 + 3, y + 6, { width: COL2 - 6, align: 'center' });
    y += 22;

    const catLabel = donation.category_title || donation.campaign_title || 'Genel Bağış';
    const tlPart   = Math.floor(donation.amount);
    const krPart   = Math.round((donation.amount - tlPart) * 100);
    const krStr    = String(krPart).padStart(2, '0');
    const amtDisp  = `${new Intl.NumberFormat('tr-TR').format(tlPart)},${krStr}`;

    const tableStartY = y;
    for (let i = 0; i < 3; i++) {
      const rh = 22;
      doc.moveTo(LM, y + rh).lineTo(W - LM, y + rh).lineWidth(0.4).strokeColor(C_BORDER).stroke();
      doc.moveTo(LM + COL1, y).lineTo(LM + COL1, y + rh).lineWidth(0.4).strokeColor(C_BORDER).stroke();
      if (i === 0) {
        doc.font('R').fontSize(9).fillColor(C_TEXT)
           .text(catLabel, LM + 6, y + 6, { width: COL1 - 12 });
        doc.font('B').fontSize(9).fillColor(C_BRAND)
           .text(amtDisp, LM + COL1 + 4, y + 6, { width: COL2 - 8, align: 'right' });
      }
      y += rh;
    }
    doc.rect(LM, tableStartY - 22, CW, 22 + 66).lineWidth(0.5).strokeColor(C_BORDER).stroke();

    y += 14;

    // ════════════════════════════════════════════════════════
    // TUTAR KUTUSU
    // ════════════════════════════════════════════════════════
    const boxH = 88;
    doc.rect(LM + 4, y + 4, CW, boxH).fill('#c8d8e8');
    doc.rect(LM, y, CW, boxH).fill(C_BRAND);
    doc.rect(LM, y, 6, boxH).fill(C_ACCENT);

    doc.font('R').fontSize(9).fillColor('rgba(255,255,255,0.6)')
       .text('ONAYLANAN BAĞIŞ TUTARI', 0, y + 14, { align: 'center', width: W });

    const amountFull = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(donation.amount);

    doc.font('B').fontSize(36).fillColor(C_WHITE)
       .text(amountFull + ' ₺', 0, y + 32, { align: 'center', width: W });

    y += boxH + 6;

    // ════════════════════════════════════════════════════════
    // YALNIZ SATIRI
    // ════════════════════════════════════════════════════════
    doc.rect(LM, y, CW, 30).fill('#eef2f7');
    doc.font('R').fontSize(9.5).fillColor(C_BRAND)
       .text(
         `Yalnız  ${new Intl.NumberFormat('tr-TR').format(tlPart)}  TL.  ${krStr}  kr. Tahsil Edilmiştir.`,
         LM + 10, y + 9, { width: CW - 20 }
       );
    y += 34;

    // ════════════════════════════════════════════════════════
    // YASAL METİN
    // ════════════════════════════════════════════════════════
    doc.rect(LM, y, CW, 2).fill(C_ACCENT);
    y += 8;
    doc.font('R').fontSize(7.5).fillColor(C_MUTED)
       .text(
         'Bu belge, Hayır Limanı Yardım Derneği (Kütük No: 06-161-029) tarafından elektronik ortamda düzenlenmiş ' +
         'resmi alındı belgesidir. 5253 Sayılı Dernekler Kanunu ve ilgili mevzuat kapsamında geçerli olup vergi ' +
         'beyannamelerine ek olarak sunulabilir. Belgenin aslına uygunluğu www.hayirlimani.com adresinden teyit edilebilir.',
         LM, y, { width: CW, align: 'justify', lineGap: 2 }
       );
    y += 44;

    // ════════════════════════════════════════════════════════
    // PARAYI TAHSİL EDENİN
    // ════════════════════════════════════════════════════════
    y = sectionBar('PARAYI TAHSİL EDENİN', y);
    y += 10;

    const sigW = 150;
    const sigH = 65;

    // Sol: Dernek Mühürü kutusu
    doc.rect(LM, y, sigW, sigH)
       .lineWidth(1).dash(5, { space: 4 }).strokeColor(C_BORDER).stroke().undash();
    doc.font('B').fontSize(8).fillColor(C_MUTED)
       .text('DERNEK MÜHÜRÜ', LM, y + 8, { width: sigW, align: 'center' });
    doc.font('R').fontSize(7).fillColor(C_BORDER)
       .text('(Sonradan tanımlanacaktır)', LM, y + sigH - 16, { width: sigW, align: 'center' });

    // Orta: Onaylayan kişi
    const midX = LM + sigW + 20;
    const midW = CW - sigW * 2 - 40;

    doc.font('B').fontSize(8.5).fillColor(C_MUTED).text('Adı ve Soyadı', midX, y + 8);
    if (donation.approved_by) {
      doc.font('B').fontSize(9.5).fillColor(C_BRAND)
         .text(donation.approved_by, midX, y + 22, { width: midW });
    }
    doc.moveTo(midX, y + 36).lineTo(midX + midW, y + 36).lineWidth(0.5).strokeColor(C_BORDER).stroke();

    const appDate = donation.approved_at ? new Date(donation.approved_at) : new Date();
    const dateStr = appDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.font('B').fontSize(8.5).fillColor(C_MUTED).text('Tarih', midX, y + 42);
    doc.font('R').fontSize(9).fillColor(C_TEXT).text(dateStr, midX, y + 54);

    // Sağ: Yetkili İmza kutusu
    const sig2X = W - LM - sigW;
    doc.rect(sig2X, y, sigW, sigH)
       .lineWidth(1).dash(5, { space: 4 }).strokeColor(C_BORDER).stroke().undash();
    doc.font('B').fontSize(8).fillColor(C_MUTED)
       .text('YETKİLİ İMZA', sig2X, y + 8, { width: sigW, align: 'center' });
    doc.font('R').fontSize(7).fillColor(C_BORDER)
       .text('(Sonradan tanımlanacaktır)', sig2X, y + sigH - 16, { width: sigW, align: 'center' });

    y += sigH + 10;

    // ════════════════════════════════════════════════════════
    // FOOTER
    // ════════════════════════════════════════════════════════
    doc.rect(0, H - 42, W, 42).fill(C_BRAND);
    doc.rect(0, H - 42, W, 3).fill(C_ACCENT);
    doc.font('R').fontSize(7.5).fillColor(C_WHITE)
       .text(
         `Hayır Limanı Yardım Derneği  ·  Kütük No: 06-161-029  ·  ${settings.address || 'Battalgazi Mah. 1017 Cad. 27-A, Altındağ/Ankara'}`,
         0, H - 28, { align: 'center', width: W }
       );
    doc.font('R').fontSize(7).fillColor(C_WHITE)
       .text(`${settings.email || 'info@hayirlimani.com'}  ·  Her mazlumun kıyısında…`, 0, H - 15, { align: 'center', width: W });

    doc.end();
  });
}

module.exports = { generateReceiptPDF };
