const { getReportsSchema } = require('../schemas');
const operations = require('../../lib/operations');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// Total donation count for one hall in a hallwiseReport map (0 if the hall is absent)
function hallTotal(hallwiseReport, hall) {
  const entry = hallwiseReport[hall];
  if (!entry) return 0;
  return entry.report.reduce(
    (sum, bloodGroupData) => sum + bloodGroupData.counts.reduce((s, c) => s + c.count, 0),
    0
  );
}

// Total across every hall in a hallwiseReport map
function hallwiseGrandTotal(hallwiseReport) {
  return Object.keys(hallwiseReport).reduce((sum, hall) => sum + hallTotal(hallwiseReport, hall), 0);
}

// Total across the all-halls report array
function allHallsTotal(report) {
  return report.reduce(
    (sum, bloodGroupData) => sum + bloodGroupData.counts.reduce((s, c) => s + c.count, 0),
    0
  );
}

test('GET/donations/report: hallwiseReport breaks the total down per hall', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const donationDate = Date.now();
  const startDate = donationDate - 15 * ONE_DAY_MS;
  const endDate = donationDate + 15 * ONE_DAY_MS;

  // Two donors in two different halls, each with one donation in the window
  const donorAResponse = await operations.createDonor({
    phone: 8801777000021,
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Hallwise Donor A',
    studentId: 1900201,
    address: 'Test Address',
    roomNumber: '2001',
    comment: 'hallwise test',
    extraDonationCount: 0,
    availableToAll: true,
  }, signInResponse);
  const donorBResponse = await operations.createDonor({
    phone: 8801777000022,
    bloodGroup: 3,
    hall: HALLS_INDEX.NAZRUL,
    name: 'Hallwise Donor B',
    studentId: 1900202,
    address: 'Test Address',
    roomNumber: '2002',
    comment: 'hallwise test',
    extraDonationCount: 0,
    availableToAll: true,
  }, signInResponse);
  const donorAId = donorAResponse.data.newDonor._id;
  const donorBId = donorBResponse.data.newDonor._id;

  await operations.createDonation(donorAId, donationDate, signInResponse);
  await operations.createDonation(donorBId, donationDate, signInResponse);

  const response = await operations.getDonationReport({
    startDate,
    endDate,
    signInResponse,
    schema: getReportsSchema,
  });
  const { report, firstDonationCount, hallwiseReport } = response.data;

  // Each hall the donation went into shows up with at least that donation
  expect(hallTotal(hallwiseReport, HALLS_INDEX.CHATRI)).toBeGreaterThanOrEqual(1);
  expect(hallTotal(hallwiseReport, HALLS_INDEX.NAZRUL)).toBeGreaterThanOrEqual(1);

  // Invariant: the per-hall totals reconcile exactly with the all-halls total
  expect(hallwiseGrandTotal(hallwiseReport)).toBe(allHallsTotal(report));

  // Invariant: each first-time donor belongs to exactly one hall, so the per-hall
  // first-time counts sum to the all-halls first-time count
  const hallwiseFirstSum = Object.values(hallwiseReport)
    .reduce((sum, entry) => sum + entry.firstDonationCount, 0);
  expect(hallwiseFirstSum).toBe(firstDonationCount);

  await operations.deleteDonation(donorAId, donationDate, signInResponse);
  await operations.deleteDonation(donorBId, donationDate, signInResponse);
  await operations.signOut(signInResponse);
});
