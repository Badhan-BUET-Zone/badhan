const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { postActiveDonorSchema, deleteActiveDonorSchema } = require("./schemas");

test("POST & DELETE /guest/activeDonors: guest", async () => {
  try {
    let createActiveDonorResponse = await badhanAxios.post(
      "/guest/activeDonors",
      {},
      {}
    );

    let createActiveDonorValidationResult = validate(
      createActiveDonorResponse.data,
      postActiveDonorSchema
    );

    expect(createActiveDonorValidationResult.errors).toEqual([]);

    let deleteActiveDonorResponse = await badhanAxios.delete(
      `/guest/activeDonors/123456`,
      {}
    );

    let deleteActiveDonorValidateResult = validate(
      deleteActiveDonorResponse.data,
      deleteActiveDonorSchema
    );
    expect(deleteActiveDonorValidateResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
