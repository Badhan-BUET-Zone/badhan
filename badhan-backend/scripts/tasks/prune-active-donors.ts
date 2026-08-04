/*
 * Task: unmark active donors who have not donated in the last two years.
 *
 * Deletes the activedonors row of every donor with neither a blood donation nor a platelet
 * donation dated within the last 730 days. Designation and batch are not considered — this is
 * purely about donation activity, so hall admins and super admins are pruned on the same terms as
 * anyone else.
 *
 * Nothing else about the donor changes: the donor document, its archiveFlag, its designation, its
 * donations and its call records are all untouched. Being unmarked only removes them from the
 * Active Donors page; they remain fully searchable.
 *
 * A row whose donor no longer exists has no donations either, so it is pruned too and counted
 * separately in the receipt.
 *
 * The receipt records each deleted row in full — donorId, markerId and time — so this run can be
 * reversed by re-inserting them, which deleting by id alone would not allow.
 *
 * Environment:
 *   NODE_ENV picks the database. DRY_RUN=1 reports what it would do and writes nothing.
 *
 * Usage:
 *   docker compose exec -e NODE_ENV=production -e DRY_RUN=1 backend \
 *     npx ts-node --transpile-only scripts/tasks/prune-active-donors.ts
 */
import '../migrations/_bootstrap';
import fs from 'fs';
import path from 'path';
import { mongoose } from '../../src/db/mongoose';
import myConsole from '../../src/utils/myConsole';

const DRY_RUN: boolean = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const TWO_YEARS_IN_MS: number = 2 * 365 * 24 * 60 * 60 * 1000;

const OUTPUT_DIR: string = path.resolve(__dirname, '../../reports');

async function main(): Promise<void> {
  await (await import('../migrations/_bootstrap')).ready;

  const models: typeof mongoose.models = mongoose.connection.models;
  const ActiveDonorModel: mongoose.Model<any> = models.ActiveDonors;
  const DonorModel: mongoose.Model<any> = models.Donor;
  const DonationModel: mongoose.Model<any> = models.Donations;
  const PlateletDonationModel: mongoose.Model<any> = models.PlateletDonations;
  if (!ActiveDonorModel || !DonorModel || !DonationModel || !PlateletDonationModel) {
    throw new Error('ActiveDonors, Donor, Donations and PlateletDonations models must all be registered.');
  }

  const now: number = Date.now();
  const cutoff: number = now - TWO_YEARS_IN_MS;
  myConsole.log('--- Task: prune active donors with no donation in two years ---');
  myConsole.log(`NODE_ENV=${process.env.NODE_ENV} DRY_RUN=${DRY_RUN}`);
  myConsole.log(`Cutoff: ${new Date(cutoff).toISOString()} (donations on or after this keep the marking)`);

  const rows: any[] = await ActiveDonorModel.find({}, { donorId: 1, markerId: 1, time: 1 }).lean();
  const markedDonorIds: any[] = rows.map((r: any): any => r.donorId);
  myConsole.log(`Active donor rows: ${rows.length} (${new Set(markedDonorIds.map(String)).size} distinct donor(s))`);

  // Both donation collections count: someone who gave platelets last month has donated.
  const recentBlood: any[] = await DonationModel.distinct('donorId', {
    donorId: { $in: markedDonorIds }, date: { $gte: cutoff }
  });
  const recentPlatelet: any[] = await PlateletDonationModel.distinct('donorId', {
    donorId: { $in: markedDonorIds }, date: { $gte: cutoff }
  });
  const donatedRecently: Set<string> = new Set<string>([
    ...recentBlood.map((id: any): string => String(id)),
    ...recentPlatelet.map((id: any): string => String(id))
  ]);
  myConsole.log(
    `Marked donors with a donation in the window: ${donatedRecently.size} ` +
      `(${recentBlood.length} blood, ${recentPlatelet.length} platelet)`
  );

  const existingDonorIds: Set<string> = new Set<string>(
    (await DonorModel.find({ _id: { $in: markedDonorIds } }, { _id: 1 }).lean())
      .map((d: any): string => String(d._id))
  );

  const toDelete: any[] = [];
  let orphanRows: number = 0;
  for (const row of rows) {
    const donorId: string = String(row.donorId);
    if (donatedRecently.has(donorId)) continue;
    if (!existingDonorIds.has(donorId)) orphanRows++;
    toDelete.push(row);
  }

  const donorIds: string[] = [...new Set(toDelete.map((r: any): string => String(r.donorId)))];
  myConsole.log(`To unmark: ${toDelete.length} row(s) covering ${donorIds.length} donor(s).`);
  myConsole.log(`  of which rows whose donor no longer exists: ${orphanRows}`);
  myConsole.log(`Rows kept: ${rows.length - toDelete.length}`);

  if (DRY_RUN) {
    myConsole.log(`[DRY_RUN] Would delete ${toDelete.length} activedonors row(s). No writes performed.`);
  } else {
    const result: any = await ActiveDonorModel.deleteMany({
      _id: { $in: toDelete.map((r: any): any => r._id) }
    });
    myConsole.log(`Deleted ${result.deletedCount} activedonors row(s).`);
  }

  const receipt: any = {
    ranAt: new Date(now).toISOString(),
    environment: String(process.env.NODE_ENV),
    dryRun: DRY_RUN,
    criteria: { noDonationSince: new Date(cutoff).toISOString() },
    counts: {
      activeDonorRows: rows.length,
      donatedWithinTwoYears: donatedRecently.size,
      rowsRemoved: toDelete.length,
      donorsUnmarked: donorIds.length,
      orphanRows,
      rowsKept: rows.length - toDelete.length
    },
    donorIds,
    // full rows, so this run can be undone by re-inserting them
    removedRows: toDelete.map((r: any): any => ({
      _id: String(r._id),
      donorId: String(r.donorId),
      markerId: r.markerId ? String(r.markerId) : null,
      time: r.time
    }))
  };
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath: string = path.join(
    OUTPUT_DIR,
    `prune-active-donors.${process.env.NODE_ENV}${DRY_RUN ? '.dry-run' : ''}.json`
  );
  fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8' });
  myConsole.log(`Wrote ${donorIds.length} donor id(s) to ${outputPath}`);
}

main()
  .then(async (): Promise<void> => { await mongoose.connection.close(); process.exit(0); })
  .catch(async (error: any): Promise<void> => {
    myConsole.error('Prune task failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  });
