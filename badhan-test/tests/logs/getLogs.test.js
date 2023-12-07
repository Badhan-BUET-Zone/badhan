const { badhanAxios } = require('../../api')
const validate = require('jsonschema').validate
const env = require('../../config/config')
const { processError } = require('../fixtures/helpers')
const logSchema={
  type: "object",
  additionalProperties: false,
  properties: {
    status: {type: "string"},
    statusCode: {const: 200},
    message: {type: "string"},
    logs: {
      type:"array",
      minItems: 1,
      items: {
        type:"object",
        additionalProperties: false,
        properties: {
          date: {type: "number"},
          _id:{type:"string"},
          name: {type: "string"},
          hall: {type: "number"},
          operation: {type:"string"}
        },
        required: ["date","_id","name","hall","operation"]
      }
    }
  },
  required: ["status", "statusCode", "message","logs"]
}

test('GET/log', async () => {
  try {
    let signInResponse = await badhanAxios.post('/users/signin', {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD
    })

    let getLogResponse = await badhanAxios.get('/log',{
      headers:{
        "x-auth":signInResponse.data.token
      }
    });


    let getLogResponseValidationResult = validate(getLogResponse.data, logSchema);

    expect(getLogResponseValidationResult.errors).toEqual([]);

    await badhanAxios.delete('/users/signout', {
      headers: {
        'x-auth': signInResponse.data.token
      }
    })

  } catch (e) {
    throw processError(e)
  }
})

test('GET/guest/log', async () => {
  try {
    let getLogsResponse = await badhanAxios.get('/guest/log');

    let logsResponseValidationResult = validate(getLogsResponse.data, logSchema);

    expect(logsResponseValidationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e)
  }
})