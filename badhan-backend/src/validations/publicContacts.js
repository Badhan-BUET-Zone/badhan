const { validate } = require('../validations')
const { validateQUERYPublicContactId, validateQUERYDonorId } = require('../validations/validateRequest/validateQuery')
const { validateBODYDonorId, validateBODYPublicContactBloodGroup } = require('../validations/validateRequest/validateBody')

const validatePOSTPublicContact = validate([
  validateBODYDonorId,
  validateBODYPublicContactBloodGroup
])

const validateDELETEPublicContact = validate([
  validateQUERYDonorId,
  validateQUERYPublicContactId
])

module.exports = {
  validatePOSTPublicContact,
  validateDELETEPublicContact
}
