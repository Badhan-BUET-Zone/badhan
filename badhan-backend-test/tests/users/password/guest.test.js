const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { patchPasswordSchema } = require("./schemas");

test("PATCH/guest/users/password: guest", async () => {
    let passwordResponse = await badhanAxios.patch("/guest/users/password");
    let validationResult = validate(passwordResponse.data, patchPasswordSchema);
    expect(validationResult.errors).toEqual([]);
});
