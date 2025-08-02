const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { statisticsSchema } = require("./schemas");

test("GET/guest/log/statistics: guest", async () => {
  try {
    let statisticsResponse = await badhanAxios.get("/guest/log/statistics");

    let validationResult = validate(statisticsResponse.data, statisticsSchema);

    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
