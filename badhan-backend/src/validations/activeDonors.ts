// @ts-nocheck
// tslint:disable
import { validate } from './index'
import { validatePARAMDonorId } from './validateRequest/validateParam'
import { validateBODYDonorId } from './validateRequest/validateBody'
import {
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
} from './validateRequest/validateQuery'

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

export default {
  validatePOSTActiveDonors,
  validateDELETEActiveDonors,
  validateGETActiveDonors
}
