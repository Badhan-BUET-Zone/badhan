const { getPlateletReportDonorsSchema } = require('../schemas');
const operations = require('../../lib/operations');
const { HALLS_INDEX } = require('../../lib/utils/constants');

test('GET/platelet-donations/report/donors: lists the platelet donations behind a report cell', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const donationDate = Date.now();
  const startDate = donationDate - 15 * ONE_DAY_MS;
  const endDate = donationDate + 15 * ONE_DAY_MS;

  const BLOOD_GROUP = 3;
  const donorResponse = await operations.createDonor(
    {
      phone: 8801777000051,
      bloodGroup: BLOOD_GROUP,
      hall: HALLS_INDEX.NAZRUL,
      name: 'Platelet Drill Down Donor',
      fatherName: 'Platelet Drill Down Donor Father',
      motherName: 'Platelet Drill Down Donor Mother',
      studentId: 1900501,
      address: 'Test Address',
      roomNumber: '5001',
      comment: 'platelet report donors test',
      extraDonationCount: 0,
      availableToAll: true,
    },
    signInResponse
  );
  const donorId = donorResponse.data.newDonor._id;
  await operations.createPlateletDonation(donorId, donationDate, signInResponse);

  const cellResponse = await operations.getPlateletDonationReportDonors({
    startDate,
    endDate,
    bloodGroup: BLOOD_GROUP,
    hall: HALLS_INDEX.NAZRUL,
    signInResponse,
    schema: getPlateletReportDonorsSchema,
  });
  const mine = cellResponse.data.donations.filter((donation) => donation.donorId === donorId);
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatchObject({
    name: 'Platelet Drill Down Donor',
    bloodGroup: BLOOD_GROUP,
    hall: HALLS_INDEX.NAZRUL,
    date: donationDate,
  });

  // A different blood group's cell does not carry this donation
  const otherBloodGroupResponse = await operations.getPlateletDonationReportDonors({
    startDate,
    endDate,
    bloodGroup: BLOOD_GROUP === 0 ? 1 : 0,
    hall: -1,
    signInResponse,
    schema: getPlateletReportDonorsSchema,
  });
  expect(
    otherBloodGroupResponse.data.donations.filter((donation) => donation.donorId === donorId)
  ).toHaveLength(0);

  await operations.deletePlateletDonation(donorId, donationDate, signInResponse);
  await operations.signOut(signInResponse);
});
