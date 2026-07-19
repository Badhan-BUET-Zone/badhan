// Runs after Jest environment has been set up but before each test file's tests run.
// Register per-test hooks here.

const axios = require('axios');
// Ensure new architecture dirs are referenced so imports resolve during migration
require('./runtime');
require('./lib');
const { resetBaseURL } = require('./runtime/axios');

const processError = (e) => {
  if (e.response && e.response.data) {
    const consoleErrorPrint = {
      url: '',
      data: e.response.data,
      stack: e.stack,
    };
    if (e.response.config) {
      consoleErrorPrint.url = e.response.config.url;
    }
    throw new Error(JSON.stringify(consoleErrorPrint, null, 2));
  }
  throw e;
};

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
        return processError(e);
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
      if (original.concurrent.only)
        patched.concurrent.only = (title, fn, timeout) =>
          original.concurrent.only(title, wrap(fn), timeout);
      if (original.concurrent.skip)
        patched.concurrent.skip = (title, fn, timeout) =>
          original.concurrent.skip(title, fn, timeout);
    }

    global[name] = patched;
  };

  patch('test');
  patch('it');
})();

// The backup service exposes a purge endpoint that runs the DB purge script.
// You can override the URL via the BACKUP_PURGE_URL environment variable.
const PURGE_URL = process.env.BACKUP_PURGE_URL || 'http://localhost:4000/purge-local-db';

// Skip purge when --no-purge CLI flag or NO_PURGE env var is set.
const NO_PURGE =
  process.argv.includes('--no-purge') ||
  process.env.NO_PURGE === '1' ||
  process.env.NO_PURGE === 'true';

// Example: clear all mocks before each test, reset modules, and call purge endpoint.
beforeEach(async () => {
  // Clear Jest mocks
  if (typeof jest !== 'undefined' && jest.clearAllMocks) {
    jest.clearAllMocks();
    jest.resetModules();
  }
  // Reset axios baseURL to avoid leaking '/guest' across tests
  try {
    resetBaseURL();
  } catch (_) {
    // Silently ignore - resetBaseURL failure is not critical
  }
  if (NO_PURGE) {
    // Skipping purge per request
    process.stdout.write('🔕  Skipping test DB purge (before each) due to --no-purge / NO_PURGE\n');

    return;
  }

  // Call the backup service to purge the local test database before each individual test.
  try {
    // POST without payload; configure a reasonable timeout.
    // process.stdout.write('🔄 test before each purging test DB …\n');
    await axios.post(PURGE_URL, {}, { timeout: 60000 });
    // Optionally set a global marker for debugging
    // global.__TEST_DB_PURGE_AT__ = Date.now();
  } catch (err) {
    console.error(
      `Failed to purge test DB via ${PURGE_URL}:`,
      err && err.message ? err.message : err
    );
    // Throw so the test run fails fast and it's obvious why.
    throw err;
  }
});

// Optional: afterEach hook for cleanup
afterEach(() => {
  // Example cleanup placeholder
  // delete global.__TEST_DB_PURGE_AT__;
});
