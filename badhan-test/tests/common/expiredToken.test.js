const {expiredTokenSchema} = require("./schemas");
const {badhanAxios} = require("../../api");
const {validate} = require("jsonschema");
const env = require("../../config");

test('invalid jwt token',async()=>{
    let signInResponse = await badhanAxios.post('/users/signin',{phone:env.SUPERADMIN_PHONE,password: env.SUPERADMIN_PASSWORD});
    await badhanAxios.delete('/users/signout',{
        headers:{
            "x-auth": signInResponse.data.token
        }
    });

    badhanAxios.post('/users/signout',{
        headers: {
            "x-auth": signInResponse.data.token
        }
    }).catch(e=>{
        let validationResult = validate(e.response.data, expiredTokenSchema);
        expect(validationResult.errors).toEqual([]);
    })
})
