/*
 * Service: Generate schema/document inconsistency report (in‑memory) for all mongoose models.
 * This is adapted from the standalone script at db/test/reportInconsistencies.ts but trimmed
 * of any filesystem side‑effects so it can be exposed via an internal HTTP route.
 */
/* tslint:disable:no-console */
import { mongoose, dbReady } from '../db/mongoose'
import { Model, SchemaType, Schema } from 'mongoose'

interface FieldStats { count: number; examples: any[] }

interface ModelDocLevelBuckets {
  extraFields: Record<string, Record<string, any>>
  missingRequired: Record<string, string[]>
  nullInRequired: Record<string, string[]>
  typeMismatch: Record<string, Record<string, { expected: string; actual: string; value: any }>>
  constraintViolations: Record<string, Record<string, { kind: string; message: string; value: any }>>
  rawDocs: Record<string, any>
}

interface ModelReport {
  model: string
  totalDocs: number
  extraFields: Record<string, FieldStats>
  missingRequired: Record<string, FieldStats>
  typeMismatch: Record<string, FieldStats>
  nullInRequired: Record<string, FieldStats>
  constraintViolations: Record<string, FieldStats>
  docLevel: ModelDocLevelBuckets
}

const MAX_EXAMPLES: number = 5

function ensureStats(obj: Record<string, FieldStats>, key: string, sample: any): void {
  if (!obj[key]) obj[key] = { count: 0, examples: [] }
  obj[key].count += 1
  if (obj[key].examples.length < MAX_EXAMPLES) obj[key].examples.push(sample)
}

function jsType(val: any): string {
  if (val === null) return 'null'
  if (Array.isArray(val)) return 'array'
  return typeof val
}

function schemaTypeLabel(st: SchemaType): string {
  const opt: any = (st as any).instance || (st as any).options?.type?.name
  if (!opt) return 'unknown'
  switch (opt) {
    case 'String': return 'string'
    case 'Number': return 'number'
    case 'Boolean': return 'boolean'
    case 'Date': return 'number'
    case 'ObjectID': return 'objectid'
    case 'Array': return 'array'
    case 'Mixed': return 'mixed'
    default: return String(opt).toLowerCase()
  }
}

async function analyzeModel(model: Model<any>): Promise<ModelReport> {
  const schema: Schema = model.schema
  const schemaPaths: [string, SchemaType][] = (Object.entries(schema.paths) as [string, SchemaType][])
    .filter(([p]: [string, SchemaType]): boolean => !p.startsWith('__v') && p !== '_id')

  const requiredPaths: Set<string> = new Set(
    schemaPaths
      .filter(([_, st]: [string, any]): boolean => Boolean((st as any).isRequired))
      .map(([p]: [string, SchemaType]): string => p)
  )

  const schemaPathSet: Set<string> = new Set(schemaPaths.map(([p]: [string, SchemaType]): string => p))
  const schemaTypeMap: Record<string, SchemaType> = Object.fromEntries(schemaPaths) as any

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
      rawDocs: {}
    }
  }

  const cursor: AsyncIterable<any> = model.find().cursor() as any
  for await (const doc of cursor) {
    report.totalDocs += 1
    const plain: any = doc.toObject({ depopulate: true, virtuals: false })
    const docKeys: string[] = Object.keys(plain)
    const docId: string = String(plain._id || doc._id || 'unknown')

  function ensureDocExtra(): Record<string, any> { if (!report.docLevel.extraFields[docId]) report.docLevel.extraFields[docId] = {}; return report.docLevel.extraFields[docId] }
  function ensureDocMissing(): string[] { if (!report.docLevel.missingRequired[docId]) report.docLevel.missingRequired[docId] = []; return report.docLevel.missingRequired[docId] }
  function ensureDocNull(): string[] { if (!report.docLevel.nullInRequired[docId]) report.docLevel.nullInRequired[docId] = []; return report.docLevel.nullInRequired[docId] }
  function ensureDocMismatch(): Record<string, { expected: string; actual: string; value: any }> { if (!report.docLevel.typeMismatch[docId]) report.docLevel.typeMismatch[docId] = {}; return report.docLevel.typeMismatch[docId] }
  function ensureDocConstraint(): Record<string, { kind: string; message: string; value: any }> { if (!report.docLevel.constraintViolations[docId]) report.docLevel.constraintViolations[docId] = {}; return report.docLevel.constraintViolations[docId] }
  function recordRaw(): void { if (!report.docLevel.rawDocs[docId]) report.docLevel.rawDocs[docId] = plain }

    // Extra fields
    for (const k of docKeys) {
      if (!schemaPathSet.has(k) && k !== '_id') {
        ensureStats(report.extraFields, k, plain[k])
        ensureDocExtra()[k] = plain[k]
        recordRaw()
      }
    }

    // Missing / null required
    for (const req of requiredPaths) {
      if (!(req in plain) || plain[req] === undefined) {
        ensureStats(report.missingRequired, req, undefined)
        ensureDocMissing().push(req)
        recordRaw()
      } else if (plain[req] === null) {
        ensureStats(report.nullInRequired, req, null)
        ensureDocNull().push(req)
        recordRaw()
      }
    }

    // Type mismatches
    for (const [p, st] of Object.entries(schemaTypeMap) as [string, SchemaType][]) {
      if (!(p in plain)) continue
      const val: any = plain[p]
      if (val === null) continue
  const expected: string = schemaTypeLabel(st)
  const actual: string = jsType(val)
      if (expected === 'mixed') continue
      if (expected === 'objectid') {
        if (typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val)) continue
        if (val && typeof val === 'object' && (val as any)._bsontype === 'ObjectID') continue
        if (!mongoose.isValidObjectId(val)) {
          ensureStats(report.typeMismatch, p, actual + ':' + String(val))
          ensureDocMismatch()[p] = { expected: 'objectid', actual, value: val }
          recordRaw()
        }
        continue
      }
      if (expected !== actual) {
        ensureStats(report.typeMismatch, p, { actual, value: val })
        ensureDocMismatch()[p] = { expected, actual, value: val }
        recordRaw()
      }
    }

    // Constraint violations
    const validationError: any = doc.validateSync()
    if (validationError && validationError.errors) {
      for (const [pathKey, err] of Object.entries(validationError.errors) as [string, any][]) {
        const kind: string = err.kind || 'user-defined'
        if (kind === 'required' || kind === 'ObjectId') continue
        if (report.typeMismatch[pathKey]) continue
        const valueSample: any = (err as any).value
        ensureStats(report.constraintViolations, pathKey, { kind, value: valueSample })
        ensureDocConstraint()[pathKey] = { kind, message: err.message, value: valueSample }
        recordRaw()
      }
    }
  }

  return report
}

export interface SchemaInconsistenciesResult {
  schema_inconsistencies: Record<string, any>
  meta: { generatedAt: number; modelsAnalyzed: number }
}

export async function generateSchemaInconsistencies(): Promise<SchemaInconsistenciesResult> {
  await dbReady
  const models: Model<any>[] = Object.values(mongoose.connection.models) as Model<any>[]
  const result: SchemaInconsistenciesResult = { schema_inconsistencies: {}, meta: { generatedAt: Date.now(), modelsAnalyzed: models.length } }

  for (const m of models) {
    try {
      const r: ModelReport = await analyzeModel(m)
      // Build structure consistent with file outputs: model -> inconsistencyType -> docId -> content
      const modelBucket: Record<string, any> = {}
      const addBucket = (type: keyof ModelReport['docLevel']): void => {
        const source: any = r.docLevel[type]
        if (Object.keys(source).length === 0) return
        modelBucket[type] = {}
        for (const [docId, data] of Object.entries(source) as [string, any][]) {
          let content: any
          switch (type) {
            case 'extraFields': content = { documentId: docId, extraFields: data, originalDoc: r.docLevel.rawDocs[docId] }; break
            case 'missingRequired': content = { documentId: docId, missingRequired: data, originalDoc: r.docLevel.rawDocs[docId] }; break
            case 'nullInRequired': content = { documentId: docId, nullInRequired: data, originalDoc: r.docLevel.rawDocs[docId] }; break
            case 'typeMismatch': content = { documentId: docId, typeMismatch: data, originalDoc: r.docLevel.rawDocs[docId] }; break
            case 'constraintViolations': content = { documentId: docId, constraintViolations: data, originalDoc: r.docLevel.rawDocs[docId] }; break
            default: content = { documentId: docId, data }
          }
          modelBucket[type][docId] = content
        }
      }
      addBucket('extraFields')
      addBucket('missingRequired')
      addBucket('nullInRequired')
      addBucket('typeMismatch')
      addBucket('constraintViolations')
      result.schema_inconsistencies[m.modelName] = modelBucket
    } catch (e: any) {
      result.schema_inconsistencies[m.modelName] = { error: e?.message }
    }
  }
  return result
}
