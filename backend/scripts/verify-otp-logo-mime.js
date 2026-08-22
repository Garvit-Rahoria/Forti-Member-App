/**
 * Build OTP MIME, assert Content-ID <forti-logo>, then send a real OTP email.
 * Usage: node scripts/verify-otp-logo-mime.js [toEmail]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const LOGO_CID = 'forti-logo';

async function main() {
  const to = process.argv[2] || 'alinwork1199@gmail.com';
  const logoPath = path.join(__dirname, '../src/assets/brand/logo.png');
  if (!fs.existsSync(logoPath)) {
    console.error('FAIL: logo missing at', logoPath);
    process.exit(1);
  }
  const buf = fs.readFileSync(logoPath);

  const html = [
    '<!DOCTYPE html><html><body>',
    '<div style="background:#6d28d9;padding:24px;text-align:center">',
    '<img src="cid:forti-logo" alt="FORTI" width="220" style="display:block;max-width:220px;height:auto;margin:0 auto;border:0" />',
    '<p style="color:#fff;font-size:18px;margin:14px 0 0">Membership Portal</p>',
    '</div>',
    '<p>Hello <strong>MIME Verify</strong>,</p>',
    '<p>OTP check — MIME structure verification</p>',
    '</body></html>',
  ].join('');

  const preview = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
  const previewInfo = await preview.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject: 'MIME Preview',
    html,
    attachments: [{
      filename: 'logo.png',
      content: buf,
      cid: LOGO_CID,
      contentType: 'image/png',
      contentDisposition: 'inline',
    }],
  });

  const raw = previewInfo.message.toString('utf8');
  const outPath = path.join(__dirname, '../tmp-otp-mime.txt');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, raw);

  const hasCidHeader = /Content-ID:\s*<?forti-logo>?/i.test(raw);
  const hasInline = /Content-Disposition:\s*inline/i.test(raw);
  // quoted-printable may encode as src=3D"cid:forti-logo"
  const hasImgCid = /src(?:=3D|=)["']cid:forti-logo["']/i.test(raw);
  const imgCount = (raw.match(/src(?:=3D|=)["']cid:forti-logo["']/gi) || []).length;
  const pngParts = (raw.match(/Content-Type:\s*image\/png/gi) || []).length;

  console.log('--- MIME checks ---');
  console.log('Content-ID <forti-logo>:', hasCidHeader ? 'OK' : 'MISSING');
  console.log('Content-Disposition inline:', hasInline ? 'OK' : 'MISSING');
  console.log('HTML src=cid:forti-logo:', hasImgCid ? 'OK' : 'MISSING');
  console.log('cid:forti-logo img count:', imgCount, imgCount === 1 ? '(OK single)' : '(expected 1)');
  console.log('image/png parts:', pngParts);
  console.log('logo bytes:', buf.length);
  console.log('raw mime saved:', outPath);

  if (!hasCidHeader || !hasInline || !hasImgCid || imgCount !== 1) {
    console.error('FAIL: MIME structure incorrect');
    process.exit(1);
  }

  const { sendOTP } = require('../src/utils/email');
  await sendOTP({
    to,
    name: 'MIME Verify',
    otp: String(Math.floor(100000 + Math.random() * 900000)),
    purpose: 'apply',
  });
  console.log('SENT production OTP email to', to);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
