const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { postDonationSchema, deleteDonationSchema } = require("./schemas");

test("POST&DELETE/donations: success", async () => {
  try {
    //post/donation part

    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let donationDate = new Date().getTime();
    let donationCreationResponse = await badhanAxios.post(
      "/donations",
      {
        donorId: donorResponse.data.donor._id,
        date: donationDate,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationDonationResult = validate(
      donationCreationResponse.data,
      postDonationSchema
    );

    expect(validationDonationResult.errors).toEqual([]);

    // delete/donations part

    let donationDeletionResponse = await badhanAxios.delete(
      "/donations?donorId=" +
        donorResponse.data.donor._id +
        "&date=" +
        donationDate,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationResult = validate(
      donationDeletionResponse.data,
      deleteDonationSchema
    );
    expect(validationResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
