const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { processError, sleep } = require("../../fixtures/helpers");
const { logInsSchema } = require("./schemas");

test("GET/users/logins: success", async () => {
  try {
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
  } catch (e) {
    throw processError(e);
  }
});
