const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const {processError}=require('../fixtures/helpers');
const publicContactsSchema={
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
                    bloodGroup:{type:"number"},
                    contacts:{
                        type:"array",
                        minItems: 1,
                        items: {
                            type:"object",
                            additionalProperties:false,
                            properties:{
                                donorId:{type:"string"},
                                phone:{type:"number"},
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

test('GET/publicContacts',async()=>{
    try {
        let contactResponse = await badhanAxios.get('/publicContacts');
        let validationResult = validate(contactResponse.data, publicContactsSchema);
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})

test('GET/guest/publicContacts',async()=>{
    try {
        let contactResponse = await badhanAxios.get('/guest/publicContacts');
        let validationResult = validate(contactResponse.data, publicContactsSchema);
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})