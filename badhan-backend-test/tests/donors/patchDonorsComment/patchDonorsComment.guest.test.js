const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { patchCommentSchema } = require("../schemas");

test("PATCH/guest/donors/comment: guest", async () => {
    let response = await badhanAxios.patch("/guest/donors/comment");

    let validationResult = validate(response.data, patchCommentSchema);

    expect(validationResult.errors).toEqual([]);
});
