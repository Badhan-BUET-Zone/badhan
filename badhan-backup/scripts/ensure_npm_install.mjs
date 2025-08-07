import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  existsSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

/**
 * Idempotent `npm install` for a given project directory.
 * Creates stamp files in `.npm_install_stamps/` relative to this script.
 *
 * @param {string} directory - Absolute or relative path to the target project
 */
export async function ensureNpmInstall(directory) {
  const die = (msg) => {
    throw new Error(`❌ ${msg}`);
  };

  // ─── 0. Paths ─────────────────────────────────────────────
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const stampRoot = join(__dirname, '.npm_install_stamps');
  mkdirSync(stampRoot, { recursive: true });

  // ─── 1. Locate project ───────────────────────────────────
  const projDir = resolve(directory || '.');
  if (!existsSync(projDir)) die(`Directory not found: ${projDir}`);

  const packageJsonPath = join(projDir, 'package.json');
  if (!existsSync(packageJsonPath)) die(`package.json not found in ${projDir}`);

  // ─── 2. Stamp location ───────────────────────────────────
  const projAbs = resolve(projDir);
  const hash = createHash('sha1').update(projAbs).digest('hex');
  const stamp = join(stampRoot, `${hash}.stamp`);

  // ─── 3. Check if install is needed ───────────────────────
  const lockfile = join(projDir, 'package-lock.json'); // or 'npm-shrinkwrap.json'
  let needInstall = false;

  if (!existsSync(join(projDir, 'node_modules'))) needInstall = true;
  if (!existsSync(stamp)) needInstall = true;

  const pkgTime = statSync(packageJsonPath).mtimeMs;
  const stampTime = existsSync(stamp) ? statSync(stamp).mtimeMs : 0;

  if (pkgTime > stampTime) needInstall = true;
  if (existsSync(lockfile) && statSync(lockfile).mtimeMs > stampTime)
    needInstall = true;

  // ─── 4. Run install if needed ────────────────────────────
  if (needInstall) {
    console.log(`➡️  Running \`npm install\` in ${projDir} ...`);
    const result = spawnSync('npm', ['install'], {
      cwd: projDir,
      stdio: 'inherit',
    });

    if (result.status === 0) {
      writeFileSync(stamp, `${Date.now()}\n`);
      console.log(`✅  Dependencies installed. (stamp: ${stamp})`);
    } else {
      die(`npm install failed in ${projDir}`);
    }
  } else {
    console.log(`✔️  Already up‑to‑date – skipping npm install in ${projDir}.`);
  }
}
