const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { duplicateDonorsManySchema } = require("../schemas");
const { newDonor_1_info, newDonor_2_info } = require("../infos");

test("GET/donors/phone: fetch donars duplicate all", async () => {
    const superAdminSignInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    const donor_1_creationResponse = await badhanAxios.post(
      "/donors",
      newDonor_1_info,
      {
        headers: {
          "x-auth": superAdminSignInResponse.data.token,
        },
      }
    );
    const donor_2_creationResponse = await badhanAxios.post(
      "/donors",
      newDonor_2_info,
      {
        headers: {
          "x-auth": superAdminSignInResponse.data.token,
        },
      }
    );

    await badhanAxios.patch(
      "/donors/designation",
      {
        donorId: donor_1_creationResponse.data.newDonor._id,
        promoteFlag: true,
      },
      {
        headers: {
          "x-auth": superAdminSignInResponse.data.token,
        },
      }
    );

    const volunteer_1_token_response = await badhanAxios.post(
      "/donors/password",
      {
        donorId: donor_1_creationResponse.data.newDonor._id,
      },
      {
        headers: {
          "x-auth": superAdminSignInResponse.data.token,
        },
      }
    );
    const voluneer_1_token = volunteer_1_token_response.data.token;

    const listOfPhones = [newDonor_1_info.phone, newDonor_2_info.phone];
    const phoneListQuery = "?phoneList=" + listOfPhones.join("&phoneList=");

    const existingDonorsResponse_1 = await badhanAxios.get(
      `/donors/phone${phoneListQuery}`,
      {
        headers: {
          "x-auth": voluneer_1_token,
        },
      }
    );

    const existingDonorValidationResult = validate(
      existingDonorsResponse_1.data,
      duplicateDonorsManySchema
    );
    expect(existingDonorValidationResult.errors).toEqual([]);
});
