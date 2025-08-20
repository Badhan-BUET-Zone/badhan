const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { logSchema } = require("./schemas");

test("GET/guest/log: guest", async () => {
  try {
    let getLogsResponse = await badhanAxios.get("/guest/log");

    let logsResponseValidationResult = validate(
      getLogsResponse.data,
      logSchema
    );

    expect(logsResponseValidationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
