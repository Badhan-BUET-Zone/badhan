const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { processError } = require("../../fixtures/helpers");
const { patchPasswordSchema } = require("./schemas");

test("PATCH/users/password: success", async () => {
  try {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });
    let passwordResponse = await badhanAxios.patch(
      "/users/password",
      {
        password: env.SUPERADMIN_PASSWORD,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );
    let validationResult = validate(passwordResponse.data, patchPasswordSchema);
    expect(validationResult.errors).toEqual([]);
    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": passwordResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
