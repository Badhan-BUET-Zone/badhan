import { validate } from './index'
import { body, ValidationChain } from 'express-validator'
import { NextFunction, Request, Response } from 'express'
import { AGENT_CHAT_TITLE_MAX_LENGTH } from '../db/models/AgentChat'
import { MAX_USER_CONTENT_CHARS } from '../services/agent/constants'
import { REPORTED_TOOL_STATUSES } from '../services/agent/conversation'
import { validatePARAMDonorId } from './validateRequest/validateParam'

/**
 * Refuse any body key the route does not take, rather than letting it through.
 *
 * Not only tidiness: tsoa is configured with `throw-on-extras`, and its ValidateError reaches the
 * app's last-resort handler as a 500. A key the route does not know has to be a 400 here, before
 * tsoa ever sees it. Same allowed/unknown key shape as validations/messages.ts.
 */
const onlyBodyKeys = (allowed: string[]): ValidationChain => body()
  .custom((value: any): boolean => {
    if (value === undefined || value === null || typeof value !== 'object') {
      return true
    }
    const unknown: string[] = Object.keys(value).filter((k: string): boolean => !allowed.includes(k))
    if (unknown.length > 0) {
      throw new Error(`body contains unexpected keys: ${unknown.join(', ')}`)
    }
    return true
  })

const validateBODYAgentChatTitle: ValidationChain = body('title')
  .exists().withMessage('title is required')
  .isString().withMessage('title must be a string')
  .trim()
  .isLength({ min: 1, max: AGENT_CHAT_TITLE_MAX_LENGTH })
  .withMessage(`title must be between 1 and ${AGENT_CHAT_TITLE_MAX_LENGTH} characters`)

const validatePATCHAgentChat: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  onlyBodyKeys(['title']),
  validateBODYAgentChatTitle
])

// A member's message: what starts a chat, and what carries one on.
const validateBODYAgentContent: ValidationChain = body('content')
  .exists().withMessage('content is required')
  .isString().withMessage('content must be a string')
  .trim()
  .isLength({ min: 1, max: MAX_USER_CONTENT_CHARS })
  .withMessage(`content must be between 1 and ${MAX_USER_CONTENT_CHARS} characters`)

const validatePOSTAgentContent: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  onlyBodyKeys(['content']),
  validateBODYAgentContent
])

// `continue` takes no body at all.
const validatePOSTAgentContinue: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  onlyBodyKeys([])
])

/**
 * The browser's report of one tool call. `response` is deliberately not length-checked: the server
 * clips it to the display limit rather than refusing a result the API really did return. What does
 * bound it is the 1 MB body limit this one path has (app.ts).
 */
const validatePUTAgentToolCall: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  onlyBodyKeys(['status', 'httpStatus', 'durationMs', 'response', 'note']),
  body('status')
    .exists().withMessage('status is required')
    .isIn(REPORTED_TOOL_STATUSES).withMessage(`status must be one of ${REPORTED_TOOL_STATUSES.join(', ')}`),
  // A call that ran has an HTTP status; the others never reached a server that could give one.
  body('httpStatus')
    .if(body('status').equals('done'))
    .exists({ checkNull: true }).withMessage('httpStatus is required when status is done'),
  body('httpStatus')
    .optional({ nullable: true })
    .isInt({ min: 100, max: 599 }).withMessage('httpStatus must be an HTTP status code').toInt(),
  body('durationMs')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('durationMs must be a whole number of milliseconds, 0 or more').toInt(),
  body('response')
    .optional({ nullable: true })
    .custom((value: any): boolean => typeof value === 'string').withMessage('response must be the response body as a string'),
  body('note')
    .optional({ nullable: true })
    .custom((value: any): boolean => typeof value === 'string').withMessage('note must be a string')
])

// The review page's member column. A malformed donor id is a plain 400 here: these routes are for
// super admins, and there is nothing about another member's chats to hide from them.
const validateGETAgentReviewMemberChats: (req: Request, res: Response, next: NextFunction) => Promise<Response | void> = validate([
  validatePARAMDonorId
])

// No validator for `chatId`. A malformed id must answer 404 exactly like an id that does not
// exist, so the controller checks it, and a 400 here would tell a caller which ids are well formed.

export default {
  validatePATCHAgentChat,
  validatePOSTAgentContent,
  validatePOSTAgentContinue,
  validatePUTAgentToolCall,
  validateGETAgentReviewMemberChats
}
