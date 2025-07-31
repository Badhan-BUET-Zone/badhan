const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { processError } = require("../../fixtures/helpers");
const { donorSchema } = require("./schemas");

test("GET/users/me: success", async () => {
  try {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let validationResult = validate(donorResponse.data, donorSchema);
    expect(validationResult.errors).toEqual([]);
    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
