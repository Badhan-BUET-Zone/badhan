// @ts-nocheck
// tslint:disable
import { validate } from './index'
import { validateBODYDate, validateBODYDonorId } from './validateRequest/validateBody'
import { validateQUERYDonorId, validateQUERYDate } from './validateRequest/validateQuery'

const validatePOSTDonations = validate([
  validateBODYDonorId,
  validateBODYDate
])

const validateDELETEDonations = validate([
  validateQUERYDonorId,
  validateQUERYDate
])

export default {
  validatePOSTDonations,
  validateDELETEDonations
}
