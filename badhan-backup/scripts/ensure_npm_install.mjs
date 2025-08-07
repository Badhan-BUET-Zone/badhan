import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync, existsSync, statSync, writeFileSync
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

/**
 * Idempotent `npm install` (cross-platform).
 * Creates stamp files in `.npm_install_stamps/` next to this script.
 *
 * @param {string} directory – project root
 */
export async function ensureNpmInstall(directory = '.') {
  const die = (msg) => { throw new Error(`❌ ${msg}`); };

  // 0. Paths -----------------------------------------------------------------
  const __filename = fileURLToPath(import.meta.url);
  const __dirname  = dirname(__filename);
  const stampRoot  = join(__dirname, '.npm_install_stamps');
  mkdirSync(stampRoot, { recursive: true });

  // 1. Locate project --------------------------------------------------------
  const projDir = resolve(directory);
  if (!existsSync(projDir))          die(`Directory not found: ${projDir}`);
  const packageJson = join(projDir, 'package.json');
  if (!existsSync(packageJson))      die(`package.json not found in ${projDir}`);

  // 2. Stamp file ------------------------------------------------------------
  const hash   = createHash('sha1').update(projDir).digest('hex');
  const stamp  = join(stampRoot, `${hash}.stamp`);

  // 3. Decide if we need to run npm -----------------------------------------
  const lock   = ['package-lock.json', 'npm-shrinkwrap.json']
                   .map(f => join(projDir, f))
                   .find(existsSync);

  const stampTime = existsSync(stamp) ? statSync(stamp).mtimeMs : 0;
  const needInstall =
        !existsSync(join(projDir, 'node_modules')) ||
        !existsSync(stamp) ||
        statSync(packageJson).mtimeMs > stampTime ||
        (lock && statSync(lock).mtimeMs > stampTime);

  // 4. Run npm (Windows-safe) -----------------------------------------------
  if (needInstall) {
    console.log(`➡️  Running \`npm install\` in ${projDir}…`);

    const npmExe = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(
      npmExe,
      ['install'],
      {
        cwd:   projDir,
        stdio: 'inherit',
        // Windows: .cmd must be spawned via shell; no harm on *nix.
        shell: process.platform === 'win32'
      }
    );

    if (result.error)            die(result.error.message);
    if (result.status !== 0)     die(`npm install failed (exit ${result.status})`);

    writeFileSync(stamp, `${Date.now()}\n`);
    console.log(`✅  Dependencies installed (stamp updated).`);
  } else {
    console.log(`✔️  ${projDir} already up to date – skipping npm install.`);
  }
}
