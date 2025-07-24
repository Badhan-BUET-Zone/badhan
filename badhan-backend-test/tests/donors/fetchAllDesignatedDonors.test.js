const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');
const allDesignatedDonorSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode:{const:200},
        message:{type:"string"},
        data: {
            type: "array",
            minItems: 1,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    _id: {type: "string"},
                    studentId: {type: "string"},
                    name: {type: "string"},
                    logCount: {type: "integer"},
                    hall: {type: "integer"},
                },
                required: ["_id", "studentId","name", "logCount","hall"]
            },
        },
    },
    required:["status","statusCode","message","data"]
}

test('GET/donors/designation/all', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let allDesignatedDonorResponse = await badhanAxios.get('/donors/designation/all', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(allDesignatedDonorResponse.data, allDesignatedDonorSchema);

        expect(validationResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

    } catch (e) {
        throw processError(e);
    }
})

test('GET/guest/donors/designation/all', async () => {
    try {
        let allDesignatedDonorResponse = await badhanAxios.get('/guest/donors/designation/all');

        let validationResult = validate(allDesignatedDonorResponse.data, allDesignatedDonorSchema);

        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})
