import { validate } from './index'
import { validateBODYDate, validateBODYDonorId } from './validateRequest/validateBody'
import { validateQUERYDonorId, validateQUERYDate } from './validateRequest/validateQuery'
import {NextFunction, Request, Response} from "express";

const validatePOSTDonations:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYDate
])

const validateDELETEDonations:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYDonorId,
  validateQUERYDate
])

export default {
  validatePOSTDonations,
  validateDELETEDonations
}
