const { authedGet, authedPost, authedDelete } = require('../http');
const {
  postPlateletDonationSchema,
  deletePlateletDonationSchema,
  getPlateletDonationReportsSchema,
  getPlateletReportDonorsSchema,
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

/**
 * Get the platelet donations (with their donors) behind one cell of the platelet report.
 * bloodGroup -1 means every blood group, hall -1 means every hall.
 */
async function getPlateletDonationReportDonors({
  startDate,
  endDate,
  bloodGroup = -1,
  hall = -1,
  signInResponse,
  schema = getPlateletReportDonorsSchema,
}) {
  return authedGet(
    `/platelet-donations/report/donors?startDate=${startDate}&endDate=${endDate}&bloodGroup=${bloodGroup}&hall=${hall}`,
    signInResponse,
    schema
  );
}

module.exports = {
  createPlateletDonation,
  deletePlateletDonation,
  getPlateletDonationReport,
  getPlateletDonationReportDonors,
};
