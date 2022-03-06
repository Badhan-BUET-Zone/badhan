const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');
const duplicateDonorSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        donorId: {type: "string",}
    },
    required: ["status", "statusCode", "message", "donorId"]
}
const postDonorSchema={
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
                designation: {type: "integer"},
                lastDonation: {type: "integer"},
                comment: {type: "string"},
                commentTime: {type: "integer"},
                email: {type: "string"},
                _id: {type: "string"},
                phone: {type: "integer"},
                bloodGroup: {type: "integer"},
                hall: {type: "integer"},
                name: {type: "string"},
                studentId: {type: "string"},
                availableToAll: {type: "boolean"},
            },
            required: ["address", "roomNumber", "designation", "lastDonation", "comment", "commentTime", "email", "_id", "phone", "bloodGroup", "hall", "name", "studentId", "availableToAll"]
        }
    },
    required: ["status", "statusCode", "message", "newDonor"]
}
const patchDonorSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"}
    },
    required: ["status", "statusCode", "message"]
}
const deleteDonorSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"}
    },
    required: ["status", "statusCode", "message"]
}

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

        let validationCreationResult = validate(donorCreationResponse.data, postDonorSchema);

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


        let validationUpdateResult = validate(donorUpdateResponse.data, patchDonorSchema);

        expect(validationUpdateResult.errors).toEqual([]);

        // delete/donations part

        let donationDeletionResponse = await badhanAxios.delete("/donors?donorId="+donorCreationResponse.data.newDonor["_id"],  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(donationDeletionResponse.data, deleteDonorSchema);
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

test('POST&PATCH&DELETE/guest/donors', async () => {
    try {

        //post/donors part

        let donorCreationResponse = await badhanAxios.post("/guest/donors");

        let validationCreationResult = validate(donorCreationResponse.data, postDonorSchema);

        expect(validationCreationResult.errors).toEqual([]);

        //patch/donors

        let donorUpdateResponse = await badhanAxios.patch("/guest/donors/v2");


        let validationUpdateResult = validate(donorUpdateResponse.data, patchDonorSchema);

        expect(validationUpdateResult.errors).toEqual([]);

        // delete/donations part

        let donationDeletionResponse = await badhanAxios.delete("/guest/donors?donorId=");

        let validationResult = validate(donationDeletionResponse.data, deleteDonorSchema);
        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})
