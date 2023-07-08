const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {hallAdminPermissionErrorSchema} = require('../schemas')
const env = require('../../../config')
test('hall admin permission test',async()=>{
    let signInResponse
    let sampleVolunteerId1
    let passwordRecoveryResponse
    try{
        signInResponse = await badhanAxios.post('/users/signin', {phone: env.SUPERADMIN_PHONE, password: env.SUPERADMIN_PASSWORD});
        let designationResponse = await badhanAxios.get('/donors/designation', {headers: {"x-auth": signInResponse.data.token}});
        sampleVolunteerId1 = designationResponse.data.volunteerList[0]._id
        const sampleVolunteerId2 = designationResponse.data.volunteerList[0]._id
        passwordRecoveryResponse = await badhanAxios.post('/donors/password', {donorId:sampleVolunteerId1},{headers: {"x-auth": signInResponse.data.token}});

        await badhanAxios.patch('/donors/designation', {
            donorId:sampleVolunteerId2,
            promoteFlag:true
        },{
            headers: {
                "x-auth": passwordRecoveryResponse.data.token
            }
        });

    }catch (e) {
        let validationResult = validate(e.response.data, hallAdminPermissionErrorSchema);
        expect(validationResult.errors).toEqual([]);
        await badhanAxios.delete('/users/signout', {headers: {"x-auth": passwordRecoveryResponse.data.token}});
        await badhanAxios.delete('/users/signout', {headers: {"x-auth": signInResponse.data.token}});
    }
})
