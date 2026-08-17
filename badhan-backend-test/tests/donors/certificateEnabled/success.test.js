const operations = require('../../lib/operations');
const { certificateEnabledDonorSchema } = require('../schemas');
const { HALLS_INDEX } = require('../../lib/utils/constants');
const { uniquePhone } = require('../../lib/utils/helpers');

// GET /donors/certificateEnabled lists every donor whose certificate is switched on. The flag is
// not a super-admin privilege — any volunteer or hall admin who may edit a donor may set it — so
// this route is the only place the whole set is visible, and reading it is what needs the guard.

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Certificate Enabled Row',
  fatherName: 'Certificate Enabled Row Father',
  motherName: 'Certificate Enabled Row Mother',
  studentId: 1606095,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'certificate enabled test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const setFlags = (donorId, info, { isCertificateEnabled, archiveFlag }, signInResponse) =>
  operations.updateDonor(
    {
      donorId,
      name: info.name,
      fatherName: info.fatherName,
      motherName: info.motherName,
      phone: info.phone,
      studentId: info.studentId,
      bloodGroup: info.bloodGroup,
      hall: info.hall,
      roomNumber: info.roomNumber,
      address: info.address,
      availableToAll: info.availableToAll,
      archiveFlag,
      isCertificateEnabled,
      email: '',
    },
    signInResponse
  );

test('GET/donors/certificateEnabled: returns the enabled donors and only those', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const enabledInfo = donorInfo({ name: 'Certificate Enabled Donor' });
  const enabledId = (await operations.createDonor(enabledInfo, signInResponse)).data.newDonor._id;
  await setFlags(enabledId, enabledInfo, { isCertificateEnabled: true, archiveFlag: false }, signInResponse);

  // A donor created and left alone: the flag defaults to false, which is the state most of the
  // collection is in.
  const disabledInfo = donorInfo({ name: 'Certificate Disabled Donor' });
  const disabledId = (await operations.createDonor(disabledInfo, signInResponse)).data.newDonor._id;

  const response = await operations.authedGet(
    '/donors/certificateEnabled',
    signInResponse,
    certificateEnabledDonorSchema
  );
  const ids = response.data.data.map((donor) => donor._id);

  expect(ids).toContain(enabledId);
  // The load-bearing half. A handler that forgot its filter still contains the enabled donor, so
  // only the exclusion proves the query ran.
  expect(ids).not.toContain(disabledId);

  // Pins the filter from the other side: nothing in the list may be disabled, whatever else changes.
  response.data.data.forEach((donor) => {
    expect(donor.isCertificateEnabled).toEqual(true);
  });

  await operations.deleteDonor(enabledId, signInResponse);
  await operations.deleteDonor(disabledId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET/donors/certificateEnabled: a donor whose certificate is switched off leaves the list', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const info = donorInfo({ name: 'Certificate Toggled Donor' });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;

  await setFlags(donorId, info, { isCertificateEnabled: true, archiveFlag: false }, signInResponse);
  const enabledResponse = await operations.authedGet(
    '/donors/certificateEnabled',
    signInResponse,
    certificateEnabledDonorSchema
  );
  expect(enabledResponse.data.data.map((donor) => donor._id)).toContain(donorId);

  await setFlags(donorId, info, { isCertificateEnabled: false, archiveFlag: false }, signInResponse);
  const disabledResponse = await operations.authedGet(
    '/donors/certificateEnabled',
    signInResponse,
    certificateEnabledDonorSchema
  );
  expect(disabledResponse.data.data.map((donor) => donor._id)).not.toContain(donorId);

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});
