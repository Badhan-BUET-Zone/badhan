const { validate } = require('../validations')
const { validatePARAMDate, validatePARAMDonorId } = require('../validations/validateRequest/validateParam')

const validateGETLogsByDate = validate([
  validatePARAMDate
])

const validateGETLogsByDateAndDonor = validate([
  validatePARAMDonorId,
  validatePARAMDate
])

module.exports = {
  validateGETLogsByDate,
  validateGETLogsByDateAndDonor
}
