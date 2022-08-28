import { validate } from './index'
import { validateBODYDonorId } from './validateRequest/validateBody'
import { validateQUERYDonorId, validateQUERYCallRecordId } from './validateRequest/validateQuery'
import {NextFunction, Request, Response} from "express";

const validatePOSTCallRecords:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId
])

const validateDELETECallRecords:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYDonorId,
  validateQUERYCallRecordId
])

export default {
  validatePOSTCallRecords,
  validateDELETECallRecords
}
