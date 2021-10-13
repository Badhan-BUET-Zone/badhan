const api = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');

test('DELETE/users/signOut', async () => {

    let signInResponse = await api.badhanAxios.post('/users/signin', {
        phone: "8801521438557",
        password: env.MAHATHIR_PASSWORD
    });
    let signOutResponse = await api.badhanAxios.delete('/users/signout', {
        headers: {
            "x-auth": signInResponse.data.token
        }
    });
    let validationResult = validate(signOutResponse.data, {
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

})