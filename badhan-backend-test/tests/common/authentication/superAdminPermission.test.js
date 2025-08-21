const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {superAdminPermissionErrorSchema} = require('../schemas')
const env = require('../../../config')
const { signInSuperAdmin, createDonor, promoteToVolunteer, promoteToHallAdmin, getMe, markDonorAsActive, createDonation, createCallRecord, createPlateletDonation} = require("../../operations");

test('super admin permission test',async()=>{
    let signInResponse
    let tokenResponse
    try{
        signInResponse = await badhanAxios.post('/users/signin', {phone: env.SUPERADMIN_PHONE, password: env.SUPERADMIN_PASSWORD});
        
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

        // create a new donor
        let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);
        
        // promote to volunteer
        const sampleVolunteerId1 = donorCreationResponse.data.newDonor._id;
        await promoteToVolunteer(sampleVolunteerId1, signInResponse);

        tokenResponse = await badhanAxios.post('/donors/password',{donorId: sampleVolunteerId1},{headers: {"x-auth": signInResponse.data.token}})
        await badhanAxios.get('/log/statistics', {headers: {"x-auth": tokenResponse.data.token}})

    }catch (e) {
        let validationResult = validate(e.response.data, superAdminPermissionErrorSchema);
        expect(validationResult.errors).toEqual([]);
    }
})
