const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { donorsSchema } = require("../schemas");
const { signInSuperAdmin, getMe, markDonorAsActive, createDonation, createCallRecord, createPlateletDonation} = require("../../operations");

test("GET/donors: success", async () => {
    let signInResponse = await signInSuperAdmin()

    let donorResponse = await getMe(signInResponse);

    let callRecordResponse = await createCallRecord(donorResponse.data.donor._id, signInResponse);

    let newDonationResult = await createDonation(donorResponse.data.donor._id, 1611100800000, signInResponse);

    let newPlateletDonationResult = await createPlateletDonation(donorResponse.data.donor._id, 1611100800001, signInResponse);

    let markeActiveDonorResponse = await markDonorAsActive(donorResponse.data.donor._id, signInResponse);

    let contactCreationResponse = await badhanAxios.post(
      "/publicContacts",
      {
        donorId: donorResponse.data.donor._id,
        bloodGroup: 2,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let donorsResponse = await badhanAxios.get(
      "/donors?donorId=" + donorResponse.data.donor._id,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationResult = validate(donorsResponse.data, donorsSchema);

    expect(validationResult.errors).toEqual([]);
});
