import mongoose, { Model } from 'mongoose';
import myConsole from '../utils/myConsole';
import fs from 'fs';
import path from 'path';

/* ────────────────────────────────────────────────────────────── */
/* 1.  Recursively load every model file in ./models so each
/*     schema registers on the default connection.
/* ────────────────────────────────────────────────────────────── */
export function loadAllModels(): void {
  const modelsDir: string = path.join(__dirname, 'models');

  const walk = (dir: string): void => {
    const entries: string[] = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath: string = path.join(dir, entry);
      const stat: fs.Stats = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);                                   // recurse
      } else if (
        /\.(ts|js)$/.test(entry) &&                       // model files
        !entry.startsWith('.') &&
        entry !== 'index.ts' &&
        entry !== 'index.js'
      ) {
        require(fullPath);                                // registers model
      }
    }
  };

  walk(modelsDir);
}

/* ────────────────────────────────────────────────────────────── */
/* 2.  Align indexes for every registered model & report diff.
/* ────────────────────────────────────────────────────────────── */
export async function syncAllModels(): Promise<void> {
  const models: [string, Model<unknown>][] = Object.entries(
    mongoose.connection.models
  ) as [string, Model<unknown>][];                        // cast for TS 4.x

  const summaries: { name: string; added: string[]; dropped: string[] }[] = [];

  for (const [name, model] of models) {
    /* ----- Determine what will change (support v5–v8 shapes) ----- */
    const rawDiff: any =
      typeof (model as any).diffIndexes === 'function'
        ? await (model as any).diffIndexes()
        : null;

    let added: string[] = [];
    let willDrop: string[] = [];

    if (rawDiff) {
      /* v7+/v8+: { toCreate: [...], toDrop: [...] } */
      if (!Array.isArray(rawDiff)) {
        added = (rawDiff.toCreate ?? []).map((idx: any): string => {
          return idx.name ?? JSON.stringify(idx.key ?? idx.keys);
        });
        willDrop = (rawDiff.toDrop ?? []).map((idx: any): string => idx.name);
      }
      /* v5/v6: Array of diff records */
      else {
        rawDiff.forEach((d: any): void => {
          if (d.schemaIndex && !d.dbIndex) {
            added.push(
              d.schemaIndex.options?.name ??
                JSON.stringify(d.schemaIndex.key ?? d.schemaIndex.keys)
            );
          }
          if (d.dbIndex && !d.schemaIndex) {
            willDrop.push(d.dbIndex.name);
          }
        });
      }
    }

    /* ----- Apply sync (drops are returned) ----------------------- */
    const actuallyDropped: string[] = await model.syncIndexes();

    /* ----- Logging ------------------------------------------------ */
    const changed: boolean =
      added.length > 0 || actuallyDropped.length > 0 || willDrop.length > 0;

    if (changed) {
      if (added.length > 0) {
        myConsole.log(`${name.padEnd(24)} ➕ added   [${added.join(', ')}]`);
      }
      if (actuallyDropped.length > 0) {
        myConsole.log(
          `${name.padEnd(24)} ➖ dropped [${actuallyDropped.join(', ')}]`
        );
      }
      summaries.push({ name, added, dropped: actuallyDropped });
    }
  }

  /* ----- Final summary ------------------------------------------ */
  if (summaries.length !== 0) {
    myConsole.log(
      `🔄  Indexes updated for ${summaries.length} model${summaries.length > 1 ? 's' : ''}.`
    );
  } else {
    myConsole.log('✅  All indexes are already in sync.');
  }
}

/* ────────────────────────────────────────────────────────────── */
/* 3.  Convenience helper used by mongoose.ts                    */
/* ────────────────────────────────────────────────────────────── */
export async function loadAndSyncIndexes(): Promise<void> {
  loadAllModels();
  await syncAllModels();
}
