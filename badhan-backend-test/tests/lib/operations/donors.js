const { badhanAxios } = require('../../../api');
const {
  authedGet,
  authedPost,
  authedPatch,
  authedDelete,
  guestGet,
  guestPost,
  guestPatch,
  validateSchema,
} = require('../http');
const {
  postDonorSchema,
  deleteDonorSchema,
  patchDonorsDesignationSchema,
  patchAdminsSchema,
  patchAdminsSuperAdminSchema,
  designationSchema,
  duplicateDonorSchema,
  passwordSchema,
  donorsNewSchema,
  duplicateDonorsManySchema,
} = require('../schemas/donors');

/**
 * Create a new donor
 */
async function createDonor(donorInfo, signInResponse) {
  return authedPost('/donors', donorInfo, signInResponse, postDonorSchema);
}

/**
 * Delete a donor by ID
 */
async function deleteDonor(donorId, signInResponse) {
  return authedDelete(`/donors?donorId=${donorId}`, signInResponse, deleteDonorSchema);
}

/**
 * Get a donor by ID (authenticated)
 */
async function getDonor(donorId, signInResponse, schema) {
  return authedGet(`/donors?donorId=${donorId}`, signInResponse, schema);
}

/**
 * Update donor comment (authenticated)
 */
async function patchDonorComment(donorId, comment, signInResponse, schema) {
  return authedPatch('/donors/comment', { donorId, comment }, signInResponse, schema);
}

/**
 * Get a donor by ID (guest)
 */
async function guestGetDonor(donorId, schema) {
  return guestGet(`/guest/donors?donorId=${donorId}`, schema);
}

/**
 * Update donor comment (guest endpoint)
 */
async function guestPatchDonorComment(schema) {
  return guestPatch('/guest/donors/comment', {}, schema);
}

/**
 * Issue a password/token for a donor (admin action)
 */
async function issueDonorPassword(donorId, signInResponse) {
  return authedPost('/donors/password', { donorId }, signInResponse, passwordSchema);
}

/**
 * Guest endpoint to get donor password
 */
async function guestIssueDonorPassword(schema = passwordSchema) {
  return guestPost('/guest/donors/password', null, schema);
}

/**
 * Fetch donors created in a given timeframe (authenticated)
 */
async function getNewDonors({ startTime, endTime, signInResponse, schema = donorsNewSchema }) {
  return authedGet(`/donors/new?startTime=${startTime}&endTime=${endTime}`, signInResponse, schema);
}

/**
 * Fetch donors created in a given timeframe (guest)
 */
async function guestGetNewDonors({ startTime, endTime, schema = donorsNewSchema }) {
  return guestGet(`/guest/donors/new?startTime=${startTime}&endTime=${endTime}`, schema);
}

/**
 * Fetch duplicate donors by phone list
 */
async function getDuplicateDonorsByPhones({ phoneList, token, schema = duplicateDonorsManySchema }) {
  const query = phoneList.map(p => `phoneList=${p}`).join('&');
  const response = await badhanAxios.get(`/donors/phone?${query}`, { headers: { 'x-auth': token } });
  validateSchema(response.data, schema);
  return response;
}

/**
 * Check if a donor with given phone exists
 */
async function checkDuplicate(phone, signInResponse) {
  return authedGet(`/donors/checkDuplicate?phone=${phone}`, signInResponse, duplicateDonorSchema);
}

/**
 * Get current user's designation
 */
async function getDesignation(signInResponse) {
  return authedGet('/donors/designation', signInResponse, designationSchema);
}

/**
 * Promote a donor to volunteer
 */
async function promoteToVolunteer(donorId, signInResponse) {
  return authedPatch(
    '/donors/designation',
    { donorId, promoteFlag: true },
    signInResponse,
    patchDonorsDesignationSchema
  );
}

/**
 * Demote a volunteer to donor
 */
async function demoteToDonor(donorId, signInResponse) {
  return authedPatch(
    '/donors/designation',
    { donorId, promoteFlag: false },
    signInResponse,
    patchDonorsDesignationSchema
  );
}

/**
 * Promote a user to hall admin
 */
async function promoteToHallAdmin(donorId, signInResponse) {
  return authedPatch('/admins', { donorId }, signInResponse, patchAdminsSchema);
}

/**
 * Promote a user to super admin
 */
async function promoteToSuperAdmin(donorId, signInResponse) {
  return authedPatch(
    '/admins/superadmin',
    { donorId, promoteFlag: true },
    signInResponse,
    patchAdminsSuperAdminSchema
  );
}

module.exports = {
  createDonor,
  deleteDonor,
  getDonor,
  patchDonorComment,
  guestGetDonor,
  guestPatchDonorComment,
  issueDonorPassword,
  guestIssueDonorPassword,
  getNewDonors,
  guestGetNewDonors,
  getDuplicateDonorsByPhones,
  checkDuplicate,
  getDesignation,
  promoteToVolunteer,
  demoteToDonor,
  promoteToHallAdmin,
  promoteToSuperAdmin,
};
