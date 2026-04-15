const axios = require('axios');

/**
 * Send OTP via SMS using Fast2SMS (India)
 * Sign up free at https://www.fast2sms.com — get API key from Dashboard > Dev API
 */
async function sendSMS({ phone, otp, name }) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.log('[SMS] FAST2SMS_API_KEY not set — skipping SMS send');
    return { skipped: true };
  }

  // Clean phone: remove +91, spaces, dashes — keep 10 digits
  const cleaned = String(phone).replace(/\D/g, '').replace(/^91/, '').slice(-10);
  if (cleaned.length !== 10) {
    console.warn('[SMS] Invalid phone number:', phone);
    return { skipped: true };
  }

  try {
    const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
      params: {
        authorization: apiKey,
        variables_values: otp,
        route: 'otp',
        numbers: cleaned,
      },
      headers: { 'cache-control': 'no-cache' },
      timeout: 10000,
    });

    if (response.data?.return === true) {
      console.log(`[SMS] OTP sent to ${cleaned}`);
      return { sent: true };
    } else {
      console.error('[SMS] Fast2SMS error:', JSON.stringify(response.data));
      return { sent: false, error: JSON.stringify(response.data) };
    }
  } catch (err) {
    console.error('[SMS] Failed:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendSMS };
