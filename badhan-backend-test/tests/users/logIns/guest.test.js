const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { processError, sleep } = require("../../fixtures/helpers");
const { logInsSchema } = require("./schemas");

test("GET/guest/users/logins: guest", async () => {
  try {
    let logInsResponse = await badhanAxios.get("/guest/users/logins");
    let validationResult = validate(logInsResponse.data, logInsSchema);
    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
