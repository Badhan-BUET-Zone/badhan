const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { deleteLogInsSchema } = require("./schemas");

test("DELETE /guest/users/logins/{tokenId}: guest", async () => {
    let deleteResponse = await badhanAxios.delete("/guest/users/logins/abc");
    let validationResult = validate(deleteResponse.data, deleteLogInsSchema);
    expect(validationResult.errors).toEqual([]);
});
