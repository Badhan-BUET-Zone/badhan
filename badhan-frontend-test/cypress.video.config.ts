import baseConfig from './cypress.config';

// The ordinary suite with video recording switched on, for `npm run cypress:video`.
//
// It needs its own config file rather than `cypress run --config video=true`: the base config
// sets `video: false` inside `e2e`, and a testing-type value beats anything --config puts at the
// root, so the flag is silently ignored. Everything else — specPattern, the DB reset hook, the
// per-test log files — is inherited unchanged.
export default {
  ...baseConfig,
  e2e: {
    ...baseConfig.e2e,
    video: true,
  },
};
