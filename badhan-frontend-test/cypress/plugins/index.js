// cypress/plugins/index.js
/// <reference types="cypress" />

const axios = require('axios');

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // Provide Node tasks to reset and populate DB via backup service
  on('task', {
    async resetDb() {
      const url = process.env.BACKUP_RESET_URL || 'http://localhost:4000/reset-local-db';
      try {
        await axios.post(url, {}, { timeout: 60000 });
        return true;
      } catch (e) {
        console.error('[plugin] resetDb failed:', e && e.message ? e.message : e);
        throw e;
      }
    },
    async populateDb() {
      const url = process.env.BACKUP_POPULATE_URL || 'http://localhost:4000/populate-local-db';
      try {
        await axios.post(url, {}, { timeout: 60000 });
        return true;
      } catch (e) {
        console.error('[plugin] populateDb failed:', e && e.message ? e.message : e);
        throw e;
      }
    },
  });

  return config;
};
