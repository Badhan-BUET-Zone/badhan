// @ts-nocheck
// tslint:disable
import { validate } from './index'
import { validateBODYDonorId } from './validateRequest/validateBody'
import { validateQUERYDonorId, validateQUERYCallRecordId } from './validateRequest/validateQuery'

const validatePOSTCallRecords = validate([
  validateBODYDonorId
])

const validateDELETECallRecords = validate([
  validateQUERYDonorId,
  validateQUERYCallRecordId
])

export default {
  validatePOSTCallRecords,
  validateDELETECallRecords
}
