import mongoose from 'mongoose';
import myConsole from '../utils/myConsole';
import fs from 'fs';
import path from 'path';
import { DONOR_VALIDATOR } from './models/Donor';

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
  // Loosen typing here to avoid TS circular reference issues with deep mapped types in mongoose@8 + TS 4.x
  const models: [string, mongoose.Model<any>][] = Object.entries(mongoose.connection.models as Record<string, mongoose.Model<any>>) as [string, mongoose.Model<any>][];

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
/* 3.  Align collection-level validators.
/*
/*     Unlike an index, a validator is not something mongoose knows how to sync, and it does not
/*     survive the two things that routinely recreate a collection here: `mongorestore --drop`
/*     (the Restore button) and `dropDatabase()` (the purge that every test run starts with).
/*     Both would leave the collection with no validator and no complaint, so it is re-applied on
/*     every boot — the same reasoning that keeps the index declarations in the schema file.
/*
/*     Never throws. A boot that cannot set a validator (no `collMod` right, a restore in flight,
/*     a database that has not created the collection yet) must still be a boot.
/* ────────────────────────────────────────────────────────────── */
const COLLECTION_VALIDATORS: { collection: string; validator: Record<string, any> }[] = [
  { collection: 'donors', validator: DONOR_VALIDATOR }
];

export async function syncCollectionValidators(): Promise<void> {
  const db: mongoose.mongo.Db | undefined = mongoose.connection.db;
  if (!db) {
    myConsole.log('⚠️   No database handle; skipped collection validators.');
    return;
  }

  for (const { collection, validator } of COLLECTION_VALIDATORS) {
    try {
      // collMod needs the collection to exist. On a fresh or just-dropped database it does not, so
      // create it first — an existing collection makes this a harmless NamespaceExists.
      const existing: any[] = await db.listCollections({ name: collection }).toArray();
      if (existing.length === 0) {
        await db.createCollection(collection);
      }

      await db.command({
        collMod: collection,
        validator,
        validationLevel: 'strict',
        validationAction: 'error'
      });

      // Read it back rather than trusting the command. A validator that silently failed to apply
      // looks exactly like one that is working until the day it is needed.
      const [confirmed] = await db.listCollections({ name: collection }).toArray() as any[];
      if (confirmed?.options?.validator) {
        myConsole.log(`${collection.padEnd(24)} 🔒 validator applied`);
      } else {
        myConsole.log(`${collection.padEnd(24)} ⚠️  validator did not stick`);
      }
    } catch (e: any) {
      myConsole.log(`${collection.padEnd(24)} ⚠️  validator not applied: ${e?.message}`);
    }
  }
}

/* ────────────────────────────────────────────────────────────── */
/* 4.  Convenience helper used by mongoose.ts                    */
/* ────────────────────────────────────────────────────────────── */
export async function loadAndSyncIndexes(): Promise<void> {
  loadAllModels();
  await syncAllModels();
  await syncCollectionValidators();
}
