/*
 * Migration bootstrap: loads environment + connects to MongoDB (re‑using existing connection logic).
 * Keep this lightweight so individual migration scripts can simply `import './_bootstrap'`.
 */

import path from 'path';
import fs from 'fs';
import myConsole from '../../src/utils/myConsole';
import dotenv from 'dotenv';

// Ensure a NODE_ENV (default to 'local' unless explicitly provided).
//
// This is the one implicit environment default left in the backend, and it is
// deliberate on two counts. It runs *before* src/dotenv is imported — which is
// why `npm run migrate` with no flags keeps working even though src/dotenv now
// exits on an unset NODE_ENV — and it defaults to 'local', the environment that
// cannot damage anything, so a forgotten NODE_ENV means "my machine" rather
// than the shared development database.
//
// The literal is not the ENVIRONMENT_TYPES constant from src/dotenv for the
// same reason: importing that module here would run it, and its NODE_ENV check,
// before this assignment.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'local';
}

// Attempt to load a .env file matching NODE_ENV if present (optional; main mongoose.ts also imports custom dotenv wrapper)
const envFileCandidates: string[] = [
  `env.${process.env.NODE_ENV}`,
  'env'
];
for (const candidate of envFileCandidates) {
  const full: string = path.resolve(process.cwd(), candidate);
  if (fs.existsSync(full)) {
    try {
  dotenv.config({ path: full });
      myConsole.log(`Loaded env file: ${candidate}`);
    } catch (e: any) {
      myConsole.log(`Failed loading env file ${candidate}: ${e.message}`);
    }
    break;
  }
}

// Reuse existing dotenv wrapper + mongoose connection logic
// (mongoose.ts already imports ../dotenv which centralizes variable loading / validation)
// Relative path from scripts/migrations/* to src/db/mongoose
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import '../../src/db/mongoose';

// Expose a ready promise for convenience
import { dbReady } from '../../src/db/mongoose';
export const ready: Promise<void> = dbReady;
