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


const {postDonationSchema, deleteDonationSchema} = require("./donations/schemas");
const { postPlateletDonationSchema, deletePlateletDonationSchema } = require("./plateletDonations/schemas");
const { logInsSchema } = require("./users/logIns/schemas");
const { patchPasswordSchema } = require("./users/password/schemas");
const { deleteLogInsSchema } = require("./users/deleteLogins/schemas");
const { signOutSchema } = require("./users/signOut/schemas");

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
  changePassword
};
