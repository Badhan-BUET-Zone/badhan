const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { allDesignatedDonorSchema } = require("../schemas");

test("GET/guest/donors/designation/all: guest", async () => {
    let allDesignatedDonorResponse = await badhanAxios.get(
      "/guest/donors/designation/all"
    );

    let validationResult = validate(
      allDesignatedDonorResponse.data,
      allDesignatedDonorSchema
    );

    expect(validationResult.errors).toEqual([]);
});
