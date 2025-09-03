const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const {
  postDonorSchema,
  patchDonorSchema,
  deleteDonorSchema,
} = require("../schemas");

test("POST&PATCH&DELETE/guest/donors: guest", async () => {
    //post/donors part

    let donorCreationResponse = await badhanAxios.post("/guest/donors");

    let validationCreationResult = validate(
      donorCreationResponse.data,
      postDonorSchema
    );

    expect(validationCreationResult.errors).toEqual([]);

    //patch/donors

    let donorUpdateResponse = await badhanAxios.patch("/guest/donors/v2");

    let validationUpdateResult = validate(
      donorUpdateResponse.data,
      patchDonorSchema
    );

    expect(validationUpdateResult.errors).toEqual([]);

    // delete/donations part

    let donationDeletionResponse = await badhanAxios.delete(
      "/guest/donors?donorId="
    );

    let validationResult = validate(
      donationDeletionResponse.data,
      deleteDonorSchema
    );
    expect(validationResult.errors).toEqual([]);
});
