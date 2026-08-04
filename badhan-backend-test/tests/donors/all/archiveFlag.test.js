const { HTTP_STATUS } = require('../../lib/utils/constants');
const operations = require('../../lib/operations');

// archiveFlag is required here for the same reasons it is required on /search/v3: no server-side
// default, no fallback, and the same 400 whichever layer catches it first. The old path is gone
// rather than aliased — a half-applied rename that left both live would otherwise go unnoticed.

const badRequestSchema = (message) => ({
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: message },
  },
  required: ['status', 'statusCode', 'message'],
});

test('GET/donors/all: archiveFlag is mandatory — missing, empty and non-boolean all 400', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  await operations.expectAuthedError(
    'get',
    '/donors/all',
    signInResponse,
    badRequestSchema('archiveFlag is required')
  );

  await operations.expectAuthedError(
    'get',
    '/donors/all?archiveFlag=',
    signInResponse,
    badRequestSchema('archiveFlag must be boolean')
  );

  await operations.expectAuthedError(
    'get',
    '/donors/all?archiveFlag=maybe',
    signInResponse,
    badRequestSchema('archiveFlag must be boolean')
  );

  await operations.signOut(signInResponse);
});

test('GET/donors/designation/all: the pre-rename path is gone', async () => {
  const signInResponse = await operations.signInSuperAdmin();

  await operations.expectAuthedError(
    'get',
    '/donors/designation/all?archiveFlag=false',
    signInResponse
  );

  await operations.signOut(signInResponse);
});
