import fs from 'fs';
import dotenv, { DotenvConfigOutput } from 'dotenv';
import myConsole from '../utils/myConsole';

/* ── constants ─────────────────────────────────────────────────── */
type EnvironmentTypes = {                              // 🆕 explicit type
  DEVELOPMENT: 'development';
  PRODUCTION:  'production';
};

const ENVIRONMENT_TYPES: EnvironmentTypes = {          // 🆕 typed variable
  DEVELOPMENT: 'development',
  PRODUCTION:  'production',
} as const;

/* A union derived automatically: 'development' | 'production' */
type EnvironmentLiteral = typeof ENVIRONMENT_TYPES[keyof typeof ENVIRONMENT_TYPES];

/* ── resolve and verify env file ──────────────────────────────── */
const envPath: string =                                // 🆕 annotate
  `env.${process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT}`;

if (!fs.existsSync(envPath)) {
  myConsole.log(`🛑  Environment file "${envPath}" not found. Program will exit.`);
  process.exit(1);
}

const dotenvResult: DotenvConfigOutput = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  myConsole.log(`🛑  Failed to load "${envPath}": ${dotenvResult.error.message}`);
  process.exit(1);
}

/* ── typed interface for process.env ───────────────────────────── */
interface DotenvEnvFile {
  NODE_ENV:            EnvironmentLiteral;
  JWT_SECRET:          string;
  VUE_APP_FRONTEND_BASE: string;
  RATE_LIMITER_ENABLE: string;
  MONGODB_URI:         string;
}

/* All required keys—each value asserted non‑nullable with ! */
const dotenvEnvFile: DotenvEnvFile = {
  NODE_ENV:            (process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT) as EnvironmentLiteral,
  JWT_SECRET:          process.env.JWT_SECRET!,
  VUE_APP_FRONTEND_BASE: process.env.VUE_APP_FRONTEND_BASE!,
  RATE_LIMITER_ENABLE: process.env.RATE_LIMITER_ENABLE!,
  MONGODB_URI:         process.env.MONGODB_URI!,
};

/* ── helpers ───────────────────────────────────────────────────── */
export const isEnvironmentProduction = (): boolean =>
  dotenvEnvFile.NODE_ENV === ENVIRONMENT_TYPES.PRODUCTION;

/* ── check for missing vars ───────────────────────────────────── */
(Object.entries(dotenvEnvFile) as [keyof DotenvEnvFile, string][])
  .forEach(([key, value]: [keyof DotenvEnvFile, string]): void => {
    if (!value) {               // catches '' or undefined
      myConsole.log(`${key} is not defined in config. Program will exit.`);
      process.exit(1);
    }
  });



export default dotenvEnvFile;
