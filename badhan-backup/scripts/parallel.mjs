// run long-running commands side-by-side (Linux / macOS / Windows)
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const COLORS = [31,32,33,34,35,36,91,92,93,94,95,96];
const RST    = '\x1b[0m';
const rndClr = () => `\x1b[${COLORS[Math.floor(Math.random()*COLORS.length)]}m`;

/**
 * Run multiple commands in parallel.
 * @param {Array<{ workingDir:string, cmd:string, label:string }>} jobs
 */
export async function runProcessesInParallel(jobs) {
  const children = [];

  const promises = jobs.map(({ workingDir, cmd, label }) => {
    const [exe, ...args] = cmd.split(' ');
    const color = rndClr();

    const child = spawn(exe, args, {
      cwd      : resolve(workingDir),
      shell    : true,
      detached : process.platform !== 'win32',  // ← only POSIX needs this
      windowsHide : process.platform === 'win32', // hide if we ever do detach
      stdio    : ['ignore','pipe','pipe'],       // streams come back to us
    });
    child.$label = label;
    child.$color = color;
    children.push(child);

    child.stdout.on('data', d =>
      process.stdout.write(`${color}[${label}]${RST} ${d}`));
    child.stderr.on('data', d =>
      process.stderr.write(`${color}[${label} ERROR]${RST} ${d}`));

    return new Promise((ok, err) =>
      child.on('close', code =>
        code === 0 ? ok(child)
                   : err(new Error(`${label} exited with ${code}`))));
  });

  /* ─── group-aware tree-killer ─────────────────────────────── */
  const killTree = sig => {
    for (const p of children) {
      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'],
                    { stdio: 'ignore' });
        } else {
          process.kill(-p.pid, sig);           // negative PID ⇒ group
        }
      } catch {/* already gone */}
    }
  };

  const exitWith = code => () => { killTree('SIGTERM'); process.exit(code); };
  process.once('SIGINT',  exitWith(130));      // Ctrl-C
  process.once('SIGTERM', exitWith(143));
  process.on('exit',      () => killTree('SIGTERM'));   // safety-net

  /* ─── wait & summarise ────────────────────────────────────── */
  const results = await Promise.allSettled(promises);
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      const { $label:lbl, $color:clr } = r.value;
      console.log(`${clr}[${lbl}]${RST} finished successfully`);
    } else {
      console.error(`❌  ${r.reason.message}`);
    }
  });
}
