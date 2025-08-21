const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {sameHallPermissionErrorSchema} = require('../schemas')
const env = require('../../../config')
const { signInSuperAdmin, createDonor, promoteToVolunteer, getMe, markDonorAsActive, createDonation, createCallRecord, createPlateletDonation} = require("../../operations");

test('same hall permission test',async()=>{
    let signInResponse
    let sampleVolunteerId1
    let passwordRecoveryResponse
    try{
        signInResponse = await signInSuperAdmin();

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

        const newDonorInfo_2 = {
            phone: 8801555444778,
            bloodGroup: 2,
            hall: 2,
            name: "Blah Blah",
            studentId: 1606060,
            address: "Azimpur",
            roomNumber: "3009",
            comment: "developer of badhan",
            extraDonationCount: 0,
            availableToAll: true,
        };
    
        // create a new donor
        let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);

        // promote to volunteer
        sampleVolunteerId1 = donorCreationResponse.data.newDonor._id;
        await promoteToVolunteer(sampleVolunteerId1, signInResponse);

        // create another donor in a different hall
        const donorCreationResponse_2 = await createDonor(newDonorInfo_2, signInResponse);

        passwordRecoveryResponse = await badhanAxios.post('/donors/password', {donorId:sampleVolunteerId1},{headers: {"x-auth": signInResponse.data.token}});

        const profileResponse = await badhanAxios.get('/users/me',{headers: {"x-auth": passwordRecoveryResponse.data.token}})

        await badhanAxios.post('/donors/password', {donorId: donorCreationResponse_2.data.newDonor._id},{headers: {"x-auth": passwordRecoveryResponse.data.token}});

    }catch (e) {
        let validationResult = validate(e.response.data, sameHallPermissionErrorSchema);
        expect(validationResult.errors).toEqual([]);
    }
})
