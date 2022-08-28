// @ts-nocheck
// tslint:disable
import { validate } from './index'
import { validatePARAMDate, validatePARAMDonorId } from './validateRequest/validateParam'

const validateGETLogsByDate = validate([
  validatePARAMDate
])

const validateGETLogsByDateAndDonor = validate([
  validatePARAMDonorId,
  validatePARAMDate
])

export default {
  validateGETLogsByDate,
  validateGETLogsByDateAndDonor
}
