// @ts-nocheck
/* tslint:disable */
const { validate } = require('../validations')
const { validateBODYDate, validateBODYDonorId } = require('../validations/validateRequest/validateBody')
const { validateQUERYDonorId, validateQUERYDate } = require('../validations/validateRequest/validateQuery')

const validatePOSTDonations = validate([
  validateBODYDonorId,
  validateBODYDate
])

const validateDELETEDonations = validate([
  validateQUERYDonorId,
  validateQUERYDate
])

module.exports = {
  validatePOSTDonations,
  validateDELETEDonations
}
