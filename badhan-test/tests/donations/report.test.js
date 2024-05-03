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
    let signInResponse = await badhanAxios.post('/users/signin', {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD
    });

    let getReportsResponse = await badhanAxios.get('/donations/report?startDate=1707237110000&endDate=1717113600000', {
      headers: {
        "x-auth": signInResponse.data.token
      }
    });

    let validationResult = validate(getReportsResponse.data, getReportsSchema);

    expect(validationResult.errors).toEqual([]);

    await badhanAxios.delete('/users/signout', {
      headers: {
        "x-auth": signInResponse.data.token
      }
    });

  } catch (e) {
    throw processError(e);
  }
})

// invalid request test
test('GET/donations/report invalid request', async () => {
  try {
    let signInResponse = await badhanAxios.post('/users/signin', {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD
    });

    // no date query params
    try {
      await badhanAxios.get('/donations/report', {
        "x-auth": signInResponse.data.token
      });
    } catch (e) {
      let validationResult = validate(e.response.data, invalidRequestSchema);
      expect(validationResult.errors).toEqual([]);
    }

    // invalid start date
    try {
      await badhanAxios.get('/donations/report?startDate=2&endDate=1717113600000', {
        "x-auth": signInResponse.data.token
      });
    } catch (e) {
      let validationResult = validate(e.response.data, invalidRequestSchema);
      expect(validationResult.errors).toEqual([]);
    }

    // invalid end date
    try {
      await badhanAxios.get('/donations/report?startDate=1707237110000&endDate=2', {
        "x-auth": signInResponse.data.token
      });
    } catch (e) {
      let validationResult = validate(e.response.data, invalidRequestSchema);
      expect(validationResult.errors).toEqual([]);
    }

    await badhanAxios.delete('/users/signout', {
      headers: {
        "x-auth": signInResponse.data.token
      }
    });

  } catch (e) {
    throw processError(e);
  }
})



