/*
 * Utility script: Report schema/document inconsistencies across all Mongo collections.
 *
 * Use-case: Production DB still has legacy fields (dropped locally) or misses new ones.
 * This script connects (via existing mongoose bootstrap), loads all models, then for each
 * model samples every document (streamed cursor) and reports:
 *   - Extra fields present in documents but not in the schema definition
 *   - Missing (required) schema paths absent (undefined / not present) in documents
 *   - Type mismatches (primitive type differs from schema declared type)
 *   - Nullable/empty anomalies (required string/number/boolean set to null)
 *
 * The output is an aggregated summary per model with counts, plus an optional JSON detail file.
 *
 * Run (development):  ts-node -r tsconfig-paths/register src/db/test/reportInconsistencies.ts
 * Or build first then: node dist/db/test/reportInconsistencies.js
 */
import {mongoose, dbReady} from '../mongoose' // side-effect: connects + loads models + syncs indexes
import { Model, SchemaType, Schema } from 'mongoose';
import fs from 'fs';
import path from 'path';
import myConsole from '../../utils/myConsole';



interface FieldStats {
  count: number;                 // number of documents exhibiting this issue
  examples: any[];               // up to N example values (truncated)
}

interface ModelReport {
  model: string;
  totalDocs: number;
  extraFields: Record<string, FieldStats>;
  missingRequired: Record<string, FieldStats>;
  typeMismatch: Record<string, FieldStats>;
  nullInRequired: Record<string, FieldStats>;
  constraintViolations: Record<string, FieldStats>; // min/max/enum/custom validator failures (excluding required/type already counted)
  // Per-document detailed issues (for file emission)
  docLevel: {
    extraFields: Record<string, Record<string, any>>; // docId -> { fieldName: value }
    missingRequired: Record<string, string[]>;        // docId -> [fieldName]
    nullInRequired: Record<string, string[]>;         // docId -> [fieldName]
    typeMismatch: Record<string, Record<string, { expected: string; actual: string; value: any }>>; // docId -> { fieldName: {expected, actual, value}}
    constraintViolations: Record<string, Record<string, { kind: string; message: string; value: any }>>; // docId -> { fieldName: {kind,message,value} }
  rawDocs: Record<string, any>;                     // docId -> full original plain document
  }
}

const MAX_EXAMPLES: number = 5;

function ensureStats(obj: Record<string, FieldStats>, key: string, sample: any): void {
  if (!obj[key]) {
    obj[key] = { count: 0, examples: [] };
  }
  obj[key].count += 1;
  if (obj[key].examples.length < MAX_EXAMPLES) {
    obj[key].examples.push(sample);
  }
}

/* Infer primitive type label */
function jsType(val: any): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

/* Map schema type constructor name to simplified label */
function schemaTypeLabel(st: SchemaType): string {
  const opt: any = (st as any).instance || (st as any).options?.type?.name;
  if (!opt) return 'unknown';
  switch (opt) {
    case 'String': return 'string';
    case 'Number': return 'number';
    case 'Boolean': return 'boolean';
    case 'Date': return 'number'; // you seem to store timestamps as numbers; Date would appear differently.
    case 'ObjectID': return 'objectid';
    case 'Array': return 'array';
    case 'Mixed': return 'mixed';
    default: return String(opt).toLowerCase();
  }
}

async function analyzeModel(model: Model<any>): Promise<ModelReport> {
  const schema: Schema = model.schema;
  // Collect schema path info (excluding virtuals & internal _id unless present)
  const schemaPaths: [string, SchemaType][] = (Object.entries(schema.paths) as [string, SchemaType][])
    .filter(([p]: [string, SchemaType]): boolean => !p.startsWith('__v') && p !== '_id');

  const requiredPaths: Set<string> = new Set(
    schemaPaths
      .filter(([_, st]: [string, SchemaType | any]): boolean => Boolean((st as any).isRequired))
      .map(([p]: [string, SchemaType]): string => p)
  );

  const schemaPathSet: Set<string> = new Set(schemaPaths.map(([p]: [string, SchemaType]): string => p));
  const schemaTypeMap: Record<string, SchemaType> = Object.fromEntries(schemaPaths) as any;

  const report: ModelReport = {
    model: model.modelName,
    totalDocs: 0,
    extraFields: {},
    missingRequired: {},
    typeMismatch: {},
    nullInRequired: {},
    constraintViolations: {},
    docLevel: {
      extraFields: {},
      missingRequired: {},
      nullInRequired: {},
      typeMismatch: {},
      constraintViolations: {},
  rawDocs: {},
    }
  };

  // Using generic async cursor for documents
  const cursor: AsyncIterable<any> = model.find().cursor() as any;
  for await (const doc of cursor) {
    report.totalDocs += 1;
    const plain: any = doc.toObject({ depopulate: true, virtuals: false });
    const docKeys: string[] = Object.keys(plain);
  const docId: string = String(plain._id || doc._id || 'unknown');

  // Containers for this document's issues (lazy filled)

  function ensureDocExtra(): Record<string, any> { if (!report.docLevel.extraFields[docId]) report.docLevel.extraFields[docId] = {}; return report.docLevel.extraFields[docId]; }
  function ensureDocMissing(): string[] { if (!report.docLevel.missingRequired[docId]) report.docLevel.missingRequired[docId] = []; return report.docLevel.missingRequired[docId]; }
  function ensureDocNull(): string[] { if (!report.docLevel.nullInRequired[docId]) report.docLevel.nullInRequired[docId] = []; return report.docLevel.nullInRequired[docId]; }
  function ensureDocMismatch(): Record<string, { expected: string; actual: string; value: any; }> { if (!report.docLevel.typeMismatch[docId]) report.docLevel.typeMismatch[docId] = {}; return report.docLevel.typeMismatch[docId]; }
  function ensureDocConstraint(): Record<string, { kind: string; message: string; value: any }> { if (!report.docLevel.constraintViolations[docId]) report.docLevel.constraintViolations[docId] = {}; return report.docLevel.constraintViolations[docId]; }
  function recordRaw(): void { if (!report.docLevel.rawDocs[docId]) report.docLevel.rawDocs[docId] = plain; }

    // Extra fields
    for (const k of docKeys) {
      if (!schemaPathSet.has(k) && k !== '_id') {
        ensureStats(report.extraFields, k, plain[k]);
  ensureDocExtra()[k] = plain[k];
  recordRaw();
      }
    }

    // Missing required
    for (const req of requiredPaths) {
      if (!(req in plain) || plain[req] === undefined) {
        ensureStats(report.missingRequired, req, undefined);
  ensureDocMissing().push(req);
  recordRaw();
      } else if (plain[req] === null) {
        ensureStats(report.nullInRequired, req, null);
  ensureDocNull().push(req);
  recordRaw();
      }
    }

    // Type mismatches
  for (const [p, st] of Object.entries(schemaTypeMap) as [string, SchemaType][]) {
      if (!(p in plain)) continue; // missing already logged
      const val: any = plain[p];
      if (val === null) continue; // handled in nullInRequired
      const expected: string = schemaTypeLabel(st);
      const actual: string = jsType(val);
      if (expected === 'mixed') continue; // skip Mixed
      if (expected === 'objectid') {
        // Accept ObjectId or string 24 hex
        if (typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val)) continue;
        if (val && typeof val === 'object' && val._bsontype === 'ObjectID') continue;
        if (!mongoose.isValidObjectId(val)) {
          ensureStats(report.typeMismatch, p, actual + ':' + String(val));
          ensureDocMismatch()[p] = { expected: 'objectid', actual, value: val };
          recordRaw();
        }
        continue;
      }
      if (expected !== actual) {
        // Accept numeric strings for number? choose strict for visibility
        ensureStats(report.typeMismatch, p, { actual, value: val });
        ensureDocMismatch()[p] = { expected, actual, value: val };
  recordRaw();
      }
    }

    // Schema constraint (validator) violations beyond required/type: run validateSync on the existing mongoose doc clone.
    // validateSync will also surface required & type errors which we already recorded; we filter those out.
    const validationError: any = doc.validateSync();
    if (validationError && validationError.errors) {
      for (const [pathKey, err] of Object.entries(validationError.errors) as [string, any][]) {
        const kind: string = err.kind || 'user-defined';
        // Skip duplicates already covered:
        if (kind === 'required') continue; // missingRequired/null already captured
        if (kind === 'ObjectId') continue; // type mismatch logic covers
        if (kind === 'user defined' && (report.missingRequired[pathKey] || report.typeMismatch[pathKey])) continue;
        if (report.typeMismatch[pathKey]) continue; // already flagged as type mismatch
        // Keep min, max, enum, regexp, user defined validation, etc.
        const valueSample: any = (err as any).value;
        ensureStats(report.constraintViolations, pathKey, { kind, value: valueSample });
        ensureDocConstraint()[pathKey] = { kind, message: err.message, value: valueSample };
        recordRaw();
      }
    }
  }

  return report;
}

async function main(): Promise<void> {
  // Ensure database connection & model loading (including index sync) have completed
  await dbReady;
  const models: Model<any>[] = Object.values(mongoose.connection.models) as Model<any>[];

  // tslint:disable-next-line:no-console  (intentional raw listing of loaded models for ad-hoc script visibility)

  if (models.length === 0) {
    myConsole.error('No models registered. Exiting.');
    process.exit(1);
  }
  myConsole.log(`Analyzing ${models.length} models for inconsistencies…`);

  const allReports: ModelReport[] = [];
  for (const m of models) {
    myConsole.log(`→ ${m.modelName}`);
    try {
      const r: ModelReport = await analyzeModel(m);
      allReports.push(r);
    } catch (e: any) {
      myConsole.error(`Error analyzing ${m.modelName}:`, e.message);
    }
  }

  /* Pretty print summary */
  for (const r of allReports) {
    myConsole.log('='.repeat(60));
    myConsole.log(`Model: ${r.model}`);
    myConsole.log(`Documents scanned: ${r.totalDocs}`);

    const section = (title: string, data: Record<string, FieldStats>): void => {
      const keys: string[] = Object.keys(data).sort((a: string, b: string): number => data[b].count - data[a].count);
      if (keys.length === 0) {
        myConsole.log(`  ${title}: None`);
        return;
      }
      myConsole.log(`  ${title}:`);
      for (const k of keys) {
        myConsole.log(`    - ${k}: ${data[k].count} doc(s) (examples: ${JSON.stringify(data[k].examples)})`);
      }
    };

    section('Extra fields', r.extraFields);
    section('Missing required fields', r.missingRequired);
    section('Required field set to null', r.nullInRequired);
    section('Type mismatches', r.typeMismatch);
  section('Schema constraint violations', r.constraintViolations);
  }

  const outDir: string = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const timestamp: number = Date.now();
  const baseDir: string = path.join(outDir, `schema_inconsistencies_${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  // Write aggregate report inside the timestamped directory (retain original naming convention)
  const outFile: string = path.join(baseDir, `schema_inconsistencies_${timestamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(allReports, null, 2));
  myConsole.log(`Full JSON report written to ${outFile}`);

  // Emit per-document JSON files for each problem category
  const sanitize = (s: string): string => s.replace(/[^a-zA-Z0-9_-]/g, '_');
  for (const r of allReports) {
    const modelDir: string = path.join(baseDir, r.model);
    fs.mkdirSync(modelDir, { recursive: true });

    const problems: { key: keyof ModelReport['docLevel']; subDir: string; }[] = [
      { key: 'extraFields', subDir: 'extraFields' },
      { key: 'missingRequired', subDir: 'missingRequired' },
      { key: 'nullInRequired', subDir: 'nullInRequired' },
      { key: 'typeMismatch', subDir: 'typeMismatch' },
  { key: 'constraintViolations', subDir: 'constraintViolations' },
    ];

    for (const { key, subDir } of problems) {
      const bucket: any = r.docLevel[key];
      const problemDir: string = path.join(modelDir, subDir);
      if (Object.keys(bucket).length === 0) continue;
      fs.mkdirSync(problemDir, { recursive: true });
      for (const [docId, data] of Object.entries(bucket)) {
        const filePath: string = path.join(problemDir, `${sanitize(docId)}.json`);
        let content: any;
        switch (key) {
          case 'extraFields': content = { documentId: docId, extraFields: data, originalDoc: r.docLevel.rawDocs[docId] }; break;
          case 'missingRequired': content = { documentId: docId, missingRequired: data, originalDoc: r.docLevel.rawDocs[docId] }; break;
          case 'nullInRequired': content = { documentId: docId, nullInRequired: data, originalDoc: r.docLevel.rawDocs[docId] }; break;
          case 'typeMismatch': content = { documentId: docId, typeMismatch: data, originalDoc: r.docLevel.rawDocs[docId] }; break;
          case 'constraintViolations': content = { documentId: docId, constraintViolations: data, originalDoc: r.docLevel.rawDocs[docId] }; break;
          default: content = { documentId: docId, data };
        }
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      }
    }
  }
  myConsole.log(`Per-document issue files written under ${baseDir}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e: unknown): void => {
  myConsole.error(e);
  process.exit(1);
});
