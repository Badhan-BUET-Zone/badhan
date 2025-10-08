const { authedGet, authedPost, authedDelete } = require('../http');
const {
  postPublicContactsSchema,
  deletePublicContactsSchema,
  getPublicContactsSchema,
} = require('../schemas/publicContacts');

/**
 * Create a public contact
 */
async function createPublicContact({ donorId, bloodGroup, signInResponse }) {
  return authedPost('/publicContacts', { donorId, bloodGroup }, signInResponse, postPublicContactsSchema);
}

/**
 * Delete a public contact
 */
async function deletePublicContact({ donorId, contactId, signInResponse }) {
  return authedDelete(
    `/publicContacts?donorId=${donorId}&contactId=${contactId}`,
    signInResponse,
    deletePublicContactsSchema
  );
}

/**
 * Get all public contacts
 */
async function getPublicContacts(signInResponse) {
  return authedGet('/publicContacts', signInResponse, getPublicContactsSchema);
}

module.exports = {
  createPublicContact,
  deletePublicContact,
  getPublicContacts,
};

