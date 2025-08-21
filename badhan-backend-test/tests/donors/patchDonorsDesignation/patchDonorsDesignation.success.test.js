const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { patchDonorsDesignationSchema } = require("../schemas");
const { newDonorInfo } = require("../infos");

const { createDonor, signInSuperAdmin, promoteToVolunteer, demoteToDonor } = require("../../operations");


test("PATCH/donors/designation: success", async () => {
    //sign in for authorization
    let signInResponse = await signInSuperAdmin();

    //create a new donor
    let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);

    // promote that newly created donor to volunteer
    let promotionResponse = await promoteToVolunteer(
      donorCreationResponse.data.newDonor._id,
      signInResponse
    );

    //demote the newly promoted volunteer to a normal donor
    let demotionResponse = await demoteToDonor(
      donorCreationResponse.data.newDonor._id,
      signInResponse
    );
});
