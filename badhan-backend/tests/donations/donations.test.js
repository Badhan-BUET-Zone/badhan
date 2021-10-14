const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError} = require('../fixtures/helpers');

test('POST&DELETE/deletion', async () => {
    try {

        //post/donation part

        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: "8801521438557",
            password: env.MAHATHIR_PASSWORD
        });
        let donationDate=new Date().getTime();
        let donationCreationResponse = await badhanAxios.post("/donations",{
            "donorId":env.DONOR_ID,
            "date":donationDate
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationDonationResult = validate(donationCreationResponse.data, {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "status": {"type": "string"},
                "statusCode": {"const": 201},
                "message": {"type": "string"},
                "newDonation": {
                    "type": "object",
                    additionalProperties: false,
                    "properties":{
                        "date":{"type":"number"},
                        "_id":{"type":"string"},
                        "phone":{"type":"number"},
                        "donorId":{"type":"string"},
                        "__v":{"type":"number"}
                    },
                    required:["date","_id","phone","donorId","__v"]
                }
            },
            "required": ["status", "statusCode", "message", "newDonation"]
        });

        expect(validationDonationResult.errors).toEqual([]);

        // delete/donations part

        let donationDeletionResponse = await badhanAxios.delete("/donations?donorId="+env.DONOR_ID+"&date="+donationDate,  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(donationDeletionResponse.data, {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "status": {"type": "string"},
                "statusCode": {"const": 200},
                "message": {"type": "string"}
            },
            "required": ["status", "statusCode", "message"]
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