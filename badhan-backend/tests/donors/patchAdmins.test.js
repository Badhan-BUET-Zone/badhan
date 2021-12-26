const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

const patchAdminsSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
    },
    required: ["status", "statusCode", "message"]
};

test('PATCH/admins', async () => {
    try {
        //sign in for authorization
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        //get all hall admins and select the first one to track
        let designatedDonorsResponse = await badhanAxios.get('/donors/designation', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let sampleVolunteerID = designatedDonorsResponse.data.volunteerList[0]._id;

        // promote to hall admin
        let hallAdminPromotionResult = await badhanAxios.patch('/admins',{
            donorId: sampleVolunteerID
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        })

        // validate hall admin promotion result
        let hallAdminPromotionValidation = validate(hallAdminPromotionResult.data, patchAdminsSchema);

        expect(hallAdminPromotionValidation.errors).toEqual([]);

        //logout to remove token
        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
    } catch (e) {
        throw processError(e);
    }
})

test('PATCH/guest/admins',async()=>{
    let hallAdminPromotionResult = await badhanAxios.patch('/guest/admins',{
        donorId: '123456'
    },{

    })

    // validate hall admin promotion result
    let hallAdminPromotionValidation = validate(hallAdminPromotionResult.data, patchAdminsSchema);

    expect(hallAdminPromotionValidation.errors).toEqual([]);
})
