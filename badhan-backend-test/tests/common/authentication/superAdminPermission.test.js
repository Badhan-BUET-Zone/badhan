const { superAdminPermissionErrorSchema } = require('../schemas');
const operations = require("../../operations");

test('super admin permission test', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const newDonorInfo = {
        phone: 8801555444777,
        bloodGroup: 2,
        hall: 1,
        name: "Blah Blah",
        studentId: 1606060,
        address: "Azimpur",
        roomNumber: "3009",
        comment: "developer of badhan",
        extraDonationCount: 0,
        availableToAll: true,
    };
    const donorCreationResponse = await operations.createDonor(newDonorInfo, signInResponse);
    const volunteerId = donorCreationResponse.data.newDonor._id;
    await operations.promoteToVolunteer(volunteerId, signInResponse);
    const tokenResponse = await operations.issueDonorPassword(volunteerId, signInResponse);
    await operations.expectErrorWithToken('get', '/log/statistics', tokenResponse.data.token, superAdminPermissionErrorSchema);
    await operations.signOut(signInResponse);
});
