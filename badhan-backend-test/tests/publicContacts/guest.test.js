const operations = require("../operations");
const { postPublicContactsSchema, deletePublicContactsSchema, getPublicContactsSchema } = require("./schemas");

test("POST&DELETE/guest/publicContacts: guest", async () => {
  const creation = await operations.guestPost('/guest/publicContacts', {}, postPublicContactsSchema);
  await operations.guestGet('/guest/publicContacts', getPublicContactsSchema);
  await operations.guestDelete(`/guest/publicContacts?donorId=blahblah&contactId=${creation.data.publicContact._id}`, deletePublicContactsSchema);
});
