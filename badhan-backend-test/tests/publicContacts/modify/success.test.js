const env = require("../../../config");
const operations = require("../../lib/operations");
const { postPublicContactsSchema, deletePublicContactsSchema, getPublicContactsSchema } = require("../schemas");

test("POST&DELETE/publicContacts: success", async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorResponse = await operations.getMe(signInResponse);
  const contactCreationResponse = await operations.createPublicContact({ donorId: donorResponse.data.donor._id, bloodGroup: 2, signInResponse });
  await operations.getPublicContacts(signInResponse); // validates
  await operations.deletePublicContact({ donorId: donorResponse.data.donor._id, contactId: contactCreationResponse.data.publicContact._id, signInResponse });
  await operations.signOut(signInResponse);
});


