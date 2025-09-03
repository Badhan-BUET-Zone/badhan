const { badhanAxios } = require("../../../api");
const { validate } = require("jsonschema");
const { signOutSchema } = require("./schemas");

test("DELETE/guest/users/signout: guest", async () => {
    let signOutResponse = await badhanAxios.delete("/guest/users/signout");
    let validationResult = validate(signOutResponse.data, signOutSchema);
    expect(validationResult.errors).toEqual([]);
});
