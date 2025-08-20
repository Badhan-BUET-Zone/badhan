const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { searchSchema } = require("../schemas");

test("GET/guest/search/v3: guest", async () => {
  let searchResponse = await badhanAxios.get(
    "/guest/search/v3?bloodGroup=2&hall=5&batch=16&name=mahathir&address=&isAvailable=true&isNotAvailable=true&availableToAll=true"
  );

  let validationResult = validate(searchResponse.data, searchSchema({totalItems: null}));

  expect(validationResult.errors).toEqual([]);
});
