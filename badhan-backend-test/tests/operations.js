const { badhanAxios } = require("../api");
const {
  authedGet,
  authedPost,
  authedPatch,
  authedDelete,
  guestGet,
  guestPost,
  guestPatch,
  guestDelete,
  expectAuthedError,
  expectGuestError,
  validateSchema,
} = require('./lib/http');
const env = require("../config");
const {
	searchSchema,
	postDonorSchema,
	donorsSchema,
	deleteDonorSchema
} = require("./donors/schemas");

const { signInSchema } = require("./users/signIn/schemas");
const { donorSchema } = require("./users/fetchMe/schemas");
const { postCallRecordsSchema, deleteCallRecordsSchema } = require("./callRecords/schemas");
const { postActiveDonorSchema } = require("./activeDonors/schemas");
const { patchDonorsDesignationSchema, patchAdminsSchema, patchAdminsSuperAdminSchema } = require("./donors/schemas");


const {postDonationSchema, deleteDonationSchema, getReportsSchema} = require("./donations/schemas");
const { postPlateletDonationSchema, deletePlateletDonationSchema, getPlateletDonationReportsSchema } = require("./plateletDonations/schemas");
const { logInsSchema } = require("./users/logIns/schemas");
const { patchPasswordSchema } = require("./users/password/schemas");
const { deleteLogInsSchema } = require("./users/deleteLogins/schemas");
const { signOutSchema } = require("./users/signOut/schemas");
const { designationSchema, duplicateDonorSchema } = require("./donors/schemas");
const { postPublicContactsSchema, deletePublicContactsSchema, getPublicContactsSchema } = require("./publicContacts/schemas");
const { statisticsSchema, logSchema, deleteLogsSchema } = require("./logs/schemas");
// Additional donor-related schemas
const { passwordSchema, donorsNewSchema, duplicateDonorsManySchema } = require('./donors/schemas');

// Helper function to create a donor
async function createDonor(donorInfo, signInResponse) {
	return authedPost('/donors', donorInfo, signInResponse, postDonorSchema);
}

// Helper function for sign in
async function signInSuperAdmin() {
	return guestPost("/users/signin", {
		phone: env.SUPERADMIN_PHONE,
		password: env.SUPERADMIN_PASSWORD,
	}, signInSchema);
}

async function signIn(phone, password){
  return guestPost("/users/signin", {
    phone,
    password,
  }, signInSchema);
}

// Helper function to get current user
async function getMe(signInResponse) {
	return authedGet("/users/me", signInResponse, donorSchema);
}

// Helper function to create a donation
async function createDonation(donorId, date, signInResponse ) {
	return authedPost(
		"/donations",
		{ donorId, date: date },
		signInResponse,
		postDonationSchema
	);
}

// Helper function to delete a donor
async function deleteDonor(donorId, signInResponse) {
	return authedDelete(`/donors?donorId=${donorId}`, signInResponse, deleteDonorSchema);
}

// Helper function for search and validation
async function searchDonors({
	bloodGroup,
	hall,
	batch,
	name = "",
	address = "",
	isAvailable,
	isNotAvailable,
	availableToAll,
	signInResponse,
	expectedTotalItems,
	expectedDonorIds
}) {
  const url = `/search/v3?bloodGroup=${bloodGroup}&hall=${hall}&batch=${batch}&name=${name}&address=${address}&isAvailable=${isAvailable}&isNotAvailable=${isNotAvailable}&availableToAll=${availableToAll}`;
  const response = await authedGet(url, signInResponse, searchSchema({ totalItems: expectedTotalItems }));
	const foundIds = response.data.filteredDonors.map(d => d._id);
	expect(foundIds.sort()).toEqual(expectedDonorIds.sort());
	return response;
}

async function deleteDonation(donorId, date, signInResponse) {
    return authedDelete(`/donations?donorId=${donorId}&date=${date}`, signInResponse, deleteDonationSchema);
}

async function createPlateletDonation(donorId, date, signInResponse) {
    return authedPost(
        "/platelet-donations",
        { donorId, date: date },
        signInResponse,
        postPlateletDonationSchema
    );
}
async function deletePlateletDonation(donorId, date, signInResponse) {
    return authedDelete(`/platelet-donations?donorId=${donorId}&date=${date}`, signInResponse, deletePlateletDonationSchema);
}

async function createCallRecord(donorId, signInResponse) {
    return authedPost(
      "/callrecords",
      { donorId },
      signInResponse,
      postCallRecordsSchema
    );
}

async function markDonorAsActive(donorId, signInResponse) {
    return authedPost(
      "/activeDonors",
      { donorId },
      signInResponse,
      postActiveDonorSchema
    );
}

async function promoteToVolunteer(donorId, signInResponse) {
    return authedPatch(
      "/donors/designation",
      { donorId: donorId, promoteFlag: true },
      signInResponse,
      patchDonorsDesignationSchema
    );
}

async function demoteToDonor(donorId, signInResponse) {
    return authedPatch(
      "/donors/designation",
      { donorId: donorId, promoteFlag: false },
      signInResponse,
      patchDonorsDesignationSchema
    );
}

async function promoteToHallAdmin(donorId, signInResponse) {
	return authedPatch(
	  "/admins",
	  { donorId },
	  signInResponse,
	  patchAdminsSchema
	);
}

async function promoteToSuperAdmin(donorId, signInResponse) {
    return authedPatch(
      "/admins/superadmin",
      { donorId, promoteFlag: true },
      signInResponse,
      patchAdminsSuperAdminSchema
    );
}

async function getLogins(signInResponse) {
  return authedGet("/users/logins", signInResponse, logInsSchema);
}

async function deleteLogin(loginId, signInResponse) {
  return authedDelete(`/users/logins/${loginId}`, signInResponse, deleteLogInsSchema);
}

async function changePassword(newPassword, signInResponse) {
    return authedPatch(
      "/users/password",
      { password: newPassword },
      signInResponse,
      patchPasswordSchema
    );
}

async function signOut(signInResponse) {
  return authedDelete('/users/signout', signInResponse, signOutSchema);
}

// ===== Additional operations migrated from tests =====

async function getPlateletDonationReport({ startDate, endDate, signInResponse }) {
  return authedGet(`/platelet-donations/report?startDate=${startDate}&endDate=${endDate}`, signInResponse, getPlateletDonationReportsSchema);
}

async function getDonationReport({ startDate, endDate, signInResponse, schema = getReportsSchema }) {
  return authedGet(`/donations/report?startDate=${startDate}&endDate=${endDate}`, signInResponse, schema);
}

async function getDesignation(signInResponse) {
  return authedGet('/donors/designation', signInResponse, designationSchema);
}

async function checkDuplicate(phone, signInResponse) {
  return authedGet(`/donors/checkDuplicate?phone=${phone}`, signInResponse, duplicateDonorSchema);
}

async function createPublicContact({ donorId, bloodGroup, signInResponse }) {
  return authedPost('/publicContacts', { donorId, bloodGroup }, signInResponse, postPublicContactsSchema);
}

async function deletePublicContact({ donorId, contactId, signInResponse }) {
  return authedDelete(`/publicContacts?donorId=${donorId}&contactId=${contactId}`, signInResponse, deletePublicContactsSchema);
}

async function getPublicContacts(signInResponse) {
  return authedGet('/publicContacts', signInResponse, getPublicContactsSchema);
}

async function getLogStatistics(signInResponse) {
  return authedGet('/log/statistics', signInResponse, statisticsSchema);
}

async function getLogs(signInResponse) {
  return authedGet('/log', signInResponse, logSchema);
}

async function deleteLogs(signInResponse) {
  return authedDelete('/log', signInResponse, deleteLogsSchema);
}

// === Generic helpers are now centralized in tests/lib/http.js ===

// Error expectation helpers are centralized in tests/lib/http.js

// Donor specific utilities
async function patchDonorComment(donorId, comment, signInResponse, schema) {
  return authedPatch('/donors/comment', { donorId, comment }, signInResponse, schema);
}
async function getDonor(donorId, signInResponse, schema) {
  return authedGet(`/donors?donorId=${donorId}`, signInResponse, schema);
}
async function guestPatchDonorComment(schema) { // guest endpoint has no body in tests
  return guestPatch('/guest/donors/comment', {}, schema);
}
async function guestGetDonor(donorId, schema) {
  return guestGet(`/guest/donors?donorId=${donorId}`, schema);
}

// Utility to validate arbitrary data against a schema (for rare double-validation needs in tests)
// Re-exported from tests/lib/http.js

// Issue a password/token for a donor (admin action)
async function issueDonorPassword(donorId, signInResponse) {
  const response = await authedPost('/donors/password', { donorId }, signInResponse, passwordSchema);
  return response;
}

// Guest endpoint to get donor password (no body)
async function guestIssueDonorPassword(schema = passwordSchema) {
  return guestPost('/guest/donors/password', null, schema);
}

// Fetch donors created in a given timeframe (authenticated)
async function getNewDonors({ startTime, endTime, signInResponse, schema = donorsNewSchema }) {
  const response = await authedGet(`/donors/new?startTime=${startTime}&endTime=${endTime}`, signInResponse, schema);
  return response;
}

// Guest fetch new donors
async function guestGetNewDonors({ startTime, endTime, schema = donorsNewSchema }) {
  return guestGet(`/guest/donors/new?startTime=${startTime}&endTime=${endTime}`, schema);
}

// Fetch duplicate donors by phone list (needs volunteer or higher auth token)
async function getDuplicateDonorsByPhones({ phoneList, token, schema = duplicateDonorsManySchema }) {
  const query = phoneList.map(p => `phoneList=${p}`).join('&');
  const response = await badhanAxios.get(`/donors/phone?${query}`, { headers: { 'x-auth': token } });
  validateSchema(response.data, schema);
  return response;
}

// Guest search donors (no auth) wrapper
async function guestSearchDonors(paramsString, totalItems = null) {
  const response = await guestGet(`/guest/search/v3?${paramsString}`, searchSchema({ totalItems }));
  return response;
}

// Expect error for authed request with explicit token (useful after role changes or logout)
async function expectErrorWithToken(method, path, token, errorSchema, body) {
  try {
    if(method === 'get' || method === 'delete') {
      await badhanAxios[method](path, { headers: { 'x-auth': token } });
    } else {
      await badhanAxios[method](path, body, { headers: { 'x-auth': token } });
    }
    throw new Error('Expected request to fail but it succeeded');
  } catch (e) {
    validateSchema(e.response.data, errorSchema);
    return e.response;
  }
}

module.exports = {
  createDonor,
  signInSuperAdmin,
  signOut,
  getMe,
  createDonation,
  deleteDonor,
  searchDonors,
  deleteDonation,
  createPlateletDonation,
  deletePlateletDonation,
  createCallRecord,
  markDonorAsActive,
  promoteToVolunteer,
  promoteToHallAdmin,
  demoteToDonor,
  promoteToSuperAdmin,
  getLogins,
  deleteLogin,
  changePassword,
  getPlateletDonationReport,
  getDonationReport,
  getDesignation,
  checkDuplicate,
  createPublicContact,
  deletePublicContact,
  getPublicContacts,
  getLogStatistics,
  getLogs,
  deleteLogs,
  authedGet,
  authedPost,
  authedPatch,
  authedDelete,
  guestGet,
  guestPost,
  guestPatch,
  guestDelete,
  expectAuthedError,
  expectGuestError,
  patchDonorComment,
  getDonor,
  guestPatchDonorComment,
  guestGetDonor,
  validateSchema,
  issueDonorPassword,
  guestIssueDonorPassword,
  getNewDonors,
  guestGetNewDonors,
  getDuplicateDonorsByPhones,
  guestSearchDonors,
  expectErrorWithToken,
  signIn,
};
