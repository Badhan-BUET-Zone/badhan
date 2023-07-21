const {badhanAxios} = require("../../../api");
const {validate} = require("jsonschema");
const {superAdminPermissionErrorSchema} = require('../schemas')
const env = require('../../../config')

test('super admin permission test',async()=>{
    let signInResponse
    let tokenResponse
    try{
        signInResponse = await badhanAxios.post('/users/signin', {phone: env.SUPERADMIN_PHONE, password: env.SUPERADMIN_PASSWORD});
        let designationResponse = await badhanAxios.get('/donors/designation', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        const sampleHallAdminId = designationResponse.data.adminList[0]._id

        tokenResponse = await badhanAxios.post('/donors/password',{donorId: sampleHallAdminId},{headers: {"x-auth": signInResponse.data.token}})
        await badhanAxios.get('/log/statistics', {headers: {"x-auth": tokenResponse.data.token}})

    }catch (e) {
        let validationResult = validate(e.response.data, superAdminPermissionErrorSchema);
        expect(validationResult.errors).toEqual([]);
        await badhanAxios.delete('/users/signout', {headers: {"x-auth": signInResponse.data.token}});
        await badhanAxios.delete('/users/signout', {headers: {"x-auth": tokenResponse.data.token}});
    }
})
