const jwtInvalidSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: "ERROR"},
        statusCode: { const: 401},
        message:{ const : 'Invalid Authentication'}
    },
    required:["status","statusCode","message"]
}
const expiredTokenSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: "ERROR"},
        statusCode: { const: 401},
        message:{ const : 'You have been logged out'}
    },
    required:["status","statusCode","message"]
}

const routeNotFoundErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: "ERROR"},
        statusCode: { const: 404},
        message:{ const : 'Route not found'}
    },
    required:["status","statusCode","message"]
}

const jsonBodyParseErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: "ERROR"},
        statusCode: { const: 400},
        message:{ const : 'Malformed JSON'}
    },
    required:["status","statusCode","message"]
}

const internalServerErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: "EXCEPTION"},
        statusCode: { const: 500},
        message:{ const : 'UNCAUGHT ERROR: undefined'},
        details: {
            type: "object",
            additionalProperties:false,
            properties: {
                dummy:{ const: "intentional internal server error"},
            },
            required:["dummy"]
        }
    },
    required:["status","statusCode","message","details"]
}

module.exports = {
    jwtInvalidSchema,
    expiredTokenSchema,
    routeNotFoundErrorSchema,
    jsonBodyParseErrorSchema,
    internalServerErrorSchema
}
