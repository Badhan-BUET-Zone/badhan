const { sameHallPermissionErrorSchema } = require("../common/schemas");
const operations = require("../operations");

test("POST /platelet-donations: forbidden when target donor is in different hall and not availableToAll", async () => {
	const signInResponse = await operations.signInSuperAdmin();

	// Create requester (will be promoted to volunteer) in Hall 1
	const donorHall1 = await operations.createDonor(
		{
			phone: 8801555001313,
			bloodGroup: 2,
			hall: 1,
			name: "Requester Volunteer",
			studentId: 2006060,
			address: "Hall 1 Address",
			roomNumber: "1013",
			comment: "volunteer requester",
			extraDonationCount: 0,
			availableToAll: true,
		},
		signInResponse
	);

	// Create target donor in Hall 2 and NOT available to all to force hall permission check
	const donorHall2 = await operations.createDonor(
		{
			phone: 8801555001414,
			bloodGroup: 2,
			hall: 2,
			name: "Target Donor",
			studentId: 2010060,
			address: "Hall 2 Address",
			roomNumber: "2014",
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

	// Expect hall-permission error when creating a platelet donation for donor from a different hall
	await operations.expectErrorWithToken(
		"post",
		"/platelet-donations",
		volunteerTokenResponse.data.token,
		sameHallPermissionErrorSchema,
		{ donorId: donorHall2.data.newDonor._id, date: Date.now() }
	);

	await operations.signOut(signInResponse);
});


