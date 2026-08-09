import jwt, { JwtPayload } from 'jsonwebtoken'
import dotenv from '../dotenv'
import { HALLS_INDEX, HALL_ANY, HALL_INDICES_ALLOWED_FOR_DONOR } from '../constants'

/**
 * The one token the public side of the feedback feature uses.
 *
 * The payload is exactly `{ hall, exp }`. It carries no phone, no student id, no name
 * and no id, and that is a privacy decision rather than an economy: a JWT is *signed,
 * not encrypted*, so anyone holding the token can read every claim, and a registration
 * token is printed into a QR code that a room full of students scans. A hall number is
 * not worth protecting; the phone number of whoever generated the code is.
 *
 * Adding a claim here publishes it. Read that paragraph again before doing so.
 *
 * Nothing is stored and nothing can be revoked: a leaked token stays live until it
 * expires, which is why the ceiling is 24 hours.
 *
 * `hall` may also be HALL_ANY, which is NOT a hall: it is the claim an "All Halls"
 * registration code carries, and it means "the submitter names the hall". Nothing in this
 * module treats it specially — it is simply a legal value here, and the submit route is
 * what resolves it into a real hall or refuses. It never reaches a stored row.
 */

export const FEEDBACK_TOKEN_DEFAULT_MINUTES: number = 15
export const FEEDBACK_TOKEN_MAX_MINUTES: number = 1440 // 24 hours

const ALLOWED_TOKEN_HALLS: number[] = [...HALL_INDICES_ALLOWED_FOR_DONOR, HALLS_INDEX.ATTACHED, HALL_ANY]

export interface IFeedbackTokenValid {
  valid: true
  hall: number
  exp: number
}

export interface IFeedbackTokenInvalid {
  valid: false
  reason: 'expired' | 'invalid'
}

export type FeedbackTokenVerification = IFeedbackTokenValid | IFeedbackTokenInvalid

const clampDurationMinutes = (durationMinutes?: number): number => {
  // The default and the ceiling live here rather than at the route, because they are
  // properties of the token and not of one endpoint that happens to mint it today. The
  // route validates too; this is what makes the ceiling hold regardless.
  if (durationMinutes === undefined || durationMinutes === null || !Number.isFinite(durationMinutes)) {
    return FEEDBACK_TOKEN_DEFAULT_MINUTES
  }
  const whole: number = Math.floor(durationMinutes)
  return Math.min(Math.max(whole, 1), FEEDBACK_TOKEN_MAX_MINUTES)
}

export const mintFeedbackToken = (hall: number, durationMinutes?: number): { token: string, expiresAt: number } => {
  const minutes: number = clampDurationMinutes(durationMinutes)

  // `expiresIn` writes the `exp` claim in seconds, so jwt.verify enforces expiry and
  // nothing in the app compares clocks by hand.
  //
  // `noTimestamp` drops the `iat` claim jsonwebtoken would otherwise add. Nothing reads
  // it — expiry is enforced from `exp` alone — and every claim omitted is characters off
  // a QR code that has to scan from the back of a room. It keeps the payload exactly
  // `{ hall, exp }`.
  const token: string = jwt.sign(
    { hall },
    dotenv.JWT_SECRET,
    { expiresIn: `${minutes}m`, noTimestamp: true }
  ).toString()

  const decoded: JwtPayload = jwt.decode(token) as JwtPayload
  return { token, expiresAt: decoded.exp! * 1000 }
}

export const verifyFeedbackToken = (token: string): FeedbackTokenVerification => {
  let payload: JwtPayload
  try {
    payload = jwt.verify(token, dotenv.JWT_SECRET) as JwtPayload
  } catch (e) {
    // Distinguished so the public pages can say "this QR code has expired", which is
    // actionable, rather than "this link is not valid", which is not.
    if (e instanceof jwt.TokenExpiredError) {
      return { valid: false, reason: 'expired' }
    }
    return { valid: false, reason: 'invalid' }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // THIS SHAPE CHECK IS THE ENTIRE SEPARATION FROM SESSION TOKENS.
  //
  // Feedback tokens and session tokens are both signed with dotenv.JWT_SECRET, so a
  // valid signature proves nothing about which kind this is. A session payload is
  // `{ _id, access: 'auth' }` and has no `hall`; a feedback payload is `{ hall, exp }`
  // and has neither `_id` nor `access`. Requiring a valid hall and rejecting those two
  // keys is what stops a stolen session token being used to submit feedback.
  //
  // This works only while the two payloads stay disjoint. If a session token ever gains
  // a `hall` claim, this check silently stops discriminating and an explicit claim —
  // e.g. `purpose: 'feedback'` — has to come back. Do not weaken it without deciding
  // that question again.
  // ─────────────────────────────────────────────────────────────────────────────
  if (payload === null || typeof payload !== 'object') {
    return { valid: false, reason: 'invalid' }
  }
  if ('_id' in payload || 'access' in payload) {
    return { valid: false, reason: 'invalid' }
  }
  if (typeof payload.hall !== 'number' || !ALLOWED_TOKEN_HALLS.includes(payload.hall)) {
    return { valid: false, reason: 'invalid' }
  }
  if (typeof payload.exp !== 'number') {
    return { valid: false, reason: 'invalid' }
  }

  return { valid: true, hall: payload.hall, exp: payload.exp }
}
