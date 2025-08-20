const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config/config");
const { processError } = require("../fixtures/helpers");
const { logSchema } = require("./schemas");

test("GET/log: success", async () => {
  try {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let getLogResponse = await badhanAxios.get("/log", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let getLogResponseValidationResult = validate(
      getLogResponse.data,
      logSchema
    );

    expect(getLogResponseValidationResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
