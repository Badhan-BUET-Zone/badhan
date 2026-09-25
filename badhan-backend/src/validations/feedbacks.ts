import { validate } from './index'
import {
  validateBODYPhone,
  validateBODYStudentId,
  validateBODYQrHall,
  validateBODYType,
  validateBODYToken,
  validateBODYNoToken
} from './validateRequest/validateBody'
import { validateQUERYFeedbackId } from './validateRequest/validateQuery'
import { FEEDBACK_TYPES } from '../db/models/Feedback'
import { validateFeedbackJSON, IPayloadResult } from './feedbackPayload'
import { body, ValidationChain } from 'express-validator'
import { NextFunction, Request, Response } from 'express'

// The public identity check behind /#/donor. Both credentials, and nothing else: this route
// hands back a donor's own summary and no credential of any kind, so there is no hall to state
// and no duration to choose.
const validatePOSTDonorLookup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYPhone,
  validateBODYStudentId
])

// The registration-QR mint. One field, required. The route is authenticated outright, so the
// caller is known before this runs and the controller decides whether they may state THIS hall.
const validatePOSTRegistrationToken: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
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

// The credential rule is per-type, and it is a rule in both directions:
//
//   newDonor → a token is REQUIRED. It is the only thing authorising the submission, and the
//              hall it carries is the one the row lands in.
//   feedback → a token is FORBIDDEN. The phone and student id inside feedbackJSON are matched
//              against a donor record, and that record's hall is the row's. Rejecting a token
//              outright rather than ignoring one leaves exactly one way to file a message; a
//              silently-ignored credential is how a caller comes to believe it did something.
//
// `type` is read raw here because this runs alongside validateBODYType rather than after it: an
// unreadable type falls to the forbidding branch, so a body that names no type cannot smuggle a
// token past this chain. validateBODYType then answers for the type itself.
const validatePOSTFeedback: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> =
  async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const type: unknown = req.body === undefined || req.body === null ? undefined : req.body.type
    const tokenChain: ValidationChain = type === FEEDBACK_TYPES.NEW_DONOR ? validateBODYToken : validateBODYNoToken
    return validate([
      tokenChain,
      validateBODYType,
      validateBODYFeedbackJSON
    ])(req, res, next)
  }

const validateDELETEFeedback: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYFeedbackId
])

export default {
  validatePOSTDonorLookup,
  validatePOSTRegistrationToken,
  validatePOSTFeedback,
  validateDELETEFeedback
}
