#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { existsSync } = require("fs");

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

function ensureFirebaseToolsInstalled(baseDir) {
  try {
    execSync("npx --no-install firebase --version", { stdio: "ignore" });
  } catch (_) {
    console.log("ℹ️  firebase-tools not found in node_modules. Installing as dev dependency…");
    run("npm install --save-dev firebase-tools", baseDir);
  }
}

function deployToFirebase() {
  const baseDir = __dirname; // ensure all commands run in badhan-frontend directory
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

// Export the function for use in other files
module.exports = { deployToFirebase };

// Run the function if this script is executed directly
if (require.main === module) {
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


