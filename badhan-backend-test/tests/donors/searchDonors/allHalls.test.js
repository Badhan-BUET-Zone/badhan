// hall=-1 searches every hall at once, and only a super admin may ask for it. Below super admin the
// answer is a 403 rather than a 400: the value is valid, the caller is not allowed it — which is
// the distinction an assistant reading the error needs in order to stop rather than retry.
const { HALLS_INDEX, HTTP_STATUS } = require('../../lib/utils/constants');
const operations = require('../../lib/operations');

const HALL_ANY = -1;

// A name no seeded donor shares, so the name filter scopes every search to the donors made here.
const NAME_PREFIX = 'Zqxallhalls';

const donorInfo = (overrides) => ({
  bloodGroup: 0,
  fatherName: 'All Halls Father',
  motherName: 'All Halls Mother',
  address: 'Azimpur',
  roomNumber: '3009',
  comment: 'all halls search',
  extraDonationCount: 0,
  // false, so the hall filter is the thing being tested: availableToAll=true drops it anyway.
  availableToAll: false,
  ...overrides,
});

const searchURL = (hall) =>
  `/search/v3?bloodGroup=0&hall=${hall}&batch=&name=${NAME_PREFIX}&address=` +
  '&isAvailable=true&isNotAvailable=true&availableToAll=false&archiveFlag=false';

const allHallsForbiddenSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.FORBIDDEN },
    message: { const: 'Only super admins can search every hall at once' },
  },
  required: ['status', 'statusCode', 'message'],
};

test('GET/search/v3: hall=-1 searches every hall for a super admin', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  const inSuhrawardy = await operations.createDonor(
    donorInfo({ phone: 8801555444901, hall: HALLS_INDEX.SUHRAWARDY, name: `${NAME_PREFIX} One`, studentId: 1606901 }),
    signInResponse
  );
  const inTitumir = await operations.createDonor(
    donorInfo({ phone: 8801555444902, hall: HALLS_INDEX.TITUMIR, name: `${NAME_PREFIX} Two`, studentId: 1606902 }),
    signInResponse
  );
  // Same name prefix and hall as one of the matches, different blood group: every hall does not
  // mean every filter is off.
  await operations.createDonor(
    donorInfo({ phone: 8801555444903, hall: HALLS_INDEX.TITUMIR, name: `${NAME_PREFIX} Three`, studentId: 1606903, bloodGroup: 2 }),
    signInResponse
  );

  await operations.searchDonors({
    bloodGroup: 0,
    hall: HALL_ANY,
    batch: '',
    name: NAME_PREFIX,
    isAvailable: true,
    isNotAvailable: true,
    availableToAll: false,
    signInResponse,
    expectedTotalItems: 2,
    expectedDonorIds: [inSuhrawardy.data.newDonor._id, inTitumir.data.newDonor._id],
  });

  // One hall still means one hall.
  await operations.searchDonors({
    bloodGroup: 0,
    hall: HALLS_INDEX.TITUMIR,
    batch: '',
    name: NAME_PREFIX,
    isAvailable: true,
    isNotAvailable: true,
    availableToAll: false,
    signInResponse,
    expectedTotalItems: 1,
    expectedDonorIds: [inTitumir.data.newDonor._id],
  });
});

test('GET/search/v3: hall=-1 is refused with 403 below super admin', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const me = await operations.getMe(signInResponse);

  const volunteer = await operations.createDonor(
    donorInfo({ phone: 8801555444904, hall: me.data.donor.hall, name: `${NAME_PREFIX} Volunteer`, studentId: 1606904 }),
    signInResponse
  );
  const volunteerId = volunteer.data.newDonor._id;
  await operations.promoteToVolunteer(volunteerId, signInResponse);
  const volunteerToken = (await operations.issueDonorPassword(volunteerId, signInResponse)).data.token;

  const response = await operations.expectErrorWithToken('get', searchURL(HALL_ANY), volunteerToken, allHallsForbiddenSchema);
  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
});
