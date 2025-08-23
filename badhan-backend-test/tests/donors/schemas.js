const donorsNewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    donors: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          _id: { type: "string" },
          phone: { type: "integer" },
          name: { type: "string" },
          studentId: { type: "string" },
          email: { type: "string" },
          bloodGroup: { type: "integer" },
          hall: { type: "integer" },
          roomNumber: { type: "string" },
          address: { type: "string" },
          comment: { type: "string" },
          commentTime: { type: "integer" },
          designation: { type: "integer" },
          availableToAll: { type: "boolean" },
          created: { type: "integer" }
        },
        required: [
          "_id",
          "phone",
          "name",
          "studentId",
          "email",
          "bloodGroup",
          "hall",
          "roomNumber",
          "address",
          "comment",
          "commentTime",
          "designation",
          "availableToAll",
          "created"
        ]
      }
    }
  },
  required: ["status", "statusCode", "message", "donors"]
};
const searchSchema = ({ totalItems } = {}) => {
  // Build filteredDonors schema conditionally depending on whether totalItems is provided
  const filteredDonors = {
    type: "array",
    // minItems/maxItems will be added only when totalItems is specified
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        address: { type: "string" },
        roomNumber: { type: "string" },
        lastDonation: { type: "integer" },
        lastPlateletDonation: { type: "integer" },
        comment: { type: "string" },
        commentTime: { type: "integer" },
        _id: { type: "string" },
        studentId: { type: "string" },
        name: { type: "string" },
        bloodGroup: { type: "integer" },
        phone: { type: "integer" },
        hall: { type: "integer" },
        availableToAll: { type: "boolean" },
        donationCount: { type: "integer" },
        callRecordCount: { type: "integer" },
        callCountLast3Days: { type: "integer" },
        lastCalled: {
          type: {
            anyOf: [
              {
                type: "integer",
              },
              {
                type: "null",
              },
            ],
          },
        },
        marker: {
          type: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  time: { type: "integer" },
                },
                required: ["name", "time"],
              },
              {
                type: "object",
                additionalProperties: false,
                properties: {},
              },
            ],
          },
        },
      },
      required: [
        "address",
        "roomNumber",
        "lastDonation",
        "lastPlateletDonation",
        "comment",
        "commentTime",
        "_id",
        "studentId",
        "name",
        "bloodGroup",
        "hall",
        "phone",
        "availableToAll",
        "donationCount",
        "callRecordCount",
        "marker",
      ],
    },
  };

  // Only enforce a fixed count when totalItems is explicitly provided (not null/undefined)
  if (totalItems != null) {
    filteredDonors.minItems = totalItems;
    filteredDonors.maxItems = totalItems;
  }

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      status: { type: "string" },
      statusCode: { const: 200 },
      message: { type: "string" },
      filteredDonors,
    },
    required: ["status", "statusCode", "message", "filteredDonors"],
  };
}

const passwordSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    token: { type: "string" },
  },
  required: ["status", "statusCode", "message", "token"],
};

const patchDonorsDesignationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
  },
  required: ["status", "statusCode", "message"],
};

const patchCommentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
  },
  required: ["status", "statusCode", "message"],
};

const getCommentSchema = {
  type: "object",
  properties: {
    donor: {
      type: "object",
      properties: {
        comment: { type: String },
      },
      required: ["comment"],
    },
  },
  required: ["donor"],
};

const patchAdminsSuperAdminSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    donor: {
      type: "object",
      additionalProperties: false,
      properties: {
        _id: { type: "string" },
        phone: { type: "integer" },
        name: { type: "string" },
        studentId: { type: "string" },
        email: { type: "string" },
        bloodGroup: { type: "integer" },
        hall: { type: "integer" },
        roomNumber: { type: "string" },
        address: { type: "string" },
        comment: { type: "string" },
        commentTime: { type: "integer" },
        designation: { type: "integer" },
        availableToAll: { type: "boolean" },
      },
      required: [
        "_id",
        "phone",
        "name",
        "studentId",
        "email",
        "bloodGroup",
        "hall",
        "roomNumber",
        "address",
        "comment",
        "commentTime",
        "designation",
        "availableToAll",
      ],
    },
  },
  required: ["status", "statusCode", "message", "donor"],
};

const patchAdminsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
  },
  required: ["status", "statusCode", "message"],
};

const duplicateDonorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    found: { type: "boolean" },
    donor: {
      type: "object",
      additionalProperties: false,
      properties: {
        address: { type: "string" },
        roomNumber: { type: "string" },
        designation: { type: "integer" },
        comment: { type: "string" },
        commentTime: { type: "integer" },
        email: { type: "string" },
        _id: { type: "string" },
        studentId: { type: "string" },
        phone: { type: "integer" },
        bloodGroup: { type: "integer" },
        hall: { type: "integer" },
        name: { type: "string" },
        availableToAll: { type: "boolean" },
      },
      required: [
        "address",
        "roomNumber",
        "designation",
        "comment",
        "commentTime",
        "email",
        "_id",
        "studentId",
        "phone",
        "bloodGroup",
        "hall",
        "name",
        "availableToAll",
      ],
    },
  },
  required: ["status", "statusCode", "message", "donor", "found"],
};

const duplicateDonorsManySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },

    donors: {
      type: "array",
      minItems: 1,

      /* every item must still satisfy the per‑element rules … */
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          donorId: {
            oneOf: [
              { type: "string", minLength: 24, maxLength: 24 },
              { const: "FORBIDDEN" },
            ],
          },
          phone: { type: "number" },
        },
        required: ["donorId", "phone"],
      },

      /* …and the array, as a whole, must contain BOTH kinds */
      allOf: [
        /* ➊ at least one 24‑character donorId */
        {
          contains: {
            type: "object",
            required: ["donorId"],
            properties: {
              donorId: { type: "string", minLength: 24, maxLength: 24 },
            },
          },
          /* 1 is the default, so minContains isn’t needed */
        },

        /* ➋ at least one "FORBIDDEN" donorId */
        {
          contains: {
            type: "object",
            required: ["donorId"],
            properties: {
              donorId: { const: "FORBIDDEN" },
            },
          },
        },
      ],
    },
  },
  required: ["status", "statusCode", "message", "donors"],
};

const designationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    volunteerList: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          roomNumber: { type: "string" },
          _id: { type: "string" },
          studentId: { type: "string" },
          phone: { type: "integer" },
          bloodGroup: { type: "integer" },
          name: { type: "string" },
        },
        required: [
          "roomNumber",
          "_id",
          "studentId",
          "phone",
          "bloodGroup",
          "name",
        ],
      },
    },
    adminList: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          _id: { type: "string" },
          studentId: { type: "string" },
          phone: { type: "integer" },
          hall: { type: "integer" },
          name: { type: "string" },
        },
        required: ["_id", "studentId", "phone", "hall", "name"],
      },
    },
    superAdminList: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          _id: { type: "string" },
          studentId: { type: "string" },
          phone: { type: "integer" },
          hall: { type: "integer" },
          name: { type: "string" },
        },
        required: ["_id", "studentId", "phone", "hall", "name"],
      },
    },
  },
  required: [
    "status",
    "statusCode",
    "message",
    "volunteerList",
    "adminList",
    "superAdminList",
  ],
};

const donorsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    donor: {
      type: "object",
      additionalProperties: false,
      properties: {
        _id: { type: "string" },
        phone: { type: "integer" },
        name: { type: "string" },
        studentId: { type: "string" },
        email: { type: "string" },
        lastDonation: { type: "integer" },
        lastPlateletDonation: { type: "integer" },
        bloodGroup: { type: "integer" },
        hall: { type: "integer" },
        roomNumber: { type: "string" },
        address: { type: "string" },
        comment: { type: "string" },
        commentTime: { type: "integer" },
        designation: { type: "integer" },
        availableToAll: { type: "boolean" },
        callRecords: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              _id: { type: "string" },
              callerId: {
                type: "object",
                additionalProperties: false,
                properties: {
                  designation: { type: "integer" },
                  _id: { type: "string" },
                  name: { type: "string" },
                  hall: { type: "integer" },
                },
                required: ["designation", "_id", "name", "hall"],
              },
              calleeId: { type: "string" },
              date: { type: "integer" },
            },
            required: ["callerId", "calleeId", "date"],
          },
        },
        donations: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              _id: { type: "string" },
              donorId: { type: "string" },
              phone: { type: "integer" },
              date: { type: "integer" },
            },
            required: ["_id", "donorId", "phone", "date"],
          },
        },
        plateletDonations: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              _id: { type: "string" },
              donorId: { type: "string" },
              phone: { type: "integer" },
              date: { type: "integer" },
            },
            required: ["_id", "donorId", "phone", "date"],
          },
        },
        publicContacts: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              bloodGroup: { type: "integer" },
              _id: { type: "string" },
              donorId: { type: "string" },
            },
            required: ["_id", "bloodGroup", "donorId"],
          },
        },
        markedBy: {
          type: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  _id: { type: "string" },
                  name: { type: "string" },
                },
                required: ["_id", "name"],
              },
              {
                type: "null",
              },
            ],
          },
        },
      },
      required: [
        "_id",
        "phone",
        "name",
        "studentId",
        "email",
        "lastDonation",
        "lastPlateletDonation",
        "bloodGroup",
        "hall",
        "roomNumber",
        "address",
        "comment",
        "commentTime",
        "designation",
        "availableToAll",
        "callRecords",
        "donations",
        "plateletDonations",
        "publicContacts",
        "markedBy",
      ],
    },
  },
  required: ["status", "statusCode", "message", "donor"],
};

const allDesignatedDonorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    data: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          _id: { type: "string" },
          studentId: { type: "string" },
          name: { type: "string" },
          logCount: { type: "integer" },
          hall: { type: "integer" },
        },
        required: ["_id", "studentId", "name", "logCount", "hall"],
      },
    },
  },
  required: ["status", "statusCode", "message", "data"],
};

const postDonorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 201 },
    message: { type: "string" },
    newDonor: {
      type: "object",
      additionalProperties: false,
      properties: {
        address: { type: "string" },
        roomNumber: { type: "string" },
        designation: { type: "integer" },
        comment: { type: "string" },
        commentTime: { type: "integer" },
        email: { type: "string" },
        _id: { type: "string" },
        phone: { type: "integer" },
        bloodGroup: { type: "integer" },
        hall: { type: "integer" },
        name: { type: "string" },
        studentId: { type: "string" },
        availableToAll: { type: "boolean" },
      },
      required: [
        "address",
        "roomNumber",
        "designation",
        "comment",
        "commentTime",
        "email",
        "_id",
        "phone",
        "bloodGroup",
        "hall",
        "name",
        "studentId",
        "availableToAll",
      ],
    },
  },
  required: ["status", "statusCode", "message", "newDonor"],
};
const patchDonorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
  },
  required: ["status", "statusCode", "message"],
};
const deleteDonorSchema = {
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
  searchSchema,
  passwordSchema,
  patchDonorsDesignationSchema,
  patchCommentSchema,
  getCommentSchema,
  patchAdminsSuperAdminSchema,
  patchAdminsSchema,
  duplicateDonorSchema,
  duplicateDonorsManySchema,
  designationSchema,
  donorsSchema,
  allDesignatedDonorSchema,
  postDonorSchema,
  patchDonorSchema,
  deleteDonorSchema,
  donorsNewSchema,
};
