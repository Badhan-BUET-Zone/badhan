"use strict";

// The single branch → environment → deploy-target map.
//
// This ecosystem has exactly three environments — `production`, `development`
// and `local` — and before this module existed it had nine names for them,
// spread across two deploy scripts that each inferred their target from the git
// branch with an `if` on one literal and a fallthrough. The two copies agreed by
// habit; nothing made them.
//
// Only the host-side deploy orchestration (deploy.js and the three upload
// scripts) needs the branch → environment edge. The apps themselves already
// learn their environment from NODE_ENV / VUE_APP_ENVIRONMENT and must not
// import this file: nothing here is bundled, and a build step that shipped it
// would be a second source of truth again.
//
// Standard library only, CommonJS, like the scripts that require it — there are
// no node_modules on the host and there must be none. See the exceptions list
// in CLAUDE.md.

// `local` is deliberately absent. It is not a deploy target — it has no GCP
// project, no App Engine config and no Firebase site — and listing it here would
// invite a caller to try to deploy to it. The apps know about `local`; the
// deploy path does not.
const ENVIRONMENTS = {
  production: {
    name: "production",
    branch: "production",
    gcpProject: "badhan-buet",
    appEngineConfig: "app.production.yaml",
    backendEnvFile: "env.production",
    backendBaseUrl: "https://badhan-buet.uc.r.appspot.com",
    firebaseProject: "badhan-buet",
    firebaseConfig: "firebase.production.json",
    frontendBaseUrl: "https://badhan-buet.web.app",
    frontendBuildScript: "build:production",
  },
  development: {
    name: "development",
    branch: "development",
    gcpProject: "badhan-buet-test",
    appEngineConfig: "app.development.yaml",
    backendEnvFile: "env.development",
    backendBaseUrl: "https://badhan-buet-test.uc.r.appspot.com",
    firebaseProject: "badhan-buet-test",
    firebaseConfig: "firebase.development.json",
    // The hosting *site* is `badhan-buet-test-46eca` (see
    // firebase.development.json) — a Firebase-generated identifier, not a fourth
    // spelling of "development" that we are free to change.
    frontendBaseUrl: "https://badhan-buet-test-46eca.web.app",
    frontendBuildScript: "build:development",
  },
};

// Branch name === environment name, by design: the rename that introduced this
// module made the branch the environment rather than a thing that maps to one.
const DEPLOYABLE_BRANCHES = Object.values(ENVIRONMENTS).map((e) => e.branch);

// Resolve the environment a branch deploys to.
//
// Throws for anything unlisted rather than defaulting. The old behaviour was a
// fallthrough: every branch that was not `main` — a feature branch, a branch
// created five minutes ago — silently deployed to the shared test environment
// after running both test suites, without a word about it. Two branches, two
// targets, no third path; previewing a feature branch means merging it to
// `development` first.
//
// The message is pre-indented to line up under the `   • ` bullet that both
// preflight reports print it with.
function environmentForBranch(branch) {
  const environment = ENVIRONMENTS[branch];
  if (!environment || environment.branch !== branch) {
    throw new Error(
      `branch "${branch}" has no deploy target.\n` +
        `     Deployable branches: ${DEPLOYABLE_BRANCHES.join(", ")}.`
    );
  }
  return environment;
}

module.exports = { ENVIRONMENTS, DEPLOYABLE_BRANCHES, environmentForBranch };
