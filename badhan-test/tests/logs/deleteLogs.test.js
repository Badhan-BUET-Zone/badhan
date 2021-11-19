const {badhanAxios} = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');
const {processError}=require('../fixtures/helpers');
const deleteLogsSchema={
  type: "object",
  additionalProperties: false,
  properties: {
    status: {type: "string"},
    statusCode: {const: 200},
    message: {type: "string"},
  },
  required: ["status", "statusCode", "message"]
}

test('DELETE/log',async()=>{
  try {
    let signInResponse = await badhanAxios.post('/users/signin', {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD
    });


    let deleteLogsResult = await badhanAxios.delete('/log',{
      headers:{
        "x-auth":signInResponse.data.token
      }
    });


    let deleteLogsValidationResult = validate(deleteLogsResult.data, deleteLogsSchema);

    expect(deleteLogsValidationResult.errors).toEqual([]);

    await badhanAxios.delete('/users/signout', {
      headers: {
        "x-auth": signInResponse.data.token
      }
    });

  }catch (e) {
    throw processError(e);
  }
})