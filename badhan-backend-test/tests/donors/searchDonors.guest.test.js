const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { searchSchema } = require("./schemas");

test("GET/guest/search/v3: guest", async () => {
  try {
    let searchResponse = await badhanAxios.get(
      "/guest/search/v3?bloodGroup=2&hall=5&batch=16&name=mahathir&address=&isAvailable=true&isNotAvailable=true&availableToAll=true"
    );

    let validationResult = validate(searchResponse.data, searchSchema);

    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
