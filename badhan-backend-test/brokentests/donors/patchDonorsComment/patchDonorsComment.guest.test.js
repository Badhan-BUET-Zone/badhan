const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { patchCommentSchema } = require("./schemas");

test("PATCH/guest/donors/comment: guest", async () => {
  try {
    let response = await badhanAxios.patch("/guest/donors/comment");

    let validationResult = validate(response.data, patchCommentSchema);

    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
