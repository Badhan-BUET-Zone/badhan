const { badhanAxios } = require("../../../api");
const env = require("../../../config");
const validate = require("jsonschema").validate;
const { signInSchema } = require("./schemas");

test("POST/users/signIn: success", async () => {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });
    let validationResult = validate(signInResponse.data, signInSchema);
    expect(validationResult.errors).toEqual([]);
    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
});
