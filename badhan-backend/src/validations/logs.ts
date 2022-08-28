import { validate } from './index'
import { validatePARAMDate, validatePARAMDonorId } from './validateRequest/validateParam'
import {NextFunction, Request, Response} from "express";

const validateGETLogsByDate:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validatePARAMDate
])

const validateGETLogsByDateAndDonor:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validatePARAMDonorId,
  validatePARAMDate
])

export default {
  validateGETLogsByDate,
  validateGETLogsByDateAndDonor
}
