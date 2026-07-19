import { defineConfig } from 'cypress';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  viewportHeight: 851,
  viewportWidth: 393,
  retries: 0,
  defaultCommandTimeout: 8000,
  pageLoadTimeout: 60000,
  // Exposed to the app under test via window.Cypress.env('apiBaseURL').
  // The app's environment mixin prefers this over its build-time API base so
  // the in-container browser targets a resolvable backend host (backend:3000)
  // instead of the baked-in localhost:3000.
  env: {
    apiBaseURL: process.env.APP_API_BASE_URL || '',
  },
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:8080',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    setupNodeEvents(on, config) {
      // Simple sanitizer for filenames
      const sanitize = (str: string) =>
        str
          .replace(/[\n\r]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/[^a-zA-Z0-9._-]+/g, '_')
          .slice(0, 120);

      const logsRoot = path.join(process.cwd(), 'logs');
      const successDir = path.join(logsRoot, 'success');
      const errorDir = path.join(logsRoot, 'error');

      let testCounter = 0;

      on('before:run', () => {
        // Reset logs directory at the start of every execution
        try {
          if (fs.existsSync(logsRoot)) {
            fs.rmSync(logsRoot, { recursive: true, force: true });
          }
          fs.mkdirSync(successDir, { recursive: true });
          fs.mkdirSync(errorDir, { recursive: true });
        } catch (err) {
          console.error('Failed to reset logs directory:', err);
          throw err;
        }
      });

      on('after:spec', (spec, results) => {
        try {
          if (!results || !results.tests) return;
          // Ensure directories exist (in case running in open mode or external deletion)
          [logsRoot, successDir, errorDir].forEach((d) => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
          });

          const relativeSpecPath = spec.relative || spec.name || 'unknown-spec';

          results.tests.forEach((t) => {
            const idx = String(++testCounter).padStart(3, '0');
            const title = Array.isArray(t.title) ? t.title.join(' ') : String(t.title);
            const baseName = `${idx}-${sanitize(relativeSpecPath)}_${sanitize(title)}`;

            if (t.state === 'passed') {
              const filePath = path.join(successDir, `${baseName}_success.txt`);
              const content = [
                `TEST: ${title}`,
                `FILE: ${relativeSpecPath}`,
                `STATUS: SUCCESS`,
                `DURATION_MS: ${t.displayDuration ?? t.duration ?? ''}`,
                ''
              ].join('\n');
              fs.writeFileSync(filePath, content, 'utf8');
            } else if (t.state === 'failed') {
              const firstAttempt = (t.attempts && t.attempts[0]) ? t.attempts[0] : undefined;
              const errorMessage = firstAttempt?.error?.message || t.displayError || '';
              const failureTag = sanitize((errorMessage.split(/\n/)[0] || 'failure')).slice(0, 60) || 'failure';
              const filePath = path.join(errorDir, `${baseName}_${failureTag}.txt`);
              const content = [
                `TEST: ${title}`,
                `FILE: ${relativeSpecPath}`,
                `STATUS: FAILURE`,
                `DURATION_MS: ${t.displayDuration ?? t.duration ?? ''}`,
                '--- FAILURE MESSAGE ---',
                String(errorMessage),
                ''
              ].join('\n');
              fs.writeFileSync(filePath, content, 'utf8');
            }
          });
        } catch (err) {
          console.error('Failed writing spec results to logs:', err);
        }
      });

      on('before:spec', async () => {
        const apiBase = process.env.API_BASE_URL || 'http://localhost:4000';
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


