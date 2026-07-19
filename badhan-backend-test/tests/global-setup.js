// tests/global-setup.js
require('dotenv').config();
const axios = require('axios');

// The backup service purge endpoint. Override with BACKUP_PURGE_URL if needed.
const PURGE_URL = process.env.BACKUP_PURGE_URL || 'http://localhost:4000/purge-local-db';

// Skip purge if the flag is passed on the CLI or environment variable is set.
const NO_PURGE =
  process.argv.includes('--no-purge') ||
  process.env.NO_PURGE === '1' ||
  process.env.NO_PURGE === 'true';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async () => {
  if (NO_PURGE) {
    // Skipping initial purge per request
    return;
  }

  const maxAttempts = 3;
  const baseDelayMs = 1000; // 1s, will backoff linearly

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await axios.post(PURGE_URL, {}, { timeout: 60000 });
      return; // success
    } catch (e) {
      const last = attempt === maxAttempts;
      const message = `[global-setup] Purge attempt ${attempt}/${maxAttempts} failed: ${e && e.message ? e.message : e}`;
      if (last) {
        console.warn(`${message} — continuing without initial purge.`);
        return; // do not throw; let per-test purges handle it
      }
      // Backoff before retrying
      await sleep(baseDelayMs * attempt);
    }
  }
};
