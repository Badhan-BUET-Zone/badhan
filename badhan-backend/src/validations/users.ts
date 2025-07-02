import { validate } from './index'
import { validateBODYPhone, validateBODYPassword } from './validateRequest/validateBody'
import { validatePARAMTokenId } from './validateRequest/validateParam'
import {NextFunction, Request, Response} from "express";
const validateLogin:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYPhone,
  validateBODYPassword
])

const validatePATCHPassword:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYPassword
])

const validatePOSTPasswordForgot:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYPhone
])

const validateDELETELogins:(req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validatePARAMTokenId
])

export default {
  validateLogin,
  validatePATCHPassword,
  validatePOSTPasswordForgot,
  validateDELETELogins
}
