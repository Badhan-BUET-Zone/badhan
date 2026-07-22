#!/usr/bin/env node
"use strict";

// Fetches the secrets required by the backup/restore internal server from the
// private secrets repo and drops them into badhan-backend/config (gitignored and
// gcloudignored). Uses a throwaway shallow clone that is always removed.
//
//   node scripts/fetch-backup-secrets.js
//
// Override access via env vars if you clone over SSH:
//   SECRETS_REPO_URL=git@github.com:Badhan-BUET-Zone/secrets.git \
//   SECRETS_BRANCH=main node scripts/fetch-backup-secrets.js

const { execSync } = require("child_process");
const { existsSync, mkdirSync, mkdtempSync, copyFileSync, rmSync } = require("fs");
const { resolve, dirname } = require("path");
const os = require("os");

const SECRETS_REPO_URL =
  process.env.SECRETS_REPO_URL ||
  "https://github.com/Badhan-BUET-Zone/secrets.git";
const SECRETS_BRANCH = process.env.SECRETS_BRANCH || "main";
// Directory within the secrets repo that holds the backup config.
const SECRETS_SUBDIR = "badhan-backup/config";

// badhan-backend root (this script lives in badhan-backend/scripts).
const BASE_DIR = resolve(__dirname, "..");

// Each secret: path within SECRETS_SUBDIR -> destination relative to BASE_DIR.
// - config.env               : backup MongoDB URIs / settings
// - badhan-buet-...json       : Firebase service account (default path the
//                               internal server looks for; see internalRoutes)
const FILES = [
  { src: "config.env", dest: "config/config.env" },
  {
    src: "badhan-buet-1d20b088a755.json",
    dest: "config/badhan-buet-1d20b088a755.json",
  },
];

function main() {
  const tmp = mkdtempSync(resolve(os.tmpdir(), "badhan-backup-secrets-"));
  try {
    console.log(`🔐  Cloning ${SECRETS_REPO_URL}@${SECRETS_BRANCH}…`);
    execSync(
      `git clone --depth 1 --branch ${SECRETS_BRANCH} ${SECRETS_REPO_URL} "${tmp}"`,
      { stdio: "inherit" }
    );

    for (const { src, dest } of FILES) {
      const from = resolve(tmp, SECRETS_SUBDIR, src);
      if (!existsSync(from)) {
        throw new Error(
          `"${SECRETS_SUBDIR}/${src}" not found in secrets repo (${SECRETS_REPO_URL}@${SECRETS_BRANCH}).`
        );
      }
      const to = resolve(BASE_DIR, dest);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
      console.log(`✅  ${dest}`);
    }

    console.log("🎉  Backup secrets fetched.");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

try {
  main();
} catch (e) {
  console.error(`🛑  ${e.message || e}`);
  process.exit(1);
}
