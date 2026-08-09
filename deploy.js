#!/usr/bin/env node
"use strict";

// Manual deploy script — run by hand only.
//
// Runs both test suites as one-off containers under the `test` compose profile
// (compose starts their dependencies automatically), and only deploys if BOTH
// suites pass. The test gate cannot be skipped.
//
// This is the orchestrator: it calls the upload scripts' exported functions
// IN-PROCESS rather than spawning `node badhan-backend/upload-gcloud.js …` per
// step, so a preflight failure is a returned array of errors instead of an exit
// code, and both preflights can be reported in one pass.
//
// Nothing here needs gcloud or firebase on the host: each ships in the `deploy`
// stage of the app it deploys (`backend-deploy`, `frontend-deploy`) and reads
// its credentials from .deploy-auth/ (gitignored), which is a plain host
// directory and therefore survives `docker compose down -v`. Log in once with
// `./deploy.js --login`.
//
// Standard library only, like the upload scripts it drives: there are no
// node_modules on the host and there must be none.
//
// Usage: ./deploy.js [--login | --relogin | --help]

const { execSync } = require("child_process");
const { runCli, ensureAuthDir, childEnv, REPO_ROOT } = require("./deploy-container");
const { environmentForBranch } = require("./environments");
const backend = require("./badhan-backend/upload-gcloud");
const frontend = require("./badhan-frontend/upload-firebase");

// `log` is console.error on the unknown-option path, so usage text follows the
// error onto stderr instead of splitting the two streams.
function usage(log = console.log) {
  log(`Usage: ./deploy.js [option]

  (no option)   Run both test suites, then deploy backend + frontend.
  --login       Log the deploy container in to Google Cloud and Firebase.
  --relogin     Force a fresh login for both, replacing existing credentials.
  --help        Show this message.

Credentials are stored in .deploy-auth/ at the repo root (gitignored) and
survive \`docker compose down -v\`. Neither CLI has to be installed on the host.`);
}

// Reproduce `set -e`: a failed step ends the run with the child's own status,
// and without dumping a Node stack trace over output the child already printed.
function die(err) {
  if (err && typeof err.status === "number") process.exit(err.status || 1);
  console.error(err && err.message ? err.message : err);
  process.exit(1);
}

// The test suites live under the `test` profile, not the `deploy` one, so they
// go through compose directly rather than through deploy-container's CLI
// wrapper. childEnv() still applies: it is what passes the host uid through on
// Linux/WSL2.
function runCompose(args) {
  execSync(`docker compose ${args}`, { stdio: "inherit", cwd: REPO_ROOT, env: childEnv() });
}

// Say where this deploy is going before it spends six minutes on tests.
//
// Both upload scripts resolve the branch themselves and each reports an unlisted
// one through its own preflight, so the throw here is not the only guard — it is
// the one that fires first and says it once, rather than as two identical
// bullets in a report about credentials.
function announceEnvironment() {
  let branch;
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", cwd: REPO_ROOT }).trim();
  } catch (_) {
    console.error("❌  Unable to determine the current git branch (is this a repo?).");
    process.exit(1);
  }

  let environment;
  try {
    environment = environmentForBranch(branch);
  } catch (err) {
    console.error(`❌  ${err.message.replace(/\n\s+/, "\n    ")}`);
    process.exit(1);
  }

  console.log(
    `🌍  Branch "${branch}" → environment ${environment.name} (${environment.gcpProject}).`
  );
}

// Both preflights in one pass. Each returns human-readable strings and touches
// nothing, so there is no reason to stop at the first failing one and hide a
// firebase problem behind a gcloud problem.
function preflight() {
  announceEnvironment();
  const errors = [...backend.checkRequirements(), ...frontend.checkRequirements()];
  if (errors.length > 0) {
    console.error("❌  Deployment requirements not met:");
    for (const e of errors) console.error(`   • ${e}`);
    process.exit(1);
  }
  console.log("✅  Requirements satisfied.");
}

// Both flows are browserless: the container prints a URL you open on the host,
// and you paste the resulting code back. `interactive: true` is what keeps the
// TTY these prompts need — the checks that parse stdout pass -T instead.
//
// The two run in different containers, because each CLI now ships with the app
// it deploys. They still write to the same .deploy-auth/ directory, reached
// through CLOUDSDK_CONFIG and XDG_CONFIG_HOME respectively.
function login(gcloudFlags, firebaseFlags) {
  // Created host-side so it is owned by the developer, not by the container uid.
  ensureAuthDir();

  console.log("🔑  Logging in to Google Cloud (paste the URL into any browser)…");
  runCli(`gcloud auth login --no-launch-browser ${gcloudFlags}`.trim(), {
    service: "backend-deploy",
    interactive: true,
  });

  console.log("🔑  Logging in to Firebase…");
  runCli(`firebase login --no-localhost ${firebaseFlags}`.trim(), {
    service: "frontend-deploy",
    interactive: true,
  });

  console.log("✅  Logged in. Verifying…");
  // The same preflight the deploy runs, so --login cannot report success on
  // credentials that would fail ten seconds later — including access to the
  // project this branch actually deploys to.
  preflight();
}

async function main() {
  switch (process.argv[2] || "") {
    case "--help":
    case "-h":
      usage();
      return;
    case "--login":
      login("", "");
      return;
    case "--relogin":
      // `firebase login` answers "Already logged in" and will not refresh an
      // expired token; --reauth is the only thing that clears that state.
      login("--force", "--reauth");
      return;
    case "":
      break;
    default:
      console.error(`Unknown option: ${process.argv[2]}`);
      usage(console.error);
      process.exit(1);
  }

  console.log("🔎  Checking deployment requirements before running tests…");
  preflight();

  console.log("🧪  Running backend test suite (Jest)…");
  runCompose("--profile test run --rm backend-test");

  console.log("🧪  Running frontend test suite (Cypress)…");
  runCompose("--profile test run --rm frontend-test");

  console.log("✅  All tests passed. Deploying…");

  console.log("☁️   Deploying backend to Google Cloud…");
  backend.deployToGoogleCloud();

  console.log("🩺  Verifying the deployed backend is live…");
  // Unlike the other steps this one reports failure by returning false rather
  // than throwing, so the abort is explicit.
  if (!(await backend.liveCheck())) process.exit(1);

  console.log("🔥  Deploying frontend to Firebase…");
  frontend.deployToFirebase();

  console.log("🚀  Deploy complete.");
}

main().catch(die);
