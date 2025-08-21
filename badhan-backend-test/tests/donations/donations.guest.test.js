const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { postDonationSchema, deleteDonationSchema } = require("./schemas");

test("POST&DELETE/guest/donations: guest", async () => {
    //post/donation part

    let donationCreationResponse = await badhanAxios.post("/guest/donations");
    let validationDonationResult = validate(
      donationCreationResponse.data,
      postDonationSchema
    );

    expect(validationDonationResult.errors).toEqual([]);

    // delete/donations part

    let donationDate = new Date().getTime();
    let donationDeletionResponse = await badhanAxios.delete(
      "/guest/donations?donorId=12345&date=" + donationDate
    );
    let validationResult = validate(
      donationDeletionResponse.data,
      deleteDonationSchema
    );
    expect(validationResult.errors).toEqual([]);
});
