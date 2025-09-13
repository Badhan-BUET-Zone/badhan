#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { existsSync } = require("fs");

function run(command, options = {}) {
  return execSync(command, { stdio: "inherit", ...options });
}

function getCurrentBranch() {
  try {
    return execSync("git symbolic-ref --short HEAD", { encoding: "utf8" }).trim();
  } catch (e) {
    return "";
  }
}

function ensureFirebaseToolsInstalled() {
  try {
    execSync("npx --no-install firebase --version", { stdio: "ignore" });
  } catch (_) {
    console.log("ℹ️  firebase-tools not found in node_modules. Installing as dev dependency…");
    run("npm install --save-dev firebase-tools");
  }
}

function main() {
  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.error("❌  Unable to determine the current Git branch. Aborting.");
    process.exit(1);
  }

  console.log(`🔍  Current branch: ${currentBranch}`);

  let buildCmd;
  let firebaseProject;
  switch (currentBranch) {
    case "main":
      buildCmd = "npm run build";
      firebaseProject = "badhan-buet";
      break;
    default:
      buildCmd = "npm run build:development";
      firebaseProject = "badhan-buet-test";
  }

  ensureFirebaseToolsInstalled();

  console.log(`🔨  Running build command: ${buildCmd}`);
  run(buildCmd);

  console.log(`🚀  Deploying to Firebase project '${firebaseProject}'…`);
  const configFile = `firebase.${firebaseProject}.json`;

  run(
    `npx --no-install firebase deploy --only hosting --project "${firebaseProject}" --config "${configFile}"`
  );

  console.log("✅  Deployment complete.");
}

try {
  main();
} catch (err) {
  if (err && typeof err.status === "number") {
    process.exit(err.status || 1);
  }
  console.error(err);
  process.exit(1);
}


