#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { existsSync, writeFileSync } = require("fs");
const { resolve } = require("path");

function run(command) {
  return execSync(command, { stdio: "inherit" });
}

function getCurrentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
}

function requireFile(file) {
  const absolute = resolve(process.cwd(), file);
  if (!existsSync(absolute)) {
    console.error(`🛑  Deploy halted: required file "${file}" not found.`);
    process.exit(1);
  }
}

function updateLastDeployed() {
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
  writeFileSync(resolve(process.cwd(), "last_deployed.txt"), `${formatted}\n`, {
    encoding: "utf8",
  });
}

function main() {
  try {
    const currentBranch = getCurrentBranch();
    if (currentBranch === "main") {
      requireFile(".env.production");
      updateLastDeployed();
      run("gcloud app deploy --project badhan-buet ./app_prod.yaml --quiet");
    } else {
      requireFile(".env.development");
      updateLastDeployed();
      run("gcloud app deploy --project badhan-buet-test ./app_dev.yaml --quiet");
    }
  } catch (err) {
    // child_process throws with status code; ensure non-zero exit for CI visibility
    if (err && typeof err.status === "number") {
      process.exit(err.status || 1);
    }
    console.error(err);
    process.exit(1);
  }
}

main();


