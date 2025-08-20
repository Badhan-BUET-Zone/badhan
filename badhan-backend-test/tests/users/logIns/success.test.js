const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { logInsSchema } = require("./schemas");
const { sleep } = require("../../helpers");

test("GET/users/logins: success", async () => {
    let signInResponse = await badhanAxios.post("/users/signIn", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });
    await sleep(1000);
    let signInResponse_2 = await badhanAxios.post("/users/signIn", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let logInsResponse = await badhanAxios.get("/users/logins", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
    let validationResult = validate(logInsResponse.data, logInsSchema);

    expect(validationResult.errors).toEqual([]);
    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse_2.data.token,
      },
    });
});
