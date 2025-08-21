const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { postCallRecordsSchema, deleteCallRecordsSchema } = require("./schemas");

test("POST&DELETE/callrecords: success", async () => {
    //post/callrecords part

    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

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

    let validationRecordResult = validate(
      recordCreationResponse.data,
      postCallRecordsSchema
    );

    expect(validationRecordResult.errors).toEqual([]);

    // delete/donations part

    let donationDeletionResponse = await badhanAxios.delete(
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

    let validationResult = validate(
      donationDeletionResponse.data,
      deleteCallRecordsSchema
    );
    expect(validationResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
});
