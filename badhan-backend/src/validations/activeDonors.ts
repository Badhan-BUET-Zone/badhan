// @ts-nocheck
/* tslint:disable */
const { validate } = require('../validations')
const { validatePARAMDonorId } = require('./validateRequest/validateParam')
const { validateBODYDonorId } = require('./validateRequest/validateBody')
const {
  validateQUERYBloodGroup,
  validateQUERYHall,
  validateQUERYBatch,
  validateQUERYName,
  validateQUERYAddress,
  validateQUERYIsAvailable,
  validateQEURYIsNotAvailable,
  validateQUERYAvailableToAll,
  validateQUERYMarkedByMe,
  validateQUERYAvailableToAllOrHall
} = require('../validations/validateRequest/validateQuery')

const validatePOSTActiveDonors = validate([
  validateBODYDonorId
])

const validateDELETEActiveDonors = validate([
  validatePARAMDonorId
])
const validateGETActiveDonors = validate([
  validateQUERYBloodGroup,
  validateQUERYHall,
  validateQUERYBatch,
  validateQUERYName,
  validateQUERYAddress,
  validateQUERYIsAvailable,
  validateQEURYIsNotAvailable,
  validateQUERYAvailableToAll,
  validateQUERYMarkedByMe,
  validateQUERYAvailableToAllOrHall
])

module.exports = {
  validatePOSTActiveDonors,
  validateDELETEActiveDonors,
  validateGETActiveDonors
}
