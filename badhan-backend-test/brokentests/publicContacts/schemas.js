const postPublicContactsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 201 },
    message: { type: "string" },
    publicContact: {
      type: "object",
      additionalProperties: false,
      properties: {
        bloodGroup: { type: "integer" },
        _id: { type: "string" },
        donorId: { type: "string" },
      },
      required: ["bloodGroup", "_id", "donorId"],
    },
  },
  required: ["status", "statusCode", "message", "publicContact"],
};

const deletePublicContactsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
  },
  required: ["status", "statusCode", "message"],
};

const getPublicContactsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    statusCode: { const: 200 },
    message: { type: "string" },
    publicContacts: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          bloodGroup: { type: "integer" },
          contacts: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                donorId: { type: "string" },
                phone: { type: "integer" },
                name: { type: "string" },
                contactId: { type: "string" },
              },
              required: ["donorId", "phone", "name", "contactId"],
            },
          },
        },
        required: ["bloodGroup", "contacts"],
      },
    },
  },
  required: ["status", "statusCode", "message", "publicContacts"],
};

module.exports = {
  postPublicContactsSchema,
  deletePublicContactsSchema,
  getPublicContactsSchema,
};
