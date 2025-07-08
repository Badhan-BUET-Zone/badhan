import fs from 'fs';
import dotenv, { DotenvConfigOutput } from 'dotenv';
import myConsole from '../utils/myConsole';

// ── resolve and verify env file ──────────────────────────────────────────
const envPath: string = `.env.${process.env.NODE_ENV ?? 'development'}`;  // ← explicit type

if (!fs.existsSync(envPath)) {
  myConsole.log(`🛑  Environment file "${envPath}" not found. Program will exit.`);
  process.exit(1);
}

const dotenvResult: DotenvConfigOutput = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  myConsole.log(`🛑  Failed to load "${envPath}": ${dotenvResult.error.message}`);
  process.exit(1);
}

// ── typed interface for process.env ─────────────────────────────────────
interface DotenvEnvFile {
  NODE_ENV: string;
  JWT_SECRET: string;
  VUE_APP_FRONTEND_BASE: string;
  RATE_LIMITER_ENABLE: string;
  MONGODB_URI: string;
}

// All required keys—each value asserted non-nullable with !
const dotenvEnvFile: DotenvEnvFile = {
  NODE_ENV: process.env.NODE_ENV!,
  JWT_SECRET: process.env.JWT_SECRET!,
  VUE_APP_FRONTEND_BASE: process.env.VUE_APP_FRONTEND_BASE!,
  RATE_LIMITER_ENABLE: process.env.RATE_LIMITER_ENABLE!,
  MONGODB_URI: process.env.MONGODB_URI!,
};

// ── check for missing vars ──────────────────────────────────────────────
Object.entries(dotenvEnvFile).forEach(
  ([key, value]: [string, string], _index: number): void => {  // ← types on both params + return
    if (value === undefined) {
      myConsole.log(`${key} is not defined in config. Program will exit.`);
      process.exit(1);
    }
  }
);

export default dotenvEnvFile;
