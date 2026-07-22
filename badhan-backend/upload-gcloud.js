#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { existsSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } = require("fs");
const { resolve } = require("path");
const os = require("os");

// Env files are NOT committed to this repo. They live in a private secrets
// repo and are cloned into place only for the duration of a deploy, then
// removed. Override the URL/branch via env vars if your access is over SSH
// (e.g. SECRETS_REPO_URL=git@github.com:mirmahathir1/secrets.git).
const SECRETS_REPO_URL =
  process.env.SECRETS_REPO_URL || "https://github.com/mirmahathir1/secrets.git";
const SECRETS_BRANCH = process.env.SECRETS_BRANCH || "master";
// Path of the env files within the secrets repo.
const SECRETS_SUBDIR = "badhan-backend";

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

// Validate that gcloud has WORKING credentials, not merely a configured active
// account. `gcloud auth list` reports an account as active even after its
// refresh token has been revoked/expired, so it can't catch the `invalid_grant`
// failure the deploy hits. `print-access-token` forces an actual token refresh
// and fails the same way the deploy would, so we exercise it here.
function gcloudHasValidCredentials() {
  try {
    const out = execSync("gcloud auth print-access-token", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim().length > 0;
  } catch (_) {
    return false;
  }
}

// Confirm we can reach the secrets repo and that the target branch exists,
// without downloading anything. Used by the preflight so we fail fast if the
// env file couldn't be fetched at deploy time.
function secretsBranchReachable() {
  try {
    const out = execSync(
      `git ls-remote --heads ${SECRETS_REPO_URL} ${SECRETS_BRANCH}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return out.trim().length > 0;
  } catch (_) {
    return false;
  }
}

// Clone the env file for `envFile` from the secrets repo into `baseDir`.
// Returns the absolute path written. Uses a throwaway temp clone that is
// always removed. Throws if the file isn't present in the secrets repo.
function fetchSecretEnv(baseDir, envFile) {
  const tmp = mkdtempSync(resolve(os.tmpdir(), "badhan-secrets-"));
  try {
    run(`git clone --depth 1 --branch ${SECRETS_BRANCH} ${SECRETS_REPO_URL} "${tmp}"`);
    const src = resolve(tmp, SECRETS_SUBDIR, envFile);
    if (!existsSync(src)) {
      throw new Error(
        `"${SECRETS_SUBDIR}/${envFile}" not found in secrets repo (${SECRETS_REPO_URL}@${SECRETS_BRANCH}).`
      );
    }
    const dest = resolve(baseDir, envFile);
    copyFileSync(src, dest);
    return dest;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
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

  // The env file is fetched from the secrets repo at deploy time. Accept a
  // local copy if one already exists; otherwise require the secrets repo to be
  // reachable so the fetch will succeed.
  if (!existsSync(resolve(baseDir, envFile))) {
    if (!secretsBranchReachable()) {
      errors.push(
        `backend: "${envFile}" not present locally and secrets repo not reachable ` +
          `(${SECRETS_REPO_URL} branch ${SECRETS_BRANCH}). Check git access.`
      );
    }
  }
  if (!existsSync(resolve(baseDir, yaml))) {
    errors.push(`backend: required App Engine config "${yaml}" not found.`);
  }
  if (!commandExists("gcloud")) {
    errors.push(
      "backend: gcloud CLI not found on PATH. Install it: https://cloud.google.com/sdk/docs/install"
    );
  } else if (!gcloudHasValidCredentials()) {
    errors.push(
      "backend: gcloud credentials are missing or expired (token refresh failed). Run `gcloud auth login`."
    );
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
    const { envFile, yaml, project } = getDeployTarget(currentBranch);

    // Fetch the env file from the secrets repo unless a local copy already
    // exists. Only files WE fetched are cleaned up afterwards, so a
    // pre-existing local env is never deleted.
    const envPath = resolve(baseDir, envFile);
    let fetchedEnv = false;
    if (!existsSync(envPath)) {
      console.log(`🔐  Fetching ${envFile} from secrets repo…`);
      fetchSecretEnv(baseDir, envFile);
      fetchedEnv = true;
    }

    try {
      updateLastDeployed(baseDir);
      run(`gcloud app deploy --project ${project} ./${yaml} --quiet`, baseDir);
    } finally {
      if (fetchedEnv) {
        rmSync(envPath, { force: true });
        console.log(`🧹  Removed fetched ${envFile}.`);
      }
    }
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
