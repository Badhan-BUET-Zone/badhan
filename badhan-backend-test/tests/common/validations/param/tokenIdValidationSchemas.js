const { HTTP_STATUS } = require('../../../lib/utils/constants');
const PARAM_tokenId_RequiredError_Schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: 'tokenId is required' },
  },
  required: ['status', 'statusCode', 'message'],
};

const PARAM_tokenId_InvalidError_Schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { const: 'ERROR' },
    statusCode: { const: HTTP_STATUS.BAD_REQUEST },
    message: { const: 'Enter a valid tokenId' },
  },
  required: ['status', 'statusCode', 'message'],
};

module.exports = {
  PARAM_tokenId_RequiredError_Schema,
  PARAM_tokenId_InvalidError_Schema,
};
