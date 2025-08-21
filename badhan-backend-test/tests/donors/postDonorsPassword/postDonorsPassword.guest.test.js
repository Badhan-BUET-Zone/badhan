const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { passwordSchema } = require("../schemas");

test("POST/guest/donors/password: guest", async () => {
    let response = await badhanAxios.post("/guest/donors/password");

    let validationResult = validate(response.data, passwordSchema);

    expect(validationResult.errors).toEqual([]);
});
