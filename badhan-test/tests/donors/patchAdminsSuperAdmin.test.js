const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');

const patchAdminsSuperAdminSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        donor: {
            type: "object",
            additionalProperties: false,
            properties: {
                _id:{type:"string"},
                phone: {type: "integer"},
                name:{type:"string"},
                studentId:{type:"string"},
                email:{type:"string"},
                lastDonation: {type: "integer"},
                bloodGroup: {type: "integer"},
                hall: {type: "integer"},
                roomNumber:{type:"string"},
                address:{type:"string"},
                comment:{type:"string"},
                commentTime:{type:"integer"},
                designation: {type: "integer"},
                availableToAll: {type: "boolean"},
            },
            required: ["_id", "phone","name","studentId","email","lastDonation","bloodGroup","hall","roomNumber","address","comment","commentTime","designation","availableToAll"]
        },
    },
    required: ["status", "statusCode", "message","donor"]
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

        // promote to super admin
        let superAdminPromotionResult = await badhanAxios.patch('/admins/superadmin',{
            donorId: sampleVolunteerID,
            promoteFlag: true
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        })

        // validate hall admin promotion result
        let superAdminPromotionValidation = validate(superAdminPromotionResult.data, patchAdminsSuperAdminSchema);

        expect(superAdminPromotionValidation.errors).toEqual([]);

        await badhanAxios.patch('/admins/superadmin',{
            donorId: sampleVolunteerID,
            promoteFlag: false
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        })

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
    let superAdminPromotionResult = await badhanAxios.patch('/guest/admins/superadmin',{
        donorId: '123456',
        promoteFlag: true
    },{

    })

    // validate hall admin promotion result
    let superAdminPromotionValidation = validate(superAdminPromotionResult.data, patchAdminsSuperAdminSchema);

    expect(superAdminPromotionValidation.errors).toEqual([]);
})
