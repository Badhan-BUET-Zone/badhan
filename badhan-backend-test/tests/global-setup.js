// tests/global-setup.js
const { execSync } = require('child_process');
// OR: import your clearDatabase() function directly
// const clearDatabase = require('../src/db/test/clearDatabase');

module.exports = async () => {
  console.log('🔄  Resetting test DB …');
  execSync('cd ../badhan-backend && npm run reset_db', { stdio: 'inherit' });   // blocks until finished
  // await clearDatabase();                             // if you prefer JS instead of shell
};
