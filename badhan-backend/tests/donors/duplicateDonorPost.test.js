const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');
const duplicateDonorSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 409},
        message: {type: "string"},
        donorId: {type: "string",}
    },
    required: ["status", "statusCode", "message", "donorId"]
}

test('POST/donors handle duplicate',async ()=>{
    try{
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        try {
            await badhanAxios.post("/donors", {
                phone: 8801521438557,
                bloodGroup: 2,
                hall: 5,
                name: "Blah Blah",
                studentId: 1606060,
                address: "Azimpur",
                roomNumber: "3009",
                comment: "developer of badhan",
                extraDonationCount: 2,
                availableToAll: true
            }, {
                headers: {
                    "x-auth": signInResponse.data.token
                }
            });
        }catch (e) {
            let duplicateValidationResult = validate(e.response.data, duplicateDonorSchema);
            expect(duplicateValidationResult.errors).toEqual([]);
        }finally {
            await badhanAxios.delete('/users/signout', {
                headers: {
                    "x-auth": signInResponse.data.token
                }
            });
        }
    }catch (e) {
        throw processError(e);
    }
})
