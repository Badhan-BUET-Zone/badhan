/*
 * Migration: add `archiveFlag` to every donor, then build the two compound indexes that make the
 * flag a cheap, index-backed leading `$match` predicate on the donor search pipeline.
 *
 * Two steps, in this order:
 *  1. Backfill `archiveFlag: false` on every donor that does not have the field.
 *  2. Create { archiveFlag: 1, hall: 1, bloodGroup: 1 } and
 *     { archiveFlag: 1, availableToAll: 1, bloodGroup: 1 }.
 *
 * Order matters: the backfill runs first so the indexes are built over materialized values.
 *
 * Backfilling explicitly rather than relying on the mongoose schema default matters, because a
 * missing field would not match `{ archiveFlag: false }` and those donors would vanish from search.
 *
 * No donor is archived by this migration — archiving is a purely manual, per-donor action. The
 * collection comes out of the migration in exactly the state it went in, just with the field
 * materialized and indexed.
 *
 * Plain `createIndex` with no options — no `background: true`, no TTL, no partial filter. At ~4k
 * donors the build is sub-second, so a foreground build is simpler and finishes before the next
 * log line.
 *
 * Idempotent: re-running backfills nothing (the field exists everywhere) and `createIndex` is a
 * no-op when the index already exists.
 *
 * Environment:
 *  NODE_ENV should target the database you intend to mutate. DRY_RUN=1 only logs what it would do.
 */
import '../_bootstrap';
import { mongoose } from '../../../src/db/mongoose';
import myConsole from '../../../src/utils/myConsole';

const DRY_RUN: boolean = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const ARCHIVE_FLAG_INDEXES: Record<string, 1>[] = [
  { archiveFlag: 1, hall: 1, bloodGroup: 1 },
  { archiveFlag: 1, availableToAll: 1, bloodGroup: 1 }
];

function log(msg: string): void { myConsole.log(msg); }

export default async function run(): Promise<void> {
  log('--- Migration start: add archiveFlag to donors (backfill + indexes) ---');
  log(`NODE_ENV=${process.env.NODE_ENV} DRY_RUN=${DRY_RUN}`);

  await (await import('../_bootstrap')).ready; // ensure DB connected and models registered

  const models: typeof mongoose.models = mongoose.connection.models;
  const DonorModel: mongoose.Model<any> | undefined = models.Donor;
  if (!DonorModel) {
    throw new Error('Donor model is not registered; cannot run the archiveFlag migration.');
  }

  /* ----------------------------- 1. backfill ------------------------------ */
  const missingCount: number = await DonorModel.countDocuments({ archiveFlag: { $exists: false } });
  log(`Step 1/2 backfill: ${missingCount} donor(s) without an archiveFlag field.`);

  if (DRY_RUN) {
    log(`[DRY_RUN] Would set archiveFlag=false on ${missingCount} donor(s).`);
  } else if (missingCount === 0) {
    log('Nothing to backfill; every donor already carries archiveFlag.');
  } else {
    const result: any = await DonorModel.updateMany(
      { archiveFlag: { $exists: false } },
      { $set: { archiveFlag: false } }
    );
    log(`Backfilled archiveFlag=false on ${result.modifiedCount} donor(s).`);
  }

  /* ------------------------------ 2. indexes ------------------------------ */
  log(`Step 2/2 indexes: ${ARCHIVE_FLAG_INDEXES.length} compound index(es) on donors.`);

  for (const spec of ARCHIVE_FLAG_INDEXES) {
    const description: string = JSON.stringify(spec);
    if (DRY_RUN) {
      log(`[DRY_RUN] Would create index ${description} on donors.`);
      continue;
    }
    const indexName: string = await DonorModel.collection.createIndex(spec);
    log(`Created (or confirmed) index ${indexName} ${description} on donors.`);
  }

  log(DRY_RUN ? 'DRY_RUN complete (no writes performed).' : 'Migration complete.');
}
