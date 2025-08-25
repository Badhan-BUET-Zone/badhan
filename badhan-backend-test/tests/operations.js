const { badhanAxios } = require("../api");
const validate = require("jsonschema").validate;
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
	const response = await badhanAxios.post(
		"/donors",
		donorInfo,
		{ headers: { "x-auth": signInResponse.data.token } }
	);
	const validationResult = validate(response.data, postDonorSchema);
	expect(validationResult.errors).toEqual([]);
	return response;
}

// Helper function for sign in
async function signInSuperAdmin() {
	const response = await badhanAxios.post("/users/signin", {
		phone: env.SUPERADMIN_PHONE,
		password: env.SUPERADMIN_PASSWORD,
	});
	const validationResult = validate(response.data, signInSchema);
	expect(validationResult.errors).toEqual([]);
	return response;
}

// Helper function to get current user
async function getMe(signInResponse) {
	const response = await badhanAxios.get("/users/me", {
		headers: { "x-auth": signInResponse.data.token },
	});
	const validationResult = validate(response.data, donorSchema);
	expect(validationResult.errors).toEqual([]);
	return response;
}

// Helper function to create a donation
async function createDonation(donorId, date, signInResponse ) {
	// No schema for donation response in schemas.js, so skipping validation
	return badhanAxios.post(
		"/donations",
		{ donorId, date: date },
		{ headers: { "x-auth": signInResponse.data.token } }
	);
}

// Helper function to delete a donor
async function deleteDonor(donorId, signInResponse) {
	const response = await badhanAxios.delete(`/donors?donorId=${donorId}`, {
		headers: { "x-auth": signInResponse.data.token },
	});
	const validationResult = validate(response.data, deleteDonorSchema);
	expect(validationResult.errors).toEqual([]);
	return response;
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
	const response = await badhanAxios.get(url, {
		headers: {
			"x-auth": signInResponse.data.token,
		},
	});
	const validationResult = validate(response.data, searchSchema({ totalItems: expectedTotalItems }));
	expect(validationResult.errors).toEqual([]);
	const foundIds = response.data.filteredDonors.map(d => d._id);
	expect(foundIds.sort()).toEqual(expectedDonorIds.sort());
	return response;
}

async function deleteDonation(donorId, date, signInResponse) {
    const response = await badhanAxios.delete(`/donations?donorId=${donorId}&date=${date}`, {
        headers: { "x-auth": signInResponse.data.token },
    });
    const validationResult = validate(response.data, deleteDonationSchema);
    expect(validationResult.errors).toEqual([]);
    return response;
}

async function createPlateletDonation(donorId, date, signInResponse) {
    const response = await badhanAxios.post(
        "/platelet-donations",
        { donorId, date: date },
        { headers: { "x-auth": signInResponse.data.token } }
    );
    const validationResult = validate(response.data, postPlateletDonationSchema);
    expect(validationResult.errors).toEqual([]);
    return response;
}
async function deletePlateletDonation(donorId, date, signInResponse) {
    const response = await badhanAxios.delete(`/platelet-donations?donorId=${donorId}&date=${date}`, {
        headers: { "x-auth": signInResponse.data.token },
    });
    const validationResult = validate(response.data, deletePlateletDonationSchema);
    expect(validationResult.errors).toEqual([]);
    return response;
}

async function createCallRecord(donorId, signInResponse) {
    let recordCreationResponse = await badhanAxios.post(
      "/callrecords",
      {
        donorId
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationRecordResult = validate(
      recordCreationResponse.data,
      postCallRecordsSchema
    );

    expect(validationRecordResult.errors).toEqual([]);
	return recordCreationResponse;
}

async function markDonorAsActive(donorId, signInResponse) {
	    let createActiveDonorResponse = await badhanAxios.post(
      "/activeDonors",
      {
        donorId
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let createActiveDonorValidationResult = validate(
      createActiveDonorResponse.data,
      postActiveDonorSchema
    );

    expect(createActiveDonorValidationResult.errors).toEqual([]);
	return createActiveDonorResponse
}

async function promoteToVolunteer(donorId, signInResponse) {
    let promotionResponse = await badhanAxios.patch(
      "/donors/designation",
      {
        donorId: donorId,
        promoteFlag: true,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    //validate the promotion response
    let promotionValidationResult = validate(
      promotionResponse.data,
      patchDonorsDesignationSchema
    );

    expect(promotionValidationResult.errors).toEqual([]);
	return promotionResponse
}

async function demoteToDonor(donorId, signInResponse) {
    let promotionResponse = await badhanAxios.patch(
      "/donors/designation",
      {
        donorId: donorId,
        promoteFlag: false,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    //validate the promotion response
    let promotionValidationResult = validate(
      promotionResponse.data,
      patchDonorsDesignationSchema
    );

    expect(promotionValidationResult.errors).toEqual([]);
	return promotionResponse
}

async function promoteToHallAdmin(donorId, signInResponse) {
	let hallAdminPromotionResult = await badhanAxios.patch(
	  "/admins",
	  {
		donorId,
	  },
	  {
		headers: {
		  "x-auth": signInResponse.data.token,
		},
	  }
	);

	// validate hall admin promotion result
	let hallAdminPromotionValidation = validate(
	  hallAdminPromotionResult.data,
	  patchAdminsSchema
	);

	expect(hallAdminPromotionValidation.errors).toEqual([]);
}

async function promoteToSuperAdmin(donorId, signInResponse) {
    let superAdminPromotionResult = await badhanAxios.patch(
      "/admins/superadmin",
      {
        donorId,
        promoteFlag: true,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    // validate hall admin promotion result
    let superAdminPromotionValidation = validate(
      superAdminPromotionResult.data,
      patchAdminsSuperAdminSchema
    );

    expect(superAdminPromotionValidation.errors).toEqual([]);
	return superAdminPromotionResult;
}

async function getLogins(signInResponse) {
  let logInsResponse = await badhanAxios.get("/users/logins", {
    headers: {
      "x-auth": signInResponse.data.token,
    },
  });
  let validationResult = validate(logInsResponse.data, logInsSchema);

  expect(validationResult.errors).toEqual([]);
  return logInsResponse;
}

async function deleteLogin(loginId, signInResponse) {
  let deleteResponse = await badhanAxios.delete(
    "/users/logins/" + loginId,
    {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    }
  );
  let validationResult = validate(deleteResponse.data, deleteLogInsSchema);
  expect(validationResult.errors).toEqual([]);
}

async function changePassword(newPassword, signInResponse) {
    let passwordResponse = await badhanAxios.patch(
      "/users/password",
      {
        password: newPassword,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );
    let validationResult = validate(passwordResponse.data, patchPasswordSchema);
    expect(validationResult.errors).toEqual([]);
    return passwordResponse;
}

async function signOut(signInResponse) {
  let signOutResponse = await badhanAxios.delete('/users/signout', {
      headers: {
          "x-auth": signInResponse.data.token
      }
  });
  let validationResult = validate(signOutResponse.data,signOutSchema);
  expect(validationResult.errors).toEqual([]);
  return signOutResponse;
}

// ===== Additional operations migrated from tests =====

async function getPlateletDonationReport({ startDate, endDate, signInResponse }) {
  const response = await badhanAxios.get(`/platelet-donations/report?startDate=${startDate}&endDate=${endDate}`, {
    headers: { 'x-auth': signInResponse.data.token }
  });
  const validationResult = validate(response.data, getPlateletDonationReportsSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

async function getDonationReport({ startDate, endDate, signInResponse, schema = getReportsSchema }) {
  const response = await badhanAxios.get(`/donations/report?startDate=${startDate}&endDate=${endDate}`, {
    headers: { 'x-auth': signInResponse.data.token }
  });
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}

async function getDesignation(signInResponse) {
  const response = await badhanAxios.get('/donors/designation', { headers: { 'x-auth': signInResponse.data.token } });
  const validationResult = validate(response.data, designationSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

async function checkDuplicate(phone, signInResponse) {
  const response = await badhanAxios.get(`/donors/checkDuplicate?phone=${phone}`, { headers: { 'x-auth': signInResponse.data.token } });
  const validationResult = validate(response.data, duplicateDonorSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

async function createPublicContact({ donorId, bloodGroup, signInResponse }) {
  const response = await badhanAxios.post('/publicContacts', { donorId, bloodGroup }, { headers: { 'x-auth': signInResponse.data.token } });
  const validationResult = validate(response.data, postPublicContactsSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

async function deletePublicContact({ donorId, contactId, signInResponse }) {
  const response = await badhanAxios.delete(`/publicContacts?donorId=${donorId}&contactId=${contactId}`, { headers: { 'x-auth': signInResponse.data.token } });
  const validationResult = validate(response.data, deletePublicContactsSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

async function getPublicContacts(signInResponse) {
  const response = await badhanAxios.get('/publicContacts', { headers: { 'x-auth': signInResponse.data.token } });
  const validationResult = validate(response.data, getPublicContactsSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

async function getLogStatistics(signInResponse) {
  const response = await badhanAxios.get('/log/statistics', { headers: { 'x-auth': signInResponse.data.token } });
  const validationResult = validate(response.data, statisticsSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

async function getLogs(signInResponse) {
  const response = await badhanAxios.get('/log', { headers: { 'x-auth': signInResponse.data.token } });
  const validationResult = validate(response.data, logSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

async function deleteLogs(signInResponse) {
  const response = await badhanAxios.delete('/log', { headers: { 'x-auth': signInResponse.data.token } });
  const validationResult = validate(response.data, deleteLogsSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

// === Generic helpers ===
async function authedGet(path, signInResponse, schema) {
  const response = await badhanAxios.get(path, { headers: { 'x-auth': signInResponse.data.token } });
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}
async function authedPost(path, body, signInResponse, schema) {
  const response = await badhanAxios.post(path, body, { headers: { 'x-auth': signInResponse.data.token } });
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}
async function authedPatch(path, body, signInResponse, schema) {
  const response = await badhanAxios.patch(path, body, { headers: { 'x-auth': signInResponse.data.token } });
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}
async function authedDelete(path, signInResponse, schema) {
  const response = await badhanAxios.delete(path, { headers: { 'x-auth': signInResponse.data.token } });
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}

// Guest (unauthenticated) variants
async function guestGet(path, schema) {
  const response = await badhanAxios.get(path);
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}
async function guestPost(path, body, schema) {
  const response = await badhanAxios.post(path, body);
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}
async function guestPatch(path, body, schema) {
  const response = await badhanAxios.patch(path, body);
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}
async function guestDelete(path, schema) {
  const response = await badhanAxios.delete(path);
  if (schema) {
    const validationResult = validate(response.data, schema);
    expect(validationResult.errors).toEqual([]);
  }
  return response;
}

// Error expectation helpers
async function expectAuthedError(method, path, signInResponse, errorSchema, body) {
  try {
    await badhanAxios[method](path, body, { headers: { 'x-auth': signInResponse.data.token } });
    throw new Error('Expected request to fail but it succeeded');
  } catch (e) {
    const validationResult = validate(e.response.data, errorSchema);
    expect(validationResult.errors).toEqual([]);
    return e.response;
  }
}
async function expectGuestError(method, path, errorSchema, body) {
  try {
    await badhanAxios[method](path, body);
    throw new Error('Expected request to fail but it succeeded');
  } catch (e) {
    const validationResult = validate(e.response.data, errorSchema);
    expect(validationResult.errors).toEqual([]);
    return e.response;
  }
}

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
function validateSchema(data, schema) {
  if (!schema) return;
  const validationResult = validate(data, schema);
  expect(validationResult.errors).toEqual([]);
  return true;
}

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
  const validationResult = validate(response.data, schema);
  expect(validationResult.errors).toEqual([]);
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
    const validationResult = validate(e.response.data, errorSchema);
    expect(validationResult.errors).toEqual([]);
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
  guestGetDonor
  ,validateSchema
  ,issueDonorPassword
  ,guestIssueDonorPassword
  ,getNewDonors
  ,guestGetNewDonors
  ,getDuplicateDonorsByPhones
  ,guestSearchDonors
  , expectErrorWithToken
};
