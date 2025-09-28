const operations = require('./operations');

// ===== Composite flows built from primitives in operations.js =====

/**
 * Create a donor, promote to volunteer, and issue a login token.
 * @param {object} newDonorInfo
 * @param {object} signInResponse
 * @param {object} options
 * @returns {Promise<{ donorId: string, volunteerToken: string, donorCreationResponse: object, volunteerSignIn: object }>}
 */
async function createVolunteerWithToken(newDonorInfo, signInResponse, options = {}) {
	const { alsoPromoteHallAdmin = false } = options;
	const donorCreationResponse = await operations.createDonor(newDonorInfo, signInResponse);
	const donorId = donorCreationResponse.data.newDonor._id;
	await operations.promoteToVolunteer(donorId, signInResponse);
	if (alsoPromoteHallAdmin) {
		await operations.promoteToHallAdmin(donorId, signInResponse);
	}
	const volunteerSignIn = await operations.issueDonorPassword(donorId, signInResponse);
	return {
		donorId,
		volunteerToken: volunteerSignIn.data.token,
		donorCreationResponse,
		volunteerSignIn,
	};
}


/**
 * Verify that a restricted endpoint is forbidden for volunteer and hall admin.
 * Creates a new donor, promotes to volunteer, issues token, asserts forbidden,
 * then promotes to hall admin and asserts forbidden again.
 * @param {Object} params
 * @param {('get'|'post'|'patch'|'delete')} params.method
 * @param {string} params.path
 * @param {Object} params.errorSchema
 * @param {Object} params.signInResponse
 * @param {Object} params.newDonorInfo
 * @param {Object} [params.body]
 */
async function assertForbiddenForVolunteerAndHallAdmin({ method, path, errorSchema, signInResponse, newDonorInfo, body }) {
	const { donorId, volunteerToken } = await createVolunteerWithToken(newDonorInfo, signInResponse);
	await operations.expectErrorWithToken(method, path, volunteerToken, errorSchema, body);
	await operations.promoteToHallAdmin(donorId, signInResponse);
	await operations.expectErrorWithToken(method, path, volunteerToken, errorSchema, body);
	return { donorId, volunteerToken };
}

module.exports = {
	createVolunteerWithToken,
	assertForbiddenForVolunteerAndHallAdmin,
};


