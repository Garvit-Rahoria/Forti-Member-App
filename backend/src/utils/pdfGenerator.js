'use strict';
/**
 * pdfGenerator.js
 * Generates PDFs from HTML using Puppeteer.
 * All three documents share a single browser instance (lazy-init, reused).
 */

let _browser = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  const puppeteer = require('puppeteer');
  _browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  _browser.on('disconnected', () => { _browser = null; });
  return _browser;
}

async function htmlToPdf(html, pdfOptions = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('screen');
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.pdf({ printBackground: true, ...pdfOptions });
    return buf;
  } finally {
    await page.close();
  }
}

// ─── Shared CSS variables ────────────────────────────────────────────────────
const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --purple: #6C3EAB;
    --purple-light: #9B6FCC;
    --purple-pale: #F3EEFF;
    --purple-border: #D4B8FF;
    --text-dark: #1A1A2E;
    --text-mid: #444455;
    --text-soft: #777788;
    --text-muted: #AAAAAA;
    --white: #FFFFFF;
    --divider: #E0E0E8;
  }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: var(--text-dark);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

// ─── CERTIFICATE ─────────────────────────────────────────────────────────────
function buildCertificateHtml({ fullName, certNo, issuedOn, validUpto, email }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${BASE_CSS}

    html, body { width: 210mm; height: 297mm; }

    .page {
      width: 210mm;
      height: 297mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--white);
    }

    /* Double border frame */
    .frame {
      width: 190mm;
      height: 277mm;
      border: 3px solid var(--purple);
      border-radius: 6px;
      padding: 4px;
      display: flex;
      flex-direction: column;
    }
    .frame-inner {
      flex: 1;
      border: 1px solid var(--purple-light);
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 32px 40px 24px;
      background: linear-gradient(175deg, #FAF7FF 0%, #FFFFFF 60%);
    }

    /* Header */
    .header { text-align: center; width: 100%; }
    .org-name {
      font-size: 38px;
      font-weight: 800;
      color: var(--purple);
      letter-spacing: 6px;
      line-height: 1;
    }
    .org-sub {
      font-size: 11px;
      color: var(--text-soft);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .divider-ornament {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 18px auto;
      width: 80%;
    }
    .divider-ornament .line { flex: 1; height: 1px; background: var(--purple-light); }
    .divider-ornament .diamond {
      width: 8px; height: 8px;
      background: var(--purple);
      transform: rotate(45deg);
      flex-shrink: 0;
    }

    /* Body */
    .cert-body { text-align: center; width: 100%; }
    .cert-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--purple);
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .cert-intro {
      font-size: 13px;
      color: var(--text-soft);
      margin-bottom: 14px;
    }
    .member-name {
      font-size: 32px;
      font-weight: 800;
      color: var(--text-dark);
      border-bottom: 2px solid var(--purple-border);
      display: inline-block;
      padding-bottom: 6px;
      margin-bottom: 16px;
    }
    .cert-desc {
      font-size: 13px;
      color: var(--text-mid);
      max-width: 380px;
      margin: 0 auto;
      line-height: 1.7;
    }

    /* Details grid */
    .details {
      width: 100%;
      border-top: 1px solid var(--divider);
      border-bottom: 1px solid var(--divider);
      padding: 18px 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 0;
    }
    .detail-cell { text-align: center; padding: 4px 12px; }
    .detail-cell + .detail-cell { border-left: 1px solid var(--divider); }
    .detail-cell:nth-child(3) { border-top: 1px solid var(--divider); }
    .detail-cell:nth-child(4) { border-top: 1px solid var(--divider); border-left: 1px solid var(--divider); }
    .detail-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-soft);
      margin-bottom: 4px;
    }
    .detail-value {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-dark);
      word-break: break-all;
    }

    /* Footer */
    .cert-footer { text-align: center; width: 100%; }
    .seal {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: var(--purple);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }
    .seal-text {
      color: white;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      text-align: center;
      line-height: 1.4;
    }
    .footer-note {
      font-size: 9px;
      color: var(--text-muted);
      line-height: 1.6;
    }
  </style>
</head>
<body>
<div class="page">
  <div class="frame">
    <div class="frame-inner">

      <!-- Header -->
      <div class="header">
        <div class="org-name">FORTI</div>
        <div class="org-sub">Federation of Registered Traders &amp; Industries</div>
        <div class="divider-ornament">
          <div class="line"></div>
          <div class="diamond"></div>
          <div class="line"></div>
        </div>
      </div>

      <!-- Body -->
      <div class="cert-body">
        <div class="cert-title">Certificate of Membership</div>
        <div class="cert-intro">This is to certify that</div>
        <div class="member-name">${escHtml(fullName)}</div>
        <p class="cert-desc">
          is a duly registered member of FORTI and is entitled to all
          the rights, benefits, and privileges accorded to its members.
        </p>
      </div>

      <!-- Details -->
      <div class="details">
        <div class="detail-cell">
          <div class="detail-label">Membership ID</div>
          <div class="detail-value">${escHtml(certNo)}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Issued On</div>
          <div class="detail-value">${escHtml(issuedOn)}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Valid Upto</div>
          <div class="detail-value">${escHtml(validUpto)}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Email</div>
          <div class="detail-value">${escHtml(email)}</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="cert-footer">
        <div class="seal"><div class="seal-text">FORTI<br>OFFICIAL</div></div>
        <p class="footer-note">
          This certificate is digitally generated and is valid without a physical signature.<br>
          Generated on ${new Date().toLocaleDateString('en-IN')} &nbsp;·&nbsp; FORTI Portal
        </p>
      </div>

    </div>
  </div>
</div>
</body>
</html>`;
}

// ─── DIGITAL ID CARD ─────────────────────────────────────────────────────────
function buildIdCardHtml({ fullName, certNo, validUpto, email, qrDataUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${BASE_CSS}

    html, body {
      width: 210mm;
      height: 297mm;
      background: #F0EDF6;
    }

    .page {
      width: 210mm;
      height: 297mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* CR-80 physical card: 85.6mm × 54mm */
    .card {
      width: 85.6mm;
      height: 54mm;
      border-radius: 4mm;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(108,62,171,0.25);
      display: flex;
      flex-direction: column;
      font-size: 0; /* reset inline */
    }

    /* Top purple band */
    .card-top {
      background: linear-gradient(135deg, #5A2D95 0%, #8B5CC8 100%);
      flex: 0 0 62%;
      padding: 5mm 4mm 3mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    /* Decorative arc top-right */
    .card-top::after {
      content: '';
      position: absolute;
      top: -10mm;
      right: -10mm;
      width: 28mm;
      height: 28mm;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .card-brand { }
    .brand-name {
      font-size: 7mm;
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1;
      letter-spacing: 1px;
    }
    .brand-sub {
      font-size: 2mm;
      color: #D4BEFF;
      letter-spacing: 0.5px;
      line-height: 1.4;
      max-width: 38mm;
    }
    .card-badge {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 2mm;
      padding: 1mm 2mm;
      font-size: 2mm;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: 1px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .card-member {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }
    .member-info { }
    .member-full-name {
      font-size: 4.5mm;
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1.2;
      margin-bottom: 1mm;
    }
    .member-id-label {
      font-size: 2mm;
      color: #C8AAEE;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .member-id-value {
      font-size: 3mm;
      font-weight: 700;
      color: #EEE0FF;
    }

    .qr-wrap {
      background: #FFFFFF;
      border-radius: 2mm;
      padding: 1.5mm;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .qr-wrap img {
      width: 14mm;
      height: 14mm;
      display: block;
    }

    /* Bottom white band */
    .card-bottom {
      background: #FFFFFF;
      flex: 1;
      padding: 2.5mm 4mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .bottom-left { }
    .bottom-field-label {
      font-size: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--purple);
      font-weight: 700;
    }
    .bottom-field-value {
      font-size: 2.6mm;
      color: var(--text-dark);
      font-weight: 600;
      word-break: break-all;
    }
    .bottom-right {
      text-align: right;
      flex-shrink: 0;
    }
    .valid-label {
      font-size: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-soft);
      font-weight: 600;
    }
    .valid-value {
      font-size: 2.6mm;
      color: var(--text-dark);
      font-weight: 700;
    }
  </style>
</head>
<body>
<div class="page">
  <div class="card">
    <!-- Purple top -->
    <div class="card-top">
      <div class="card-header">
        <div class="card-brand">
          <div class="brand-name">FORTI</div>
          <div class="brand-sub">Federation of Registered<br>Traders &amp; Industries</div>
        </div>
        <div class="card-badge">Digital ID</div>
      </div>
      <div class="card-member">
        <div class="member-info">
          <div class="member-full-name">${escHtml(fullName)}</div>
          <div class="member-id-label">Member ID</div>
          <div class="member-id-value">${escHtml(certNo)}</div>
        </div>
        <div class="qr-wrap">
          <img src="${qrDataUrl}" alt="QR Code"/>
        </div>
      </div>
    </div>

    <!-- White bottom -->
    <div class="card-bottom">
      <div class="bottom-left">
        <div class="bottom-field-label">Email</div>
        <div class="bottom-field-value">${escHtml(email)}</div>
      </div>
      <div class="bottom-right">
        <div class="valid-label">Valid Until</div>
        <div class="valid-value">${escHtml(validUpto)}</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ─── INVOICE (Tailwind CSS + Puppeteer HTML-to-PDF) ──────────────────────────
function buildInvoiceHtml({ memberName, memberEmail, memberId, invoiceNum, packageName, amount, taxAmount, totalAmount, currency, dateStr, txnId, paymentMethod, phone, orgName }) {
  const sym = ({ INR: '₹', USD: '$', GBP: '£', EUR: '€', AED: 'د.إ', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$' })[currency] || currency || '₹';
  const fmt = (n) => `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const hasTax = Number(taxAmount) > 0;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand:      { 50: '#F5F0FF', 100: '#EDE5FF', 200: '#D4BFFF', 400: '#9B6FCC', 500: '#7C3AED', 600: '#6C3EAB', 700: '#5B21B6', 800: '#4C1D95', 900: '#3B0764' },
            ink:        { DEFAULT: '#1A1A2E', soft: '#64648C', muted: '#9CA3AF' },
            surface:    { DEFAULT: '#FAFBFF', card: '#FFFFFF' },
          },
          fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] },
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }
    @page { margin: 0; size: A4; }
  </style>
</head>
<body class="bg-white m-0 p-0">

<div class="w-[210mm] min-h-[297mm] mx-auto flex flex-col" style="padding: 0;">

  <!-- ═══ HEADER BAND ═══ -->
  <div class="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 px-12 pt-10 pb-8 relative overflow-hidden">
    <!-- Decorative circles -->
    <div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5"></div>
    <div class="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-white/5"></div>
    <div class="absolute top-6 right-32 w-20 h-20 rounded-full bg-white/[0.03]"></div>

    <div class="flex justify-between items-start relative z-10">
      <!-- Brand -->
      <div>
        <div class="flex items-center gap-3 mb-1">
          <div class="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span class="text-white font-black text-lg tracking-tight">F</span>
          </div>
          <div>
            <div class="text-white font-black text-2xl tracking-widest leading-none">FORTI</div>
            <div class="text-brand-200 text-[10px] tracking-wider font-medium mt-0.5">Federation of Registered Traders &amp; Industries</div>
          </div>
        </div>
      </div>

      <!-- Invoice Tag -->
      <div class="text-right">
        <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-2.5">
          <svg class="w-5 h-5 text-brand-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span class="text-white font-extrabold text-xl tracking-wider">INVOICE</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ BODY ═══ -->
  <div class="flex-1 px-12 pt-8 pb-6 flex flex-col">

    <!-- Invoice meta strip -->
    <div class="flex justify-between items-center mb-8">
      <div class="flex gap-8">
        <div>
          <div class="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-0.5">Invoice No.</div>
          <div class="text-sm font-bold text-ink">${escHtml(invoiceNum)}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-0.5">Date</div>
          <div class="text-sm font-bold text-ink">${escHtml(dateStr)}</div>
        </div>
        ${escHtml(memberId) ? `<div>
          <div class="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-0.5">Member ID</div>
          <div class="text-sm font-bold text-ink">${escHtml(memberId)}</div>
        </div>` : ''}
      </div>
      <div class="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
        <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
        PAID
      </div>
    </div>

    <!-- Bill To / From -->
    <div class="grid grid-cols-2 gap-8 mb-8">
      <!-- Bill To -->
      <div class="bg-brand-50/60 border border-brand-100 rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-brand-600">Billed To</span>
        </div>
        <div class="text-base font-bold text-ink leading-snug">${escHtml(memberName)}</div>
        <div class="text-sm text-ink-soft mt-1">${escHtml(memberEmail)}</div>
        ${phone ? `<div class="text-sm text-ink-soft">${escHtml(phone)}</div>` : ''}
        ${orgName ? `<div class="text-sm text-ink-soft mt-0.5">${escHtml(orgName)}</div>` : ''}
      </div>

      <!-- From -->
      <div class="bg-surface border border-gray-100 rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">From</span>
        </div>
        <div class="text-base font-bold text-ink leading-snug">FORTI</div>
        <div class="text-sm text-ink-soft mt-1">Federation of Registered Traders &amp; Industries</div>
        <div class="text-sm text-ink-soft">membership@forti.org</div>
      </div>
    </div>

    <!-- ═══ LINE ITEMS TABLE ═══ -->
    <div class="rounded-xl border border-gray-200 overflow-hidden mb-6">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-gradient-to-r from-brand-700 to-brand-600">
            <th class="text-left text-white text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 w-[10%]">#</th>
            <th class="text-left text-white text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 w-[50%]">Description</th>
            <th class="text-center text-white text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 w-[15%]">Qty</th>
            <th class="text-right text-white text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 w-[25%]">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-gray-100">
            <td class="py-4 px-5 text-sm text-ink-soft font-medium">1</td>
            <td class="py-4 px-5">
              <div class="text-sm font-semibold text-ink">${escHtml(packageName)}</div>
              <div class="text-xs text-ink-soft mt-0.5">FORTI Membership Package</div>
            </td>
            <td class="py-4 px-5 text-center text-sm text-ink-soft font-medium">1</td>
            <td class="py-4 px-5 text-right text-sm font-bold text-ink">${fmt(amount)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══ TOTALS SECTION ═══ -->
    <div class="flex justify-end mb-8">
      <div class="w-72">
        <div class="flex justify-between items-center py-2 px-4 text-sm">
          <span class="text-ink-soft">Subtotal</span>
          <span class="font-semibold text-ink">${fmt(amount)}</span>
        </div>
        ${hasTax ? `
        <div class="flex justify-between items-center py-2 px-4 text-sm">
          <span class="text-ink-soft">Tax</span>
          <span class="font-semibold text-ink">${fmt(taxAmount)}</span>
        </div>` : `
        <div class="flex justify-between items-center py-2 px-4 text-sm">
          <span class="text-ink-soft">Tax</span>
          <span class="font-medium text-ink-muted">—</span>
        </div>`}
        <div class="border-t-2 border-brand-600 mt-1"></div>
        <div class="flex justify-between items-center py-3 px-4 bg-brand-50 rounded-b-lg">
          <span class="text-sm font-bold text-brand-700 uppercase tracking-wide">Total</span>
          <span class="text-xl font-black text-brand-700">${fmt(totalAmount)}</span>
        </div>
      </div>
    </div>

    <!-- ═══ PAYMENT INFO ═══ -->
    ${(txnId && txnId !== '—') || paymentMethod ? `
    <div class="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
      <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Payment Details</div>
      <div class="grid grid-cols-3 gap-4">
        ${paymentMethod ? `
        <div>
          <div class="text-[10px] text-ink-muted font-medium uppercase tracking-wider">Method</div>
          <div class="text-sm font-semibold text-ink mt-0.5">${escHtml(paymentMethod)}</div>
        </div>` : ''}
        ${txnId && txnId !== '—' ? `
        <div>
          <div class="text-[10px] text-ink-muted font-medium uppercase tracking-wider">Transaction ID</div>
          <div class="text-sm font-semibold text-ink mt-0.5">${escHtml(txnId)}</div>
        </div>` : ''}
        <div>
          <div class="text-[10px] text-ink-muted font-medium uppercase tracking-wider">Status</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span class="text-sm font-semibold text-emerald-700">Paid</span>
          </div>
        </div>
      </div>
    </div>` : ''}

    <!-- ═══ FOOTER ═══ -->
    <div class="mt-auto pt-6 border-t border-gray-200">
      <div class="flex justify-between items-end">
        <div>
          <div class="text-[10px] text-ink-muted leading-relaxed">
            This is a computer-generated invoice and does not require a physical signature.<br/>
            Generated on ${escHtml(today)} &nbsp;·&nbsp; FORTI Membership Portal
          </div>
        </div>
        <div class="text-right">
          <div class="text-lg font-black text-brand-600 tracking-tight">Thank you!</div>
          <div class="text-[10px] text-ink-muted">We appreciate your membership</div>
        </div>
      </div>

      <!-- Bottom brand bar -->
      <div class="mt-5 bg-gradient-to-r from-brand-800 to-brand-600 rounded-lg px-5 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-white font-black text-sm tracking-widest">FORTI</span>
          <span class="text-brand-200 text-[9px] font-medium">|</span>
          <span class="text-brand-200 text-[9px] font-medium tracking-wide">Federation of Registered Traders &amp; Industries</span>
        </div>
        <div class="text-brand-200 text-[9px]">www.forti.org</div>
      </div>
    </div>

  </div>
</div>

</body>
</html>`;
}

// ─── HTML escape helper ───────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { htmlToPdf, buildCertificateHtml, buildIdCardHtml, buildInvoiceHtml };
