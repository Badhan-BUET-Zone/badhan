import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Generate a random ANSI color code.
 * @returns {string}
 */
function getRandomColorCode() {
  const colors = [31, 32, 33, 34, 35, 36, 91, 92, 93, 94, 95, 96]; // standard + bright colors
  const code = colors[Math.floor(Math.random() * colors.length)];
  return `\x1b[${code}m`;
}

/**
 * Run multiple shell commands in parallel with specified working directories and labels.
 * @param {Array<{ workingDir: string, cmd: string, label: string }>} jobs
 * @returns {Promise<void>}
 */
export async function runProcessesInParallel(jobs) {
  const processes = jobs.map(({ workingDir, cmd, label }) => {
    const [executable, ...args] = cmd.split(' ');
    const color = getRandomColorCode();
    const resetColor = '\x1b[0m';

    const proc = spawn(executable, args, {
      cwd: resolve(workingDir),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    proc.stdout.on('data', data => {
      process.stdout.write(`${color}[${label}]${resetColor} ${data}`);
    });

    proc.stderr.on('data', data => {
      process.stderr.write(`${color}[${label} ERROR]${resetColor} ${data}`);
    });

    return new Promise((resolve, reject) => {
      proc.on('close', code => {
        if (code === 0) {
          resolve({ label, color });
        } else {
          reject(new Error(`${label} exited with code ${code}`));
        }
      });
    });
  });

  await Promise.allSettled(processes).then(results => {
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { label, color } = result.value;
        console.log(`${color}[${label}]${resetColor} finished successfully`);
      } else {
        console.error(`[${result.reason.message}]`);
      }
    });
  });
}
