const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const { postPlateletDonationSchema, deletePlateletDonationSchema } = require("./schemas");

test("POST&DELETE/guest/platelet-donations: guest", async () => {
  try {
    //post/donation part

    let plateletDonationCreationResponse = await badhanAxios.post("/guest/platelet-donations");
    let validationPlateletDonationResult = validate(
      plateletDonationCreationResponse.data,
      postPlateletDonationSchema
    );

    expect(validationPlateletDonationResult.errors).toEqual([]);

    // delete/platelet-donations part

    let plateletDonationDate = new Date().getTime();
    let plateletDonationDeletionResponse = await badhanAxios.delete(
      "/guest/platelet-donations?donorId=12345&date=" + plateletDonationDate
    );
    let validationPlateletDonationDeleteResult = validate(
      plateletDonationDeletionResponse.data,
      deletePlateletDonationSchema
    );
    expect(validationPlateletDonationDeleteResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
