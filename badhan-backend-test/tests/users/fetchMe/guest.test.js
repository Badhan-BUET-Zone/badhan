const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { donorSchema } = require("./schemas");

test("GET/guest/users/me: guest", async () => {
    let donorResponse = await badhanAxios.get("/guest/users/me");
    let validationResult = validate(donorResponse.data, donorSchema);
    expect(validationResult.errors).toEqual([]);
});
