import { defineConfig } from 'cypress';
import axios from 'axios';

export default defineConfig({
  viewportHeight: 851,
  viewportWidth: 393,
  e2e: {
    baseUrl: 'http://localhost:8080',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    setupNodeEvents(on, config) {
      on('before:spec', async () => {
        const apiBase = 'http://localhost:4000';
        try {
          await axios.post(`${apiBase}/reset-local-db`);
          await axios.post(`${apiBase}/populate-local-db`);
        } catch (error) {
          // Surface the error to fail fast if local DB prep fails
          console.error('Failed to prepare local DB before spec run:', error);
          throw error;
        }
      });
      // If env var is set by start script, force devtools to open in headed mode
      if (config.env.openDevTools) {
        on('before:browser:launch', (browser: Cypress.Browser, launchOptions) => {
          if (browser.name === 'chrome' || browser.family === 'chromium') {
            launchOptions.args.push('--auto-open-devtools-for-tabs')
          }
          if (browser.name === 'electron') {
            launchOptions.preferences.devTools = true
          }
          return launchOptions
        })
      }
      return config
    },
  },
});


