// Runs after Jest environment has been set up but before each test file's tests run.
// Register per-test hooks here.

const axios = require('axios');
// Ensure new architecture dirs are referenced so imports resolve during migration
require('./runtime');
require('./lib');

const processError = (e) => {
    if (e.response && e.response.data) {
        const consoleErrorPrint = {
            url: "",
            data: e.response.data,
            stack: e.stack
        }
        if (e.response.config) {
            consoleErrorPrint.url = e.response.config.url
        }
        throw new Error(JSON.stringify(consoleErrorPrint, null, 2));
    }
    throw e;
}

// Global test wrapper: ensures any error thrown inside a test gets formatted
// via processError so failures print useful API response details without
// needing per-test try/catch blocks.
(() => {
  const wrap = (fn) => {
    if (!fn) return fn;
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        // processError throws a formatted Error; rethrow that
        try { processError(e); } catch (formatted) { throw formatted; }
        // Fallback, though we shouldn't get here
        throw e;
      }
    };
  };

  const patch = (name) => {
    const original = global[name];
    if (!original) return;

    const patched = (title, fn, timeout) => original(title, wrap(fn), timeout);
    // Preserve common modifiers
    patched.only = (title, fn, timeout) => original.only(title, wrap(fn), timeout);
    patched.skip = (title, fn, timeout) => original.skip(title, fn, timeout);
    if (typeof original.todo === 'function') patched.todo = original.todo.bind(original);
    if (original.each) {
      patched.each = (...eachArgs) => {
        const eachOrig = original.each(...eachArgs);
        const bound = (title, fn, timeout) => eachOrig(title, wrap(fn), timeout);
        bound.only = (title, fn, timeout) => eachOrig.only(title, wrap(fn), timeout);
        bound.skip = (title, fn, timeout) => eachOrig.skip(title, fn, timeout);
        return bound;
      };
    }
    if (original.concurrent) {
      patched.concurrent = (title, fn, timeout) => original.concurrent(title, wrap(fn), timeout);
      if (original.concurrent.only) patched.concurrent.only = (title, fn, timeout) => original.concurrent.only(title, wrap(fn), timeout);
      if (original.concurrent.skip) patched.concurrent.skip = (title, fn, timeout) => original.concurrent.skip(title, fn, timeout);
    }

    global[name] = patched;
  };

  patch('test');
  patch('it');
})();

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
  // process.stdout.write('🔄 test before each resetting test DB …\n');
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
