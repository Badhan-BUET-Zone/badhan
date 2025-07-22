// cypress/plugins/index.js
/// <reference types="cypress" />

const { execSync } = require('child_process');

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // Fires **once per “cypress run …”** (single spec or glob)
  on('before:run', () => {
    console.log('🔄  Resetting test DB …');
    execSync('cd ../badhan-backend && npm run reset_db', {
      stdio: 'inherit',   // stream the output so you can see errors
    });
  });

  // always return the config object
  return config;
};
