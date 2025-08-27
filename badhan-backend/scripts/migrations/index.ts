/*
 * Central migration orchestrator.
 * Usage examples:
 *  LIST pending & applied:  ts-node scripts/migrations/index.ts list
 *  RUN all pending:         ts-node scripts/migrations/index.ts
 *  RUN specific subset:     ts-node scripts/migrations/index.ts 20250826_remove-extra-fields
 *  DRY RUN (no writes):     DRY_RUN=1 ts-node scripts/migrations/index.ts
 */
import './_bootstrap';
import fs from 'fs';
import path from 'path';
import myConsole from '../../src/utils/myConsole';

const MIGRATIONS_DIR: string = path.join(__dirname, 'files');
const DRY_RUN: boolean = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

// Tracking of applied migrations has been removed; orchestrator always runs selected files.

/* -------------------------- Discover migration files ----------------------- */
function discoverMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  const all: string[] = fs.readdirSync(MIGRATIONS_DIR);
  return all
    .filter((f: string): boolean => /\.ts$/.test(f))
    .sort((a: string, b: string): number => a.localeCompare(b));
}

/* ----------------------------- Load migrations ----------------------------- */
interface LoadedMigration { name: string; run: () => Promise<any> }
async function loadMigration(file: string): Promise<LoadedMigration> {
  const full: string = path.join(MIGRATIONS_DIR, file);
  const mod: any = await import(full);
  const run: () => Promise<any> = mod.default || mod.run || mod.migrate;
  if (typeof run !== 'function') {
    throw new Error(`Migration ${file} does not export a function (default / run / migrate).`);
  }
  const name: string = file.replace(/\.ts$/, '');
  return { name, run };
}

/* ------------------------------- Main logic -------------------------------- */
async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  const modeList: boolean = args[0] === 'list';
  const explicitSelection: Set<string> = new Set(
    args.filter((a: string): boolean => a !== 'list')
  );

  await (await import('./_bootstrap')).ready; // ensure DB connected and models registered

  const files: string[] = discoverMigrationFiles();
  const loaded: LoadedMigration[] = [];
  for (const f of files) {
    const m: LoadedMigration = await loadMigration(f);
    if (explicitSelection.size > 0 && !explicitSelection.has(m.name)) continue;
    loaded.push(m);
  }

  // No applied-migration tracking; all selected migrations are treated as pending.

  if (modeList) {
    myConsole.log('--- Migration Files ---');
    for (const m of loaded) {
      myConsole.log(`PENDING   ${m.name}`); // Always pending now
    }
    if (explicitSelection.size === 0) {
      const skipped: string[] = files.filter((f: string): boolean => !loaded.find((mm: LoadedMigration): boolean => mm.name === f.replace(/\.ts$/, '')));
      if (skipped.length) {
        myConsole.log('\n(Other migration files present but filtered out by selection):');
        skipped.forEach((s: string): void => myConsole.log('  ', s));
      }
    }
    return;
  }

  myConsole.log('--- Running migrations ---');
  myConsole.log(`DRY_RUN = ${DRY_RUN} | NODE_ENV = ${process.env.NODE_ENV}`);
  for (const m of loaded) {
    myConsole.log(`RUN: ${m.name}`);
    const t0: number = Date.now();
    if (DRY_RUN) {
      myConsole.log('  (dry run)');
    }
    await m.run();
    myConsole.log(`DONE: ${m.name} in ${((Date.now() - t0) / 1000).toFixed(2)}s`);
  }
  myConsole.log('--- All done ---');
}

if (require.main === module) {
  main().then((): void => process.exit(0)).catch((err: Error): void => {
    myConsole.log(`Migration orchestrator failed: ${err.message}`);
    process.exit(1);
  });
}

export default main;
