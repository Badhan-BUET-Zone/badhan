const { getReportDonorsSchema, getReportsSchema } = require('../schemas');
const operations = require('../../lib/operations');
const { HALLS_INDEX } = require('../../lib/utils/constants');

// Total donations counted by the report for one blood group across the whole window
function bloodGroupTotal(report, bloodGroup) {
  return report
    .filter((entry) => entry.bloodGroup === bloodGroup)
    .reduce((sum, entry) => sum + entry.counts.reduce((s, c) => s + c.count, 0), 0);
}

test('GET/donations/report/donors: lists the donations behind a report cell', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const donationDate = Date.now();
  const startDate = donationDate - 15 * ONE_DAY_MS;
  const endDate = donationDate + 15 * ONE_DAY_MS;

  const BLOOD_GROUP = 2;
  const donorResponse = await operations.createDonor(
    {
      phone: 8801777000031,
      bloodGroup: BLOOD_GROUP,
      hall: HALLS_INDEX.CHATRI,
      name: 'Drill Down Donor',
      studentId: 1900301,
      address: 'Test Address',
      roomNumber: '3001',
      comment: 'report donors test',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );
  const donorId = donorResponse.data.newDonor._id;
  await operations.createDonation(donorId, donationDate, signInResponse);

  // The donor shows up under their own blood group and hall
  const cellResponse = await operations.getDonationReportDonors({
    startDate,
    endDate,
    bloodGroup: BLOOD_GROUP,
    hall: HALLS_INDEX.CHATRI,
    signInResponse,
    schema: getReportDonorsSchema,
  });
  const cellDonations = cellResponse.data.donations;
  const mine = cellDonations.filter((donation) => donation.donorId === donorId);
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatchObject({
    name: 'Drill Down Donor',
    bloodGroup: BLOOD_GROUP,
    hall: HALLS_INDEX.CHATRI,
    date: donationDate,
  });

  // Invariant: the list behind a cell is exactly as long as the count the cell shows
  const reportResponse = await operations.getDonationReport({
    startDate,
    endDate,
    signInResponse,
    schema: getReportsSchema,
  });
  const allHallsCellResponse = await operations.getDonationReportDonors({
    startDate,
    endDate,
    bloodGroup: BLOOD_GROUP,
    hall: -1,
    signInResponse,
    schema: getReportDonorsSchema,
  });
  expect(allHallsCellResponse.data.donations).toHaveLength(
    bloodGroupTotal(reportResponse.data.report, BLOOD_GROUP)
  );

  // A different hall does not carry this donor's donation
  const otherHallResponse = await operations.getDonationReportDonors({
    startDate,
    endDate,
    bloodGroup: BLOOD_GROUP,
    hall: HALLS_INDEX.NAZRUL,
    signInResponse,
    schema: getReportDonorsSchema,
  });
  expect(
    otherHallResponse.data.donations.filter((donation) => donation.donorId === donorId)
  ).toHaveLength(0);

  // bloodGroup -1 is the 'Total' column: every blood group, so it includes this donation
  const totalColumnResponse = await operations.getDonationReportDonors({
    startDate,
    endDate,
    bloodGroup: -1,
    hall: -1,
    signInResponse,
    schema: getReportDonorsSchema,
  });
  expect(
    totalColumnResponse.data.donations.filter((donation) => donation.donorId === donorId)
  ).toHaveLength(1);

  // Outside the window, the donation is not listed
  const outsideWindowResponse = await operations.getDonationReportDonors({
    startDate: donationDate + ONE_DAY_MS,
    endDate,
    bloodGroup: -1,
    hall: -1,
    signInResponse,
    schema: getReportDonorsSchema,
  });
  expect(
    outsideWindowResponse.data.donations.filter((donation) => donation.donorId === donorId)
  ).toHaveLength(0);

  await operations.deleteDonation(donorId, donationDate, signInResponse);
  await operations.signOut(signInResponse);
});
