const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { processError } = require("../fixtures/helpers");
const {
  postPublicContactsSchema,
  deletePublicContactsSchema,
  getPublicContactsSchema,
} = require("./schemas");

test("POST&DELETE/guest/publicContacts: guest", async () => {
  try {
    //post/callrecords part

    let contactCreationResponse = await badhanAxios.post(
      "/guest/publicContacts"
    );

    let validationContactResult = validate(
      contactCreationResponse.data,
      postPublicContactsSchema
    );

    expect(validationContactResult.errors).toEqual([]);

    let getContactResponse = await badhanAxios.get("/guest/publicContacts");
    let getContactResponseValidationResult = validate(
      getContactResponse.data,
      getPublicContactsSchema
    );
    expect(getContactResponseValidationResult.errors).toEqual([]);

    // delete/donations part

    let contactDeletionResponse = await badhanAxios.delete(
      "/guest/publicContacts?donorId=blahblah&contactId=" +
        contactCreationResponse.data.publicContact["_id"]
    );

    let validationResult = validate(
      contactDeletionResponse.data,
      deletePublicContactsSchema
    );
    expect(validationResult.errors).toEqual([]);
  } catch (e) {
    throw processError(e);
  }
});
