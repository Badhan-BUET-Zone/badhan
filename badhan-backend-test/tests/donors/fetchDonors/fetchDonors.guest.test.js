const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { donorsSchema } = require("../schemas");

test("GET/guest/donors: guest", async () => {
    let donorsResponse = await badhanAxios.get("/guest/donors?donorId=123456");

    let validationResult = validate(donorsResponse.data, donorsSchema);

    expect(validationResult.errors).toEqual([]);
});
