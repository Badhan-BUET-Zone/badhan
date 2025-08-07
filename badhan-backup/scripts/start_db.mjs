#!/usr/bin/env node
// run_local_mongo.mjs — self-contained MongoDB launcher (Linux ▸ macOS ▸ Git-Bash ▸ Windows)

import { execSync, spawn } from 'node:child_process';
import {
  existsSync, mkdirSync, rmSync, writeFileSync, readFileSync,
  createWriteStream
} from 'node:fs';
import { platform, arch, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:https';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

const env = process.env;
const MONGO_VERSION = env.MONGO_VERSION || '7.0.14';
const PORT = env.PORT || '27017';
const BIND_IP = env.BIND_IP || '127.0.0.1';
const ROOT_DIR = resolve(env.ROOT_DIR || './mongodb_local');
const BIN_DIR = join(ROOT_DIR, 'bin');
const DATA_DIR = join(ROOT_DIR, 'data');
const LOG_FILE = join(ROOT_DIR, 'mongod.log');
const LOCK_DIR = join(ROOT_DIR, '.run_local_mongo.lock');

const die = (msg) => {
  console.error(`❌ ${msg}`);
  process.exit(1);
};

const need = (cmd) => {
  try {
    execSync(`${platform() === 'win32' ? 'where' : 'command -v'} ${cmd}`, { stdio: 'ignore' });
  } catch {
    die(`Need '${cmd}' in PATH`);
  }
};

const portInUse = () => {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${PORT}`).toString();
      return output.includes(`:${PORT}`);
    } else {
      execSync(`lsof -iTCP:${PORT} -sTCP:LISTEN`, { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
};

const acquireLock = () => {
  mkdirSync(ROOT_DIR, { recursive: true });

  if (!existsSync(LOCK_DIR)) {
    mkdirSync(LOCK_DIR);
    writeFileSync(join(LOCK_DIR, 'pid'), `${process.pid}`);
    process.on('exit', () => rmSync(LOCK_DIR, { recursive: true, force: true }));
    return;
  }

  const pidPath = join(LOCK_DIR, 'pid');
  if (existsSync(pidPath)) {
    const oldpid = readFileSync(pidPath, 'utf-8');
    try {
      process.kill(oldpid, 0);
      die(`Another instance (PID ${oldpid}) is already running in ${ROOT_DIR}`);
    } catch {
      console.warn(`⚠️  Stale lock detected (PID ${oldpid} is not running). Cleaning up…`);
      rmSync(LOCK_DIR, { recursive: true });
      acquireLock();
    }
  } else {
    console.warn(`⚠️  Lock directory exists without pid file. Cleaning up…`);
    rmSync(LOCK_DIR, { recursive: true });
    acquireLock();
  }
};

const detectPlatform = () => {
  let OS, ARCH, EXT, EXE_SUFFIX, FILE, URL;

  switch (platform()) {
    case 'darwin': OS = 'macos'; break;
    case 'linux': OS = 'linux'; break;
    case 'win32': OS = 'windows'; break;
    default: die(`Unsupported OS: ${platform()}`);
  }

  switch (arch()) {
    case 'x64': ARCH = 'x86_64'; break;
    case 'arm64': ARCH = 'arm64'; break;
    default: ARCH = 'x86_64'; console.warn(`⚠️  Unknown arch '${arch()}', defaulting to x86_64`);
  }

  if (OS === 'windows') {
    FILE = `mongodb-windows-x86_64-${MONGO_VERSION}.zip`;
    URL = `https://fastdl.mongodb.org/windows/${FILE}`;
    EXT = 'zip';
    EXE_SUFFIX = '.exe';
  } else if (OS === 'macos') {
    FILE = `mongodb-macos-${ARCH}-${MONGO_VERSION}.tgz`;
    URL = `https://fastdl.mongodb.org/osx/${FILE}`;
    EXT = 'tgz';
    EXE_SUFFIX = '';
  } else {
    FILE = `mongodb-linux-${ARCH}-${MONGO_VERSION}.tgz`;
    URL = `https://fastdl.mongodb.org/linux/${FILE}`;
    EXT = 'tgz';
    EXE_SUFFIX = '';
  }

  return { OS, ARCH, EXT, EXE_SUFFIX, FILE, URL };
};

const fetch = (url, dest) =>
  new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    request(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Failed to download ${url}`));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject).end();
  });

const downloadAndExtract = async ({ EXT, FILE, URL }) => {
  mkdirSync(BIN_DIR, { recursive: true });
  const temp = join(tmpdir(), `mongo_${Date.now()}`);
  mkdirSync(temp, { recursive: true });
  const archive = join(temp, FILE);

  console.log(`⬇️  Downloading MongoDB ${MONGO_VERSION}…`);
  await fetch(URL, archive);

  console.log(`📦 Extracting…`);
  if (EXT === 'zip') {
    need('unzip');
    execSync(`unzip -q "${archive}" -d "${temp}"`);
  } else {
    need('tar');
    execSync(`tar -xzf "${archive}" -C "${temp}"`);
  }

  const folders = execSync(`ls "${temp}"`).toString().split('\n').filter(x => x.startsWith('mongodb') && x.trim());
  if (!folders.length) die('Extraction failed (no mongodb folder found)');
  const binPath = join(temp, folders[0], 'bin');

  const binaries = execSync(`ls "${binPath}"`).toString().split('\n').filter(x => x.trim());
  binaries.forEach((file) => {
    const src = join(binPath, file);
    const dst = join(BIN_DIR, file);
    execSync(`cp "${src}" "${dst}"`);
    execSync(`chmod +x "${dst}"`);
  });

  console.log(`✅ MongoDB binaries ready in ${BIN_DIR}`);
};

const startMongo = ({ EXE_SUFFIX }) => {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(LOG_FILE, '', { flag: 'a' });

  const mongod = join(BIN_DIR, `mongod${EXE_SUFFIX}`);
  if (!existsSync(mongod)) die(`mongod not found at ${mongod}`);

  console.log(`🚀 Starting mongod on port ${PORT} (dbpath: ${DATA_DIR})…`);
  console.log(`📄 Logs: ${LOG_FILE}`);
  console.log(`⛔ Press Ctrl+C to stop.`);

  spawn(mongod, [
    '--dbpath', DATA_DIR,
    '--port', PORT,
    '--bind_ip', BIND_IP,
    '--logpath', LOG_FILE,
    '--logappend'
  ], {
    stdio: 'inherit'
  });
};

// ──────────────── MAIN ────────────────
if (portInUse()) die(`Port ${PORT} is already in use – another mongod (or something else) is running.`);
acquireLock();

const platformInfo = detectPlatform();
const mongodPath = join(BIN_DIR, `mongod${platformInfo.EXE_SUFFIX}`);
if (!existsSync(mongodPath)) {
  downloadAndExtract(platformInfo).then(() => startMongo(platformInfo));
} else {
  console.log(`✅ Found existing MongoDB in ${BIN_DIR} — skipping download.`);
  startMongo(platformInfo);
}
