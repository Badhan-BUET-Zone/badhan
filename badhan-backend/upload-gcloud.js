#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { existsSync, writeFileSync } = require("fs");
const { resolve } = require("path");

function run(command, cwd) {
  return execSync(command, { stdio: "inherit", cwd });
}

function getCurrentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
}

// Resolve the branch-dependent deploy target (env file, App Engine config,
// GCP project). Shared by both the preflight checks and the actual deploy so
// the two can never drift.
function getDeployTarget(currentBranch) {
  if (currentBranch === "main") {
    return { envFile: ".env.production", yaml: "app_prod.yaml", project: "badhan-buet" };
  }
  return { envFile: ".env.development", yaml: "app_dev.yaml", project: "badhan-buet-test" };
}

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
}

function gcloudHasActiveAccount() {
  try {
    const out = execSync(
      'gcloud auth list --filter=status:ACTIVE --format="value(account)"',
      { encoding: "utf8" }
    );
    return out.trim().length > 0;
  } catch (_) {
    return false;
  }
}

// Side-effect-free preflight: validate everything the backend deploy needs
// WITHOUT deploying or touching the filesystem. Returns an array of
// human-readable error strings (empty === ready to deploy). Safe to call
// before the lengthy test suite so we fail fast on missing prerequisites.
function checkRequirements(baseDir = __dirname) {
  const errors = [];

  let currentBranch;
  try {
    currentBranch = getCurrentBranch();
  } catch (_) {
    errors.push("backend: unable to determine current git branch (is git installed and this a repo?).");
    return errors;
  }

  const { envFile, yaml, project } = getDeployTarget(currentBranch);

  if (!existsSync(resolve(baseDir, envFile))) {
    errors.push(`backend: required env file "${envFile}" not found (needed for project ${project}).`);
  }
  if (!existsSync(resolve(baseDir, yaml))) {
    errors.push(`backend: required App Engine config "${yaml}" not found.`);
  }
  if (!commandExists("gcloud")) {
    errors.push("backend: gcloud CLI not found on PATH.");
  } else if (!gcloudHasActiveAccount()) {
    errors.push("backend: gcloud has no active account (run `gcloud auth login`).");
  }

  return errors;
}

function updateLastDeployed(baseDir) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const formatted = formatter.format(now).replace(",", "");
  writeFileSync(resolve(baseDir, "last_deployed.txt"), `${formatted}\n`, {
    encoding: "utf8",
  });
}

function deployToGoogleCloud() {
  try {
    const baseDir = __dirname; // Ensure paths resolve to badhan-backend directory

    // Re-run preflight at deploy time so a direct invocation is still guarded.
    const errors = checkRequirements(baseDir);
    if (errors.length > 0) {
      console.error("🛑  Deploy halted. Unmet requirements:");
      for (const e of errors) console.error(`   • ${e}`);
      process.exit(1);
    }

    const currentBranch = getCurrentBranch();
    const { yaml, project } = getDeployTarget(currentBranch);
    updateLastDeployed(baseDir);
    run(`gcloud app deploy --project ${project} ./${yaml} --quiet`, baseDir);
    return true;
  } catch (err) {
    // child_process throws with status code; ensure non-zero exit for CI visibility
    if (err && typeof err.status === "number") {
      process.exit(err.status || 1);
    }
    console.error(err);
    process.exit(1);
  }
}

// Export the functions for use in other files (e.g. the deploy preflight).
module.exports = { deployToGoogleCloud, checkRequirements, getDeployTarget };

// Run when executed directly. `--check` runs only the preflight (no deploy)
// and exits non-zero if any requirement is unmet.
if (require.main === module) {
  if (process.argv.includes("--check")) {
    const errors = checkRequirements();
    if (errors.length > 0) {
      console.error("❌  Backend deployment requirements not met:");
      for (const e of errors) console.error(`   • ${e}`);
      process.exit(1);
    }
    console.log("✅  Backend deployment requirements OK.");
  } else {
    deployToGoogleCloud();
  }
}
