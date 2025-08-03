const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { passwordSchema } = require("./schemas");

test("POST/guest/donors/password: guest", async () => {
  try {
    let response = await badhanAxios.post("/guest/donors/password");

    let validationResult = validate(response.data, passwordSchema);

    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
