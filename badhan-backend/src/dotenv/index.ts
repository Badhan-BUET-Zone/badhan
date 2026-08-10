import fs from 'fs';
import dotenv, { DotenvConfigOutput } from 'dotenv';
import myConsole from '../utils/myConsole';

/* ── constants ─────────────────────────────────────────────────── */
/* The three environment names, spelled the same way everywhere in the
 * ecosystem. Duplicated here from environments.js at the repo root on purpose:
 * no build step ships that host-side module into this app. */
type EnvironmentTypes = {
  PRODUCTION:  'production';
  DEVELOPMENT: 'development';
  LOCAL:       'local';
};

export const ENVIRONMENT_TYPES: EnvironmentTypes = {
  PRODUCTION:  'production',
  DEVELOPMENT: 'development',
  LOCAL:       'local',
} as const;

/* A union derived automatically: 'production' | 'development' | 'local' */
export type EnvironmentLiteral = typeof ENVIRONMENT_TYPES[keyof typeof ENVIRONMENT_TYPES];

const ENVIRONMENT_NAMES: EnvironmentLiteral[] = Object.values(ENVIRONMENT_TYPES);

/* ── NODE_ENV is mandatory ────────────────────────────────────────
 * Not defaulted: an unset NODE_ENV used to load env.development and connect to
 * the *shared* development database, which is never what someone hand-running
 * a command on their own machine means. A typo now reports its actual cause
 * here instead of surfacing below as a missing-file error.
 * The migration/task/report scripts are the one exception — scripts/migrations/
 * _bootstrap.ts defaults them to 'local' before this module is imported. */
function resolveNodeEnv(): EnvironmentLiteral {
  const validValues: string = ENVIRONMENT_NAMES.join(', ');
  const rawNodeEnv: string | undefined = process.env.NODE_ENV;

  if (!rawNodeEnv) {
    myConsole.log(`🛑  NODE_ENV is not set. It must be one of: ${validValues}.`);
    process.exit(1);
  }

  if (!ENVIRONMENT_NAMES.includes(rawNodeEnv as EnvironmentLiteral)) {
    myConsole.log(`🛑  NODE_ENV="${rawNodeEnv}" is not one of: ${validValues}.`);
    process.exit(1);
  }

  return rawNodeEnv as EnvironmentLiteral;
}

export const NODE_ENV: EnvironmentLiteral = resolveNodeEnv();

/* ── resolve and verify env file ──────────────────────────────── */
const envPath: string = `env.${NODE_ENV}`;

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
  NODE_ENV,
  JWT_SECRET:          process.env.JWT_SECRET!,
  VUE_APP_FRONTEND_BASE: process.env.VUE_APP_FRONTEND_BASE!,
  RATE_LIMITER_ENABLE: process.env.RATE_LIMITER_ENABLE!,
  MONGODB_URI:         process.env.MONGODB_URI!,
};

/* ── helpers ───────────────────────────────────────────────────── */
export const isEnvironmentProduction = (): boolean =>
  NODE_ENV === ENVIRONMENT_TYPES.PRODUCTION;

export const isEnvironmentDevelopment = (): boolean =>
  NODE_ENV === ENVIRONMENT_TYPES.DEVELOPMENT;

export const isEnvironmentLocal = (): boolean =>
  NODE_ENV === ENVIRONMENT_TYPES.LOCAL;

/* ── check for missing vars ───────────────────────────────────── */
(Object.entries(dotenvEnvFile) as [keyof DotenvEnvFile, string][])
  .forEach(([key, value]: [keyof DotenvEnvFile, string]): void => {
    if (!value) {               // catches '' or undefined
      myConsole.log(`${key} is not defined in config. Program will exit.`);
      process.exit(1);
    }
  });



export default dotenvEnvFile;
