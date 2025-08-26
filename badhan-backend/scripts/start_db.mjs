#!/usr/bin/env node
// start_db.mjs — self-contained MongoDB launcher (Linux ▸ macOS ▸ Windows)

import { execSync, spawn } from 'node:child_process';
import {
  existsSync, mkdirSync, rmSync, writeFileSync, readFileSync,
  createWriteStream
} from 'node:fs';
import { platform, arch, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:https';

const __dirname   = resolve(fileURLToPath(import.meta.url), '..');
const env         = process.env;
const VERSION     = env.MONGO_VERSION || '7.0.14';
const PORT        = env.PORT         || '27017';
const BIND_IP     = env.BIND_IP      || '127.0.0.1';
// ROOT_DIR now lives inside badhan-backend (this script's working dir)
const ROOT_DIR    = resolve(env.ROOT_DIR || './mongodb_local');
const BIN_DIR     = join(ROOT_DIR, 'bin');
const DATA_DIR    = join(ROOT_DIR, 'data');
const LOG_FILE    = join(ROOT_DIR, 'mongod.log');
const LOCK_DIR    = join(ROOT_DIR, '.run_local_mongo.lock');

const die  = msg => { console.error(`❌ ${msg}`); process.exit(1); };
const need = cmd => {
  try { execSync(`${platform() === 'win32' ? 'where' : 'command -v'} ${cmd}`, { stdio:'ignore' }); }
  catch { die(`Need '${cmd}' in PATH`); }
};

/*──────────── Port / Lock helpers ────────────────────────────────────────*/
const portInUse = () => {
  try {
    if (platform() === 'win32') {
      // Keep rows whose state is LISTENING and have a non-zero PID
      const out = execSync(
        `netstat -ano -p tcp | findstr /R /C":"${PORT} .*LISTENING"`
      ).toString();
      return out.trim().length > 0;     // true ↔ someone is really listening
    }
    execSync(`lsof -iTCP:${PORT} -sTCP:LISTEN`, { stdio:'ignore' });
    return true;
  } catch { return false; }
};

const acquireLock = () => {
  mkdirSync(ROOT_DIR, { recursive:true });
  if (!existsSync(LOCK_DIR)) {
    mkdirSync(LOCK_DIR);
    writeFileSync(join(LOCK_DIR, 'pid'), `${process.pid}`);
    process.on('exit', () => rmSync(LOCK_DIR, { recursive:true, force:true }));
    return;
  }
  const pidFile = join(LOCK_DIR, 'pid');
  if (existsSync(pidFile)) {
    const old = readFileSync(pidFile,'utf8');
    try { process.kill(old, 0); die(`Another instance (PID ${old}) running in ${ROOT_DIR}`); }
    catch { console.warn(`⚠️  Stale lock (${old})—cleaning…`); }
  }
  rmSync(LOCK_DIR,{ recursive:true, force:true });
  acquireLock();
};

/*──────────── Download & extract MongoDB if needed ───────────────────────*/
const detectPlatform = () => {
  let OS, ARCH, EXT, EXE, FILE, URL;
  switch (platform()) {
    case 'darwin': OS='macos';   break;
    case 'linux':  OS='linux';   break;
    case 'win32':  OS='windows'; break;
    default: die(`Unsupported OS ${platform()}`);
  }
  switch (arch()) {
    case 'x64':   ARCH='x86_64'; break;
    case 'arm64': ARCH='arm64';  break;
    default:      ARCH='x86_64';
  }
  if (OS === 'windows') {
    FILE = `mongodb-windows-x86_64-${VERSION}.zip`;
    URL  = `https://fastdl.mongodb.org/windows/${FILE}`;
    EXT  = 'zip'; EXE='.exe';
  } else if (OS === 'macos') {
    FILE = `mongodb-macos-${ARCH}-${VERSION}.tgz`;
    URL  = `https://fastdl.mongodb.org/osx/${FILE}`;
    EXT  = 'tgz'; EXE='';
  } else {
    FILE = `mongodb-linux-${ARCH}-${VERSION}.tgz`;
    URL  = `https://fastdl.mongodb.org/linux/${FILE}`;
    EXT  = 'tgz'; EXE='';
  }
  return { EXT, EXE, FILE, URL };
};

const download = (url, dest) => new Promise((res, rej) => {
  const file = createWriteStream(dest);
  request(url, r => {
    if (r.statusCode !== 200) return rej(new Error(`Bad status ${r.statusCode}`));
    r.pipe(file); file.on('finish', () => file.close(res));
  }).on('error', rej).end();
});

const downloadAndExtract = async ({ EXT, FILE, URL }) => {
  mkdirSync(BIN_DIR, { recursive:true });
  const tmp = join(tmpdir(), `mongo_${Date.now()}`);
  mkdirSync(tmp, { recursive:true });
  const archive = join(tmp, FILE);

  console.log(`⬇️  Downloading MongoDB ${VERSION}…`);
  await download(URL, archive);

  console.log('📦 Extracting…');
  if (EXT === 'zip') { need('unzip'); execSync(`unzip -q "${archive}" -d "${tmp}"`); }
  else               { need('tar');  execSync(`tar -xzf "${archive}" -C "${tmp}"`); }

  const folder = execSync(`ls "${tmp}"`).toString().split('\n').find(f => f.startsWith('mongodb'));
  if (!folder) die('Extraction failed');
  const binPath = join(tmp, folder, 'bin');

  execSync(`cp "${binPath}"/* "${BIN_DIR}/"`);
  execSync(`chmod +x "${BIN_DIR}"/*`);
  console.log(`✅ MongoDB ready in ${BIN_DIR}`);
};

/*──────────── Start MongoDB & tie its lifetime to this script ───────────*/
let mongodProc=null;
const startMongo = ({ EXE }) => {
  mkdirSync(DATA_DIR, { recursive:true });
  writeFileSync(LOG_FILE,'',{ flag:'a' });

  const mongod = join(BIN_DIR, `mongod${EXE}`);
  if (!existsSync(mongod)) die(`mongod not found: ${mongod}`);

  console.log(`🚀 Starting mongod on ${PORT} (dbpath ${DATA_DIR})`);
  console.log(`📄 Logs → ${LOG_FILE}   ⛔ Ctrl+C stops everything`);

  mongodProc = spawn(mongod, [
    '--dbpath', DATA_DIR,
    '--port',   PORT,
    '--bind_ip',BIND_IP,
    '--logpath',LOG_FILE,
    '--logappend'
  ], {
    stdio:'inherit',
    detached: platform() !== 'win32'
  });
};

/*──────────── Graceful shutdown (called on exit, SIGINT, SIGTERM) ─────────*/
const stopMongo = () => {
  if (!mongodProc || mongodProc.killed) return;
  try {
    if (platform() === 'win32') {
      spawn('taskkill', ['/PID', mongodProc.pid, '/T', '/F']);
    } else {
      process.kill(-mongodProc.pid, 'SIGTERM');
    }
  } catch {/* ignore */}
};
['SIGINT','SIGTERM','SIGQUIT'].forEach(sig =>
  process.once(sig, () => { stopMongo(); process.exit(0); }));
process.on('exit', stopMongo);

/*──────────── Main ───────────────────────────────────────────────────────*/
if (portInUse()) die(`Port ${PORT} already in use`);
acquireLock();

const info = detectPlatform();
const mongodPath = join(BIN_DIR, `mongod${info.EXE}`);
if (!existsSync(mongodPath)) downloadAndExtract(info).then(() => startMongo(info));
else { console.log(`✅ Using cached MongoDB in ${BIN_DIR}`); startMongo(info); }
