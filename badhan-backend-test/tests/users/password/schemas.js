const patchPasswordSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 201 },
    message: { type: "string" },
    token: { type: "string" },
  },
  required: ["status", "statusCode", "token", "message"],
};

module.exports = {
  patchPasswordSchema,
};
