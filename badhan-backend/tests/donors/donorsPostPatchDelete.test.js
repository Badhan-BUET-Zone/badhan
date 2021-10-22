const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('POST&PATCH&DELETE/donors', async () => {
    try {

        //post/donors part

        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let donorCreationResponse = await badhanAxios.post("/donors", {
            phone: 8801555444777,
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

        let validationCreationResult = validate(donorCreationResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 201},
                message: {type: "string"},
                newDonor: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        address: {type: "string"},
                        roomNumber: {type: "string"},
                        designation: {type: "number"},
                        lastDonation: {type: "number"},
                        comment: {type: "string"},
                        commentTime: {type: "number"},
                        email: {type: "string"},
                        _id: {type: "string"},
                        phone: {type: "number"},
                        bloodGroup: {type: "number"},
                        hall: {type: "number"},
                        name: {type: "string"},
                        studentId: {type: "string"},
                        availableToAll: {type: "boolean"},
                    },
                    required: ["address", "roomNumber", "designation", "lastDonation", "comment", "commentTime", "email", "_id", "phone", "bloodGroup", "hall", "name", "studentId", "availableToAll"]
                }
            },
            required: ["status", "statusCode", "message", "newDonor"]
        });

        expect(validationCreationResult.errors).toEqual([]);

        //patch/donors

        let donorUpdateResponse = await badhanAxios.patch("/donors/v2", {
            donorId: donorCreationResponse.data.newDonor["_id"],
            name: "Blah Blah",
            phone: 8801555444777,
            studentId: 1606060,
            bloodGroup: 2,
            hall: 5,
            roomNumber: "3009",
            address: "Azimpur",
            availableToAll: true,
            email:""
        }, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });


        let validationUpdateResult = validate(donorUpdateResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 200},
                message: {type: "string"}
            },
            required: ["status", "statusCode", "message"]
        });

        expect(validationUpdateResult.errors).toEqual([]);

        // delete/donations part

        let donationDeletionResponse = await badhanAxios.delete("/donors?donorId="+donorCreationResponse.data.newDonor["_id"],  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(donationDeletionResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 200},
                message: {type: "string"}
            },
            required: ["status", "statusCode", "message"]
        });
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