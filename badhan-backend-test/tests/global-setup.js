// tests/global-setup.js
require('dotenv').config();
const axios = require('axios');

// The backup service reset endpoint. Override with BACKUP_RESET_URL if needed.
const RESET_URL = process.env.BACKUP_RESET_URL || 'http://localhost:4000/reset-local-db';

// Skip reset if the flag is passed on the CLI or environment variable is set.
const NO_RESET =
  process.argv.includes('--no-reset') ||
  process.env.NO_RESET === '1' ||
  process.env.NO_RESET === 'true';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async () => {
  if (NO_RESET) {
    // Skipping initial reset per request
    return;
  }

  const maxAttempts = 3;
  const baseDelayMs = 1000; // 1s, will backoff linearly

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await axios.post(RESET_URL, {}, { timeout: 60000 });
      return; // success
    } catch (e) {
      const last = attempt === maxAttempts;
      const message = `[global-setup] Reset attempt ${attempt}/${maxAttempts} failed: ${e && e.message ? e.message : e}`;
      if (last) {
        console.warn(`${message} — continuing without initial reset.`);
        return; // do not throw; let per-test resets handle it
      }
      // Backoff before retrying
      await sleep(baseDelayMs * attempt);
    }
  }
};
