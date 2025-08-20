const deleteLogInsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
  },
  required: ["status", "statusCode", "message"],
};

module.exports = {
  deleteLogInsSchema,
};
