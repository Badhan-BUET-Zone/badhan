import baseConfig from './cypress.config';

// Documentation screenshots, kept out of the automated suite.
//
// The specs under cypress/docs-screenshots/ are not tests — they drive the app to a particular
// state and photograph it for the guides in docs/blog/. They live outside cypress/e2e/, so the
// ordinary suite's specPattern (`cypress/e2e/**/*.cy.ts`) never picks them up and `./deploy` never
// runs them. This config is the only way to run them.
//
// Everything else is inherited, including the before:spec hook that purges and repopulates the
// local database — the screenshots need seeded donors exactly as the real specs do.
export default {
  ...baseConfig,
  e2e: {
    ...baseConfig.e2e,
    specPattern: 'cypress/docs-screenshots/**/*.cy.ts',
  },
};
