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
module.exports = {
    jwtInvalidSchema,
    expiredTokenSchema
}
