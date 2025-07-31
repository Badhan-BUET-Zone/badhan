const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { processError } = require("../../fixtures/helpers");
const {
  postUsersRedirectionSchema,
  patchUsersRedirectionSchema,
} = require("./schemas");

test("POST&PATCH/users/redirection: success", async () => {
  try {
    //post/users/redirection part

    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });
    let redirectionResponse = await badhanAxios.post(
      "/users/redirection",
      {},
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );
    let validationRedirectionResult = validate(
      redirectionResponse.data,
      postUsersRedirectionSchema
    );

    expect(validationRedirectionResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    // patch/users/redirection part
    let redirectionToWebResponse = await badhanAxios.patch(
      "/users/redirection",
      {
        token: redirectionResponse.data.token,
      }
    );
    let validationResult = validate(
      redirectionToWebResponse.data,
      patchUsersRedirectionSchema
    );
    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
