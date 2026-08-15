const { HALLS_INDEX, HTTP_STATUS } = require('../../lib/utils/constants');
const { uniquePhone } = require('../../lib/utils/helpers');
const operations = require('../../lib/operations');

// The creation contract for the two fields plan16 added, and for the one it deliberately did not
// let anybody set at creation time.
//
// Parents' names are required on POST, the same way the donor's own name is: a certificate prints
// all three, and a record created without them can only be repaired by somebody noticing later.
// isCertificateEnabled is the opposite — it has no place on this route at all, because a
// certificate is something a volunteer turns on for a donor deliberately, afterwards.

const missingFieldSchema = (field) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: `${field} is required` },
  },
  required: ['status', 'statusCode', 'message'],
});

const donorInfo = (overrides = {}) => ({
  phone: uniquePhone(),
  bloodGroup: 2,
  hall: HALLS_INDEX.SUHRAWARDY,
  name: 'Required Fields Donor',
  fatherName: 'Required Fields Father',
  motherName: 'Required Fields Mother',
  studentId: 1605018,
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'required fields test',
  extraDonationCount: 0,
  availableToAll: true,
  ...overrides,
});

test('POST /donors: refuses a body with no fatherName, and one with no motherName', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  for (const field of ['fatherName', 'motherName']) {
    const body = donorInfo();
    delete body[field];

    const response = await operations.expectAuthedError(
      'post',
      '/donors',
      signInResponse,
      missingFieldSchema(field),
      body
    );
    expect(response.status).toEqual(HTTP_STATUS.BAD_REQUEST);
  }

  await operations.signOut(signInResponse);
});

test('POST /donors: a new donor gets isCertificateEnabled false without anyone sending it', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const info = donorInfo({ name: 'Certificate Default Donor', studentId: 1605019 });

  // Nothing in the body mentions the field — it is not part of the creation contract.
  expect(info.isCertificateEnabled).toBeUndefined();

  const donorId = (await operations.createDonor(info, signInResponse)).data.newDonor._id;
  // No schema argument: donorsSchema describes a donor who is also a public contact, and this one
  // is not. The single field is what this test is about.
  const fetched = await operations.getDonor(donorId, signInResponse);

  // Read back from the API rather than trusted from the schema default: a default that mongoose
  // applies on hydration but never writes is exactly the gap the backfill migration exists to
  // close, and it would look identical here if this only checked the creation response.
  expect(fetched.data.donor.isCertificateEnabled).toEqual(false);

  await operations.deleteDonor(donorId, signInResponse);
  await operations.signOut(signInResponse);
});
