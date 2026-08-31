import { validate } from './index'
import {
  validateQUERYAfterOptional,
  validateQUERYBeforeOptional,
  validateQUERYBeforeIdOptional,
  validateQUERYLimitOptional,
  validateQUERYMessageId
} from './validateRequest/validateQuery'
import { validateBODYMessageText } from './validateRequest/validateBody'
import { body, query, ValidationChain } from 'express-validator'
import { NextFunction, Request, Response } from 'express'

/**
 * The cross-field rules of the three reads.
 *
 *   no cursor                 → the newest page          (first open)
 *   ?after=<ms>               → everything strictly newer (catch-up / fetch button / post-send)
 *   ?before=<ms>&beforeId=<id> → the page older than one message (scroll up)
 *
 * These cannot be expressed on a single field, so they are stated once here, hung off
 * `after` and `before` respectively. Both are `.optional()` chains, so each custom only
 * runs when its own field is present — which is why the pairing rule needs to be checked
 * from BOTH ends: a lone `beforeId` is caught by the second chain, a lone `before` by the
 * first clause of it.
 */
const validateQUERYCursorExclusivity: ValidationChain = query('after')
  .optional()
  .custom((_value: any, { req }: any): boolean => {
    if (req.query.before !== undefined || req.query.beforeId !== undefined) {
      throw new Error('after cannot be combined with before or beforeId')
    }
    return true
  })

// The two halves of the older cursor travel together or not at all. A lone `before` names a
// millisecond rather than a message, and a boundary landing inside a shared millisecond then
// skips a message forever — so it is refused rather than silently degraded.
const validateQUERYBeforePairing: ValidationChain = query('beforeId')
  .custom((_value: any, { req }: any): boolean => {
    const hasBefore: boolean = req.query.before !== undefined
    const hasBeforeId: boolean = req.query.beforeId !== undefined
    if (hasBefore !== hasBeforeId) {
      throw new Error('before and beforeId must be sent together')
    }
    return true
  })

const validateGETMessages: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYAfterOptional,
  validateQUERYBeforeOptional,
  validateQUERYBeforeIdOptional,
  validateQUERYLimitOptional,
  validateQUERYCursorExclusivity,
  validateQUERYBeforePairing
])

/**
 * `text` and nothing else.
 *
 * `senderId` and `date` are the server's to decide — the sender comes from the token and the
 * send time from the schema default — so a body that states either is rejected outright
 * rather than silently ignored. Silently ignoring it is how a client ends up believing it can
 * post as somebody else, or backdate a message into a page the reader has already scrolled
 * past. Same allowed/unknown key shape as validations/feedbackPayload.ts.
 */
const validateBODYNoUnexpectedMessageKeys: ValidationChain = body()
  .custom((value: any): boolean => {
    if (value === undefined || value === null || typeof value !== 'object') {
      return true
    }
    const allowed: string[] = ['text']
    const unknown: string[] = Object.keys(value).filter((k: string): boolean => !allowed.includes(k))
    if (unknown.length > 0) {
      throw new Error(`body contains unexpected keys: ${unknown.join(', ')}`)
    }
    return true
  })

const validatePOSTMessage: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateBODYNoUnexpectedMessageKeys,
  validateBODYMessageText
])

const validateDELETEMessage: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validateQUERYMessageId
])

export default {
  validateGETMessages,
  validatePOSTMessage,
  validateDELETEMessage
}
