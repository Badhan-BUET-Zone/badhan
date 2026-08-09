/*
 * Task: archive the donors listed in reports/stale-donors.<NODE_ENV>.json.
 *
 * Applies exactly the mutation PATCH /donors/v2 applies when archiveFlag flips to true:
 *
 *   - archiveFlag = true;
 *   - designation 1 (volunteer) or 2 (hall admin) becomes 0 (donor). Super admins keep theirs.
 *
 * The demotion is one-way. Unarchiving does NOT restore a designation, by design — re-promotion is
 * a manual action from the Settings block. Nothing else changes: activedonors rows survive,
 * sessions are not revoked, donations and call records are untouched.
 *
 * Every donor is re-checked against the four conditions the report was built on before being
 * touched, so a stale report cannot archive someone who has donated or used the app since it was
 * generated. Anyone who no longer qualifies is skipped and named in the receipt.
 *
 * No audit-log rows are written. The logs collection is keyed on the donor who performed an
 * action, and this is a script with no acting user: attributing 1371 archive operations to a
 * super admin who did not perform them would falsify the audit trail, and attributing them to the
 * archived donors themselves would make them look active to the very query that selected them.
 * The receipt file is the record of what this run did.
 *
 * Environment:
 *   NODE_ENV picks the database. DRY_RUN=1 reports what it would do and writes nothing.
 *
 * Usage:
 *   docker compose exec -e NODE_ENV=production -e DRY_RUN=1 backend \
 *     npx ts-node --transpile-only scripts/tasks/archive-dormant-donors.ts
 */
import '../migrations/_bootstrap';
import fs from 'fs';
import path from 'path';
import { mongoose } from '../../src/db/mongoose';
import myConsole from '../../src/utils/myConsole';
import { DESIGNATIONS_INDEX } from '../../src/constants';

const DRY_RUN: boolean = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const ONE_YEAR_IN_MS: number = 365 * 24 * 60 * 60 * 1000;
const EXCLUDED_BATCH_FROM: number = 20;

const REPORTS_DIR: string = path.resolve(__dirname, '../../reports');

interface Skipped { donorId: string; reason: string }

async function main(): Promise<void> {
  await (await import('../migrations/_bootstrap')).ready;

  const models: typeof mongoose.models = mongoose.connection.models;
  const DonorModel: mongoose.Model<any> = models.Donor;
  const DonationModel: mongoose.Model<any> = models.Donations;
  const PlateletDonationModel: mongoose.Model<any> = models.PlateletDonations;
  const LogModel: mongoose.Model<any> = models.Logs;
  if (!DonorModel || !DonationModel || !PlateletDonationModel || !LogModel) {
    throw new Error('Donor, Donations, PlateletDonations and Logs models must all be registered.');
  }

  const reportPath: string = path.join(REPORTS_DIR, `stale-donors.${process.env.NODE_ENV}.json`);
  if (!fs.existsSync(reportPath)) {
    throw new Error(`No report at ${reportPath}. Run scripts/reports/stale-donors.ts first.`);
  }
  const report: any = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const ids: string[] = report.donorIds;

  myConsole.log('--- Task: archive dormant donors ---');
  myConsole.log(`NODE_ENV=${process.env.NODE_ENV} DRY_RUN=${DRY_RUN}`);
  myConsole.log(`Report: ${reportPath} (generated ${report.generatedAt}, ${ids.length} donor(s))`);

  const now: number = Date.now();
  const cutoff: number = now - ONE_YEAR_IN_MS;
  const objectIds: any[] = ids.map((id: string): any => new mongoose.Types.ObjectId(id));

  // Re-derive the disqualifiers against the window as it stands right now, not as it stood when
  // the report was written.
  const recentlyActive: Set<string> = new Set<string>([
    ...(await DonationModel.distinct('donorId', { donorId: { $in: objectIds }, date: { $gte: cutoff } })),
    ...(await PlateletDonationModel.distinct('donorId', { donorId: { $in: objectIds }, date: { $gte: cutoff } })),
    ...(await LogModel.distinct('donorId', { donorId: { $in: objectIds }, date: { $gte: cutoff } }))
  ].map((id: any): string => String(id)));

  const donors: any[] = await DonorModel.find(
    { _id: { $in: objectIds } },
    { studentId: 1, designation: 1, archiveFlag: 1 }
  ).lean();
  const byId: Map<string, any> = new Map<string, any>(donors.map((d: any): [string, any] => [String(d._id), d]));

  const toArchive: string[] = [];
  const toDemote: string[] = [];
  const alreadyArchived: string[] = [];
  const skipped: Skipped[] = [];

  for (const donorId of ids) {
    const donor: any | undefined = byId.get(donorId);
    if (!donor) {
      skipped.push({ donorId, reason: 'donor not found' });
      continue;
    }
    // An explicit membership test rather than `> VOLUNTEER`. Every donor carries a designation now
    // (20260809_materialize-required-defaults, plus the collection validator), so the two are
    // equivalent — but this reads from a `.lean()` query, which applies no schema default, so the
    // form that cannot be fooled by an absent field is the one worth keeping.
    if (donor.designation === DESIGNATIONS_INDEX.HALL_ADMIN || donor.designation === DESIGNATIONS_INDEX.SUPER_ADMIN) {
      skipped.push({ donorId, reason: `designation is now ${donor.designation}` });
      continue;
    }
    if (recentlyActive.has(donorId)) {
      skipped.push({ donorId, reason: 'donated or used the app within the year' });
      continue;
    }
    const batch: number = parseInt(String(donor.studentId ?? '').substring(0, 2), 10);
    if (!(batch < EXCLUDED_BATCH_FROM)) {
      skipped.push({ donorId, reason: `batch ${donor.studentId}` });
      continue;
    }
    if (donor.archiveFlag === true) {
      alreadyArchived.push(donorId);
      continue;
    }
    toArchive.push(donorId);
    if (donor.designation === DESIGNATIONS_INDEX.VOLUNTEER) toDemote.push(donorId);
  }

  myConsole.log(`To archive: ${toArchive.length}`);
  myConsole.log(`  of which volunteers demoted to donor: ${toDemote.length}`);
  myConsole.log(`Already archived: ${alreadyArchived.length}`);
  myConsole.log(`Skipped: ${skipped.length}`);
  for (const s of skipped.slice(0, 10)) myConsole.log(`  ${s.donorId}: ${s.reason}`);

  if (DRY_RUN) {
    myConsole.log(`[DRY_RUN] Would archive ${toArchive.length} donor(s), demoting ${toDemote.length}. No writes performed.`);
  } else {
    // Two updates rather than one per donor: the demotion applies only to the volunteers, and
    // splitting it keeps each statement a plain, reviewable filter.
    // runValidators on both: an update statement enforces nothing by default, and a script that
    // writes 1371 donors in two statements is exactly where a bad value would go unnoticed.
    const archiveResult: any = await DonorModel.updateMany(
      { _id: { $in: toArchive.map((id: string): any => new mongoose.Types.ObjectId(id)) } },
      { $set: { archiveFlag: true } },
      { runValidators: true }
    );
    myConsole.log(`Archived ${archiveResult.modifiedCount} donor(s).`);
    const demoteResult: any = await DonorModel.updateMany(
      { _id: { $in: toDemote.map((id: string): any => new mongoose.Types.ObjectId(id)) } },
      { $set: { designation: DESIGNATIONS_INDEX.DONOR } },
      { runValidators: true }
    );
    myConsole.log(`Demoted ${demoteResult.modifiedCount} volunteer(s) to donor.`);
  }

  const receipt: any = {
    ranAt: new Date(now).toISOString(),
    environment: String(process.env.NODE_ENV),
    dryRun: DRY_RUN,
    sourceReport: { path: path.basename(reportPath), generatedAt: report.generatedAt, donorIds: ids.length },
    counts: {
      archived: toArchive.length,
      demotedToDonor: toDemote.length,
      alreadyArchived: alreadyArchived.length,
      skipped: skipped.length
    },
    archivedIds: toArchive,
    demotedIds: toDemote,
    alreadyArchivedIds: alreadyArchived,
    skipped
  };
  const receiptPath: string = path.join(
    REPORTS_DIR,
    `archive-dormant-donors.${process.env.NODE_ENV}${DRY_RUN ? '.dry-run' : ''}.json`
  );
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8' });
  myConsole.log(`Receipt written to ${receiptPath}`);
}

main()
  .then(async (): Promise<void> => { await mongoose.connection.close(); process.exit(0); })
  .catch(async (error: any): Promise<void> => {
    myConsole.error('Archive task failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  });
