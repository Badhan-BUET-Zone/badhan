const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');

const postPublicBookmarkSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 201},
        message: {type: "string"},
        newBookmark:{
            type:"object",
            additionalProperties: false,
            properties: {
                _id:{type:"string"},
                donorId:{type: "string"},
                markerId:{type: "string"},
                time:{type:"number"},
            }
        }
    }
}


const deletePublicBookmarkSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: {type: "string"},
        statusCode: {const: 200},
        message: {type: "string"},
        removedBookmark:{
            type:"object",
            additionalProperties: false,
            properties: {
                _id:{type:"string"},
                donorId:{type: "string"},
                markerId:{type: "string"},
                time:{type:"number"},
            }
        }
    }
}

test('POST & DELETE /bookmarks/public',async()=>{
    try {
        let signInResponse = await badhanAxios.post('/users/signin', {
            phone: env.SUPERADMIN_PHONE,
            password: env.SUPERADMIN_PASSWORD
        });

        let createBookmarkResponse = await badhanAxios.post('/bookmarks/public',{
            donorId: env.SUPERADMIN_ID,
        },{
            headers: {
                "x-auth": signInResponse.data.token
            }
        })

        let createBookmarkValidationResult = validate(createBookmarkResponse.data, postPublicBookmarkSchema);

        expect(createBookmarkValidationResult.errors).toEqual([]);

        let deleteBookmarkResponse = await badhanAxios.delete(`/bookmarks/public/${env.SUPERADMIN_ID}`, {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });

        let deleteBookmarkValidateResult = validate(deleteBookmarkResponse.data,deletePublicBookmarkSchema);
        expect(deleteBookmarkValidateResult.errors).toEqual([]);

        await badhanAxios.delete('/users/signout', {
            headers: {
                "x-auth": signInResponse.data.token
            }
        });
    }catch (e) {
        throw processError(e);
    }
});
test('POST/guest/bookmarks/public',async()=>{
    try {
        let createBookmarkResponse = await badhanAxios.post('/guest/bookmarks/public',{
        },{
        })

        let createBookmarkValidationResult = validate(createBookmarkResponse.data, postPublicBookmarkSchema);

        expect(createBookmarkValidationResult.errors).toEqual([]);

        let deleteBookmarkResponse = await badhanAxios.delete(`/guest/bookmarks/public/${env.SUPERADMIN_ID}`, {
        });

        let deleteBookmarkValidateResult = validate(deleteBookmarkResponse.data,deletePublicBookmarkSchema);
        expect(deleteBookmarkValidateResult.errors).toEqual([]);
    }catch (e) {
        throw processError(e);
    }
});

