#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { existsSync } = require("fs");
const { resolve } = require("path");
const { runCli, captureCli, dockerAvailable, REPO_ROOT } = require("../deploy-container");
const { environmentForBranch } = require("../environments");

function run(command, cwd) {
  return execSync(command, { stdio: "inherit", cwd });
}

function getCurrentBranch() {
  try {
    return execSync("git symbolic-ref --short HEAD", { encoding: "utf8" }).trim();
  } catch (e) {
    return "";
  }
}

// The build runs INSIDE the frontend container, and the deploy inside the deploy
// container. This script stays on the host only to orchestrate the two: it shells
// out to `docker compose`, which a container has no socket to do.
//
// The build is a different job from the deploy, in a different container: it needs
// this project's node_modules, which live in the container's anonymous
// /app/node_modules volume and are deliberately never installed on the host (see
// docker-compose.yml). Running the build on the host meant keeping a second, hand-
// maintained install in sync with package.json, and it failed exactly where it hurts
// most: at deploy time, the first time a dependency was added.
//
// `run --rm --no-deps` uses a throwaway container rather than a long-lived dev one,
// so the artifact never depends on whatever state someone's `docker compose up`
// happens to be in, and `--no-deps` keeps mongo and the backend out of it — a build
// needs neither. `npm ci` runs first because a fresh container's node_modules volume
// is seeded from the image, which goes stale the moment package.json changes; `ci`
// installs exactly what package-lock.json pins, so the deployed bundle is built from
// the committed lock file every time.
//
// ./badhan-frontend is bind-mounted into the container, so `dist` is written straight
// to the host, where `firebase deploy` picks it up unchanged.
function containerBuildCommand(npmScript) {
  return `docker compose run --rm --no-deps frontend sh -c "npm ci && npm run ${npmScript}"`;
}

// Resolve the branch-dependent deploy target (build command, Firebase project,
// hosting config) from ../environments.js — the one place the branch → target
// map lives, shared with the backend's upload-gcloud.js so the two can no longer
// drift.
//
// `configFile` comes off the environment rather than being interpolated from the
// project id, which is what used to tie the hosting config's *file name* to a
// cloud project id and made the environment the one thing the name did not say.
//
// Throws for a branch with no deploy target; checkRequirements turns that into a
// preflight bullet.
function getDeployTarget(currentBranch) {
  const environment = environmentForBranch(currentBranch);
  return {
    buildCmd: containerBuildCommand(environment.frontendBuildScript),
    project: environment.firebaseProject,
    configFile: environment.firebaseConfig,
  };
}

// Every firebase call goes to the `frontend-deploy` service — the `deploy`
// target of this directory's Dockerfile, i.e. this app's own image plus the CLI
// that deploys it. Spread into each call rather than hidden in a default, so a
// misrouted command fails in deploy-container.js instead of in a container that
// has no firebase.
const FIREBASE = { service: "frontend-deploy" };

// firebase-tools is installed globally in that stage, not in package.json and
// not on the host: it is a deploy tool rather than a dependency of this app, a
// local install would be masked by the frontend service's anonymous
// node_modules volume, and putting it in package.json would bloat every
// `npm ci`. See ../deploy-container.js.
function firebaseAvailable() {
  return captureCli("firebase --version", FIREBASE).length > 0;
}

const FIREBASE_INSTALL_HINT =
  "Rebuild it with `docker compose --profile deploy build frontend-deploy`.";

// The account the container is logged in as, for readable failures.
function firebaseActiveAccount() {
  const out = captureCli("firebase login:list", FIREBASE);
  const match = out.match(/[\w.+-]+@[\w.-]+/);
  return match ? match[0] : "unknown";
}

// Match a project id as a whole token: a plain `includes("badhan-buet")` is
// satisfied by "badhan-buet-test", which would pass the production check on an
// account that can only see the test project.
function listsProject(output, project) {
  return new RegExp(`(?:^|[^\\w-])${project}(?![\\w-])`).test(output);
}

// Side-effect-free preflight: validate everything the frontend deploy needs
// WITHOUT building, installing, or deploying. Returns an array of
// human-readable error strings (empty === ready to deploy). Never installs
// anything: if firebase-tools is missing it reports the install command for
// the user to run rather than fetching it here.
function checkRequirements(baseDir = __dirname) {
  const errors = [];

  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    errors.push("frontend: unable to determine current git branch (is git installed and this a repo?).");
    return errors;
  }

  // An unlisted branch is a preflight failure, not an exception. Nothing below
  // can be checked without a target, so report and stop.
  let project;
  let configFile;
  try {
    ({ project, configFile } = getDeployTarget(currentBranch));
  } catch (err) {
    errors.push(`frontend: ${err.message}`);
    return errors;
  }

  if (!existsSync(resolve(baseDir, configFile))) {
    errors.push(`frontend: required Firebase config "${configFile}" not found (needed for project ${project}).`);
  }

  // Both the build and the Firebase CLI run in containers, so Docker is the
  // first deploy requirement. Caught here rather than three minutes in.
  if (!dockerAvailable()) {
    errors.push(
      "frontend: Docker is not available (the build runs in the frontend container, " +
        "the Firebase CLI in the frontend-deploy container). Start Docker Desktop and try again."
    );
  } else if (!firebaseAvailable()) {
    errors.push(`frontend: firebase-tools not available in the frontend-deploy container. ${FIREBASE_INSTALL_HINT}`);
  } else {
    // `firebase login:list` only reads the stored token; it can't tell whether
    // that token still works. `projects:list` actually calls the Firebase API,
    // so a revoked/expired credential fails here the same way a deploy would.
    // Its output is kept rather than discarded, because it also answers the
    // question a token refresh cannot: can THIS account see the project this
    // branch deploys to?
    const projects = captureCli("firebase projects:list", FIREBASE);
    if (!projects) {
      errors.push(
        "frontend: firebase credentials are missing or expired (API call failed). " +
          "Run `./deploy.js --relogin` (plain `firebase login` reports 'Already logged in' and won't refresh an expired token)."
      );
    } else if (!listsProject(projects, project)) {
      errors.push(
        `frontend: logged in as ${firebaseActiveAccount()}, which cannot see Firebase project "${project}" ` +
          `(branch "${currentBranch}"). Run \`./deploy.js --relogin\` and pick an account with access.`
      );
    }
  }

  return errors;
}

function deployToFirebase() {
  // The firebase deploy runs from badhan-frontend, where the hosting configs and the
  // built dist live. The build is the exception — it runs from REPO_ROOT, in a
  // container. See containerBuildCommand.
  const baseDir = __dirname;

  // Re-run preflight so a direct invocation is still guarded.
  const errors = checkRequirements(baseDir);
  if (errors.length > 0) {
    console.error("🛑  Deploy halted. Unmet requirements:");
    for (const e of errors) console.error(`   • ${e}`);
    process.exit(1);
  }

  const currentBranch = getCurrentBranch();
  console.log(`🔍  Current branch: ${currentBranch}`);

  const { buildCmd, project: firebaseProject, configFile } = getDeployTarget(currentBranch);

  console.log(`🔨  Running build command: ${buildCmd}`);
  // From the repo root: that is where docker-compose.yml lives. The build still writes
  // dist into badhan-frontend, because the container bind-mounts it.
  run(buildCmd, REPO_ROOT);

  console.log(`🚀  Deploying to Firebase project '${firebaseProject}'…`);

  // Runs in the frontend-deploy container, whose /repo/badhan-frontend is this
  // directory (a plain bind mount, no node_modules volume over it) — including
  // the dist the frontend container just built.
  runCli(
    `firebase deploy --only hosting --project "${firebaseProject}" --config "${configFile}"`,
    { ...FIREBASE, workdir: "/repo/badhan-frontend" }
  );

  console.log("✅  Deployment complete.");
  return true;
}

// Export the functions for use in other files (e.g. the deploy preflight).
module.exports = { deployToFirebase, checkRequirements, getDeployTarget };

// Run when executed directly. `--check` runs only the preflight (no build /
// deploy) and exits non-zero if any requirement is unmet.
if (require.main === module) {
  if (process.argv.includes("--check")) {
    const errors = checkRequirements();
    if (errors.length > 0) {
      console.error("❌  Frontend deployment requirements not met:");
      for (const e of errors) console.error(`   • ${e}`);
      process.exit(1);
    }
    console.log("✅  Frontend deployment requirements OK.");
  } else {
    try {
      deployToFirebase();
    } catch (err) {
      if (err && typeof err.status === "number") {
        process.exit(err.status || 1);
      }
      console.error(err);
      process.exit(1);
    }
  }
}
