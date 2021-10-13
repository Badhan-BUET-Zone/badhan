const api = require('../../api');
const validate = require('jsonschema').validate;
const env = require('../../config/config');

test('PATCH/users/password', async () => {
    let signInResponse = await api.badhanAxios.post('/users/signin', {
        phone: "8801521438557",
        password: env.MAHATHIR_PASSWORD
    });
    let passwordResponse = await api.badhanAxios.patch("/users/password", {"password": env.MAHATHIR_PASSWORD}, {
        headers: {
            "x-auth": signInResponse.data.token
        }
    });
    let validationResult = validate(passwordResponse.data, {
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "status": {"type": "string"},
            "statusCode": {"const": 201},
            "message": {"type": "string"},
            "token": {"type": "string"}
        },
        "required": ["status", "statusCode", "token", "message"]
    });
    expect(validationResult.errors).toEqual([]);
    await api.badhanAxios.delete('/users/signout', {
        headers: {
            "x-auth": passwordResponse.data.token
        }
    });
})