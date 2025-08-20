const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { logInsSchema } = require("./schemas");

test("GET/guest/users/logins: guest", async () => {
    let logInsResponse = await badhanAxios.get("/guest/users/logins");
    let validationResult = validate(logInsResponse.data, logInsSchema);
    expect(validationResult.errors).toEqual([]);
});
