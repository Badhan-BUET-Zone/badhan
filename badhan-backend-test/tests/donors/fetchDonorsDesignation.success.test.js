const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { designationSchema } = require("./schemas");

test("GET/donors/designation: success", async () => {
  try {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let designationResponse = await badhanAxios.get("/donors/designation", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let validationResult = validate(
      designationResponse.data,
      designationSchema
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
