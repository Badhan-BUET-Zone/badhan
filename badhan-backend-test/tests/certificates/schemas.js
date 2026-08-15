const { HTTP_STATUS } = require('../lib/utils/constants');

// There is no success schema here any more, and that absence is the point: the route no longer
// answers with a JSON payload whose fields could be widened by accident. It renders the certificate
// on the backend and returns the PDF, so the donor's details never cross the boundary as data at
// all — only as marks on a page. What used to be guarded by additionalProperties: false is now
// guarded by what the renderer is handed to draw (see certificateRenderer.ts), and asserted in
// getCertificate.test.js by checking what comes back is a PDF and nothing else.

const certificateNotFoundSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.NOT_FOUND },
    message: { const: 'Certificate not found' },
  },
  required: ['status', 'statusCode', 'message'],
};

// Deliberately distinguishable from the not-found answer above. Once an id has resolved to a real
// donor there is nothing left to hide by answering identically, and the page needs to be able to
// say "nobody has turned this on yet" rather than "this does not exist".
const certificateNotEnabledSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.FORBIDDEN },
    message: { const: 'Certificate not available for this donor' },
  },
  required: ['status', 'statusCode', 'message'],
};

module.exports = {
  certificateNotFoundSchema,
  certificateNotEnabledSchema,
};
