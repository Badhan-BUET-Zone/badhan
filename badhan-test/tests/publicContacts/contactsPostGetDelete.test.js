const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config');
const {processError} = require('../fixtures/helpers');
const postPublicContactsSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        publicContact: {
            type: "object",
            additionalProperties: false,
            properties:{
                bloodGroup:{type:"integer"},
                _id:{type:"string"},
                donorId:{type:"string"}
            },
            required:["bloodGroup","_id","donorId"]
        }
    },
    required: ["status", "statusCode", "message","publicContact"]
}

const deletePublicContactsSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"}
    },
    required: ["status", "statusCode", "message"]
}

const getPublicContactsSchema={
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        publicContacts: {
            type: "array",
            minItems: 1,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    bloodGroup:{type:"integer"},
                    contacts:{
                        type:"array",
                        minItems: 1,
                        items: {
                            type:"object",
                            additionalProperties:false,
                            properties:{
                                donorId:{type:"string"},
                                phone:{type:"integer"},
                                name:{type:"string"},
                                contactId:{type:"string"}
                            },
                            required:["donorId","phone","name","contactId"]
                        }
                    }
                },
                required:["bloodGroup","contacts"]
            }
        },
    },
    required: ["status", "statusCode", "message", "publicContacts"]
}

test('POST&DELETE/publicContacts', async () => {
    try {

        //post/callrecords part

        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let donorResponse = await badhanAxios.get('/users/me', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let contactCreationResponse = await badhanAxios.post("/publicContacts",{
            donorId: donorResponse.data.donor._id,
            bloodGroup:2
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationContactResult = validate(contactCreationResponse.data, postPublicContactsSchema);

        expect(validationContactResult.errors).toEqual([]);

        let getContactResponse = await badhanAxios.get('/publicContacts');
        let getContactResponseValidationResult = validate(getContactResponse.data, getPublicContactsSchema);
        expect(getContactResponseValidationResult.errors).toEqual([]);

        // delete/donations part

        let contactDeletionResponse = await badhanAxios.delete("/publicContacts?donorId="+donorResponse.data.donor._id+"&contactId="+contactCreationResponse.data.publicContact["_id"],  {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationResult = validate(contactDeletionResponse.data, deletePublicContactsSchema);
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

test('POST&DELETE/guest/publicContacts', async () => {
    try {

        //post/callrecords part

        let contactCreationResponse = await badhanAxios.post("/guest/publicContacts");

        let validationContactResult = validate(contactCreationResponse.data, postPublicContactsSchema);

        expect(validationContactResult.errors).toEqual([]);

        let getContactResponse = await badhanAxios.get('/guest/publicContacts');
        let getContactResponseValidationResult = validate(getContactResponse.data, getPublicContactsSchema);
        expect(getContactResponseValidationResult.errors).toEqual([]);

        // delete/donations part

        let contactDeletionResponse = await badhanAxios.delete("/guest/publicContacts?donorId=blahblah&contactId="+contactCreationResponse.data.publicContact["_id"]);

        let validationResult = validate(contactDeletionResponse.data, deletePublicContactsSchema);
        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})
