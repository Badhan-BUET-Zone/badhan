const { authedGet, authedDelete } = require('../http');
const { statisticsSchema, logSchema, deleteLogsSchema } = require('../schemas/logs');

/**
 * Get log statistics
 */
async function getLogStatistics(signInResponse) {
  return authedGet('/log/statistics', signInResponse, statisticsSchema);
}

/**
 * Get all logs
 */
async function getLogs(signInResponse) {
  return authedGet('/log', signInResponse, logSchema);
}

/**
 * Delete all logs
 */
async function deleteLogs(signInResponse) {
  return authedDelete('/log', signInResponse, deleteLogsSchema);
}

module.exports = {
  getLogStatistics,
  getLogs,
  deleteLogs,
};
