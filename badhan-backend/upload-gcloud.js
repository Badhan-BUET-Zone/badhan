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

function requireFile(baseDir, file) {
  const absolute = resolve(baseDir, file);
  if (!existsSync(absolute)) {
    console.error(`🛑  Deploy halted: required file "${file}" not found.`);
    process.exit(1);
  }
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
    const currentBranch = getCurrentBranch();
    if (currentBranch === "main") {
      requireFile(baseDir, ".env.production");
      updateLastDeployed(baseDir);
      run("gcloud app deploy --project badhan-buet ./app_prod.yaml --quiet", baseDir);
    } else {
      requireFile(baseDir, ".env.development");
      updateLastDeployed(baseDir);
      run("gcloud app deploy --project badhan-buet-test ./app_dev.yaml --quiet", baseDir);
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

// Export the function for use in other files
module.exports = { deployToGoogleCloud };

// Run the function if this script is executed directly
if (require.main === module) {
  deployToGoogleCloud();
}


