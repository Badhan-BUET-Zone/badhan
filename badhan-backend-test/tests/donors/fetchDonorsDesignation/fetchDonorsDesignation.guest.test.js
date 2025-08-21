const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { designationSchema } = require("../schemas");

test("GET/guest/donors/designation: guest", async () => {
    let designationResponse = await badhanAxios.get(
      "/guest/donors/designation"
    );

    let validationResult = validate(
      designationResponse.data,
      designationSchema
    );

    expect(validationResult.errors).toEqual([]);
});
