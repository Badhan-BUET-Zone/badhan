/*
 * Migration: Remove extra (non-schema) properties from every document of every Mongoose model.
 * Strategy:
 *  1. Enumerate all registered models after connection / index sync.
 *  2. For each model, build a Set of allowed dot paths based on schema.paths (include parent prefixes for nested paths).
 *  3. Stream all documents with a cursor (lean) to avoid loading entire collections in memory.
 *  4. Traverse each document recursively collecting dot paths; anything not in the allowed set (and not _id) is slated for $unset.
 *  5. Apply per-document update (batched with limited concurrency) using $unset on the collected extra fields.
 *  6. Produce a summary report.
 *
 * Idempotent: re-running finds no extra fields and performs zero writes.
 * Safe: only removes fields not represented in the schema definition (virtuals are ignored because they are not persisted).
 *
 * Environment:
 *  NODE_ENV should target the database you intend to mutate. DRY_RUN=1 will only log actions without writing.
 */
import '../_bootstrap';
import { mongoose } from '../../../src/db/mongoose';
import myConsole from '../../../src/utils/myConsole';
import fs from 'fs';
import path from 'path';

interface DocExtraResult { model: string; docId: string; removed: string[] }

const DRY_RUN: boolean = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const MIGRATION_NAME: string = path.basename(__filename).replace(/\.(js|ts)$/, '');
const DRY_RUN_LOG_DIR: string = path.resolve(process.cwd(), 'logs', 'migrations');
const dryRunBuffer: string[] = [];

// High-level log: always prints + (if dry run) buffers.
function log(line: string): void {
  myConsole.log(line);
  if (DRY_RUN) dryRunBuffer.push(`${new Date().toISOString()} ${line}`);
}

// Document-level detail: only buffer (no terminal output) during dry run; silent otherwise.
function docLog(line: string): void {
  if (DRY_RUN) dryRunBuffer.push(`${new Date().toISOString()} ${line}`);
}
const CONCURRENCY: number = Number(process.env.MIGRATION_CONCURRENCY || 25);

interface AllowedPathsResult { allowed: Set<string>; flexiblePrefixes: Set<string> }

function buildAllowedPathSet(model: mongoose.Model<any>): AllowedPathsResult {
  const allowed: Set<string> = new Set(['_id']);
  const flexiblePrefixes: Set<string> = new Set(); // Mixed / Object containers whose subtree is free‑form
  for (const [rawPath, schemaType] of Object.entries(model.schema.paths)) {
    if (rawPath === '__v') continue; // versionKey disabled anyway but be explicit
    const segments: string[] = rawPath.split('.');
    for (let i: number = 1; i <= segments.length; i++) {
      allowed.add(segments.slice(0, i).join('.'));
    }
    // Detect flexible container
    const stAny: any = schemaType as any;
    const instance: string | undefined = stAny.instance || stAny.options?.type?.name;
    if (instance === 'Mixed' || instance === 'Object' || stAny.$isMongooseMixed) {
      flexiblePrefixes.add(rawPath); // do not inspect nested keys
    }
  }
  return { allowed, flexiblePrefixes };
}

function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== 'object') return false;
  const proto: any = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null; // treat plain object only
}

function collectDocPaths(doc: any, prefix: string = '', flexiblePrefixes: Set<string>): string[] {
  if (!isPlainObject(doc)) return [];
  const results: string[] = [];
  for (const key of Object.keys(doc)) {
    const currentPath: string = prefix ? `${prefix}.${key}` : key;
    results.push(currentPath);
    const val: any = (doc as any)[key];
    if (flexiblePrefixes.has(currentPath)) continue; // treat subtree as opaque / allowed
    if (isPlainObject(val)) {
      results.push(...collectDocPaths(val, currentPath, flexiblePrefixes));
    }
  }
  return results;
}

async function processModel(model: mongoose.Model<any>): Promise<{ model: string; docsScanned: number; docsMutated: number; fieldsRemoved: number }> {
  const { allowed: allowedPaths, flexiblePrefixes } = buildAllowedPathSet(model);
  const cursor: any = model.find().lean().cursor();

  let docsScanned: number = 0;
  let docsMutated: number = 0;
  let fieldsRemoved: number = 0;

  const pending: Promise<DocExtraResult | null>[] = [];

  const flush = async (): Promise<void> => {
    if (pending.length === 0) return;
    const settled: (DocExtraResult | null)[] = await Promise.all(pending.splice(0, pending.length));
    for (const res of settled) {
      if (!res) continue;
      docsMutated += 1;
      fieldsRemoved += res.removed.length;
    }
  };

  for await (const doc of cursor as AsyncIterable<any> as any) {
    docsScanned += 1;
    const plain: any = doc; // already lean()
    const allPaths: string[] = collectDocPaths(plain, '', flexiblePrefixes)
      .filter((p: string): boolean => p !== '_id' && !p.startsWith('_id.') && !p.startsWith('donorId.'));
    const extra: string[] = allPaths.filter((p: string): boolean => !allowedPaths.has(p));
    if (extra.length === 0) continue;

    pending.push((async (): Promise<DocExtraResult | null> => {
      const unset: Record<string, ''> = {};
      for (const p of extra) unset[p] = '';
      if (DRY_RUN) {
        docLog(`[DRY_RUN] Would unset ${extra.length} field(s) in ${model.modelName}#${plain._id}: ${extra.join(', ')}`);
        return { model: model.modelName, docId: String(plain._id), removed: extra };
      }
      try {
        const result: any = await model.collection.updateOne({ _id: plain._id }, { $unset: unset });
        if (result.modifiedCount === 0) {
          docLog(`WARN no modification for ${model.modelName}#${plain._id} (fields: ${extra.join(', ')})`);
        } else {
          docLog(`Unset ${extra.length} field(s) in ${model.modelName}#${plain._id}: ${extra.join(', ')}`);
        }
        return { model: model.modelName, docId: String(plain._id), removed: extra };
      } catch (e: any) {
        docLog(`Failed to update ${model.modelName}#${plain._id}: ${e.message}`);
        return null;
      }
    })());

    if (pending.length >= CONCURRENCY) await flush();
  }
  await flush();

  return { model: model.modelName, docsScanned, docsMutated, fieldsRemoved };
}

async function run(): Promise<void> {
  const startAll: number = Date.now();
  log('--- Migration start: remove extra (non-schema) fields ---');
  log(`NODE_ENV = ${process.env.NODE_ENV} | DRY_RUN = ${DRY_RUN} | CONCURRENCY = ${CONCURRENCY}`);

  // Ensure models are registered (mongoose.ts handles this & index sync)
  await (await import('../_bootstrap')).ready;

  const models: mongoose.Model<any>[] = Object.values(mongoose.connection.models) as any;
  log(`Discovered ${models.length} models.`);

  const perModel: { model: string; docsScanned: number; docsMutated: number; fieldsRemoved: number }[] = [];
  for (const m of models) {
    const t0: number = Date.now();
    log(`Processing model ${m.modelName} …`);
    const res: { model: string; docsScanned: number; docsMutated: number; fieldsRemoved: number } = await processModel(m);
    const dt: string = ((Date.now() - t0) / 1000).toFixed(1);
    log(`Model ${m.modelName}: scanned=${res.docsScanned} mutated=${res.docsMutated} removedFields=${res.fieldsRemoved} (${dt}s)`);
    perModel.push(res);
  }

  const total: { docsScanned: number; docsMutated: number; fieldsRemoved: number } = perModel.reduce((a: { docsScanned: number; docsMutated: number; fieldsRemoved: number }, r: { model: string; docsScanned: number; docsMutated: number; fieldsRemoved: number }): { docsScanned: number; docsMutated: number; fieldsRemoved: number } => {
    a.docsScanned += r.docsScanned; a.docsMutated += r.docsMutated; a.fieldsRemoved += r.fieldsRemoved; return a; }, { docsScanned: 0, docsMutated: 0, fieldsRemoved: 0 });

  log('--- Migration summary ---');
  for (const r of perModel) {
    log(`${r.model}: scanned=${r.docsScanned}, mutated=${r.docsMutated}, removedFields=${r.fieldsRemoved}`);
  }
  log(`TOTAL: scanned=${total.docsScanned}, mutated=${total.docsMutated}, removedFields=${total.fieldsRemoved}`);
  log(`Elapsed ${(Date.now() - startAll) / 1000}s`);
  log(DRY_RUN ? 'DRY_RUN complete (no writes performed).' : 'Migration complete.');

  if (DRY_RUN) {
    try {
      if (!fs.existsSync(DRY_RUN_LOG_DIR)) {
        fs.mkdirSync(DRY_RUN_LOG_DIR, { recursive: true });
      }
      const ts: string = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath: string = path.join(DRY_RUN_LOG_DIR, `${ts}_${MIGRATION_NAME}_dryrun.log`);
      fs.writeFileSync(filePath, dryRunBuffer.join('\n'), 'utf8');
      log(`Dry run log written to ${filePath}`);
    } catch (e: any) {
      log(`Failed to write dry run log file: ${e.message}`);
    }
  }
}

if (require.main === module) {
  run().then((): void => {
    process.exit(0);
  }).catch((err: Error): void => {
    myConsole.log(`Migration failed: ${err.message}`);
    process.exit(1);
  });
}

export default run;
