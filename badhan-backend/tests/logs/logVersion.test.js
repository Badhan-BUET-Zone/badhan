const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const {processError}=require('../fixtures/helpers');

test('GET/log/version/v5',async()=>{
    try {

        let logVersionResponse = await badhanAxios.get('/log/version/v5');
        let validationResult = validate(logVersionResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 200},
                message: {type: "string"},
                githubReleaseVersion :{type:"string"},
                githubReleaseDownloadURL :{type:"string"},
                firebaseVersion :{type:"string"}
            },
            required: ["status", "statusCode", "message", "githubReleaseVersion", "githubReleaseDownloadURL", "firebaseVersion"]
        });
        expect(validationResult.errors).toEqual([]);

    }catch (e) {
        throw processError(e);
    }
})

test('GET/guest/log/version/v5',async()=>{
    try {

        let logVersionResponse = await badhanAxios.get('/guest/log/version/v5');
        let validationResult = validate(logVersionResponse.data, {
            type: "object",
            additionalProperties: false,
            properties: {
                status: {type: "string"},
                statusCode: {const: 200},
                message: {type: "string"},
                githubReleaseVersion :{type:"string"},
                githubReleaseDownloadURL :{type:"string"},
                firebaseVersion :{type:"string"}
            },
            required: ["status", "statusCode", "message", "githubReleaseVersion", "githubReleaseDownloadURL", "firebaseVersion"]
        });
        expect(validationResult.errors).toEqual([]);

    }catch (e) {
        throw processError(e);
    }
})
