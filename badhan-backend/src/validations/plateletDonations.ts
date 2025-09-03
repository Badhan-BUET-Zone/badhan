import { validate } from './index'
import { validateBODYDate, validateBODYDonorId } from './validateRequest/validateBody'
import { validateQUERYDonorId, validateQUERYDate, validateQUERYStartDate, validateQUERYEndDate } from './validateRequest/validateQuery'
import {NextFunction, Request, Response} from "express";

const validatePOSTPlateletDonations:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYDate
])

const validateDELETEPlateletDonations:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYDonorId,
  validateQUERYDate
])

const validateGETPlateletDonationsReport:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYStartDate,
  validateQUERYEndDate
])

export default {
  validatePOSTPlateletDonations,
  validateDELETEPlateletDonations,
  validateGETPlateletDonationsReport
}
