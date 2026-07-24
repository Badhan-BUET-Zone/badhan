const { authedGet, authedPost, authedDelete } = require('../http');
const {
  postDonationSchema,
  deleteDonationSchema,
  getReportsSchema,
  getReportDonorsSchema,
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

/**
 * Get the donations (with their donors) behind one cell of the donation report.
 * bloodGroup -1 means every blood group, hall -1 means every hall.
 */
async function getDonationReportDonors({
  startDate,
  endDate,
  bloodGroup = -1,
  hall = -1,
  signInResponse,
  schema = getReportDonorsSchema,
}) {
  return authedGet(
    `/donations/report/donors?startDate=${startDate}&endDate=${endDate}&bloodGroup=${bloodGroup}&hall=${hall}`,
    signInResponse,
    schema
  );
}

module.exports = {
  createDonation,
  deleteDonation,
  getDonationReport,
  getDonationReportDonors,
};
