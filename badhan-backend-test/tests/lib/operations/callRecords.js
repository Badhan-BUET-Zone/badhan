const { authedPost } = require('../http');
const { postCallRecordsSchema } = require('../schemas/callRecords');

/**
 * Create a call record for a donor
 */
async function createCallRecord(donorId, signInResponse) {
  return authedPost('/callrecords', { donorId }, signInResponse, postCallRecordsSchema);
}

module.exports = {
  createCallRecord,
};

