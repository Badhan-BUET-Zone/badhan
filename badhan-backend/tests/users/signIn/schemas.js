const signInSchema={
    type: "object",
    additionalProperties:false,
    properties: {
        status:{type:"string"},
        statusCode: { const: 201},
        token: { type: "string" },
        message:{type:"string"}
    },
    required:["status","statusCode","token","message"]
};

const phoneValidationErrorSchema = {
    type: "object",
    additionalProperties:false,
    properties: {
        status:{ const: 'ERROR' },
        statusCode: { const: 400 },
        message:{ type: 'string'}
    },
    required:["status","statusCode","message"]
}

const phoneNotFoundErrorSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: { const: 'ERROR' },
        statusCode: { const: 404 },
        message: { const: 'Account not found'}
    },
    required:["status","statusCode","message"]
}

const passwordIncorrectErrorSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: { const: 'ERROR' },
        statusCode: { const: 401 },
        message: { const: 'Incorrect phone / password'}
    },
    required:["status","statusCode","message"]
}

module.exports = {
    signInSchema,
    phoneValidationErrorSchema,
    phoneNotFoundErrorSchema,
    passwordIncorrectErrorSchema
}
