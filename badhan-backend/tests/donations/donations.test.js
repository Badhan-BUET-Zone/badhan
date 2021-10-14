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

        let donationCreationResponse = await badhanAxios.post("/donations",{
            "donorId":env.DONOR_ID,
            "date":new Date().getTime()
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
        console.log(donationCreationResponse.data);
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

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        // patch/users/redirection part

        // let redirectionToWebResponse = await badhanAxios.patch("/users/redirection",  {
        //     "token": redirectionResponse.data.token
        // });
        // let validationResult = validate(redirectionToWebResponse.data, {
        //     "type": "object",
        //     "additionalProperties": false,
        //     "properties": {
        //         "status": {"type": "string"},
        //         "statusCode": {"const": 201},
        //         "message": {"type": "string"},
        //         "token": {"type": "string"}
        //     },
        //     "required": ["status", "statusCode", "token", "message"]
        // });
        // expect(validationResult.errors).toEqual([]);
        // await badhanAxios.delete('/users/signout', {
        //     headers: {
        //         "x-auth": redirectionToWebResponse.data.token
        //     }
        // });

    } catch (e) {
        throw processError(e);
    }
})