const getPlateletDonationReportsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
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
                month: { type: "integer" },
                year: { type: "integer" },
                count: { type: "integer" },
              },
              required: ["month", "year", "count"],
            },
          },
          bloodGroup: { type: "integer" },
        },
      },
    },
  firstPlateletDonationCount: { type: "integer" },
  },
  required: ["status", "statusCode", "message", "report", "firstPlateletDonationCount"],
};

const invalidRequestSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 400 },
    message: { type: "string" },
  },
  required: ["status", "statusCode", "message"],
};

const postPlateletDonationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 201 },
    message: { type: "string" },
  newPlateletDonation: {
      type: "object",
      additionalProperties: false,
      properties: {
        date: { type: "integer" },
        _id: { type: "string" },
        phone: { type: "integer" },
        donorId: { type: "string" },
      },
      required: ["date", "_id", "phone", "donorId"],
    },
  },
  required: ["status", "statusCode", "message", "newPlateletDonation"],
};

const deletePlateletDonationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
  deletedPlateletDonation: {
      type: "object",
      additionalProperties: false,
      properties: {
        _id: { type: "string" },
        date: { type: "number" },
        donorId: { type: "string" },
        phone: { type: "number" },
      },
      required: ["_id", "date", "donorId", "phone"],
    },
  },
  required: ["status", "statusCode", "message", "deletedPlateletDonation"],
};

module.exports = {
  getPlateletDonationReportsSchema,
  invalidRequestSchema,
  postPlateletDonationSchema,
  deletePlateletDonationSchema,
};
