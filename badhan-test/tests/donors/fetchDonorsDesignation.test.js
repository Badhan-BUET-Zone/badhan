const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');
const designationSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        volunteerList: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    roomNumber: {type: "string"},
                    _id: {type: "string"},
                    studentId: {type: "string"},
                    phone: {type: "number"},
                    bloodGroup: {type: "number"},
                    name: {type: "string"},
                },
                required: ["roomNumber", "_id", "studentId", "phone", "bloodGroup", "name"]
            }
        },
        adminList: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    _id: {type: "string"},
                    studentId: {type: "string"},
                    phone: {type: "number"},
                    hall: {type: "number"},
                    name: {type: "string"},
                },
                required: [ "_id", "studentId", "phone", "hall", "name"]
            }
        },
        superAdminList: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    _id: {type: "string"},
                    studentId: {type: "string"},
                    phone: {type: "number"},
                    hall: {type: "number"},
                    name: {type: "string"},
                },
                required: [ "_id", "studentId", "phone", "hall", "name"]
            }
        },
    },
    required: ["status", "statusCode", "message", "volunteerList","adminList","superAdminList"]
}

test('GET/donors/designation', async () => {
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let designationResponse = await badhanAxios.get('/donors/designation', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(designationResponse.data, designationSchema);

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


test('GET/guest/donors/designation', async () => {
    try {
        let designationResponse = await badhanAxios.get('/guest/donors/designation');

        let validationResult = validate(designationResponse.data, designationSchema);

        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})