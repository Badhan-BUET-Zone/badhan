/*
 * Migration bootstrap: loads environment + connects to MongoDB (re‑using existing connection logic).
 * Keep this lightweight so individual migration scripts can simply `import './_bootstrap'`.
 */

import path from 'path';
import fs from 'fs';
import myConsole from '../../src/utils/myConsole';
import dotenv from 'dotenv';

// Ensure a NODE_ENV (default to 'local' unless explicitly provided)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'local';
}

// Attempt to load a .env file matching NODE_ENV if present (optional; main mongoose.ts also imports custom dotenv wrapper)
const envFileCandidates: string[] = [
  `.env.${process.env.NODE_ENV}`,
  '.env'
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
