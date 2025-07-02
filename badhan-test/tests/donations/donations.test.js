const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');
const postDonationSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        newDonation: {
            type: "object",
            additionalProperties: false,
            properties:{
                date:{type:"integer"},
                _id:{type:"string"},
                phone:{type:"integer"},
                donorId:{type:"string"},
            },
            required:["date","_id","phone","donorId"]
        }
    },
    required: ["status", "statusCode", "message", "newDonation"]
}
const deleteDonationSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        deletedDonation: {
            type: "object",
            additionalProperties: false,
            properties: {
                _id: {type: "string"},
                date: {type: "number"},
                donorId: {type: "string"},
                phone: {type: "number"}
            },
            required: ["_id", "date", "donorId","phone"]
        }
    },
    required: ["status", "statusCode", "message","deletedDonation"]
}

test('POST&DELETE/donations', async () => {
    try {

        //post/donation part

        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let donorResponse = await badhanAxios.get('/users/me', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let donationDate=new Date().getTime();
        let donationCreationResponse = await badhanAxios.post("/donations",{
            donorId:donorResponse.data.donor._id,
            date:donationDate
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationDonationResult = validate(donationCreationResponse.data, postDonationSchema);

        expect(validationDonationResult.errors).toEqual([]);

        // delete/donations part

        let donationDeletionResponse = await badhanAxios.delete("/donations?donorId="+donorResponse.data.donor._id+"&date="+donationDate,  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(donationDeletionResponse.data, deleteDonationSchema);
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

test('POST&DELETE/guest/donations', async () => {
    try {

        //post/donation part

        let donationCreationResponse = await badhanAxios.post("/guest/donations");
        let validationDonationResult = validate(donationCreationResponse.data, postDonationSchema);

        expect(validationDonationResult.errors).toEqual([]);

        // delete/donations part

        let donationDate=new Date().getTime();
        let donationDeletionResponse = await badhanAxios.delete("/guest/donations?donorId=12345&date="+donationDate);
        let validationResult = validate(donationDeletionResponse.data, deleteDonationSchema);
        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})
