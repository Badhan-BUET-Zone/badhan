const { HALLS_INDEX, HTTP_STATUS } = require('../lib/utils/constants');
const { uniquePhone } = require('../lib/utils/helpers');
const operations = require('../lib/operations');
const flows = require('../lib/flows');
const { certificateNotFoundSchema, certificateNotEnabledSchema } = require('./schemas');

// GET /certificates/{donorId} is the only route in the project that is public by design rather than
// by omission: a printed certificate's QR code is scanned by someone who has no Badhan account and
// never will. It carries no authentication middleware at all, so these tests deliberately call it
// with no x-auth header — operations.guestGet sends none. A caller who happens to be signed in gets
// the same document; the test at the bottom of this file pins that.
//
// It is also the only route that answers with a file. The certificate is rendered on the backend
// and returned as a PDF, so there is no JSON payload left to pin field-by-field; what these tests
// pin instead is that the bytes really are a PDF, that the two failures stay told apart, and that
// a certificate is unreachable until somebody turns it on.

const PDF_SIGNATURE = '%PDF-';

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Certificate Target',
  fatherName: 'Certificate Target Father',
  motherName: 'Certificate Target Mother',
  studentId: 1605011,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'certificate route test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

const patchBody = (donorId, info, archiveFlag, isCertificateEnabled = false) => ({
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
});

// A donor is created with the certificate off — that is the schema default, and POST /donors has no
// field for it — so every test that wants a reachable certificate turns it on the way a volunteer
// would, through the ordinary profile PATCH.
const createDonorWithCertificate = async (info, signInResponse) => {
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;
  await operations.updateDonor(patchBody(donorId, info, false, true), signInResponse);
  return donorId;
};

const expectPdf = (response) => {
  expect(response.status).toEqual(HTTP_STATUS.OK);
  expect(response.headers['content-type']).toEqual('application/pdf');

  const body = Buffer.from(response.data);
  expect(body.subarray(0, PDF_SIGNATURE.length).toString('latin1')).toEqual(PDF_SIGNATURE);

  // A PDF carrying the full-page background is hundreds of kilobytes. A few hundred bytes would
  // mean the renderer produced an empty page and nothing else noticed.
  expect(body.length).toBeGreaterThan(100000);
  return body;
};

test('GET /certificates: served without a token, and answers with a PDF', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Public Read', studentId: 1605012 });
  const donorId = await createDonorWithCertificate(info, signInResponse);

  // No x-auth header anywhere in this call — a verifier scanning printed paper has no account.
  const response = await operations.guestGetBinary(`/certificates/${donorId}`);
  expectPdf(response);

  // inline, not attachment: the verification page shows the certificate on screen, and only
  // downloads it if the visitor asks. The filename is what lands on their disk if they do.
  expect(response.headers['content-disposition']).toEqual(
    `inline; filename="Badhan-Certificate-${info.studentId}.pdf"`
  );

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET /certificates: a donor whose certificate is not enabled is refused, distinctly from missing', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Disabled Donor', studentId: 1605015 });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;

  // Never enabled — this is what every donor looks like the moment they are created, and what
  // every donor that existed before this feature looks like after the backfill.
  const disabled = await operations.expectGuestError(
    'get',
    `/certificates/${donorId}`,
    certificateNotEnabledSchema
  );
  expect(disabled.status).toEqual(HTTP_STATUS.FORBIDDEN);

  // Turning it on is an ordinary profile edit, and takes effect immediately.
  await operations.updateDonor(patchBody(donorId, info, false, true), signInResponse);
  expectPdf(await operations.guestGetBinary(`/certificates/${donorId}`));

  // And turning it back off makes the certificate unreachable again.
  await operations.updateDonor(patchBody(donorId, info, false, false), signInResponse);
  await operations.expectGuestError(
    'get',
    `/certificates/${donorId}`,
    certificateNotEnabledSchema
  );

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET /certificates: an ordinary volunteer can turn a certificate on, and it takes effect at once', async () => {
  // isCertificateEnabled rides the general profile PATCH with no permission rule of its own, so
  // whoever may edit a donor may enable their certificate. That is the decision this pins: if
  // somebody later gates the field to hall admin, this fails rather than the behaviour changing
  // quietly.
  const signInResponse = await operations.signInSuperAdmin();
  const volunteerInfo = donorInfo({ name: 'Certificate Enabling Volunteer', studentId: 1605016 });
  const { volunteerToken } = await flows.createVolunteerWithToken(volunteerInfo, signInResponse);

  // Same hall as the volunteer, which is what makes them editable by one.
  const info = donorInfo({ name: 'Certificate Volunteer Target', studentId: 1605017 });
  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;

  await operations.expectGuestError(
    'get',
    `/certificates/${donorId}`,
    certificateNotEnabledSchema
  );

  await operations.updateDonor(patchBody(donorId, info, false, true), { data: { token: volunteerToken } });
  expectPdf(await operations.guestGetBinary(`/certificates/${donorId}`));

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET /certificates: the route is rate limited', async () => {
  // The endpoint renders a full-page PDF per call on a public, unauthenticated route, so losing
  // its limiter would be worth noticing. Exhausting it is not the check — the limit is 12/min in
  // production and 1200/min here — but commonLimiter announces itself in every response, and those
  // headers disappear the moment the middleware does.
  const response = await operations.expectGuestError(
    'get',
    '/certificates/000000000000000000000000',
    certificateNotFoundSchema
  );

  expect(response.headers['x-ratelimit-limit']).toBeDefined();
  expect(response.headers['x-ratelimit-remaining']).toBeDefined();
});

test('GET /certificates: an archived donor still resolves', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Archived Donor', studentId: 1605013 });
  const donorId = await createDonorWithCertificate(info, signInResponse);

  await operations.updateDonor(patchBody(donorId, info, true, true), signInResponse);

  // Archiving means graduated, not erased — and a graduate is exactly who needs the certificate.
  // Paper already in their hands has to keep verifying, so archiveFlag is never a filter here.
  expectPdf(await operations.guestGetBinary(`/certificates/${donorId}`));

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});

test('GET /certificates: a deleted donor answers 404', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Deleted Donor', studentId: 1605014 });
  const donorId = await createDonorWithCertificate(info, signInResponse);

  expectPdf(await operations.guestGetBinary(`/certificates/${donorId}`));
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
  //
  // Note this is a different answer from the not-enabled case above, on purpose: there, the id has
  // already resolved to a real donor, so there is nothing left for sameness to protect.
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

// --- the same document for everyone ---------------------------------------------------------
//
// The certificate is drawn on one background, signature block and all, whoever asked for it: the
// paper in a verifier's hand and the page on their screen have to be the same drawing for the
// comparison they are making to read.
//
// Nothing here can look at the drawing, so this compares LENGTHS, not bytes. Two renders of the
// same donor are never byte-identical — pdfkit stamps a /CreationDate into every document — but on
// the same background they are always exactly the same length, and a second background would differ
// by tens of kilobytes of embedded PNG. So a byte comparison would pass whatever the renderer did,
// while a length comparison says whether one background was used.

test('GET /certificates: a signed-in viewer gets the same document as a stranger', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Signature Block', studentId: 1605018 });
  const donorId = await createDonorWithCertificate(info, signInResponse);

  const anonymousResponse = await operations.guestGetBinary(`/certificates/${donorId}`);
  const signedInResponse = await operations.authedGetBinary(`/certificates/${donorId}`, signInResponse);
  const anonymous = expectPdf(anonymousResponse);
  const signedIn = expectPdf(signedInResponse);

  // The same length to the byte, which two different backgrounds could never be.
  expect(signedIn.length).toEqual(anonymous.length);

  // And the filename a visitor saves does not depend on their session either, nor the inline
  // disposition the verification page relies on.
  expect(signedInResponse.headers['content-disposition']).toEqual(
    anonymousResponse.headers['content-disposition']
  );

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});
