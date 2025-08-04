const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const {
  postPublicContactsSchema,
  deletePublicContactsSchema,
  getPublicContactsSchema,
} = require("./schemas");

test("POST&DELETE/publicContacts: success", async () => {
  try {
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

    let validationContactResult = validate(
      contactCreationResponse.data,
      postPublicContactsSchema
    );

    expect(validationContactResult.errors).toEqual([]);

    let getContactResponse = await badhanAxios.get("/publicContacts");
    let getContactResponseValidationResult = validate(
      getContactResponse.data,
      getPublicContactsSchema
    );
    expect(getContactResponseValidationResult.errors).toEqual([]);

    // delete/donations part

    let contactDeletionResponse = await badhanAxios.delete(
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

    let validationResult = validate(
      contactDeletionResponse.data,
      deletePublicContactsSchema
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
