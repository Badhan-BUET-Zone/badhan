/*
 * Report: dormant donors and volunteers.
 *
 * Lists the ids of every donor who meets all of the following, and writes them to a JSON file:
 *
 *   - designation is not HALL_ADMIN or SUPER_ADMIN — a missing designation counts as DONOR,
 *     which is the schema default and what 1349 legacy documents carry;
 *   - no blood donation and no platelet donation dated within the last 365 days;
 *   - no log entry within the last 365 days, i.e. the account itself has been idle;
 *   - student batch earlier than 20.
 *
 * "Has not donated" counts both donation collections. A donor who gave platelets three months ago
 * has donated, so treating the blood collection alone as the whole story would list them as
 * dormant. The logs are keyed on the donor who performed the action, so an entry there means the
 * account was in use — a volunteer who has not donated but has been calling donors all year is
 * active and is excluded.
 *
 * The batch is the first two digits of the student id, the same derivation the search page uses to
 * group results. Batch 20 and later are excluded; the script logs every batch it saw on either side
 * of that line, so a student id that does not follow the convention shows up rather than being
 * silently binned.
 *
 * Read-only: it writes a JSON file and touches nothing in the database.
 *
 * Environment:
 *   NODE_ENV picks the database, exactly as the migrations do. Run it against production with
 *   NODE_ENV=production.
 *
 * Usage:
 *   docker compose exec -e NODE_ENV=production backend \
 *     npx ts-node --transpile-only scripts/reports/stale-donors.ts
 */
import '../migrations/_bootstrap';
import fs from 'fs';
import path from 'path';
import { mongoose } from '../../src/db/mongoose';
import myConsole from '../../src/utils/myConsole';
import { DESIGNATIONS_INDEX } from '../../src/constants';

const ONE_YEAR_IN_MS: number = 365 * 24 * 60 * 60 * 1000;
// The oldest batch that is NOT reported. Batch is a two-digit year, so this reads "20 and after".
const EXCLUDED_BATCH_FROM: number = 20;

const OUTPUT_DIR: string = path.resolve(__dirname, '../../reports');

interface DormantDonorReport {
  generatedAt: string;
  environment: string;
  criteria: {
    excludedDesignations: number[];
    noDonationSince: string;
    noLogSince: string;
    excludedBatchFrom: number;
  };
  counts: {
    consideredDonorsAndVolunteers: number;
    donatedWithinTheYear: number;
    activeInLogsWithinTheYear: number;
    excludedByBatch: number;
    reported: number;
  };
  donorIds: string[];
}

async function main(): Promise<void> {
  await (await import('../migrations/_bootstrap')).ready;

  const models: typeof mongoose.models = mongoose.connection.models;
  const DonorModel: mongoose.Model<any> | undefined = models.Donor;
  const DonationModel: mongoose.Model<any> | undefined = models.Donations;
  const PlateletDonationModel: mongoose.Model<any> | undefined = models.PlateletDonations;
  const LogModel: mongoose.Model<any> | undefined = models.Logs;
  if (!DonorModel || !DonationModel || !PlateletDonationModel || !LogModel) {
    throw new Error('Donor, Donations, PlateletDonations and Logs models must all be registered.');
  }

  const now: number = Date.now();
  const cutoff: number = now - ONE_YEAR_IN_MS;
  myConsole.log('--- Report: dormant donors and volunteers ---');
  myConsole.log(`NODE_ENV=${process.env.NODE_ENV}`);
  myConsole.log(`Cutoff: ${new Date(cutoff).toISOString()} (donations and logs on or after this count as recent)`);

  // Everyone with a recent donation of either kind, plus everyone whose account did anything at
  // all in the same window. Collected as id strings so the three collections can be merged and
  // looked up in constant time.
  const recentBloodDonors: any[] = await DonationModel.distinct('donorId', { date: { $gte: cutoff } });
  const recentPlateletDonors: any[] = await PlateletDonationModel.distinct('donorId', { date: { $gte: cutoff } });
  const recentlyLogged: any[] = await LogModel.distinct('donorId', { date: { $gte: cutoff } });

  const donatedRecently: Set<string> = new Set<string>([
    ...recentBloodDonors.map((id: any): string => String(id)),
    ...recentPlateletDonors.map((id: any): string => String(id))
  ]);
  const activeInLogs: Set<string> = new Set<string>(recentlyLogged.map((id: any): string => String(id)));

  myConsole.log(
    `Recent donations: ${recentBloodDonors.length} blood, ${recentPlateletDonors.length} platelet, ` +
      `${donatedRecently.size} distinct donor(s).`
  );
  myConsole.log(`Accounts with a log entry in the window: ${activeInLogs.size}.`);

  // Expressed as an exclusion, not `$in: [0, 1]`: 1349 legacy donor documents have no
  // designation field at all, and a missing field matches no $in list. The schema default is
  // DONOR, so an absent designation is a plain donor and belongs in this report.
  const excludedDesignations: number[] = [DESIGNATIONS_INDEX.HALL_ADMIN, DESIGNATIONS_INDEX.SUPER_ADMIN];
  const candidates: any[] = await DonorModel.find(
    { designation: { $nin: excludedDesignations } },
    { studentId: 1, designation: 1 }
  ).lean();
  myConsole.log(`Considered ${candidates.length} donor(s) and volunteer(s).`);

  const batchOf = (studentId: any): number => parseInt(String(studentId ?? '').substring(0, 2), 10);

  const reportedBatches: Set<number> = new Set<number>();
  const excludedBatches: Set<number> = new Set<number>();
  let donatedWithinTheYear: number = 0;
  let activeInLogsWithinTheYear: number = 0;
  let excludedByBatch: number = 0;
  const donorIds: string[] = [];

  for (const donor of candidates) {
    const donorId: string = String(donor._id);
    if (donatedRecently.has(donorId)) {
      donatedWithinTheYear++;
      continue;
    }
    if (activeInLogs.has(donorId)) {
      activeInLogsWithinTheYear++;
      continue;
    }
    const batch: number = batchOf(donor.studentId);
    // NaN fails both comparisons, so a student id that is not two leading digits is reported
    // rather than dropped — it is a data problem worth seeing, not one to hide.
    if (batch >= EXCLUDED_BATCH_FROM) {
      excludedByBatch++;
      excludedBatches.add(batch);
      continue;
    }
    reportedBatches.add(batch);
    donorIds.push(donorId);
  }

  const sortBatches = (batches: Set<number>): (number | string)[] =>
    [...batches]
      .sort((a: number, b: number): number => a - b)
      .map((b: number): number | string => (Number.isNaN(b) ? 'unparseable' : b));

  myConsole.log(`Donated within the year: ${donatedWithinTheYear}.`);
  myConsole.log(`Idle on donations but active in logs: ${activeInLogsWithinTheYear}.`);
  myConsole.log(
    `Excluded by batch (${EXCLUDED_BATCH_FROM}+): ${excludedByBatch} — batches ${JSON.stringify(sortBatches(excludedBatches))}.`
  );
  myConsole.log(`Reported: ${donorIds.length} — batches ${JSON.stringify(sortBatches(reportedBatches))}.`);

  const report: DormantDonorReport = {
    generatedAt: new Date(now).toISOString(),
    environment: String(process.env.NODE_ENV),
    criteria: {
      excludedDesignations,
      noDonationSince: new Date(cutoff).toISOString(),
      noLogSince: new Date(cutoff).toISOString(),
      excludedBatchFrom: EXCLUDED_BATCH_FROM
    },
    counts: {
      consideredDonorsAndVolunteers: candidates.length,
      donatedWithinTheYear,
      activeInLogsWithinTheYear,
      excludedByBatch,
      reported: donorIds.length
    },
    donorIds
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath: string = path.join(OUTPUT_DIR, `stale-donors.${process.env.NODE_ENV}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8' });
  myConsole.log(`Wrote ${donorIds.length} donor id(s) to ${outputPath}`);
}

main()
  .then(async (): Promise<void> => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error: any): Promise<void> => {
    myConsole.error('Report failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  });
