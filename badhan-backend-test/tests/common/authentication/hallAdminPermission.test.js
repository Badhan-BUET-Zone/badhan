const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {hallAdminPermissionErrorSchema} = require('../schemas')
const env = require('../../../config')
const { signInSuperAdmin, createDonor, promoteToVolunteer, getMe, markDonorAsActive, createDonation, createCallRecord, createPlateletDonation} = require("../../operations");

test('hall admin permission test',async()=>{
    let signInResponse
    let sampleVolunteerId1
    let passwordRecoveryResponse
    try{
        signInResponse = await signInSuperAdmin();

        const meResponse = await getMe(signInResponse);

        const newDonorInfo = {
            phone: 8801555444777,
            bloodGroup: 2,
            hall: meResponse.data.donor.hall,
            name: "Blah Blah",
            studentId: 1606060,
            address: "Azimpur",
            roomNumber: "3009",
            comment: "developer of badhan",
            extraDonationCount: 2,
            availableToAll: true,
        };

        // create a new donor
        let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);

        // promote to volunteer
        let sampleVolunteerID = donorCreationResponse.data.newDonor._id;
        await promoteToVolunteer(sampleVolunteerID, signInResponse);

        passwordRecoveryResponse = await badhanAxios.post('/donors/password', {
            donorId:sampleVolunteerID
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        await badhanAxios.patch('/donors/designation', {
            donorId: meResponse.data.donor._id,
            promoteFlag: true
        },{
            headers: {
                "x-auth": passwordRecoveryResponse.data.token
            }
        });

    }catch (e) {
        let validationResult = validate(e.response.data, hallAdminPermissionErrorSchema);
        expect(validationResult.errors).toEqual([]);
    }
})
