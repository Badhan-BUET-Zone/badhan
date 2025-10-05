const { sameHallPermissionErrorSchema } = require("../../common/schemas");
const operations = require("../../operations");

test("DELETE /donors: forbidden when target donor is in different hall", async () => {
	const signInResponse = await operations.signInSuperAdmin();

	// Create requester (will be promoted to volunteer) in Hall 1
	const donorHall1 = await operations.createDonor(
		{
			phone: 8801555006464,
			bloodGroup: 2,
			hall: 1,
			name: "Requester Volunteer",
			studentId: 2001065,
			address: "Hall 1 Address",
			roomNumber: "16464",
			comment: "volunteer requester",
			extraDonationCount: 0,
			availableToAll: true,
		},
		signInResponse
	);

	// Create target donor in Hall 2
	const donorHall2 = await operations.createDonor(
		{
			phone: 8801555006565,
			bloodGroup: 2,
			hall: 2,
			name: "Target Donor",
			studentId: 2011066,
			address: "Hall 2 Address",
			roomNumber: "26565",
			comment: "target different hall",
			extraDonationCount: 0,
			availableToAll: false,
		},
		signInResponse
	);

	// Promote requester to volunteer and issue token for them
	const volunteerId = donorHall1.data.newDonor._id;
	await operations.promoteToVolunteer(volunteerId, signInResponse);
	const volunteerTokenResponse = await operations.issueDonorPassword(
		volunteerId,
		signInResponse
	);

	// Expect hall-permission error when attempting to delete donor from a different hall
	await operations.expectErrorWithToken(
		"delete",
		`/donors?donorId=${donorHall2.data.newDonor._id}`,
		volunteerTokenResponse.data.token,
		sameHallPermissionErrorSchema
	);

	await operations.signOut(signInResponse);
});



