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
  patchDonorSchema,
  deleteDonorSchema,
  patchDonorsDesignationSchema,
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
async function getDuplicateDonorsByPhones({
  phoneList,
  token,
  schema = duplicateDonorsManySchema,
}) {
  const query = phoneList.map((p) => `phoneList=${p}`).join('&');
  const response = await badhanAxios.get(`/donors/phone?${query}`, {
    headers: { 'x-auth': token },
  });
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
 * Change a donor's designation to an explicit target level (0..3) via the merged route
 */
async function changeDesignation(donorId, designation, signInResponse, schema = patchDonorsDesignationSchema) {
  return authedPatch('/donors/designation', { donorId, designation }, signInResponse, schema);
}

/**
 * Promote a donor to volunteer (0 -> 1)
 */
async function promoteToVolunteer(donorId, signInResponse) {
  return changeDesignation(donorId, 1, signInResponse);
}

/**
 * Demote a volunteer to donor (1 -> 0)
 */
async function demoteToDonor(donorId, signInResponse) {
  return changeDesignation(donorId, 0, signInResponse);
}

/**
 * Promote a volunteer to hall admin (1 -> 2); demotes the hall's current admin
 */
async function promoteToHallAdmin(donorId, signInResponse) {
  return changeDesignation(donorId, 2, signInResponse);
}

/**
 * Promote a volunteer to super admin (1 -> 3)
 */
async function promoteToSuperAdmin(donorId, signInResponse) {
  return changeDesignation(donorId, 3, signInResponse);
}

/**
 * Demote a super admin back to volunteer (3 -> 1)
 */
async function demoteFromSuperAdmin(donorId, signInResponse) {
  return changeDesignation(donorId, 1, signInResponse);
}

/**
 * Update a donor's full details (PATCH /donors/v2)
 */
async function updateDonor(donorInfo, signInResponse) {
  return authedPatch('/donors/v2', donorInfo, signInResponse, patchDonorSchema);
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
  changeDesignation,
  promoteToVolunteer,
  demoteToDonor,
  promoteToHallAdmin,
  promoteToSuperAdmin,
  demoteFromSuperAdmin,
  updateDonor,
};
