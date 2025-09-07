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
      // Conditionally open DevTools only when requested and avoid unsupported Electron args
      on('before:browser:launch', (browser: Cypress.Browser, launchOptions) => {
        const shouldOpenDevTools = Boolean((config as any).env?.openDevTools);

        if (browser.name === 'chrome' || browser.family === 'chromium' || browser.name === 'edge') {
          if (shouldOpenDevTools) {
            launchOptions.args.push('--auto-open-devtools-for-tabs')
          }
        }

        if (browser.name === 'electron') {
          // Electron does not support args; remove to prevent warnings
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (launchOptions as any).args;
          if (shouldOpenDevTools) {
            launchOptions.preferences = {
              ...launchOptions.preferences,
              devTools: true,
            }
          }
        }

        if (browser.name === 'firefox') {
          if (shouldOpenDevTools) {
            launchOptions.args.push('-devtools')
            launchOptions.preferences = {
              ...launchOptions.preferences,
              'devtools.toolbox.selectedTool': 'webconsole',
            }
          }
        }
        return launchOptions
      })
      return config
    },
  },
});


