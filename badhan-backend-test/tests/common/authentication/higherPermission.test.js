const {badhanAxios} = require("../../../api")
const {validate} = require("jsonschema");
const {higherDesignationPermissionErrorSchema} = require('../schemas')
const env = require('../../../config')
const { signInSuperAdmin, createDonor, promoteToVolunteer, promoteToHallAdmin, getMe, markDonorAsActive, createDonation, createCallRecord, createPlateletDonation} = require("../../operations");

test('hall admin permission test',async()=>{
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
            hall: 1,
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

        let donorCreationResponse_2 = await createDonor(newDonorInfo_2, signInResponse);

        // promote to volunteer
        sampleVolunteerId1 = donorCreationResponse.data.newDonor._id;
        const sampleVolunteerId2 = donorCreationResponse_2.data.newDonor._id;
        await promoteToVolunteer(sampleVolunteerId1, signInResponse);

        // promote the second donor to volunteer
        await promoteToVolunteer(donorCreationResponse_2.data.newDonor._id, signInResponse);

        // promote the second volunteer to hall admin
        await promoteToHallAdmin(donorCreationResponse_2.data.newDonor._id, signInResponse);
        
        passwordRecoveryResponse = await badhanAxios.post('/donors/password', {donorId:sampleVolunteerId1},{headers: {"x-auth": signInResponse.data.token}});

        await badhanAxios.delete(`/donors?donorId=${sampleVolunteerId2}`,{
            headers: {
                "x-auth": passwordRecoveryResponse.data.token
            }
        });

    }catch (e) {
        let validationResult = validate(e.response.data, higherDesignationPermissionErrorSchema);
        expect(validationResult.errors).toEqual([]);
    }
})
