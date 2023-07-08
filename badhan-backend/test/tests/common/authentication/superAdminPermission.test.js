const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {superAdminPermissionErrorSchema} = require('../schemas')
const env = require('../../../config')
test('super admin permission test',async()=>{
    let signInResponse
    let donorCreationResponse
    try{
        signInResponse = await badhanAxios.post('/users/signin', {phone: env.SUPERADMIN_PHONE, password: env.SUPERADMIN_PASSWORD});
        const duplicateResponse = await badhanAxios.get(`/donors/checkDuplicate?phone=${8801555444777}`,{headers: {"x-auth": signInResponse.data.token}})
        if(duplicateResponse.data.donor){
            await badhanAxios.delete(`/donors?donorId=${duplicateResponse.data.donor._id}`,{headers: {"x-auth": signInResponse.data.token}})
        }

        donorCreationResponse = await badhanAxios.post("/donors", {phone: 8801555444777, bloodGroup: 2, hall: 5, name: "Blah Blah", studentId: 1606060, address: "Azimpur", roomNumber: "3009", comment: "developer of badhan", extraDonationCount: 2, availableToAll: true}, {headers: {"x-auth": signInResponse.data.token}});
        await badhanAxios.patch('/donors/designation', {donorId:donorCreationResponse.data.newDonor._id, promoteFlag:true},{headers: {"x-auth": signInResponse.data.token}});

        const tokenResponse = await badhanAxios.post('/donors/password',{donorId: donorCreationResponse.data.newDonor._id},{headers: {"x-auth": signInResponse.data.token}})
        await badhanAxios.get('/log/statistics', {headers: {"x-auth": tokenResponse.data.token}})

    }catch (e) {
        let validationResult = validate(e.response.data, superAdminPermissionErrorSchema);
        expect(validationResult.errors).toEqual([]);
        await badhanAxios.delete("/donors?donorId="+donorCreationResponse.data.newDonor._id,  {headers: {"x-auth": signInResponse.data.token}});
        await badhanAxios.delete('/users/signout', {headers: {"x-auth": signInResponse.data.token}});
    }
})
