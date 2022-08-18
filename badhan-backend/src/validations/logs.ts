// @ts-nocheck
/* tslint:disable */
const { validate } = require('../validations')
const { validatePARAMDate, validatePARAMDonorId } = require('../validations/validateRequest/validateParam')

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
