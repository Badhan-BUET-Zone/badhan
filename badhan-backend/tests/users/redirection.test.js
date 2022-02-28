const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

const postUsersRedirectionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        token: {type: "string"}
    },
    required: ["status", "statusCode", "token", "message"]
}

const patchUsersRedirectionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        token: {type: "string"},
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
    required: ["status", "statusCode", "token", "message", "donor"]
}

test('POST&PATCH/users/redirection', async () => {
    try {

        //post/users/redirection part

        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });
        let redirectionResponse = await badhanAxios.post("/users/redirection",{},{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        let validationRedirectionResult = validate(redirectionResponse.data, postUsersRedirectionSchema);

        expect(validationRedirectionResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        // patch/users/redirection part
        let redirectionToWebResponse = await badhanAxios.patch("/users/redirection",  {
            "token": redirectionResponse.data.token
        });
        let validationResult = validate(redirectionToWebResponse.data, patchUsersRedirectionSchema);
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})