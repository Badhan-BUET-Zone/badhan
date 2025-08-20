const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { invalidRequestSchema } = require("./schemas");

// invalid request test
test("GET/donations/report: invalid request", async () => {
  // no date query params
  try {
    await badhanAxios.get("/donations/report");
  } catch (e) {
    let validationResult = validate(e.response.data, invalidRequestSchema);
    expect(validationResult.errors).toEqual([]);
  }

  // invalid start date
  try {
    await badhanAxios.get(
      "/donations/report?startDate=2&endDate=1717113600000"
    );
  } catch (e) {
    let validationResult = validate(e.response.data, invalidRequestSchema);
    expect(validationResult.errors).toEqual([]);
  }

  // invalid end date
  try {
    await badhanAxios.get(
      "/donations/report?startDate=1707237110000&endDate=2"
    );
  } catch (e) {
    let validationResult = validate(e.response.data, invalidRequestSchema);
    expect(validationResult.errors).toEqual([]);
  }
});
