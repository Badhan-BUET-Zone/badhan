#!/usr/bin/env node
"use strict";

// Builds the Badhan Android app with Bubblewrap (Trusted Web Activity) and
// uploads the resulting bundle to Google Play via `fastlane supply`.
//
// The script itself runs on the HOST (it clones the secrets repo and shells out
// to docker, which a container has no socket to do), but every tool it drives —
// bubblewrap, gradle, the JDK, fastlane — runs in the `android` container. See
// ../../CLAUDE.md and ../../deploy-container.js.
//
// Note: the TWA is only a shell around https://badhan-buet.web.app — this does
// NOT build the web frontend. Deploy the site first (upload-firebase.js), then
// run this when the manifest, icons, or version change.

const { execSync } = require("child_process");
const { existsSync, mkdtempSync, copyFileSync, rmSync, readFileSync } = require("fs");
const { resolve, basename } = require("path");
const os = require("os");
const { runCli, captureCli, dockerAvailable, toContainerPath } = require("../../deploy-container");

// Everything below runs in the android service, from this directory.
const ANDROID = { service: "android", workdir: "/repo/badhan-frontend/bubblewrap" };

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

const ANDROID_IMAGE_HINT = "Build it with `docker compose --profile deploy build android`.";

// The JDK 17 and Android SDK locations are baked into the image's
// ~/.bubblewrap/config.json, so the host-side "did you run `bubblewrap doctor`"
// checks are gone. What can still go wrong is the opposite: the image and the
// gradle files drifting apart.
//
// The image reports what it actually installed via ENV rather than via a
// comment, so this compares the real numbers.
function imageEnv() {
  const env = {};
  for (const line of captureCli("printenv", ANDROID).split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
  return env;
}

// The Android SDK version is a second place compileSdkVersion lives: the image
// installs exactly one platform, where the host SDK happened to have several.
// A bubblewrap regeneration that bumps app/build.gradle to a new API — or the
// AGP classpath, which decides the default build-tools — must move
// badhan-android/Dockerfile with it, or the build dies inside gradle with an
// unrelated-looking error minutes in. Fail here instead, naming the fix.
function sdkVersionErrors(baseDir, env) {
  let appGradle;
  let rootGradle;
  try {
    appGradle = readFileSync(resolve(baseDir, "app", "build.gradle"), "utf8");
    rootGradle = readFileSync(resolve(baseDir, "build.gradle"), "utf8");
  } catch (e) {
    return [`bubblewrap: could not read the gradle files to check SDK versions (${e.message}).`];
  }

  const compileSdk = (appGradle.match(/compileSdkVersion\s+(\d+)/) || [])[1];
  const agp = (rootGradle.match(/com\.android\.tools\.build:gradle:([\d.]+)/) || [])[1];

  const errors = [];
  if (compileSdk && env.ANDROID_API && compileSdk !== env.ANDROID_API) {
    errors.push(
      `bubblewrap: app/build.gradle wants compileSdkVersion ${compileSdk} but the android image ` +
        `installed platform ${env.ANDROID_API}. Update ANDROID_API (and BUILD_TOOLS) in ` +
        "badhan-android/Dockerfile and rebuild."
    );
  }
  if (agp && env.AGP_VERSION && agp !== env.AGP_VERSION) {
    errors.push(
      `bubblewrap: build.gradle uses Android Gradle Plugin ${agp} but the android image was built ` +
        `for ${env.AGP_VERSION}. AGP decides the default build-tools version, so update AGP_VERSION ` +
        "and AGP_BUILD_TOOLS in badhan-android/Dockerfile and rebuild."
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
  // actionable fix, so report it before anything else. It all lives in the
  // android image now, so Docker is the requirement behind every other one.
  if (!dockerAvailable()) {
    errors.push(
      "bubblewrap: Docker is not available (the Android toolchain runs in the `android` container). " +
        "Start Docker Desktop and try again."
    );
  } else {
    if (captureCli("bubblewrap --version", ANDROID).length === 0) {
      errors.push(`bubblewrap: CLI not available in the android container. ${ANDROID_IMAGE_HINT}`);
    }
    if (publish && captureCli("fastlane --version", ANDROID).length === 0) {
      errors.push(`bubblewrap: fastlane not available in the android container. ${ANDROID_IMAGE_HINT}`);
    }
    errors.push(...sdkVersionErrors(baseDir, imageEnv()));
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
  // The passwords are forwarded by NAME (`-e BUBBLEWRAP_KEYSTORE_PASSWORD`), so
  // compose inherits the values from this process instead of putting them in
  // the host's command line where `ps` would show them.
  runCli(
    `bubblewrap build --skipPwaValidation --signingKeyPath "${toContainerPath(keystorePath)}" ` +
      `--signingKeyAlias "${keyAlias}"`,
    {
      ...ANDROID,
      passEnv: ["BUBBLEWRAP_KEYSTORE_PASSWORD", "BUBBLEWRAP_KEY_PASSWORD"],
      env: { BUBBLEWRAP_KEYSTORE_PASSWORD: password, BUBBLEWRAP_KEY_PASSWORD: password },
    }
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
  // Paths handed to a containerized command must be container paths: the host
  // absolute path from `resolve` means nothing inside the android container.
  runCli(
    [
      "fastlane supply",
      `--json_key "${toContainerPath(resolve(baseDir, PLAY_KEY_FILE))}"`,
      `--package_name "${packageId}"`,
      `--aab "${toContainerPath(aabPath)}"`,
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
    ANDROID
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
