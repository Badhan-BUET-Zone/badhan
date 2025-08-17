const postActiveDonorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 201 },
    message: { type: "string" },
    newActiveDonor: {
      type: "object",
      additionalProperties: false,
      properties: {
        _id: { type: "string" },
        donorId: { type: "string" },
        markerId: { type: "string" },
        time: { type: "integer" },
      },
    },
  },
};

const deleteActiveDonorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    removedActiveDonor: {
      type: "object",
      additionalProperties: false,
      properties: {
        _id: { type: "string" },
        donorId: { type: "string" },
        markerId: { type: "string" },
        time: { type: "integer" },
      },
    },
  },
};

const activeDonorSearchResultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    activeDonors: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          _id: { type: "string" },
          hall: { type: "integer" },
          name: { type: "string" },
          address: { type: "string" },
          comment: { type: "string" },
          commentTime: { type: "integer" },
          lastDonation: { type: "integer" },
          lastPlateletDonation: { type: "integer" },
          availableToAll: { type: "boolean" },
          bloodGroup: { type: "integer" },
          studentId: { type: "string" },
          phone: { type: "integer" },
          markedTime: { type: "integer" },
          markerName: { type: "string" },
          donationCount: { type: "integer" },
          callRecordCount: { type: "integer" },
          callCountLast3Days: { type: "integer" },
          lastCallRecord: {
            type: {
              anyOf: [{ type: "integer" }, { type: "null" }],
            },
          },
        },
        required: [
          "_id",
          "hall",
          "name",
          "address",
          "comment",
          "commentTime",
          "lastDonation",
          "availableToAll",
          "bloodGroup",
          "studentId",
          "phone",
          "markedTime",
          "markerName",
          "donationCount",
          "callRecordCount",
          "lastCallRecord",
        ],
      },
    },
  },
  required: ["status", "statusCode", "message", "activeDonors"],
};

module.exports = {
  postActiveDonorSchema,
  deleteActiveDonorSchema,
  activeDonorSearchResultSchema,
};
