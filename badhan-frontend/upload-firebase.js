#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { existsSync } = require("fs");
const { resolve } = require("path");

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

// The build runs INSIDE the frontend container, not on the host.
//
// The host is only in this script because `firebase deploy` needs the host's CLI
// credentials. Building is a different job with a different requirement — it needs
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
// hosting config). Shared by the preflight checks and the actual deploy.
function getDeployTarget(currentBranch) {
  if (currentBranch === "main") {
    return { buildCmd: containerBuildCommand("build"), project: "badhan-buet" };
  }
  return { buildCmd: containerBuildCommand("build:development"), project: "badhan-buet-test" };
}

// docker compose has to be invoked from the repo root, where docker-compose.yml is.
const REPO_ROOT = resolve(__dirname, "..");

function dockerAvailable() {
  try {
    // `docker info` talks to the daemon, so this fails when Docker Desktop is
    // installed but not running — which is the common case, and which a plain
    // `docker --version` would happily pass.
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
}

// firebase-tools is expected to be installed GLOBALLY (npm install -g
// firebase-tools), not as a repo dependency: deploy runs on the host, and a
// local install would be masked by the container's anonymous node_modules
// volume and would bloat every `npm ci` image build. So we look for `firebase`
// on PATH rather than in node_modules.
function firebaseAvailable() {
  try {
    execSync("firebase --version", { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
}

const FIREBASE_INSTALL_HINT = "Install it globally with `npm install -g firebase-tools`.";

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

  const { project } = getDeployTarget(currentBranch);
  const configFile = `firebase.${project}.json`;

  if (!existsSync(resolve(baseDir, configFile))) {
    errors.push(`frontend: required Firebase config "${configFile}" not found (needed for project ${project}).`);
  }

  // The build runs in a container now, so Docker is as much a deploy requirement as
  // the Firebase CLI is. Caught here rather than three minutes into the deploy.
  if (!dockerAvailable()) {
    errors.push(
      "frontend: Docker is not available (the frontend build runs in the frontend container). " +
        "Start Docker Desktop and try again."
    );
  }

  if (!firebaseAvailable()) {
    errors.push(`frontend: firebase-tools not found on PATH. ${FIREBASE_INSTALL_HINT}`);
  } else {
    // `firebase login:list` only reads the stored token; it can't tell whether
    // that token still works. `projects:list` actually calls the Firebase API,
    // so a revoked/expired credential fails here the same way a deploy would.
    try {
      execSync("firebase projects:list", { stdio: "ignore" });
    } catch (_) {
      errors.push(
        "frontend: firebase credentials are missing or expired (API call failed). " +
          "Run `firebase login --reauth` (plain `firebase login` reports 'Already logged in' and won't refresh an expired token)."
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

  const { buildCmd, project: firebaseProject } = getDeployTarget(currentBranch);

  console.log(`🔨  Running build command: ${buildCmd}`);
  // From the repo root: that is where docker-compose.yml lives. The build still writes
  // dist into badhan-frontend, because the container bind-mounts it.
  run(buildCmd, REPO_ROOT);

  console.log(`🚀  Deploying to Firebase project '${firebaseProject}'…`);
  const configFile = `firebase.${firebaseProject}.json`;

  run(
    `firebase deploy --only hosting --project "${firebaseProject}" --config "${configFile}"`,
    baseDir
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
