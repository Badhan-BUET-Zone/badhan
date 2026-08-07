const { HALLS_INDEX, HTTP_STATUS } = require('../lib/utils/constants');
const { uniquePhone } = require('../lib/utils/helpers');
const operations = require('../lib/operations');
const { getCertificateSchema, certificateNotFoundSchema } = require('./schemas');

// GET /certificates/{donorId} is the only route in the project that is public by design rather than
// by omission: a printed certificate's QR code is scanned by someone who has no Badhan account and
// never will. It carries no authentication middleware at all, so these tests deliberately call it
// with no x-auth header — operations.guestGet sends none.

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Certificate Target',
  studentId: 1605011,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'certificate route test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const patchBody = (donorId, info, archiveFlag) => ({
  donorId,
  name: info.name,
  phone: info.phone,
  studentId: info.studentId,
  bloodGroup: info.bloodGroup,
  hall: info.hall,
  roomNumber: info.roomNumber,
  address: info.address,
  availableToAll: info.availableToAll,
  archiveFlag,
  email: '',
});

test('GET /certificates: served without a token, and carries only name and studentId', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Public Read', studentId: 1605012 });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;

  // No x-auth header anywhere in this call — a verifier scanning printed paper has no account.
  const response = await operations.guestGet(`/certificates/${donorId}`, getCertificateSchema);

  expect(response.status).toEqual(HTTP_STATUS.OK);
  expect(response.data.certificate.name).toEqual(info.name);
  expect(response.data.certificate.studentId).toEqual(String(info.studentId));

  // The schema already pins this, but state it outright: the payload is the whole security model.
  // A donor's blood group, phone, hall, room, address, comment and donation history must never
  // reach a page anyone on the internet can open.
  expect(Object.keys(response.data.certificate).sort()).toEqual(['name', 'studentId']);

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET /certificates: an archived donor still resolves', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Archived Donor', studentId: 1605013 });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;

  await operations.updateDonor(patchBody(donorId, info, true), signInResponse);

  // Archiving means graduated, not erased — and a graduate is exactly who needs the certificate.
  // Paper already in their hands has to keep verifying, so archiveFlag is never a filter here.
  const response = await operations.guestGet(`/certificates/${donorId}`, getCertificateSchema);
  expect(response.data.certificate.name).toEqual(info.name);

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET /certificates: a deleted donor answers 404', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Deleted Donor', studentId: 1605014 });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;

  await operations.guestGet(`/certificates/${donorId}`, getCertificateSchema);
  await operations.deleteDonor(donorId, signInResponse);

  // Deleting a donor permanently breaks every certificate already printed for them. That is the
  // documented consequence, not a bug — but it must fail politely rather than crash.
  await operations.expectGuestError('get', `/certificates/${donorId}`, certificateNotFoundSchema);

  await operations.signOut(signInResponse);
});

test('GET /certificates: unknown and malformed ids are indistinguishable 404s', async () => {
  // A well-formed id that belongs to nobody, and four ids that are not ObjectIds at all, all answer
  // with the same status and the same message. Someone probing the id space learns nothing about
  // which ids are even the right shape — and a malformed id must never surface a 500 or a stack.
  const wellFormedButAbsent = '000000000000000000000000';
  const notObjectIds = ['abc', '123', 'null', '5e901d56effc5900177123'];

  for (const id of [wellFormedButAbsent, ...notObjectIds]) {
    const response = await operations.expectGuestError(
      'get',
      `/certificates/${id}`,
      certificateNotFoundSchema
    );
    expect(response.status).toEqual(HTTP_STATUS.NOT_FOUND);
  }
});
