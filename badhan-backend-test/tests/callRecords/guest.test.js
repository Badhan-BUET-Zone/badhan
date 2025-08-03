const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { postCallRecordsSchema, deleteCallRecordsSchema } = require("./schemas");

test("POST&DELETE/guest/callrecords: guest", async () => {
  try {
    //post/callrecords part

    let recordCreationResponse = await badhanAxios.post("/guest/callrecords");

    let validationRecordResult = validate(
      recordCreationResponse.data,
      postCallRecordsSchema
    );

    expect(validationRecordResult.errors).toEqual([]);

    // delete/donations part

    let donationDeletionResponse = await badhanAxios.delete(
      "/guest/callrecords?donorId=23455&callRecordId=" +
        recordCreationResponse.data.callRecord["_id"]
    );

    let validationResult = validate(
      donationDeletionResponse.data,
      deleteCallRecordsSchema
    );

    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
