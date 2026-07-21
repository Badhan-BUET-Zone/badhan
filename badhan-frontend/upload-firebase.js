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

function firebaseAvailable() {
  try {
    execSync("npx --no-install firebase --version", { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
}

function ensureFirebaseToolsInstalled(baseDir) {
  if (!firebaseAvailable()) {
    console.log("ℹ️  firebase-tools not found in node_modules. Installing as dev dependency…");
    run("npm install --save-dev firebase-tools", baseDir);
  }
}

// Side-effect-free preflight: validate everything the frontend deploy needs
// WITHOUT building, installing, or deploying. Returns an array of
// human-readable error strings (empty === ready to deploy). Note: firebase-tools
// is auto-installed at deploy time, so its absence here is not fatal; a
// missing/unauthenticated login is what actually blocks deploy.
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

  // Only assert auth if firebase-tools is already available; if it isn't, it
  // will be installed at deploy time and the user can auth then.
  if (firebaseAvailable()) {
    try {
      const out = execSync("npx --no-install firebase login:list", { encoding: "utf8" });
      if (/No authorized accounts/i.test(out)) {
        errors.push("frontend: firebase-tools has no logged-in account (run `firebase login`).");
      }
    } catch (_) {
      errors.push("frontend: unable to verify firebase login (run `firebase login`).");
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

  ensureFirebaseToolsInstalled(baseDir);

  console.log(`🔨  Running build command: ${buildCmd}`);
  run(buildCmd, baseDir);

  console.log(`🚀  Deploying to Firebase project '${firebaseProject}'…`);
  const configFile = `firebase.${firebaseProject}.json`;

  run(
    `npx --no-install firebase deploy --only hosting --project "${firebaseProject}" --config "${configFile}"`,
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
