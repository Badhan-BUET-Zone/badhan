const { authedGet, authedPost, authedDelete } = require('../http');
const {
  postDonationSchema,
  deleteDonationSchema,
  getReportsSchema,
} = require('../schemas/donations');

/**
 * Create a donation record
 */
async function createDonation(donorId, date, signInResponse) {
  return authedPost('/donations', { donorId, date }, signInResponse, postDonationSchema);
}

/**
 * Delete a donation record
 */
async function deleteDonation(donorId, date, signInResponse) {
  return authedDelete(
    `/donations?donorId=${donorId}&date=${date}`,
    signInResponse,
    deleteDonationSchema
  );
}

/**
 * Get donation report for a date range
 */
async function getDonationReport({
  startDate,
  endDate,
  signInResponse,
  schema = getReportsSchema,
}) {
  return authedGet(
    `/donations/report?startDate=${startDate}&endDate=${endDate}`,
    signInResponse,
    schema
  );
}

module.exports = {
  createDonation,
  deleteDonation,
  getDonationReport,
};
