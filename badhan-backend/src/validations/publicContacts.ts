import { validate } from './index'
import { validateQUERYPublicContactId, validateQUERYDonorId } from './validateRequest/validateQuery'
import { validateBODYDonorId, validateBODYPublicContactBloodGroup } from './validateRequest/validateBody'
import {NextFunction, Request, Response} from "express";

const validatePOSTPublicContact:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYDonorId,
  validateBODYPublicContactBloodGroup
])

const validateDELETEPublicContact:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYDonorId,
  validateQUERYPublicContactId
])

export default {
  validatePOSTPublicContact,
  validateDELETEPublicContact
}
