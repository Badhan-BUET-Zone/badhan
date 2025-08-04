const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { donorsSchema } = require("./schemas");

test("GET/donors: success", async () => {
  try {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let newDonationResult = await badhanAxios.post(
      "/donations",
      {
        donorId: donorResponse.data.donor._id,
        date: 1611100800000,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );
    let recordCreationResponse = await badhanAxios.post(
      "/callrecords",
      {
        donorId: donorResponse.data.donor._id,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );
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

    //clean up
    await badhanAxios.delete(
      "/donations?donorId=" +
        donorResponse.data.donor._id +
        "&date=" +
        1611100800000,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );
    await badhanAxios.delete(
      "/callrecords?donorId=" +
        donorResponse.data.donor._id +
        "&callRecordId=" +
        recordCreationResponse.data.callRecord["_id"],
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    await badhanAxios.delete(
      "/publicContacts?donorId=" +
        donorResponse.data.donor._id +
        "&contactId=" +
        contactCreationResponse.data.publicContact["_id"],
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
