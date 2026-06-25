import PDFDocument from 'pdfkit';
import { uploadPDF } from '../config/cloudinary.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../frontend/public/logo.png');

// ── Branding constants ────────────────────────────────────────────────────────
const BRAND = {
  name: 'investkaps',
  tagline: '...driven by research, guided by expertise',
  address: 'A-144, Vivek Vihar, Phase-1, Delhi-110095',
  phone: '+918076283540',
  RA: {
    sebiReg: 'INH000016834',
    bseEnlistment: 'RA: 6226',
    email: 'investkaps@gmail.com',
  },
  IA: {
    sebiReg: 'INA000022190',
    bseEnlistment: 'IA: 2484',
    email: 'investkaps_ia@zohomail.in',
  },
};

// ── Invoice number format: YYYYMMDDNNNN ───────────────────────────────────────
export const generateInvoiceNumber = async (PaymentRequest) => {
  const now = new Date();
  const dateStr =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  // Count today's invoices to get the next sequence number
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const count = await PaymentRequest.countDocuments({
    invoiceNumber: { $regex: `^${dateStr}` },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${dateStr}${seq}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const NAVY = '#1e3a5f';
const LIGHT = '#f8fafc';
const BORDER = '#e2e8f0';
const TEXT = '#334155';
const MUTED = '#64748b';

const fmt = (n) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Main generator ─────────────────────────────────────────────────────────────
export const generateInvoicePDF = ({
  invoiceNumber,
  date,           // Date object or ISO string
  serviceType,    // 'RA' | 'IA' | 'MP'
  billingName,
  billingState,
  pan,            // may be undefined
  email,
  phone,
  transactionId,
  packageName,
  duration,
  amount,
  coupon = 0,
}) => {
  return new Promise((resolve, reject) => {
    const profile = BRAND[serviceType === 'IA' ? 'IA' : 'RA'];
    const d = date ? new Date(date) : new Date();
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595.28;
    const M = 40; // margin
    const CW = W - M * 2; // content width

    // ── Header band ──────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 120).fill(NAVY);

    // Logo image
    const logoSize = 52;
    const logoX = W / 2 - logoSize / 2;
    const logoY = 12;
    try {
      doc.image(LOGO_PATH, logoX, logoY, { width: logoSize, height: logoSize });
    } catch {
      doc.fontSize(24).fillColor('#fff').font('Helvetica-Bold').text('K', W / 2 - 8, logoY + 14);
    }

    // Brand name
    doc.fontSize(18).fillColor('#fff').font('Helvetica-Bold').text(BRAND.name, M, 72, { width: CW, align: 'center' });
    doc.fontSize(9).fillColor('#c7d8f0').font('Helvetica').text(BRAND.tagline, M, 94, { width: CW, align: 'center' });

    // ── Invoice meta row ─────────────────────────────────────────────────────
    const metaY = 136;
    doc.rect(M, metaY, CW, 60).fill(LIGHT).stroke(BORDER);

    // Left block
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Invoice No:', M + 10, metaY + 10);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(invoiceNumber, M + 75, metaY + 10);

    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Transaction ID:', M + 10, metaY + 24);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(transactionId || '—', M + 75, metaY + 24);

    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('PAN:', M + 10, metaY + 38);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(pan || '—', M + 75, metaY + 38);

    // Right block
    const rightX = M + CW / 2 + 10;
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Date:', rightX, metaY + 10);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(dateStr, rightX + 40, metaY + 10);

    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('SEBI Reg:', rightX, metaY + 24);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(' ' + profile.sebiReg, rightX + 40, metaY + 24);

    // ── Divider ──────────────────────────────────────────────────────────────
    const divY = metaY + 68;
    doc.moveTo(M, divY).lineTo(M + CW, divY).strokeColor(BORDER).lineWidth(1).stroke();

    // ── Billed To / Contact ──────────────────────────────────────────────────
    const billedY = divY + 12;

    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('BILLED TO', M, billedY);
    doc.fontSize(11).fillColor(TEXT).font('Helvetica-Bold').text(billingName || '—', M, billedY + 14);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica').text(`State: ${billingState || '—'}`, M, billedY + 30);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica').text(`PAN: ${pan || '—'}`, M, billedY + 44);

    const contactX = M + CW / 2 + 10;
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Email:', contactX, billedY + 14);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(email || '—', contactX + 40, billedY + 14);

    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Phone:', contactX, billedY + 28);
    doc.fontSize(8).fillColor(TEXT).font('Helvetica').text(phone || '—', contactX + 40, billedY + 28);

    // ── Table ────────────────────────────────────────────────────────────────
    // Columns must sum exactly to CW (515pt) so nothing clips off the right edge.
    // colW: [#=25, Package=210, Duration=155, Amount=125]  total = 515
    const tableY = billedY + 72;
    const colW = [25, 210, 155, 125];
    const colX = [M, M + 25, M + 235, M + 390];
    const rowH = 28;

    // Header
    doc.rect(M, tableY, CW, rowH).fill(NAVY);
    const headers = ['#', 'Package', 'Duration', 'Amount (Rs.)'];
    headers.forEach((h, i) => {
      doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold')
        .text(h, colX[i] + 5, tableY + 9, { width: colW[i] - 8, align: i === 3 ? 'right' : 'left' });
    });

    // Row
    const rowY = tableY + rowH;
    doc.rect(M, rowY, CW, rowH).fill('#fff').strokeColor(BORDER).lineWidth(0.5).stroke();
    const cells = ['1', packageName || '—', duration || '—', fmt(amount)];
    cells.forEach((c, i) => {
      doc.fontSize(9).fillColor(TEXT).font('Helvetica')
        .text(c, colX[i] + 5, rowY + 9, { width: colW[i] - 8, align: i === 3 ? 'right' : 'left' });
    });

    // Totals block — anchored to right edge of content area
    const totY = rowY + rowH + 8;
    const totLabelW = 130;
    const totValW = 80;
    const totValX = M + CW - totValW;          // right-flush value column
    const totLabelX = totValX - totLabelW - 6; // label sits left of value

    const drawTotRow = (label, value, bold, y) => {
      doc.fontSize(9).fillColor(bold ? TEXT : MUTED).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, totLabelX, y, { width: totLabelW, align: 'right' });
      doc.fontSize(9).fillColor(bold ? TEXT : MUTED).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(value, totValX, y, { width: totValW, align: 'right' });
    };

    const hasCoupon = Number(coupon) > 0;
    if (hasCoupon) {
      drawTotRow('Coupon (Rs.):', `-${fmt(coupon)}`, false, totY);
    }

    const grandY = hasCoupon ? totY + 16 : totY;
    const grandBgX = totLabelX - 4;
    const grandBgW = totLabelW + totValW + 6 + 8;
    doc.rect(grandBgX, grandY - 4, grandBgW, 22).fill(NAVY);
    doc.fontSize(10).fillColor('#fff').font('Helvetica-Bold')
      .text('Grand Total (Rs.):', totLabelX, grandY + 3, { width: totLabelW, align: 'right' });
    doc.fontSize(10).fillColor('#fff').font('Helvetica-Bold')
      .text(fmt(amount - coupon), totValX, grandY + 3, { width: totValW, align: 'right' });

    // ── Note ──────────────────────────────────────────────────────────────────
    const noteY = grandY + 36;
    doc.rect(M, noteY, CW, 42).fill(LIGHT).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(7.5).fillColor(MUTED).font('Helvetica')
      .text(
        'Note: This invoice is generated by a SEBI Certified Research Analyst strictly for subscription advisory services. No physical goods are involved. Disputes, if any, are subject to jurisdiction only.',
        M + 8, noteY + 8,
        { width: CW - 16, lineGap: 2 }
      );

    // ── Footer ────────────────────────────────────────────────────────────────
    const footY = noteY + 56;
    doc.moveTo(M, footY).lineTo(M + CW, footY).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(8).fillColor(MUTED).font('Helvetica')
      .text(`${BRAND.address}`, M, footY + 8, { width: CW, align: 'center' });
    doc.fontSize(8).fillColor(MUTED).font('Helvetica')
      .text(`${BRAND.phone} | ${profile.email}`, M, footY + 20, { width: CW, align: 'center' });

    doc.end();
  });
};

// ── Upload invoice PDF to Cloudinary ─────────────────────────────────────────
export const uploadInvoicePDF = async (pdfBuffer, invoiceNumber) => {
  return uploadPDF(pdfBuffer, invoiceNumber, 'invoices');
};
