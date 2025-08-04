const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../../fixtures/helpers");
const { donorSchema } = require("./schemas");

test("GET/guest/users/me: guest", async () => {
  try {
    let donorResponse = await badhanAxios.get("/guest/users/me");
    let validationResult = validate(donorResponse.data, donorSchema);
    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
