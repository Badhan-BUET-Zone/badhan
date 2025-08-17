// Runs after Jest environment has been set up but before each test file's tests run.
// Register per-test hooks here.

const axios = require('axios');

// The backup service exposes a reset endpoint that runs the DB reset script.
// You can override the URL via the BACKUP_RESET_URL environment variable.
const RESET_URL = process.env.BACKUP_RESET_URL || 'http://localhost:4000/reset-local-db';

// Skip reset when --no-reset CLI flag or NO_RESET env var is set.
const NO_RESET = process.argv.includes('--no-reset') || process.env.NO_RESET === '1' || process.env.NO_RESET === 'true';

// Example: clear all mocks before each test, reset modules, and call reset endpoint.
beforeEach(async () => {
  // Clear Jest mocks
  if (typeof jest !== 'undefined' && jest.clearAllMocks) {
    jest.clearAllMocks();
    jest.resetModules();
  }
  if (NO_RESET) {
    // Skipping reset per request
    process.stdout.write('🔕  Skipping test DB reset (before each) due to --no-reset / NO_RESET\n');

    return;
  }

  // Call the backup service to reset the local test database before each individual test.
  try {
  // POST without payload; configure a reasonable timeout.
  process.stdout.write('🔄 test before each resetting test DB …\n');
    await axios.post(RESET_URL, {}, { timeout: 60000 });
    // Optionally set a global marker for debugging
    // global.__TEST_DB_RESET_AT__ = Date.now();
  } catch (err) {
    console.error(`Failed to reset test DB via ${RESET_URL}:`, err && err.message ? err.message : err);
    // Throw so the test run fails fast and it's obvious why.
    throw err;
  }
});

// Optional: afterEach hook for cleanup
afterEach(() => {
  // Example cleanup placeholder
  // delete global.__TEST_DB_RESET_AT__;
});
