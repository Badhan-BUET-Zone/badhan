#!/usr/bin/env node
"use strict";

// Builds the Badhan Android app with Bubblewrap (Trusted Web Activity) and
// uploads the resulting bundle to Google Play via `fastlane supply`.
//
// This runs on the HOST, not in Docker: Bubblewrap needs a JDK + Android SDK,
// and fastlane is a Ruby gem. See ../../CLAUDE.md for why that's an exception.
//
// Note: the TWA is only a shell around https://badhan-buet.web.app — this does
// NOT build the web frontend. Deploy the site first (upload-firebase.js), then
// run this when the manifest, icons, or version change.

const { execSync } = require("child_process");
const { existsSync, mkdtempSync, copyFileSync, rmSync, readFileSync } = require("fs");
const { resolve, basename } = require("path");
const os = require("os");

// The signing keystore and the Play service-account key are NOT committed to
// this repo. They live in a private secrets repo and are cloned into place only
// for the duration of a build, then removed. Override the URL/branch via env
// vars if your access is over SSH.
const SECRETS_REPO_URL =
  process.env.SECRETS_REPO_URL || "https://github.com/Badhan-BUET-Zone/secrets.git";
const SECRETS_BRANCH = process.env.SECRETS_BRANCH || "main";

// Secrets to fetch: filename in this directory -> path within the secrets repo.
const KEYSTORE_FILE = "signature.jks";
const KEY_PASSWORD_FILE = "key_password.txt";
const PLAY_KEY_FILE = "badhan-buet-f095674c5125.json";
const SECRETS = {
  [KEYSTORE_FILE]: "badhan-web/signature.jks",
  [KEY_PASSWORD_FILE]: "badhan-web/key_password.txt",
  [PLAY_KEY_FILE]: `badhan-web/bubblewrap/${PLAY_KEY_FILE}`,
};

// The keystore and the key inside it share one password.
const BUILD_SECRETS = [KEYSTORE_FILE, KEY_PASSWORD_FILE];

// Bubblewrap build artifacts. Play only accepts the .aab for updates; the .apk
// is for sideloading / manual testing.
const APK_FILE = "app-release-signed.apk";
const AAB_FILE = "app-release-bundle.aab";

const DEFAULT_TRACK = "internal";
// Play release states: "draft" (uploaded, not released), "completed" (100%),
// "inProgress" (staged rollout). Default to draft so nothing ships by accident.
const DEFAULT_STATUS = "draft";

function run(command, cwd, env) {
  return execSync(command, { stdio: "inherit", cwd, env: env ? { ...process.env, ...env } : process.env });
}

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
}

// Bubblewrap keeps the JDK 17 and Android SDK locations in ~/.bubblewrap/
// config.json. If they're missing it falls back to an interactive wizard that
// offers to download them — which hangs any non-interactive run — so we check
// them up front and point at `bubblewrap doctor` instead.
function bubblewrapSdkErrors() {
  const configPath = resolve(os.homedir(), ".bubblewrap", "config.json");
  if (!existsSync(configPath)) {
    return ["bubblewrap: ~/.bubblewrap/config.json missing. Run `bubblewrap doctor` to set up the JDK 17 and Android SDK."];
  }

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (e) {
    return [`bubblewrap: ~/.bubblewrap/config.json could not be parsed (${e.message}).`];
  }

  const errors = [];
  // On macOS the configured jdkPath is the .jdk bundle; java lives under it.
  const javaHome =
    process.platform === "darwin" ? resolve(config.jdkPath || "", "Contents/Home") : config.jdkPath || "";
  if (!config.jdkPath || !existsSync(resolve(javaHome, "bin/java"))) {
    errors.push(
      "bubblewrap: JDK 17 not configured (jdkPath in ~/.bubblewrap/config.json). " +
        "Install one (`brew install openjdk@17`) and register it with " +
        "`bubblewrap updateConfig --jdkPath <path>`."
    );
  }
  if (!config.androidSdkPath || !existsSync(resolve(config.androidSdkPath, "build-tools"))) {
    errors.push(
      "bubblewrap: Android SDK not configured (androidSdkPath in ~/.bubblewrap/config.json). " +
        "Register it with `bubblewrap updateConfig --androidSdkPath <path>`, then verify with `bubblewrap doctor`."
    );
  }
  return errors;
}

// Confirm we can reach the secrets repo and that the target branch exists,
// without downloading anything. Used by the preflight so we fail fast if the
// keystore couldn't be fetched at build time.
function secretsBranchReachable() {
  try {
    const out = execSync(`git ls-remote --heads ${SECRETS_REPO_URL} ${SECRETS_BRANCH}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim().length > 0;
  } catch (_) {
    return false;
  }
}

// Clone the listed secrets from the secrets repo into `baseDir`. Only files
// that aren't already present locally are fetched; returns the absolute paths
// of the ones WE wrote, so the caller can clean up exactly those. Uses a
// throwaway temp clone that is always removed.
function fetchSecrets(baseDir, files) {
  const missing = files.filter((f) => !existsSync(resolve(baseDir, f)));
  if (missing.length === 0) return [];

  const tmp = mkdtempSync(resolve(os.tmpdir(), "badhan-secrets-"));
  try {
    run(`git clone --depth 1 --branch ${SECRETS_BRANCH} ${SECRETS_REPO_URL} "${tmp}"`);
    const fetched = [];
    for (const file of missing) {
      const src = resolve(tmp, SECRETS[file]);
      if (!existsSync(src)) {
        throw new Error(
          `"${SECRETS[file]}" not found in secrets repo (${SECRETS_REPO_URL}@${SECRETS_BRANCH}).`
        );
      }
      const dest = resolve(baseDir, file);
      copyFileSync(src, dest);
      fetched.push(dest);
      console.log(`🔐  Fetched ${file}.`);
    }
    return fetched;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// twa-manifest.json is the source of truth for the package id and signing key
// alias. Its `signingKey.path` is a stale Windows path, so we pass the local
// keystore on the command line instead of trusting that field.
function readManifest(baseDir) {
  const manifestPath = resolve(baseDir, "twa-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return {
    packageId: manifest.packageId,
    keyAlias: (manifest.signingKey && manifest.signingKey.alias) || "key0",
    versionCode: manifest.appVersionCode,
  };
}

function requiredSecrets(publish) {
  return publish ? [...BUILD_SECRETS, PLAY_KEY_FILE] : BUILD_SECRETS;
}

// Side-effect-free preflight: validate everything the build/upload needs
// WITHOUT building, fetching, or uploading. Returns an array of human-readable
// error strings (empty === ready to go). Never installs anything: missing tools
// are reported with their install command for the user to run.
function checkRequirements(baseDir = __dirname, { publish = true } = {}) {
  const errors = [];

  // Tooling first: a missing CLI is the most common failure and the one with an
  // actionable fix, so report it before anything else.
  if (publish && !commandExists("fastlane")) {
    errors.push("bubblewrap: fastlane not found on PATH. Install it with `brew install fastlane`.");
  }
  if (!commandExists("bubblewrap")) {
    errors.push("bubblewrap: CLI not found on PATH. Install it with `npm install -g @bubblewrap/cli`.");
  }

  if (!existsSync(resolve(baseDir, "twa-manifest.json"))) {
    errors.push("bubblewrap: twa-manifest.json not found — is this the bubblewrap directory?");
  } else {
    try {
      readManifest(baseDir);
    } catch (e) {
      errors.push(`bubblewrap: twa-manifest.json could not be parsed (${e.message}).`);
    }
  }

  // Secrets are fetched at build time. Accept local copies if they already
  // exist; otherwise require the secrets repo to be reachable.
  const missing = requiredSecrets(publish).filter((f) => !existsSync(resolve(baseDir, f)));
  if (missing.length > 0 && !secretsBranchReachable()) {
    errors.push(
      `bubblewrap: ${missing.join(", ")} not present locally and secrets repo not reachable ` +
        `(${SECRETS_REPO_URL} branch ${SECRETS_BRANCH}). Check git access.`
    );
  }

  return errors;
}

// Build the signed APK + AAB. Bubblewrap otherwise prompts for the keystore
// passwords; feeding them through BUBBLEWRAP_KEYSTORE_PASSWORD /
// BUBBLEWRAP_KEY_PASSWORD keeps the run non-interactive. Returns the artifact
// paths.
function build(baseDir) {
  const { keyAlias } = readManifest(baseDir);
  const keystorePath = resolve(baseDir, KEYSTORE_FILE);
  const password = readFileSync(resolve(baseDir, KEY_PASSWORD_FILE), "utf8").trim();

  console.log("🔨  Building with Bubblewrap…");
  run(
    `bubblewrap build --skipPwaValidation --signingKeyPath "${keystorePath}" --signingKeyAlias "${keyAlias}"`,
    baseDir,
    { BUBBLEWRAP_KEYSTORE_PASSWORD: password, BUBBLEWRAP_KEY_PASSWORD: password }
  );

  const apkPath = resolve(baseDir, APK_FILE);
  if (!existsSync(apkPath)) {
    throw new Error(`Build finished but ${APK_FILE} was not produced.`);
  }
  const aabPath = resolve(baseDir, AAB_FILE);

  console.log(`✅  APK built at: ${apkPath}`);
  if (existsSync(aabPath)) console.log(`✅  AAB built at: ${aabPath}`);

  return { apkPath, aabPath };
}

// Upload the bundle to Play. Defaults to a DRAFT release so a stray run can
// never ship to users; pass status "completed" to roll out from here instead,
// or a `rollout` fraction (0–1) for a staged release.
function upload(baseDir, track, { status = DEFAULT_STATUS, rollout } = {}) {
  const { packageId, versionCode } = readManifest(baseDir);
  const aabPath = resolve(baseDir, AAB_FILE);
  if (!existsSync(aabPath)) {
    throw new Error(`Cannot upload: ${AAB_FILE} was not produced by the build.`);
  }

  // A partial rollout is "inProgress" in Play's vocabulary; "completed" means
  // 100%. Supplying a fraction implies the former.
  const releaseStatus = rollout ? "inProgress" : status;

  console.log(`🚀  Uploading version code ${versionCode} to the '${track}' track (${releaseStatus})…`);
  run(
    [
      "fastlane supply",
      `--json_key "${resolve(baseDir, PLAY_KEY_FILE)}"`,
      `--package_name "${packageId}"`,
      `--aab "${aabPath}"`,
      // Without this, supply globs the directory and also picks up the
      // leftover app-release-unsigned-aligned.apk from the build.
      "--skip_upload_apk true",
      `--track "${track}"`,
      "--skip_upload_metadata true",
      "--skip_upload_images true",
      "--skip_upload_screenshots true",
      `--release_status ${releaseStatus}`,
      ...(rollout ? [`--rollout ${rollout}`] : []),
    ].join(" "),
    baseDir
  );

  if (releaseStatus === "draft") {
    console.log(`✅  Uploaded to '${track}' as a draft. Finish the rollout in the Play Console.`);
  } else if (rollout) {
    console.log(`✅  Released to ${Number(rollout) * 100}% of the '${track}' track.`);
  } else {
    console.log(`✅  Released to 100% of the '${track}' track.`);
  }
}

// Build and (unless publish === false) upload. Secrets fetched by this run are
// removed afterwards; pre-existing local copies are never deleted.
function buildAndUpload({ publish = true, track = DEFAULT_TRACK, status, rollout } = {}) {
  const baseDir = __dirname; // ensure all commands run in the bubblewrap directory

  // Re-run preflight so a direct invocation is still guarded.
  const errors = checkRequirements(baseDir, { publish });
  if (errors.length > 0) {
    console.error("🛑  Halted. Unmet requirements:");
    for (const e of errors) console.error(`   • ${e}`);
    process.exit(1);
  }

  const fetched = fetchSecrets(baseDir, requiredSecrets(publish));

  try {
    build(baseDir);
    if (publish) upload(baseDir, track, { status, rollout });
  } finally {
    for (const path of fetched) {
      rmSync(path, { force: true });
      console.log(`🧹  Removed fetched ${basename(path)}.`);
    }
  }
  return true;
}

module.exports = { buildAndUpload, checkRequirements, build, upload };

// Run when executed directly.
//   --check          preflight only (no build, no upload)
//   --build-only     build the APK/AAB but don't touch Play
//   --track=<name>   Play track to upload to (default: internal)
//   --release        roll out to 100% instead of leaving a draft
//   --rollout=<0-1>  staged rollout to a fraction of users (implies --release)
if (require.main === module) {
  const args = process.argv.slice(2);
  const publish = !args.includes("--build-only");
  const valueOf = (flag) => {
    const arg = args.find((a) => a.startsWith(`${flag}=`));
    return arg ? arg.slice(flag.length + 1) : undefined;
  };
  const track = valueOf("--track") || DEFAULT_TRACK;
  const rollout = valueOf("--rollout");
  const status = args.includes("--release") ? "completed" : DEFAULT_STATUS;

  try {
    if (args.includes("--check")) {
      const errors = checkRequirements(__dirname, { publish });
      if (errors.length > 0) {
        console.error("❌  Google Play upload requirements not met:");
        for (const e of errors) console.error(`   • ${e}`);
        process.exit(1);
      }
      console.log("✅  Google Play upload requirements OK.");
    } else {
      buildAndUpload({ publish, track, status, rollout });
    }
  } catch (err) {
    // child_process throws with a status code; ensure a non-zero exit.
    if (err && typeof err.status === "number") {
      process.exit(err.status || 1);
    }
    console.error(err.message || err);
    process.exit(1);
  }
}
