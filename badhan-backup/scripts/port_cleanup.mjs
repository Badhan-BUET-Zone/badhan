import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);

/**
 * Kill all processes listening on the given ports.
 * Works on macOS, Linux, and Windows.
 * @param {number[]} ports - List of ports to kill.
 */
export const killPorts = async (ports) => {
  const platform = process.platform;

  for (const port of ports) {
    try {
      if (platform === 'win32') {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.split(/\r?\n/);
        const pids = new Set(
          lines
            .map(line => line.trim().split(/\s+/).pop())
            .filter(pid => pid && pid !== '0')
        );

        if (pids.size === 0) {
          console.log(`ℹ️ No process found on port ${port}`);
          continue;
        }

        for (const pid of pids) {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`✅ Killed process ${pid} on port ${port}`);
        }

      } else {
        const { stdout } = await execAsync(`lsof -ti tcp:${port}`);
        const pids = stdout.split(/\r?\n/).filter(Boolean);

        if (pids.length === 0) {
          console.log(`ℹ️ No process found on port ${port}`);
          continue;
        }

        for (const pid of pids) {
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ Killed process ${pid} on port ${port}`);
        }
      }
    } catch (err) {
      // Gracefully handle the case where lsof/netstat finds nothing
      if (
        err.stdout?.trim() === '' ||
        /No such process|No matching processes|not found/i.test(err.message)
      ) {
        console.log(`ℹ️ No process found on port ${port}`);
      } else {
        console.error(`❌ Failed to kill process on port ${port}:`, err.message);
      }
    }
  }
};
