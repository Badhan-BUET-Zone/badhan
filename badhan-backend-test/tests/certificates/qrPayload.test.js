const { HALLS_INDEX, HTTP_STATUS } = require('../lib/utils/constants');
const { uniquePhone } = require('../lib/utils/helpers');
const { extractQrGrid, expectedQrGrid, renderGrid } = require('../lib/utils/pdfQr');
const operations = require('../lib/operations');

// What the QR code on a printed certificate actually encodes.
//
// This is the one thing on the certificate that cannot be checked by looking at it, and the one
// thing that makes the paper worth printing: a verifier scans it, lands on Badhan's site, and
// compares the names. If the address is wrong the certificate is decoration.
//
// It went unchecked for exactly that reason — the code lives inside a server-rendered PDF, so the
// Cypress suite that used to decode it could no longer reach it, and the payload was verified once
// by hand with zbarimg instead. A wrong URL shipped: the address was built without the router's
// `/#/`, so every scan landed on the app's front page instead of the certificate. These tests are
// the standing replacement for that hand check. See tests/lib/utils/pdfQr.js for how the grid is
// recovered without a rasteriser.
//
// The URL below is the contract, and it is frozen. It is printed on paper that Badhan has already
// handed to donors and cannot be recalled, so the route and its query parameter can never change
// shape — only ever be added to. The frontend half of it is badhan-frontend/src/router/index.ts.

const FRONTEND_BASE = process.env.VUE_APP_FRONTEND_BASE || 'http://localhost:8080';

const verificationUrl = (donorId) => `${FRONTEND_BASE}/#/certificate?id=${donorId}`;

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Certificate Qr Target',
  fatherName: 'Certificate Qr Target Father',
  motherName: 'Certificate Qr Target Mother',
  studentId: 1605031,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'certificate qr payload test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const patchBody = (donorId, info) => ({
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
  archiveFlag: false,
  isCertificateEnabled: true,
  email: '',
});

const createDonorWithCertificate = async (info, signInResponse) => {
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;
  await operations.updateDonor(patchBody(donorId, info), signInResponse);
  return donorId;
};

const gridFromResponse = (response) => {
  expect(response.status).toEqual(HTTP_STATUS.OK);

  const grid = extractQrGrid(Buffer.from(response.data));
  expect(grid).not.toBeNull();
  return grid;
};

test('GET /certificates: the QR code encodes the donor’s hash-routed verification page', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Qr Payload', studentId: 1605032 });
  const donorId = await createDonorWithCertificate(info, signInResponse);

  const printed = gridFromResponse(await operations.guestGetBinary(`/certificates/${donorId}`));

  // Module for module. A mismatch here is almost always the encoded URL having changed — check
  // certificateVerificationUrl in badhan-backend/src/services/certificate/certificateRenderer.ts
  // before suspecting the grid geometry.
  expect(renderGrid(printed)).toEqual(renderGrid(expectedQrGrid(verificationUrl(donorId))));

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET /certificates: the signed-in and public certificates carry the same QR code', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Qr Both Variants', studentId: 1605033 });
  const donorId = await createDonorWithCertificate(info, signInResponse);

  // The two variants differ by their background — the signed-in one has the signature block. Where
  // the paper points must not be one of the things that differs: the copy a volunteer prints and
  // the copy a verifier is shown have to lead to the same place, or the comparison is meaningless.
  const anonymous = gridFromResponse(await operations.guestGetBinary(`/certificates/${donorId}`));
  const signedIn = gridFromResponse(
    await operations.authedGetBinary(`/certificates/${donorId}`, signInResponse)
  );

  expect(renderGrid(signedIn)).toEqual(renderGrid(anonymous));
  expect(renderGrid(anonymous)).toEqual(renderGrid(expectedQrGrid(verificationUrl(donorId))));

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET /certificates: each donor’s certificate points at their own page', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const firstInfo = donorInfo({ name: 'Certificate Qr First', studentId: 1605034 });
  const secondInfo = donorInfo({ name: 'Certificate Qr Second', studentId: 1605035 });
  const firstId = await createDonorWithCertificate(firstInfo, signInResponse);
  const secondId = await createDonorWithCertificate(secondInfo, signInResponse);

  const first = gridFromResponse(await operations.guestGetBinary(`/certificates/${firstId}`));
  const second = gridFromResponse(await operations.guestGetBinary(`/certificates/${secondId}`));

  expect(renderGrid(first)).toEqual(renderGrid(expectedQrGrid(verificationUrl(firstId))));
  expect(renderGrid(second)).toEqual(renderGrid(expectedQrGrid(verificationUrl(secondId))));

  // Guards the case the two assertions above cannot see on their own: a renderer that ignored the
  // donor and encoded one constant address would still have to fail this.
  expect(renderGrid(second)).not.toEqual(renderGrid(first));

  await operations.deleteDonor(firstId, signInResponse);
  await operations.deleteDonor(secondId, signInResponse);
  await operations.signOut(signInResponse);
});
