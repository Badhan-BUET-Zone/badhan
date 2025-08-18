const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { patchAdminsSuperAdminSchema } = require("./schemas");

test("PATCH/admins: success", async () => {
  try {
    //sign in for authorization
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    //get all hall admins and select the first one to track
    let designatedDonorsResponse = await badhanAxios.get(
      "/donors/designation",
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let sampleVolunteerID = designatedDonorsResponse.data.volunteerList[0]._id;

    // promote to super admin
    let superAdminPromotionResult = await badhanAxios.patch(
      "/admins/superadmin",
      {
        donorId: sampleVolunteerID,
        promoteFlag: true,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    // validate hall admin promotion result
    let superAdminPromotionValidation = validate(
      superAdminPromotionResult.data,
      patchAdminsSuperAdminSchema
    );

    expect(superAdminPromotionValidation.errors).toEqual([]);

    await badhanAxios.patch(
      "/admins/superadmin",
      {
        donorId: sampleVolunteerID,
        promoteFlag: false,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    //logout to remove token
    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
