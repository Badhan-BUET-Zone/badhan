module.exports = {
  testEnvironment: 'node',
  globalSetup:    '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js',
  // Run setup file after the test framework is installed in the environment.
  // This file can register global hooks like beforeEach / afterEach.
  setupFilesAfterEnv: ['<rootDir>/tests/setup-after-env.js']
};