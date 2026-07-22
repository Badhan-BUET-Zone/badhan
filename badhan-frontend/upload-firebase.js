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

// Resolve the branch-dependent deploy target (build command, Firebase project,
// hosting config). Shared by the preflight checks and the actual deploy.
function getDeployTarget(currentBranch) {
  if (currentBranch === "main") {
    return { buildCmd: "npm run build", project: "badhan-buet" };
  }
  return { buildCmd: "npm run build:development", project: "badhan-buet-test" };
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
  const baseDir = __dirname; // ensure all commands run in badhan-frontend directory

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
  run(buildCmd, baseDir);

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
