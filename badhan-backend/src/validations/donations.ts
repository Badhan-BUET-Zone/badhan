import { validate } from './index'
import { validateBODYDate, validateBODYDonorId } from './validateRequest/validateBody'
import { validateQUERYDonorId, validateQUERYDate, validateQUERYStartDate, validateQUERYEndDate, validateQUERYBloodGroup, validateQUERYHallOrAny } from './validateRequest/validateQuery'
import {NextFunction, Request, Response} from "express";

const validatePOSTDonations:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYDate
])

const validateDELETEDonations:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYDonorId,
  validateQUERYDate
])

const validateGETDonationsReport:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYStartDate,
  validateQUERYEndDate
])

const validateGETDonationsReportDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYStartDate,
  validateQUERYEndDate,
  validateQUERYBloodGroup,
  validateQUERYHallOrAny
])

export default {
  validatePOSTDonations,
  validateDELETEDonations,
  validateGETDonationsReport,
  validateGETDonationsReportDonors
}
