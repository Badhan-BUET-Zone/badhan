// tests/global-teardown.js
// Global teardown: invoke populate route of badhan-backup service.
// This assumes the backup service is running on localhost:4000 as per app.js.
require('dotenv').config();
module.exports = async () => {
  const axios = require('axios');
  const url = process.env.BACKUP_POPULATE_URL || 'http://localhost:4000/populate-local-db';
  try {
    // console.log('[global-teardown] Calling purge route to purge local DB before populate.');
    const purgeUrl = process.env.BACKUP_PURGE_URL || 'http://localhost:4000/purge-local-db';
    const purgeRes = await axios.post(purgeUrl, {}, { timeout: 30000 });
    // console.log(`[global-teardown] Purge route status: ${purgeRes.status}`);
    // console.log(`[global-teardown] Calling populate route: POST ${url}`);
    const res = await axios.post(url, {}, { timeout: 30000 });
    // console.log(`[global-teardown] Populate route status: ${res.status}`);
  } catch (e) {
    console.warn('[global-teardown] Failed to call populate route:', e.message);
  }
};
