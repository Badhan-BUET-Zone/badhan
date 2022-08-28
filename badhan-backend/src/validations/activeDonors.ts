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

import {NextFunction, Request, Response} from "express";

const validatePOSTActiveDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId
])

const validateDELETEActiveDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validatePARAMDonorId
])
const validateGETActiveDonors:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
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
