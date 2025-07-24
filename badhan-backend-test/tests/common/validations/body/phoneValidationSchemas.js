const BODY_phone_RequiredError_Schema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ const: 'Phone number is required'}
    },
    required:["status","statusCode","message"]
}

const BODY_phone_LengthError_Schema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ const: 'Phone number must be of 13 digits'}
    },
    required:["status","statusCode","message"]
}

const BODY_phone_AllowedRangeError_Schema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ const: 'Phone number must an integer between 8801000000000 and 8801999999999'}
    },
    required:["status","statusCode","message"]
}

module.exports = {
    BODY_phone_AllowedRangeError_Schema,
    BODY_phone_RequiredError_Schema,
    BODY_phone_LengthError_Schema
}
