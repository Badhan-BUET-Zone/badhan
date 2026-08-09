import { validate } from './index'
import {
  validateBODYPhone,
  validateBODYStudentId,
  validateBODYDurationMinutes,
  validateBODYQrHall,
  validateBODYType,
  validateBODYToken
} from './validateRequest/validateBody'
import { validateQUERYFeedbackId } from './validateRequest/validateQuery'
import { validateFeedbackJSON, IPayloadResult } from './feedbackPayload'
import { body, ValidationChain } from 'express-validator'
import { NextFunction, Request, Response } from 'express'

// Both credentials are required on every call. `hall` is optional and is the whole branch:
// omit it and the token carries the matched donor's own hall, exactly as it always has;
// state it and the request must identify a caller who is allowed to state that hall
// (handleAuthenticationIfHallStated, then the designation check in the controller).
//
// This chain runs BEFORE that middleware, which is what makes a malformed hall a 400 rather
// than a 401.
const validatePOSTToken: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYPhone,
  validateBODYStudentId,
  validateBODYDurationMinutes,
  validateBODYQrHall
])

// feedbackJSON is nested and its rules are per-type, so the work happens in
// validations/feedbackPayload.ts. The function there is pure, which is what lets the
// validator call it to decide and the sanitiser call it again for the normalised value —
// the escaping and the defaults therefore reach the handler already applied.
const validateBODYFeedbackJSON: ValidationChain = body('feedbackJSON')
  .exists().withMessage('feedbackJSON is required')
  .custom((value: any, { req }: any): boolean => {
    const result: IPayloadResult = validateFeedbackJSON(req.body.type, value)
    if (!result.ok) {
      throw new Error(result.message)
    }
    return true
  })
  .customSanitizer((value: any, { req }: any): any => {
    const result: IPayloadResult = validateFeedbackJSON(req.body.type, value)
    return result.ok ? result.normalised : value
  })

const validatePOSTFeedback: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYToken,
  validateBODYType,
  validateBODYFeedbackJSON
])

const validateDELETEFeedback: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYFeedbackId
])

export default {
  validatePOSTToken,
  validatePOSTFeedback,
  validateDELETEFeedback
}
