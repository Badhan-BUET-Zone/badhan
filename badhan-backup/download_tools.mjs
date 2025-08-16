#!/usr/bin/env node
// get_mongo_tools.mjs — download + extract mongodump/mongorestore (MongoDB Database Tools)
// Usage:
//   TOOLS_VERSION=100.9.4 node get_mongo_tools.mjs
//   TOOLS_VERSION=100.9.4 OUT_DIR=./local-tools node get_mongo_tools.mjs
//
// Defaults:
//   TOOLS_VERSION: 100.9.4 (change if you need another)
//   OUT_DIR: ./mongotools
//
// Notes:
// - Linux/macOS: uses system `tar` to extract .tgz / .tar.gz
// - Windows: uses PowerShell `Expand-Archive` to extract .zip
// - Arch mapping: x64 → x86_64; arm64 → aarch64 (linux), arm64 (mac), x86_64 (win fallback)

import { createWriteStream, chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { request } from 'node:https';
import { spawnSync } from 'node:child_process';

const TOOLS_VERSION = process.env.TOOLS_VERSION || '100.9.4';
const OUT_DIR = resolve(process.env.OUT_DIR || './mongotools');
const BIN_DIR = join(OUT_DIR, 'bin');
const BASE = 'https://fastdl.mongodb.org/tools/db/';

const PLATFORM = process.platform;  // 'win32' | 'darwin' | 'linux'
const ARCH = process.arch;          // 'x64' | 'arm64' | etc.

function mapArch(platform, arch) {
  if (platform === 'linux') {
    if (arch === 'x64') return 'x86_64';
    if (arch === 'arm64') return 'aarch64';
  }
  if (platform === 'darwin') {
    if (arch === 'x64') return 'x86_64';
    if (arch === 'arm64') return 'arm64';
  }
  if (platform === 'win32') {
    // MongoDB tools on Windows are typically x86_64. Use that, even on ARM64 (runs under emulation).
    return 'x86_64';
  }
  throw new Error(`Unsupported platform/arch combo: ${platform}/${arch}`);
}

function buildFilename(platform, archMapped, version) {
  if (platform === 'linux')  return `mongodb-database-tools-linux-${archMapped}-${version}.tgz`;
  if (platform === 'darwin') return `mongodb-database-tools-macos-${archMapped}-${version}.zip`;
  if (platform === 'win32')  return `mongodb-database-tools-windows-${archMapped}-${version}.zip`;
  throw new Error(`Unsupported platform: ${platform}`);
}

async function headOk(url) {
  return new Promise((resolve) => {
    const req = request(url, { method: 'HEAD' }, res => {
      resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 300);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function download(url, toPath) {
  await new Promise((resolve, reject) => {
    const file = createWriteStream(toPath);
    const req = request(url, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow one redirect
        res.destroy();
        download(res.headers.location, toPath).then(resolve, reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`Download failed: ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      pipeline(res, file).then(resolve, reject);
    });
    req.on('error', reject);
    req.end();
  });
}

function extract(archivePath, destDir) {
  mkdirSync(destDir, { recursive: true });
  if (PLATFORM === 'linux' || PLATFORM === 'darwin') {
    // Use system tar for .tgz or .tar.gz (Linux uses .tgz; mac uses .zip but we still keep tar here for Linux)
    if (archivePath.endsWith('.tgz') || archivePath.endsWith('.tar.gz')) {
      const r = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error('Extraction failed (tar)');
    } else if (archivePath.endsWith('.zip')) {
      // macOS ships 'ditto' which can handle zip reliably
      const r = spawnSync('ditto', ['-x', '-k', archivePath, destDir], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error('Extraction failed (ditto unzip)');
    } else {
      throw new Error(`Unknown archive format: ${archivePath}`);
    }
  } else if (PLATFORM === 'win32') {
    // Use PowerShell Expand-Archive
    const ps = [
      'powershell',
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      'Expand-Archive',
      '-LiteralPath', archivePath,
      '-DestinationPath', destDir,
      '-Force'
    ];
    const r = spawnSync(ps[0], ps.slice(1), { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('Extraction failed (Expand-Archive)');
  } else {
    throw new Error(`Unsupported platform for extraction: ${PLATFORM}`);
  }
}

function findExtractedRoot(dir) {
  // Look for the extracted folder that starts with 'mongodb-database-tools-'
  const entries = readdirSync(dir, { withFileTypes: true });
  const match = entries.find(e => e.isDirectory() && e.name.startsWith('mongodb-database-tools-'));
  if (!match) throw new Error('Could not locate extracted tools folder');
  return join(dir, match.name);
}

function installBinaries(extractedRoot, outDir) {
  mkdirSync(BIN_DIR, { recursive: true });
  const srcBin = join(extractedRoot, 'bin');

  const candidates = ['mongodump', 'mongorestore'];
  for (const base of candidates) {
    const src = PLATFORM === 'win32' ? join(srcBin, `${base}.exe`) : join(srcBin, base);
    const dst = PLATFORM === 'win32' ? join(BIN_DIR, `${base}.exe`) : join(BIN_DIR, base);
    if (!existsSync(src)) {
      throw new Error(`Expected binary not found in archive: ${src}`);
    }
    copyFileSync(src, dst);
    if (PLATFORM !== 'win32') {
      chmodSync(dst, 0o755);
    }
    console.log(`✅ Installed ${dst}`);
  }
}

(async () => {
  try {
    // Parse --clean argument
    const args = process.argv.slice(2);
    const clean = args.includes('--clean');

    // If --clean, remove OUT_DIR
    if (clean && existsSync(OUT_DIR)) {
      console.log(`--clean specified: removing ${OUT_DIR}`);
      rmSync(OUT_DIR, { recursive: true, force: true });
    }

    // If not --clean and BIN_DIR exists and has binaries, skip install
    if (!clean && existsSync(BIN_DIR)) {
      const bins = ['mongodump', 'mongorestore'].map(b => PLATFORM === 'win32' ? `${b}.exe` : b);
      const present = bins.every(b => existsSync(join(BIN_DIR, b)));
      if (present) {
        console.log(`Binaries already installed in ${BIN_DIR}. Skipping download and install.`);
        process.exit(0);
      }
    }

    const archMapped = mapArch(PLATFORM, ARCH);
    const filename = buildFilename(PLATFORM, archMapped, TOOLS_VERSION);
    const url = BASE + filename;

    console.log(`→ Platform: ${PLATFORM}, Arch: ${ARCH} → ${archMapped}`);
    console.log(`→ Version: ${TOOLS_VERSION}`);
    console.log(`→ URL: ${url}`);

    const ok = await headOk(url);
    if (!ok) {
      throw new Error(`Tools not found at ${url}. Try setting TOOLS_VERSION to a valid version (e.g., 100.9.4).`);
    }

    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(BIN_DIR, { recursive: true });

    const tmpPath = join(tmpdir(), filename);
    console.log(`↓ Downloading to ${tmpPath} ...`);
    await download(url, tmpPath);
    console.log('✓ Download complete');

    const extractDir = join(tmpdir(), `mdb-tools-extract-${Date.now()}`);
    console.log(`• Extracting to ${extractDir} ...`);
    extract(tmpPath, extractDir);
    console.log('✓ Extracted');

    const root = findExtractedRoot(extractDir);
    installBinaries(root, OUT_DIR);

    // Clean temp
    try { rmSync(tmpPath, { force: true }); } catch {}
    try { rmSync(extractDir, { recursive: true, force: true }); } catch {}

    console.log(`\nAll set! Binaries in: ${BIN_DIR}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
