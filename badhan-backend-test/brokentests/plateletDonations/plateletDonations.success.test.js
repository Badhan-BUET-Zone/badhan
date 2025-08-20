const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { postPlateletDonationSchema, deletePlateletDonationSchema } = require("./schemas");

test("POST&DELETE/platelet-donations: success", async () => {
  try {
  //post/platelet-donation part

    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let plateletDonationDate = new Date().getTime();
    let plateletDonationCreationResponse = await badhanAxios.post(
      "/platelet-donations",
      {
        donorId: donorResponse.data.donor._id,
        date: plateletDonationDate,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationPlateletDonationResult = validate(
      plateletDonationCreationResponse.data,
      postPlateletDonationSchema
    );

    expect(validationPlateletDonationResult.errors).toEqual([]);

    // delete/platelet-donations part

    let plateletDonationDeletionResponse = await badhanAxios.delete(
      "/platelet-donations?donorId=" +
        donorResponse.data.donor._id +
        "&date=" +
        plateletDonationDate,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationPlateletDonationDeleteResult = validate(
      plateletDonationDeletionResponse.data,
      deletePlateletDonationSchema
    );
    expect(validationPlateletDonationDeleteResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
