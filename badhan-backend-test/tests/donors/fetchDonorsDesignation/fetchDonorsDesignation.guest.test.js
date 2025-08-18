const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { designationSchema } = require("./schemas");

test("GET/guest/donors/designation: guest", async () => {
  try {
    let designationResponse = await badhanAxios.get(
      "/guest/donors/designation"
    );

    let validationResult = validate(
      designationResponse.data,
      designationSchema
    );

    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
