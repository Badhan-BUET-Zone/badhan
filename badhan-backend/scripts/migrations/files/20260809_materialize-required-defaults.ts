/*
 * Migration: materialize missing required fields across every model, then lock `donors.designation`
 * behind a collection validator.
 *
 * Why this exists
 * ---------------
 * The `donors` collection held documents with no `designation` field at all. Mongoose hid them
 * perfectly: a schema default is applied when a document is *hydrated*, so every `find()` reported
 * `designation: 0` while the stored document had no such field — and a missing field matches neither
 * `{designation: 0}` nor any `$in`/`$nin` list, and aggregations (which do not hydrate) returned
 * donors with no `designation` key at all. That is why `GET /donors/{id}` could serve a donor whose
 * role rendered blank on the profile page.
 *
 * `designation` is one instance of a general shape: a field is added to a schema with a default,
 * and documents written before that day never receive it. `archiveFlag` was the same shape and got
 * its own migration (20260802). Fixing one field per migration means writing this file again next
 * year, so this one sweeps every required path of every registered model.
 *
 * Two steps, in this order:
 *  1. Backfill every required path that has a *static* default and is missing from a document.
 *  2. Apply the `donors` validator (DONOR_VALIDATOR) so the absence becomes unrepresentable below
 *     mongoose, where `required` is not enforced and the driver does as it is told.
 *
 * Order matters, and step 2 refuses to run if step 1 left anything behind: switching a
 * `validationLevel: 'strict'` validator on over violating documents makes those documents
 * unwritable, and the symptom is an opaque "Document failed validation" the next time somebody
 * edits one of them — hours later, with nothing connecting it to this migration.
 *
 * Both steps live in ONE file on purpose. The orchestrator sorts by filename with no state tracking,
 * so a separate `20260809_donor-designation-validator.ts` would sort *before*
 * `20260809_materialize-required-defaults.ts` ('d' < 'm') and apply the validator first.
 *
 * What is deliberately NOT written
 * --------------------------------
 *  - Function defaults (Logs.date, Tokens.expireAt, ActiveDonors.time, Feedbacks.date). A function
 *    default is evaluated at write time, so backfilling would stamp today onto rows created years
 *    ago and, for `expireAt`, hand every affected session a fresh TTL. Counted and reported only.
 *  - Required paths with no default at all (e.g. Logs.details). There is no value to write.
 *    Counted and reported only.
 *  - Optional paths, with or without a default (Donor.email). Nothing distinguishes absent from
 *    empty for them.
 *
 * Idempotent: a second run finds no gaps, writes nothing, and re-applies the same validator.
 *
 * Environment:
 *  NODE_ENV picks the database. DRY_RUN=1 reports everything and writes nothing — including the
 *  validator, which is a write too.
 *
 * Usage:
 *  docker compose run --rm -e NODE_ENV=development -e DRY_RUN=1 backend \
 *    npx ts-node --transpile-only scripts/migrations/index.ts 20260809_materialize-required-defaults
 */
import '../_bootstrap';
import fs from 'fs';
import path from 'path';
import { mongoose } from '../../../src/db/mongoose';
import myConsole from '../../../src/utils/myConsole';
import { DONOR_VALIDATOR } from '../../../src/db/models/Donor';
import { DESIGNATION_INDICES } from '../../../src/constants';

const DRY_RUN: boolean = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const REPORTS_DIR: string = path.resolve(__dirname, '../../../reports');

type Classification = 'static-default' | 'function-default' | 'no-default';

interface PathFinding {
  model: string;
  path: string;
  classification: Classification;
  defaultValue?: any;
  missingBefore: number;
  modified: number;
  totalDocs: number;
}

function log(msg: string): void { myConsole.log(msg); }

/*
 * A default is only safe to backfill if it is the same value today as it was the day the document
 * was written. `defaultValue` is whatever was handed to the schema, so a function is the signal —
 * mongoose stores it verbatim and calls it per write.
 */
function classify(schemaType: any): { classification: Classification; defaultValue?: any } {
  const raw: any = schemaType?.defaultValue;
  if (raw === undefined) return { classification: 'no-default' };
  if (typeof raw === 'function') return { classification: 'function-default' };
  return { classification: 'static-default', defaultValue: raw };
}

async function backfill(): Promise<PathFinding[]> {
  const models: [string, mongoose.Model<any>][] =
    Object.entries(mongoose.connection.models as Record<string, mongoose.Model<any>>);

  const findings: PathFinding[] = [];

  for (const [modelName, model] of models) {
    const totalDocs: number = await model.collection.countDocuments({});

    for (const [pathName, schemaType] of Object.entries(model.schema.paths) as [string, any][]) {
      if (pathName === '_id' || pathName === '__v') continue;
      if (!schemaType.isRequired) continue;

      const { classification, defaultValue } = classify(schemaType);

      // Count through the driver, not the model: a mongoose query would be free to apply the very
      // default this migration is here to materialize.
      const missingBefore: number = await model.collection.countDocuments({ [pathName]: { $exists: false } });

      const finding: PathFinding = {
        model: modelName, path: pathName, classification, defaultValue,
        missingBefore, modified: 0, totalDocs
      };
      findings.push(finding);

      if (missingBefore === 0) continue;

      if (classification !== 'static-default') {
        log(`  ${modelName}.${pathName}: ${missingBefore} missing — NEEDS REVIEW (${classification}), not written`);
        continue;
      }

      if (DRY_RUN) {
        log(`  [DRY_RUN] ${modelName}.${pathName}: would set ${JSON.stringify(defaultValue)} on ${missingBefore} document(s)`);
        continue;
      }

      // Driver-level updateMany, not the model's: a mongoose update would cast and re-validate
      // against a schema that is not what is being repaired here, and the value being written IS
      // the schema default.
      const result: any = await model.collection.updateMany(
        { [pathName]: { $exists: false } },
        { $set: { [pathName]: defaultValue } }
      );
      finding.modified = result?.modifiedCount ?? 0;
      log(`  ${modelName}.${pathName}: set ${JSON.stringify(defaultValue)} on ${finding.modified} document(s)`);
    }
  }

  return findings;
}

/*
 * The gate on step 2. Both counts must be zero, and the second is not implied by the first: a
 * document holding 4, null or "1" also violates the validator and would also become unwritable.
 */
async function donorDesignationViolations(): Promise<{ missing: number; outOfRange: number }> {
  const donors: mongoose.Collection = mongoose.connection.models.Donor.collection;
  return {
    missing: await donors.countDocuments({ designation: { $exists: false } }),
    // `$exists: true` is not redundant. A missing field matches `$nin` as well, so without it the
    // two counts overlap and the refusal message reports the same document twice.
    outOfRange: await donors.countDocuments({ designation: { $exists: true, $nin: DESIGNATION_INDICES } })
  };
}

async function applyDonorValidator(): Promise<{ applied: boolean; reason?: string }> {
  const db: mongoose.mongo.Db = mongoose.connection.db!;

  const { missing, outOfRange } = await donorDesignationViolations();
  log(`  verification: ${missing} donor(s) with no designation, ${outOfRange} outside ${JSON.stringify(DESIGNATION_INDICES)}`);

  if (missing > 0 || outOfRange > 0) {
    const reason: string =
      `refusing to apply the validator: ${missing} donor(s) missing designation and ${outOfRange} ` +
      'out of range would become unwritable. Fix those documents, then re-run.';
    log(`  ${reason}`);
    return { applied: false, reason };
  }

  if (DRY_RUN) {
    log('  [DRY_RUN] would apply the donors validator (validationLevel=strict, validationAction=error)');
    return { applied: false, reason: 'dry run' };
  }

  try {
    await db.command({
      collMod: 'donors',
      validator: DONOR_VALIDATOR,
      validationLevel: 'strict',
      validationAction: 'error'
    });
  } catch (e: any) {
    // Distinguish "not allowed" from "data is wrong". A managed cluster hands the application a
    // readWrite user, and collMod needs dbAdmin on the database — a privilege question for whoever
    // administers the cluster, not something a re-run will fix.
    const reason: string = /not allowed to do action/.test(String(e?.message))
      ? `collMod is not permitted for this database user (${e.message}). ` +
        'Grant dbAdmin on this database, or apply the validator with an admin connection.'
      : `collMod failed: ${e?.message}`;
    log(`  ${reason}`);
    return { applied: false, reason };
  }

  // Read it back. A validator that failed to apply looks exactly like one that is working.
  const [confirmed] = await db.listCollections({ name: 'donors' }).toArray();
  const applied: boolean = Boolean((confirmed as any)?.options?.validator);
  log(applied ? '  validator applied and confirmed on donors.' : '  validator did NOT stick on donors.');
  return { applied, reason: applied ? undefined : 'collMod reported success but the validator is absent' };
}

export default async function run(): Promise<void> {
  log('--- Migration start: materialize required defaults, then lock donors.designation ---');
  log(`NODE_ENV=${process.env.NODE_ENV} DRY_RUN=${DRY_RUN}`);

  await (await import('../_bootstrap')).ready;

  if (!mongoose.connection.models.Donor) {
    throw new Error('Donor model is not registered; cannot run this migration.');
  }

  log('Step 1/2 backfill: required paths missing from existing documents.');
  const findings: PathFinding[] = await backfill();

  const gaps: PathFinding[] = findings.filter((f: PathFinding): boolean => f.missingBefore > 0);
  const written: PathFinding[] = gaps.filter((f: PathFinding): boolean => f.classification === 'static-default');
  const needsReview: PathFinding[] = gaps.filter((f: PathFinding): boolean => f.classification !== 'static-default');

  log(`  ${findings.length} required path(s) inspected, ${gaps.length} with gaps.`);
  log(
    `  ${written.length} ${DRY_RUN ? 'would be backfilled' : 'backfilled'}, ` +
    `${needsReview.length} left for review (function or absent default).`
  );
  for (const f of needsReview) {
    log(`    review: ${f.model}.${f.path} — ${f.missingBefore}/${f.totalDocs} missing (${f.classification})`);
  }

  log('Step 2/2 validator: donors.designation.');
  const validator: { applied: boolean; reason?: string } = await applyDonorValidator();

  const report: any = {
    ranAt: new Date().toISOString(),
    environment: String(process.env.NODE_ENV),
    dryRun: DRY_RUN,
    counts: {
      requiredPathsInspected: findings.length,
      pathsWithGaps: gaps.length,
      pathsBackfilled: written.length,
      documentsModified: written.reduce((sum: number, f: PathFinding): number => sum + f.modified, 0),
      pathsNeedingReview: needsReview.length
    },
    validator,
    findings
  };
  const reportPath: string = path.join(
    REPORTS_DIR,
    `materialize-required-defaults.${process.env.NODE_ENV}${DRY_RUN ? '.dry-run' : ''}.json`
  );
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8' });
  log(`Report written to ${reportPath}`);

  // Two different kinds of "the validator is not on", and only one of them is a failure.
  //
  // Not permitted (the managed cluster hands this application a readWrite user, and `collMod` needs
  // a database-admin privilege) is a known, accepted state: the backfill is the repair, the schema
  // and its pre-update hook are the guard, and the validator applies itself on the first boot after
  // somebody grants the privilege. A warning, not an exit code.
  //
  // Documents still violating the invariant after the backfill IS a failure. It means a designation
  // outside 0..3 that no default can repair, the migration did not achieve what it exists for, and
  // the run must not report "complete".
  const { missing, outOfRange } = await donorDesignationViolations();
  if (!DRY_RUN && (missing > 0 || outOfRange > 0)) {
    throw new Error(
      `Backfill finished but ${missing} donor(s) still have no designation and ${outOfRange} hold a ` +
      'value outside 0..3. Repair those documents by hand, then re-run.'
    );
  }
  if (!validator.applied && !DRY_RUN) {
    log(`  note: collection validator not applied — ${validator.reason}`);
  }

  log(DRY_RUN ? 'DRY_RUN complete (no writes performed).' : 'Migration complete.');
}
