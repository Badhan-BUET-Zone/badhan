// @ts-nocheck
// tslint:disable
import { validate } from './index'
import { validateQUERYPublicContactId, validateQUERYDonorId } from './validateRequest/validateQuery'
import { validateBODYDonorId, validateBODYPublicContactBloodGroup } from './validateRequest/validateBody'

const validatePOSTPublicContact = validate([
  validateBODYDonorId,
  validateBODYPublicContactBloodGroup
])

const validateDELETEPublicContact = validate([
  validateQUERYDonorId,
  validateQUERYPublicContactId
])

export default {
  validatePOSTPublicContact,
  validateDELETEPublicContact
}
