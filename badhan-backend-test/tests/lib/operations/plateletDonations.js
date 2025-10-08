const { authedGet, authedPost, authedDelete } = require('../http');
const {
  postPlateletDonationSchema,
  deletePlateletDonationSchema,
  getPlateletDonationReportsSchema,
} = require('../schemas/plateletDonations');

/**
 * Create a platelet donation record
 */
async function createPlateletDonation(donorId, date, signInResponse) {
  return authedPost(
    '/platelet-donations',
    { donorId, date },
    signInResponse,
    postPlateletDonationSchema
  );
}

/**
 * Delete a platelet donation record
 */
async function deletePlateletDonation(donorId, date, signInResponse) {
  return authedDelete(
    `/platelet-donations?donorId=${donorId}&date=${date}`,
    signInResponse,
    deletePlateletDonationSchema
  );
}

/**
 * Get platelet donation report for a date range
 */
async function getPlateletDonationReport({ startDate, endDate, signInResponse }) {
  return authedGet(
    `/platelet-donations/report?startDate=${startDate}&endDate=${endDate}`,
    signInResponse,
    getPlateletDonationReportsSchema
  );
}

module.exports = {
  createPlateletDonation,
  deletePlateletDonation,
  getPlateletDonationReport,
};
