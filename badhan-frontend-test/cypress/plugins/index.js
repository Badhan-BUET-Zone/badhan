// cypress/plugins/index.js
/// <reference types="cypress" />
const { execSync } = require('child_process');

module.exports = (on, config) => {
  let didReset = false;

  on('task', {
    resetDbOnce() {
      if (didReset) return 'skipped';
      console.log('🔄  Resetting test DB …');
      execSync('cd ../badhan-backend && npm run reset_db', { stdio: 'inherit' });
      didReset = true;
      return 'done';
    },
  });

  return config;
};