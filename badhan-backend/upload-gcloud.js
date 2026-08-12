#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { existsSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } = require("fs");
const { resolve } = require("path");
const os = require("os");
const https = require("https");
const { runCli, captureCli, dockerAvailable } = require("../deploy-container");
const { environmentForBranch } = require("../environments");

// Env files are NOT committed to this repo. They live in a private secrets
// repo and are cloned into place only for the duration of a deploy, then
// removed. Override the URL/branch via env vars if your access is over SSH
// (e.g. SECRETS_REPO_URL=git@github.com:Badhan-BUET-Zone/secrets.git).
//
// The org repo is the only secrets source in this ecosystem: the Android and
// backup fetchers point here too. This script used to default to a personal
// fork on `master` instead, so a deploy that did not set SECRETS_REPO_URL read
// production credentials from a second, unmanaged copy.
const SECRETS_REPO_URL =
  process.env.SECRETS_REPO_URL || "https://github.com/Badhan-BUET-Zone/secrets.git";
const SECRETS_BRANCH = process.env.SECRETS_BRANCH || "main";

function run(command, cwd) {
  return execSync(command, { stdio: "inherit", cwd });
}

function getCurrentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
}

// Resolve the branch-dependent deploy target (env file, App Engine config, GCP
// project). A thin wrapper over ../environments.js, which is the one place the
// branch → target map now lives: this file and upload-firebase.js used to hold
// a copy each, keyed differently enough that they could not be diffed by eye.
//
// Throws for a branch with no deploy target. Every caller below is inside
// checkRequirements or downstream of it, so the throw surfaces as a preflight
// bullet rather than a stack trace.
function getDeployTarget(currentBranch) {
  return environmentForBranch(currentBranch);
}

// Every gcloud call goes to the `backend-deploy` service — the `deploy` target
// of this directory's Dockerfile, i.e. the backend's own image plus the CLI
// that deploys it. Spread into each call rather than hidden in a default, so a
// misrouted command fails in deploy-container.js instead of in a container that
// has no gcloud.
const GCLOUD = { service: "backend-deploy" };

// gcloud runs in that container, reading its credentials from .deploy-auth/ —
// see ../deploy-container.js. So "is gcloud installed" is now "was the image
// built", not "is it on the host's PATH".
function gcloudAvailable() {
  return captureCli("gcloud version", GCLOUD).length > 0;
}

// Validate that gcloud has WORKING credentials, not merely a configured active
// account. `gcloud auth list` reports an account as active even after its
// refresh token has been revoked/expired, so it can't catch the `invalid_grant`
// failure the deploy hits. `print-access-token` forces an actual token refresh
// and fails the same way the deploy would, so we exercise it here.
function gcloudHasValidCredentials() {
  return captureCli("gcloud auth print-access-token", GCLOUD).length > 0;
}

// The account the container is logged in as. Only used to make a failure
// readable ("logged in as the wrong person" rather than a permissions mystery),
// so an empty answer is fine.
function gcloudActiveAccount() {
  return captureCli("gcloud auth list --filter=status:ACTIVE --format='value(account)'", GCLOUD) || "unknown";
}

// A valid token is not the same as access to the branch's target project: a
// login to the wrong Google account refreshes happily and then fails at the
// last step of a deploy that has already run both test suites. `app describe`
// is read-only and hits the App Engine API for exactly this project.
//
// This hard-fails by design. The known false positive is narrow — an account
// with only roles/appengine.deployer can deploy but lacks
// appengine.applications.get — and the fix for it is to grant
// roles/appengine.appViewer, not to soften the check into a warning the deploy
// then ignores.
function gcloudCanSeeProject(project) {
  return captureCli(`gcloud app describe --project ${project}`, GCLOUD).length > 0;
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
//
// The secrets repo is flat: every file sits at its root under the same name it
// takes on disk here, so `envFile` is both the source and the destination name.
function fetchSecretEnv(baseDir, envFile) {
  const tmp = mkdtempSync(resolve(os.tmpdir(), "badhan-secrets-"));
  try {
    run(`git clone --depth 1 --branch ${SECRETS_BRANCH} ${SECRETS_REPO_URL} "${tmp}"`);
    const src = resolve(tmp, envFile);
    if (!existsSync(src)) {
      throw new Error(
        `"${envFile}" not found in secrets repo (${SECRETS_REPO_URL}@${SECRETS_BRANCH}).`
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

  // An unlisted branch is a preflight failure, not an exception: report it the
  // same way as every other unmet requirement and stop, since nothing below can
  // be checked without knowing the target.
  let environment;
  try {
    environment = getDeployTarget(currentBranch);
  } catch (err) {
    errors.push(`backend: ${err.message}`);
    return errors;
  }

  const {
    backendEnvFile: envFile,
    appEngineConfig: yaml,
    gcpProject: project,
  } = environment;

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

  // gcloud runs in a container now, so Docker is a backend deploy requirement
  // too. Caught here rather than three minutes into the deploy.
  if (!dockerAvailable()) {
    errors.push(
      "backend: Docker is not available (gcloud runs in the `backend-deploy` container). " +
        "Start Docker Desktop and try again."
    );
  } else if (!gcloudAvailable()) {
    errors.push(
      "backend: gcloud is not available in the backend-deploy container. " +
        "Build it with `docker compose --profile deploy build backend-deploy`."
    );
  } else if (!gcloudHasValidCredentials()) {
    errors.push(
      "backend: gcloud credentials are missing or expired (token refresh failed). Run `./deploy.js --relogin`."
    );
  } else if (!gcloudCanSeeProject(project)) {
    errors.push(
      `backend: logged in as ${gcloudActiveAccount()}, which cannot access App Engine project "${project}" ` +
        `(branch "${currentBranch}"). Run \`./deploy.js --relogin\` and pick an account with access.`
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
    const {
      backendEnvFile: envFile,
      appEngineConfig: yaml,
      gcpProject: project,
    } = getDeployTarget(currentBranch);

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
      // Runs in the backend-deploy container, whose /repo/badhan-backend IS
      // this directory (a plain bind mount — the service deliberately layers
      // no node_modules or dist volume over it), so the upload payload is
      // byte-for-byte what a host `gcloud app deploy` would have sent.
      runCli(`gcloud app deploy --project ${project} ./${yaml} --quiet`, {
        ...GCLOUD,
        workdir: "/repo/badhan-backend",
      });
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

// --- Post-deploy live check -------------------------------------------------
//
// `gcloud app deploy` returns once the new version is serving, so a fixed sleep
// is either wasted time or still too short. We poll instead: the budget below
// only has to cover cold start and traffic-routing propagation, and in practice
// the first or second attempt succeeds.
const LIVE_CHECK_PATH = "/guest/log/statistics"; // unauthenticated, exercises the tsoa routes
const LIVE_CHECK_ATTEMPTS = 24;
const LIVE_CHECK_INTERVAL_MS = 5000;
const LIVE_CHECK_TIMEOUT_MS = 10000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolve to { ok: true } on HTTP 200, otherwise { ok: false, reason } — never
// rejects, so the polling loop below stays simple.
function probe(url) {
  return new Promise((resolvePromise) => {
    const req = https.get(url, (res) => {
      // Drain so the socket is released even when we ignore the body.
      res.resume();
      if (res.statusCode === 200) resolvePromise({ ok: true });
      else resolvePromise({ ok: false, reason: `HTTP ${res.statusCode}` });
    });
    req.setTimeout(LIVE_CHECK_TIMEOUT_MS, () => {
      req.destroy();
      resolvePromise({ ok: false, reason: `no response within ${LIVE_CHECK_TIMEOUT_MS / 1000}s` });
    });
    req.on("error", (err) => resolvePromise({ ok: false, reason: err.message }));
  });
}

// Poll the deployed backend until it answers 200. Returns true once live,
// false if the whole budget is exhausted.
async function liveCheck(currentBranch = getCurrentBranch()) {
  const { gcpProject: project, backendBaseUrl: baseUrl } = getDeployTarget(currentBranch);
  const url = `${baseUrl}${LIVE_CHECK_PATH}`;
  const budgetSeconds = (LIVE_CHECK_ATTEMPTS * LIVE_CHECK_INTERVAL_MS) / 1000;

  console.log(`🩺  Live check against ${project}: ${url}`);
  let lastReason = "unknown";
  for (let attempt = 1; attempt <= LIVE_CHECK_ATTEMPTS; attempt++) {
    const result = await probe(url);
    if (result.ok) {
      console.log(`✅  Backend is live (attempt ${attempt}/${LIVE_CHECK_ATTEMPTS}).`);
      return true;
    }
    lastReason = result.reason;
    console.log(`   … attempt ${attempt}/${LIVE_CHECK_ATTEMPTS} not ready (${lastReason}).`);
    if (attempt < LIVE_CHECK_ATTEMPTS) await sleep(LIVE_CHECK_INTERVAL_MS);
  }
  console.error(
    `❌  Backend did not come up within ${budgetSeconds}s. Last failure: ${lastReason}`
  );
  return false;
}

// Export the functions for use in other files (e.g. the deploy preflight).
module.exports = { deployToGoogleCloud, checkRequirements, getDeployTarget, liveCheck };

// Run when executed directly. `--check` runs only the preflight (no deploy)
// and exits non-zero if any requirement is unmet. `--live-check` polls the
// already-deployed backend (no deploy) and exits non-zero if it never answers.
if (require.main === module) {
  if (process.argv.includes("--check")) {
    const errors = checkRequirements();
    if (errors.length > 0) {
      console.error("❌  Backend deployment requirements not met:");
      for (const e of errors) console.error(`   • ${e}`);
      process.exit(1);
    }
    console.log("✅  Backend deployment requirements OK.");
  } else if (process.argv.includes("--live-check")) {
    liveCheck().then((ok) => process.exit(ok ? 0 : 1));
  } else {
    deployToGoogleCloud();
  }
}
