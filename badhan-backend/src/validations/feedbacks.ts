import { validate } from './index'
import {
  validateBODYPhone,
  validateBODYStudentId,
  validateBODYDurationMinutes,
  validateBODYType,
  validateBODYToken
} from './validateRequest/validateBody'
import { validateQUERYFeedbackId } from './validateRequest/validateQuery'
import { validateFeedbackJSON, IPayloadResult } from './feedbackPayload'
import { body, ValidationChain } from 'express-validator'
import { NextFunction, Request, Response } from 'express'

// Both credentials are required. There is deliberately no `hall` here: the token's hall
// is read from the matched donor record, never from the request, so there is nothing for
// a caller to state and nothing to cross-check.
const validatePOSTToken: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYPhone,
  validateBODYStudentId,
  validateBODYDurationMinutes
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
