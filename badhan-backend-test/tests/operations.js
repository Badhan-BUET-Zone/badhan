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


const {postDonationSchema, deleteDonationSchema} = require("./donations/schemas");
const { postPlateletDonationSchema, deletePlateletDonationSchema } = require("./plateletDonations/schemas");

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

module.exports = {
	createDonor,
	signInSuperAdmin,
	getMe,
	createDonation,
	deleteDonor,
	searchDonors,
    deleteDonation,
    createPlateletDonation,
    deletePlateletDonation,
	createCallRecord,
	markDonorAsActive
};
