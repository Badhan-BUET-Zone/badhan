const { expectAuthedError } = require('../../lib');
const operations = require('../../lib/operations');
const env = require('../../../config');

// Schema for TSOA validation error when extra fields are provided
// Currently TSOA validation errors are caught and wrapped as internal server errors (500)
const extraFieldsErrorSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'EXCEPTION' },
    statusCode: { const: 500 },
    message: { type: 'string' },
    details: {
      type: 'object',
      properties: {
        name: { const: 'ValidateError' },
        status: { const: 400 },
        fields: { type: 'object' },
      },
      required: ['name', 'status', 'fields'],
    },
  },
  required: ['status', 'statusCode', 'message', 'details'],
};

test('PATCH/users/password: reject extra fields', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  
  // Try to send extra fields that aren't in the expected body type
  // TSOA with "throw-on-extras" should reject this
  await expectAuthedError(
    'patch',
    '/users/password',
    signInResponse,
    extraFieldsErrorSchema,
    {
      password: env.SUPERADMIN_PASSWORD,
      donorId: '507f1f77bcf86cd799439011' // Extra field that should be rejected
    }
  );
  
  await operations.signOut(signInResponse);
});

