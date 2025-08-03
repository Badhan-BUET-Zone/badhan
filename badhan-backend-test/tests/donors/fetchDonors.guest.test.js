const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { donorsSchema } = require("./schemas");

test("GET/guest/donors: guest", async () => {
  try {
    let donorsResponse = await badhanAxios.get("/guest/donors?donorId=123456");

    let validationResult = validate(donorsResponse.data, donorsSchema);

    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
