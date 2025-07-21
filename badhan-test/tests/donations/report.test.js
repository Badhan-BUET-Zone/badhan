const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');

const getReportsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {type: "string"},
    statusCode: {const: 200},
    message: {type: "string"},
    report: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          counts: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                "month": {type: "integer"},
                "year": {type: "integer"},
                "count": {type: "integer"}
              },
              required: ["month", "year", "count"]
            }
          },
          bloodGroup: {type: "integer"},
        }
      }
    },
    firstDonationCount: {type: "integer"},
  },
  required: ["status", "statusCode", "message", "report", "firstDonationCount"]
}

const invalidRequestSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {type: "string"},
    statusCode: {const: 400},
    message: {type: "string"},
  },
  required: ["status", "statusCode", "message"]
}

// success
test('GET/donations/report success', async () => {
  try {
    const signInResponse = await badhanAxios.post('/users/signin', {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD
    });
    const authHeader = { headers: { "x-auth": signInResponse.data.token } };

    const donorId = (await badhanAxios.get('/users/me', authHeader)).data.donor._id;

    /* ── create a donation dated “today” ──────────────────────── */
    const donationDate = Date.now();                               // ⬅️ now
    await badhanAxios.post(
      '/donations',
      { donorId, date: donationDate },
      authHeader
    );

    /* ── query window: ±15 days around the donation date ─────── */
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const startDate = donationDate - 15 * ONE_DAY_MS;              // ⬅️ −15 days
    const endDate   = donationDate + 15 * ONE_DAY_MS;              // ⬅️ +15 days

    const getReportsResponse = await badhanAxios.get(
      `/donations/report?startDate=${startDate}&endDate=${endDate}`, // ⬅️
      authHeader
    );
    expect(validate(getReportsResponse.data, getReportsSchema).errors).toEqual([]);

    /* ── cleanup ─────────────────────────────────────────────── */
    await badhanAxios.delete(`/donations?donorId=${donorId}&date=${donationDate}`, authHeader);
    await badhanAxios.delete('/users/signout', authHeader);

  } catch (e) {
    throw processError(e);
  }
});

// invalid request test
test('GET/donations/report invalid request', async () => {
  // no date query params
  try {
    await badhanAxios.get('/donations/report');
  } catch (e) {
    let validationResult = validate(e.response.data, invalidRequestSchema);
    expect(validationResult.errors).toEqual([]);
  }

  // invalid start date
  try {
    await badhanAxios.get('/donations/report?startDate=2&endDate=1717113600000');
  } catch (e) {
    let validationResult = validate(e.response.data, invalidRequestSchema);
    expect(validationResult.errors).toEqual([]);
  }

  // invalid end date
  try {
    await badhanAxios.get('/donations/report?startDate=1707237110000&endDate=2');
  } catch (e) {
    let validationResult = validate(e.response.data, invalidRequestSchema);
    expect(validationResult.errors).toEqual([]);
  }
})



