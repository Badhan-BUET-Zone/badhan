import jwt, { JwtPayload } from 'jsonwebtoken'
import dotenv from '../dotenv'
import { HALLS_INDEX, HALL_ANY, HALL_INDICES_ALLOWED_FOR_DONOR } from '../constants'

/**
 * The one token left in the feedback feature: the credential behind a registration QR code.
 *
 * The payload is exactly `{ hall }`. It carries no phone, no student id, no name, no id and
 * NO EXPIRY, and the absence of identity is a privacy decision rather than an economy: a JWT
 * is *signed, not encrypted*, so anyone holding the token can read every claim, and a
 * registration token is printed into a QR code that a room full of students scans. A hall
 * number is not worth protecting; the phone number of whoever generated the code is.
 *
 * Adding a claim here publishes it. Read that paragraph again before doing so.
 *
 * THE TOKEN NEVER EXPIRES AND CANNOT BE REVOKED. Nothing is stored, so there is nothing to
 * delete; there is no expiry, so waiting does not help. A leaked token is a permanent door
 * into one hall's feedback queue, and the only remedies are off-screen ones — take the sheet
 * down, stop circulating the link. The generator panel, the printed sheet and the manual all
 * say this in those words. If that ever becomes unacceptable, the fix is a revocable claim
 * (e.g. `{ hall, v }` against a stored per-hall version), which is a plan of its own.
 *
 * Messages from donors no longer involve a token at all: `POST /feedbacks` with
 * `type: 'feedback'` takes a phone and a student id and matches them against a donor record.
 *
 * `hall` may also be HALL_ANY, which is NOT a hall: it is the claim an "All Halls"
 * registration code carries, and it means "the submitter names the hall". Nothing in this
 * module treats it specially — it is simply a legal value here, and the submit route is
 * what resolves it into a real hall or refuses. It never reaches a stored row.
 */

const ALLOWED_TOKEN_HALLS: number[] = [...HALL_INDICES_ALLOWED_FOR_DONOR, HALLS_INDEX.ATTACHED, HALL_ANY]

export interface IFeedbackTokenValid {
  valid: true
  hall: number
}

export interface IFeedbackTokenInvalid {
  valid: false
  reason: 'expired' | 'invalid'
}

export type FeedbackTokenVerification = IFeedbackTokenValid | IFeedbackTokenInvalid

export const mintFeedbackToken = (hall: number): { token: string } => {
  // No `expiresIn`, so no `exp` claim and jwt.verify has nothing to enforce: the token is
  // valid for as long as JWT_SECRET is.
  //
  // `noTimestamp` drops the `iat` claim jsonwebtoken would otherwise add. Nothing reads it,
  // and every claim omitted is characters off a QR code that has to scan from the back of a
  // room. Together they keep the payload exactly `{ hall }`.
  const token: string = jwt.sign(
    { hall },
    dotenv.JWT_SECRET,
    { noTimestamp: true }
  ).toString()

  return { token }
}

export const verifyFeedbackToken = (token: string): FeedbackTokenVerification => {
  let payload: JwtPayload
  try {
    payload = jwt.verify(token, dotenv.JWT_SECRET) as JwtPayload
  } catch (e) {
    // The `expired` branch is kept although nothing mints an expiring token any more: every
    // code printed before this release carries an `exp`, jwt.verify still refuses those, and
    // "this code has expired, ask a volunteer for a new one" is the actionable sentence for
    // whoever is standing in front of that sheet. Delete this branch only once no such code
    // can still be on a wall.
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
  // `{ _id, access: 'auth' }` and has no `hall`; a feedback payload is `{ hall }` and has
  // neither `_id` nor `access`. Requiring a valid hall and rejecting those two keys is what
  // stops a stolen session token being used to submit a registration.
  //
  // This works only while the two payloads stay disjoint. If a session token ever gains
  // a `hall` claim, this check silently stops discriminating and an explicit claim —
  // e.g. `purpose: 'feedback'` — has to come back. Do not weaken it without deciding
  // that question again. There is no longer an `exp` check to fall back on.
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

  return { valid: true, hall: payload.hall }
}
