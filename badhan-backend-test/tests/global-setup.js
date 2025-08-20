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

};
