const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { duplicateDonorSchema } = require("./schemas");

test("GET/donors/checkDuplicate: success", async () => {
  try {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let duplicateResponse = await badhanAxios.get(
      `/donors/checkDuplicate?phone=${env.SUPERADMIN_PHONE}`,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationResult = validate(
      duplicateResponse.data,
      duplicateDonorSchema
    );

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
