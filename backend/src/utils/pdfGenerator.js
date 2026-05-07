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

// ─── INVOICE ─────────────────────────────────────────────────────────────────
function buildInvoiceHtml({ memberName, memberEmail, memberId, invoiceNum, packageName, amount, taxAmount, totalAmount, currency, dateStr, txnId }) {
  const fmt = (n) => `${escHtml(currency)} ${Number(n).toFixed(2)}`;
  const taxRow = taxAmount > 0 ? `
    <tr class="subtotal-row">
      <td colspan="2"></td>
      <td class="label">Tax</td>
      <td class="amount">${fmt(taxAmount)}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${BASE_CSS}

    html, body { width: 210mm; background: #FFFFFF; }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm 12mm;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* ── Header ── */
    .inv-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 8mm;
      border-bottom: 3px solid var(--purple);
    }
    .inv-brand .brand-name {
      font-size: 22pt;
      font-weight: 800;
      color: var(--purple);
      letter-spacing: 3px;
      line-height: 1;
    }
    .inv-brand .brand-sub {
      font-size: 8pt;
      color: var(--text-soft);
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .inv-meta { text-align: right; }
    .inv-meta .inv-label {
      font-size: 22pt;
      font-weight: 800;
      color: var(--purple);
      letter-spacing: 2px;
      line-height: 1;
    }
    .inv-meta table { margin-top: 4px; margin-left: auto; }
    .inv-meta td {
      font-size: 8.5pt;
      color: var(--text-soft);
      padding: 1px 0 1px 12px;
      text-align: right;
    }
    .inv-meta td strong { color: var(--text-dark); }

    /* ── Bill To ── */
    .bill-section {
      margin: 7mm 0 6mm;
    }
    .bill-section .section-tag {
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--purple);
      background: var(--purple-pale);
      border-left: 3px solid var(--purple);
      padding: 2px 8px;
      display: inline-block;
      margin-bottom: 5px;
    }
    .bill-name {
      font-size: 13pt;
      font-weight: 700;
      color: var(--text-dark);
      line-height: 1.3;
    }
    .bill-detail {
      font-size: 9pt;
      color: var(--text-soft);
      line-height: 1.6;
    }

    /* ── Items Table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2mm;
    }
    .items-table thead tr {
      background: var(--purple);
      color: #FFFFFF;
    }
    .items-table thead th {
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 6px 10px;
      text-align: left;
    }
    .items-table thead th.right { text-align: right; }
    .items-table thead th.center { text-align: center; }

    .items-table tbody tr {
      border-bottom: 1px solid var(--divider);
    }
    .items-table tbody tr:nth-child(even) { background: #FAFAFA; }
    .items-table tbody td {
      font-size: 9.5pt;
      padding: 8px 10px;
      color: var(--text-dark);
      vertical-align: middle;
    }
    .items-table tbody td.center { text-align: center; color: var(--text-soft); }
    .items-table tbody td.right { text-align: right; }

    /* ── Totals ── */
    .items-table tfoot tr.subtotal-row td {
      padding: 4px 10px;
      font-size: 9pt;
      border: none;
    }
    .items-table tfoot tr.subtotal-row td.label {
      text-align: right;
      color: var(--text-soft);
    }
    .items-table tfoot tr.subtotal-row td.amount {
      text-align: right;
      color: var(--text-dark);
      min-width: 30mm;
    }
    .items-table tfoot tr.divider-row td {
      border-top: 1px solid var(--divider);
      padding: 0;
    }
    .items-table tfoot tr.total-row td {
      padding: 6px 10px;
      border-top: 2px solid var(--purple);
    }
    .items-table tfoot tr.total-row td.label {
      text-align: right;
      font-size: 10pt;
      font-weight: 700;
      color: var(--text-dark);
    }
    .items-table tfoot tr.total-row td.amount {
      text-align: right;
      font-size: 11pt;
      font-weight: 800;
      color: var(--purple);
      min-width: 30mm;
    }

    /* ── Payment Info ── */
    .payment-info {
      margin-top: 6mm;
      padding: 4mm 5mm;
      background: var(--purple-pale);
      border: 1px solid var(--purple-border);
      border-radius: 3px;
      font-size: 8.5pt;
      color: var(--text-mid);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .payment-info strong { color: var(--purple); }

    /* ── Footer ── */
    .inv-footer {
      margin-top: auto;
      padding-top: 8mm;
      border-top: 1px solid var(--divider);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-note {
      font-size: 7.5pt;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .footer-thanks {
      font-size: 10pt;
      font-weight: 700;
      color: var(--purple);
      text-align: right;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="inv-header">
    <div class="inv-brand">
      <div class="brand-name">FORTI</div>
      <div class="brand-sub">Federation of Registered Traders &amp; Industries</div>
    </div>
    <div class="inv-meta">
      <div class="inv-label">INVOICE</div>
      <table>
        <tr><td>Invoice No:&nbsp;<strong>${escHtml(invoiceNum)}</strong></td></tr>
        <tr><td>Date:&nbsp;<strong>${escHtml(dateStr)}</strong></td></tr>
      </table>
    </div>
  </div>

  <!-- Bill To -->
  <div class="bill-section">
    <div class="section-tag">Bill To</div>
    <div class="bill-name">${escHtml(memberName)}</div>
    <div class="bill-detail">${escHtml(memberEmail)}</div>
    <div class="bill-detail">Membership ID: <strong>${escHtml(memberId)}</strong></div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:60%">Description</th>
        <th class="center" style="width:15%">Qty</th>
        <th class="right" style="width:25%">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escHtml(packageName)}</td>
        <td class="center">1</td>
        <td class="right">${fmt(amount)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="subtotal-row">
        <td colspan="2"></td>
        <td class="label">Subtotal</td>
        <td class="amount">${fmt(amount)}</td>
      </tr>
      ${taxRow}
      <tr class="divider-row"><td colspan="4"></td></tr>
      <tr class="total-row">
        <td colspan="2"></td>
        <td class="label">Total</td>
        <td class="amount">${fmt(totalAmount)}</td>
      </tr>
    </tfoot>
  </table>

  ${txnId && txnId !== '—' ? `
  <div class="payment-info">
    <strong>Transaction ID:</strong> ${escHtml(txnId)}
  </div>` : ''}

  <!-- Footer -->
  <div class="inv-footer">
    <div class="footer-note">
      This is a computer-generated invoice and does not require a physical signature.<br>
      Generated on ${new Date().toLocaleDateString('en-IN')} &nbsp;·&nbsp; FORTI Portal
    </div>
    <div class="footer-thanks">Thank you for your membership!</div>
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
