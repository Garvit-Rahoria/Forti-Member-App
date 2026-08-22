/**
 * One-off: send OTP-style email with CID-embedded logo.png
 * Usage: node scripts/send-logo-test.js [toEmail]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sendOTP } = require('../src/utils/email');

async function main() {
  const to = process.argv[2] || 'alinwork1199@gmail.com';
  await sendOTP({
    to,
    name: 'Logo Test',
    otp: String(Math.floor(100000 + Math.random() * 900000)),
    purpose: 'apply',
  });
  console.log('Sent OTP via production sendOTP() to', to);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
