const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const {processError}=require('../fixtures/helpers');

test('GET/publicContacts',async()=>{
    try {
        let contactResponse = await badhanAxios.get('/publicContacts');
        let validationResult = validate(contactResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 200},
                message: {type: "string"},
                publicContacts: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            bloodGroup:{type:"number"},
                            contacts:{
                              type:"array",
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
        });
        expect(validationResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
})