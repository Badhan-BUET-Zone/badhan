const { sameHallPermissionErrorSchema } = require('../schemas');
const operations = require("../../lib/operations");

test('same hall permission test', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    const donor1 = await operations.createDonor({
        phone: 8801555444777,
        bloodGroup: 2,
        hall: 1,
        name: 'Blah Blah',
        studentId: 1606060,
        address: 'Azimpur',
        roomNumber: '3009',
        comment: 'developer of badhan',
        extraDonationCount: 0,
        availableToAll: true,
    }, signInResponse);
    const donor2 = await operations.createDonor({
        phone: 8801555444778,
        bloodGroup: 2,
        hall: 2,
        name: 'Blah Blah',
        studentId: 1606060,
        address: 'Azimpur',
        roomNumber: '3009',
        comment: 'developer of badhan',
        extraDonationCount: 0,
        availableToAll: true,
    }, signInResponse);
    const volunteerId = donor1.data.newDonor._id;
    await operations.promoteToVolunteer(volunteerId, signInResponse);
    const volunteerTokenResponse = await operations.issueDonorPassword(volunteerId, signInResponse);
    await operations.expectErrorWithToken('post', '/donors/password', volunteerTokenResponse.data.token, sameHallPermissionErrorSchema, { donorId: donor2.data.newDonor._id });
    await operations.signOut(signInResponse);
});
