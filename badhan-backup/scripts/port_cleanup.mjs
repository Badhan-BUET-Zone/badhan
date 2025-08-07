import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);

/**
 * Kill all processes listening on the given ports (macOS, Linux, Windows).
 * @param {number[]} ports
 */
export const killPorts = async (ports) => {
  const platform = process.platform;

  for (const port of ports) {
    try {
      if (platform === "win32") {
        // 1. pure-regex search so LISTENING lines are returned
        const { stdout } = await execAsync(
          `netstat -aon -p tcp | findstr /R ":${port}.*LISTENING"`
        );

        // 2. trim → split → last token = PID -- de-dup with Set
        const pids = [
          ...new Set(
            stdout
              .split(/\r?\n/)
              .filter(Boolean)
              .map((l) => l.trim().split(/\s+/).pop())
              .filter((pid) => pid && pid !== "0")
          ),
        ];

        if (pids.length === 0) {
          console.log(`ℹ️  No process found on port ${port}`);
          continue;
        }

        for (const pid of pids) {
          await execAsync(`taskkill /PID ${pid} /T /F`);
          console.log(`✅ Killed process ${pid} on port ${port}`);
        }
      } else {
        // macOS / Linux
        const { stdout } = await execAsync(`lsof -ti tcp:${port}`);
        const pids = stdout.split(/\r?\n/).filter(Boolean);

        if (pids.length === 0) {
          console.log(`ℹ️  No process found on port ${port}`);
          continue;
        }

        for (const pid of pids) {
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ Killed process ${pid} on port ${port}`);
        }
      }
    } catch (err) {
      // execAsync throws when the pipeline yields no matches; treat that as “nothing to kill”
      if (
        err.stdout?.trim() === "" ||
        /No such process|No matching processes|not found|exit code 1/i.test(
          err.message
        )
      ) {
        console.log(`ℹ️  No process found on port ${port}`);
      } else {
        console.error(`❌ Failed to kill process on port ${port}:`, err.message);
      }
    }
  }
};
