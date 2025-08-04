const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { duplicateDonorSchema } = require("./schemas");

test("GET/guest/donors/checkDuplicate: guest", async () => {
  try {
    let duplicateResponse = await badhanAxios.get(
      "/guest/donors/checkDuplicate?phone=8801521438557"
    );

    let validationResult = validate(
      duplicateResponse.data,
      duplicateDonorSchema
    );

    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
