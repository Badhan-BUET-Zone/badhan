"use strict";

// Runs the deploy CLIs (gcloud, firebase, bubblewrap, fastlane) inside
// containers instead of on the host. Each CLI lives with the thing it deploys:
// gcloud in `backend-deploy` (the deploy stage of badhan-backend's Dockerfile),
// firebase in `frontend-deploy`, and the Play toolchain in `android`.
//
// The upload scripts themselves stay on the host — they shell out to
// `docker compose` for the frontend build, which a container could not do
// without a Docker socket — so this module moves only the CLI *invocations*.
//
// Credentials live in .deploy-auth/ at the repo root: outside both upload roots
// (`gcloud app deploy` uploads badhan-backend, `firebase deploy` uploads
// badhan-frontend/dist), gitignored, and a plain host directory, so they
// outlive any container, volume, or image rebuild.
//
// Standard library only. These scripts have no node_modules on the host and
// must keep none.

const { execSync } = require("child_process");
const { mkdirSync } = require("fs");
const { resolve } = require("path");

const REPO_ROOT = __dirname;
const AUTH_DIR = resolve(REPO_ROOT, ".deploy-auth");

// The CLIs create their own subdirectories under .deploy-auth, but the parent
// has to exist first — and it has to be created from the HOST so it is owned by
// the developer rather than by whatever uid the container runs as.
function ensureAuthDir() {
  mkdirSync(AUTH_DIR, { recursive: true });
}

// The uid mapping is Linux-only (WSL2 reports "linux", which is what we want:
// the repo is on the Linux filesystem and container root would leave root-owned
// files behind). On macOS, Docker Desktop already maps bind-mount writes to the
// invoking user, so the compose default of 0:0 is correct.
//
// Exported because ./deploy runs the test-profile containers through compose
// directly, and they need the same mapping.
function childEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  if (process.platform === "linux") {
    env.DEPLOY_UID = String(process.getuid());
    env.DEPLOY_GID = String(process.getgid());
  }
  return env;
}

// Build the docker-compose invocation for a CLI command inside a deploy
// container. `workdir` is a path INSIDE the container (/repo/...), because the
// repo root is bind-mounted at /repo.
//
// `service` is required and has no default: each CLI now lives in the deploy
// stage of the app it deploys (gcloud in `backend-deploy`, firebase in
// `frontend-deploy`, the Play toolchain in `android`), and a wrong or missing
// one would surface as "command not found" from a container that simply does
// not have that CLI. Failing here names the actual mistake.
//
// `interactive` controls the TTY. Compose allocates one by default, which the
// login flows need for their paste-back prompts; every check that parses stdout
// passes -T instead, because a TTY corrupts captured output with control codes.
//
// `passEnv` lists variable NAMES to forward with a bare `-e NAME`, which makes
// compose inherit the value from this process. Never `-e NAME=value`: that
// would put secrets (the keystore password) in the host process table.
function cliCommand(cmd, { service, workdir = "/repo", interactive = false, passEnv = [] } = {}) {
  if (!service) throw new Error(`No compose service given for CLI command: ${cmd}`);
  const flags = [interactive ? "" : "-T", ...passEnv.map((n) => `-e ${n}`), `-w ${workdir}`];
  return `docker compose --profile deploy run --rm ${flags.filter(Boolean).join(" ")} ${service} ${cmd}`;
}

// Run a CLI command with its output streamed through. Always invoked from
// REPO_ROOT: that is where docker-compose.yml lives.
function runCli(cmd, opts = {}) {
  ensureAuthDir();
  return execSync(cliCommand(cmd, opts), {
    stdio: "inherit",
    cwd: REPO_ROOT,
    env: childEnv(opts.env),
  });
}

// Capture stdout, swallow stderr. Returns "" on failure rather than throwing,
// so preflight checks stay expression-shaped.
function captureCli(cmd, opts = {}) {
  ensureAuthDir();
  try {
    return execSync(cliCommand(cmd, opts), {
      encoding: "utf8",
      cwd: REPO_ROOT,
      env: childEnv(opts.env),
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (_) {
    return "";
  }
}

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

// Translate a host absolute path into the container path for the same file.
// `resolve(baseDir, "signature.jks")` produces a host path that means nothing
// inside the container; everything under the repo root is visible at /repo.
// No separator normalization — the supported hosts (macOS, Linux, WSL2) all
// use "/".
function toContainerPath(hostPath) {
  const abs = resolve(hostPath);
  if (abs !== REPO_ROOT && !abs.startsWith(`${REPO_ROOT}/`)) {
    throw new Error(
      `"${hostPath}" is outside the repo (${REPO_ROOT}) and is not visible inside the deploy containers.`
    );
  }
  return abs.replace(REPO_ROOT, "/repo");
}

module.exports = {
  cliCommand,
  childEnv,
  runCli,
  captureCli,
  dockerAvailable,
  toContainerPath,
  ensureAuthDir,
  REPO_ROOT,
  AUTH_DIR,
};
