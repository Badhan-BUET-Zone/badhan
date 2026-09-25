// additionalProperties: false everywhere on purpose. The whole point of the lookup route's payload
// is that it is exactly nine fields — a schema that tolerated a tenth would pass on the day
// somebody added `address` "because the donor asked for it".

const postDonorLookupSchema = {
  type: 'object',
  // No `token` and no `expiresAt`, and additionalProperties: false is what enforces that: this
  // route hands back a record and NO credential, so a token reappearing here is a test failure
  // rather than a nice surprise.
  additionalProperties: false,
  required: ['status', 'statusCode', 'message', 'donor'],
  properties: {
    status: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
    donor: {
      type: 'object',
      additionalProperties: false,
      required: [
        'name',
        'phone',
        'studentId',
        'bloodGroup',
        'hall',
        'donationCount',
        'plateletDonationCount',
        'lastDonation',
        'lastPlateletDonation',
      ],
      properties: {
        name: { type: 'string' },
        phone: { type: 'number' },
        studentId: { type: 'string' },
        bloodGroup: { type: 'number' },
        hall: { type: 'number' },
        donationCount: { type: 'number' },
        plateletDonationCount: { type: 'number' },
        lastDonation: { type: 'number' },
        lastPlateletDonation: { type: 'number' },
      },
    },
  },
};

// The mint route's whole answer. No `expiresAt` beside the token — there is no expiry to report —
// and additionalProperties: false is what stops one drifting back in.
const postRegistrationTokenSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message', 'token'],
  properties: {
    status: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
    token: { type: 'string' },
  },
};

const postFeedbackSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message'],
  properties: {
    status: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
  },
};

const getFeedbacksSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'statusCode', 'message', 'feedbacks'],
  properties: {
    status: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
    feedbacks: {
      type: 'array',
      items: {
        type: 'object',
        // A feedback row is four columns and an id. There is deliberately no phone or studentId
        // column — both live inside feedbackJSON — so this schema fails if one is ever promoted.
        additionalProperties: false,
        required: ['_id', 'type', 'hall', 'feedbackJSON', 'date'],
        properties: {
          _id: { type: 'string' },
          type: { type: 'string', enum: ['feedback', 'newDonor'] },
          hall: { type: 'number' },
          feedbackJSON: { type: 'object' },
          date: { type: 'number' },
          donor: { type: ['object', 'null'] },
        },
      },
    },
  },
};

const deleteFeedbackSchema = postFeedbackSchema;

module.exports = {
  postDonorLookupSchema,
  postRegistrationTokenSchema,
  postFeedbackSchema,
  getFeedbacksSchema,
  deleteFeedbackSchema,
};
