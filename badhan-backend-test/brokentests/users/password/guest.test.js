const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../../fixtures/helpers");
const { patchPasswordSchema } = require("./schemas");

test("PATCH/guest/users/password: guest", async () => {
  try {
    let passwordResponse = await badhanAxios.patch("/guest/users/password");
    let validationResult = validate(passwordResponse.data, patchPasswordSchema);
    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
