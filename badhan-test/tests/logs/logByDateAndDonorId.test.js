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
          dateString: {type: "string"},
          activeUserCount:{type:"integer"},
          totalLogCount:{type:"integer"}
        },
        required: ["dateString","activeUserCount","totalLogCount"]
      }
    }
  },
  required: ["status", "statusCode", "message","logs"]
}
const logByDateSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: 200 },
    message: { type: 'string' },
    logs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          donorId: { type: 'string' },
          hall: { type: 'number' },
          name: { type: 'string' },
          count: { type: 'number' }
        },
        required: ['donorId', 'hall', 'name', 'count']
      }
    }
  },
  required: ['status', 'statusCode', 'message', 'logs']
}

const logByDateAndDonorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string' },
    statusCode: { const: 200 },
    message: { type: 'string' },
    logs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          date: { type: 'number' },
          operation: { type: 'string' },
        },
        required: ['_id', 'date', 'operation']
      }
    }
  },
  required: ['status', 'statusCode', 'message', 'logs']
}

test('GET/log/date/{date}/donorId/{donorId}', async () => {
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

    let splitDate = getLogResponse.data.logs[0].dateString.split('-')
    let timeStamp = new Date(parseInt(splitDate[0]), parseInt(splitDate[1]) - 1, parseInt(splitDate[2])).getTime()

    let logByDateOnlyResponse = await badhanAxios.get('/log/date/' + timeStamp, {
      headers: {
        'x-auth': signInResponse.data.token
      }
    })
    let logByDateOnlyValidationResult = validate(logByDateOnlyResponse.data, logByDateSchema)

    expect(logByDateOnlyValidationResult.errors).toEqual([])

    let userId = logByDateOnlyResponse.data.logs[0].donorId

    let response = await badhanAxios.get('/log/date/' + timeStamp + '/donorId/' + userId, {
      headers: {
        'x-auth': signInResponse.data.token
      }
    })

    let validationResult = validate(response.data, logByDateAndDonorSchema)

    expect(validationResult.errors).toEqual([])

    await badhanAxios.delete('/users/signout', {
      headers: {
        'x-auth': signInResponse.data.token
      }
    })

  } catch (e) {
    throw processError(e)
  }
})

test('GET/guest/log/date/{date}/donorId/{donorId}', async () => {
  try {
    let getLogsResponse = await badhanAxios.get('/guest/log');

    let logsResponseValidationResult = validate(getLogsResponse.data, logSchema);

    expect(logsResponseValidationResult.errors).toEqual([]);

    let logByDateOnlyResponse = await badhanAxios.get('/guest/log/date/' + 123456)

    let logByDateOnlyValidationResult = validate(logByDateOnlyResponse.data, logByDateSchema)

    expect(logByDateOnlyValidationResult.errors).toEqual([])

    let response = await badhanAxios.get('/guest/log/date/' + 123 + '/donorId/blahblah')

    let validationResult = validate(response.data, logByDateAndDonorSchema)

    expect(validationResult.errors).toEqual([])

  } catch (e) {
    throw processError(e)
  }
})