// tests/global-setup.js
const { execSync } = require('child_process');
const axios = require('axios');
// OR: import your clearDatabase() function directly
// const clearDatabase = require('../src/db/test/clearDatabase');

// The backup service reset endpoint. Override with BACKUP_RESET_URL if needed.
const RESET_URL = process.env.BACKUP_RESET_URL || 'http://localhost:4000/reset-local-db';

// Skip reset if the flag is passed on the CLI or environment variable is set.
const NO_RESET = process.argv.includes('--no-reset') || process.env.NO_RESET === '1' || process.env.NO_RESET === 'true';

module.exports = async () => {
  if (NO_RESET) {
    console.log('🔕  Skipping test DB reset (global setup) due to --no-reset / NO_RESET');
    return;
  }

  console.log('🔄 global setup resetting test DB …');

  // Try resetting via HTTP first. If it fails, fall back to the local npm script.
  try {
    await axios.post(RESET_URL, {}, { timeout: 120000 });
    // console.log(`Reset via HTTP succeeded: ${RESET_URL}`);
    return;
  } catch (err) {
    console.warn(`Reset via HTTP failed (${RESET_URL}):`, err && err.message ? err.message : err);
    console.log('Falling back to running local reset script...');
  }

  // Fallback to existing shell-based reset (blocking).
  execSync('cd ../badhan-backend && npm run reset_db:local', { stdio: 'inherit' });   // blocks until finished
  // await clearDatabase();                             // if you prefer JS instead of shell
};
