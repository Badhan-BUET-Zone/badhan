const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
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
                bloodGroup:{type:"number"},
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

test('POST&DELETE/publicContacts', async () => {
    try {

        //post/callrecords part

        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let contactCreationResponse = await badhanAxios.post("/publicContacts",{
            donorId:env.SUPERADMIN_ID,
            bloodGroup:2
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let validationContactResult = validate(contactCreationResponse.data, postPublicContactsSchema);

        expect(validationContactResult.errors).toEqual([]);

        // delete/donations part

        let contactDeletionResponse = await badhanAxios.delete("/publicContacts?donorId="+env.SUPERADMIN_ID+"&contactId="+contactCreationResponse.data.publicContact["_id"],  {
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

        // delete/donations part

        let contactDeletionResponse = await badhanAxios.delete("/guest/publicContacts?donorId="+env.SUPERADMIN_ID+"&contactId="+contactCreationResponse.data.publicContact["_id"]);

        let validationResult = validate(contactDeletionResponse.data, deletePublicContactsSchema);
        expect(validationResult.errors).toEqual([]);

    } catch (e) {
        throw processError(e);
    }
})