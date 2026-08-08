import {
  BLOOD_GROUP_INDICES,
  DEPARTMENT_CODES_FOR_VALIDATION,
  HALL_INDICES_ALLOWED_FOR_DONOR,
  year2000TimeStamp
} from '../constants'
import { FEEDBACK_TYPES, FEEDBACK_JSON_MAX_BYTES } from '../db/models/Feedback'

// `validator` ships no type declarations and the project has no @types/validator.
// Reaching for the library rather than reimplementing its escape() matters: this must
// stay byte-identical to what express-validator's .escape() does on the donor-creation
// route, and a hand-rolled copy would diverge silently the day that library changed.
// tslint:disable-next-line:no-var-requires
const validatorLib: { escape: (input: string) => string } = require('validator')

/**
 * The strict edge in front of a deliberately flexible column.
 *
 * `feedbackJSON` is `Schema.Types.Mixed`, so the database enforces nothing about it and
 * these functions are the only description of what may be stored. They are plain
 * functions rather than express-validator chains because the shape is nested and
 * per-type; the chain in `validations/feedbacks.ts` calls in here.
 *
 * The rules deliberately mirror the ones the real donor-creation route applies, so that
 * a `newDonor` submission which passes here is one a volunteer can actually save later.
 */

export interface IPayloadResult {
  ok: boolean
  message: string
  normalised?: any
}

const fail = (message: string): IPayloadResult => ({ ok: false, message })

const isPlainObject = (value: any): boolean =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const checkPhone = (value: any, field: string): string | null => {
  if (!Number.isInteger(value) || value < 8801000000000 || value > 8801999999999) {
    return `${field} must be an integer between 8801000000000 and 8801999999999`
  }
  return null
}

const checkStudentId = (value: any, field: string): string | null => {
  if (typeof value !== 'string' || !/^\d{7}$/.test(value)) {
    return `${field} must be of 7 digits`
  }
  if (!DEPARTMENT_CODES_FOR_VALIDATION.includes(parseInt(value.substr(2, 2), 10))) {
    return 'Please input a valid department number'
  }
  const inputYear: number = parseInt('20' + value.substr(0, 2), 10)
  if (inputYear > new Date().getFullYear() || inputYear < 2001) {
    return 'Please input a valid batch between 01 and last two digits of current year'
  }
  return null
}

// Matches express-validator's `.escape().trim()`, which is what the donor-creation route
// applies to these fields. See the escaping note in validateNewDonorPayload.
const escapeTrim = (value: string): string => validatorLib.escape(String(value)).trim()

const checkText = (value: any, field: string, min: number, max: number): string | null => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    return `${field} length must be between ${min} and ${max}`
  }
  return null
}

const checkCount = (value: any, field: string): string | null => {
  // The same bounds validateBODYDonationCount applies to extraDonationCount. The key
  // names differ — this payload follows NewPersonCard's keysExpected — so match the
  // bounds, not the names.
  if (!Number.isInteger(value) || value < 0 || value >= 99) {
    return `${field} must be between 0 and 98`
  }
  return null
}

const checkDonationDate = (value: any, field: string, count: number): string | null => {
  if (count === 0) {
    if (value !== null && value !== undefined) {
      return `${field} must be null when the matching count is 0`
    }
    return null
  }
  if (!Number.isInteger(value) || value < year2000TimeStamp) {
    return `${field} must be a timestamp after the year 2000`
  }
  if (value > Date.now()) {
    return `${field} cannot be in the future`
  }
  return null
}

const checkSize = (payload: any): string | null => {
  if (Buffer.byteLength(JSON.stringify(payload) ?? '', 'utf8') > FEEDBACK_JSON_MAX_BYTES) {
    return `feedbackJSON must serialise to at most ${FEEDBACK_JSON_MAX_BYTES} bytes`
  }
  return null
}

/**
 * type: 'feedback' — exactly three keys.
 *
 * `text` is deliberately NOT escaped, unlike the neighbouring newDonor fields and unlike
 * validateBODYComment. It exists to be read verbatim by a human, and `.escape()` would
 * turn "I can't donate" into "I can&#x27;t donate" on a volunteer's screen. Safety is
 * enforced at render time instead: the frontend renders it with Vue text interpolation
 * only, never v-html and never VueMarkdown.
 */
const validateFeedbackPayload = (payload: any): IPayloadResult => {
  const allowed: string[] = ['phone', 'studentId', 'text']
  const unknown: string[] = Object.keys(payload).filter((k: string): boolean => !allowed.includes(k))
  if (unknown.length > 0) {
    return fail(`feedbackJSON contains unexpected keys: ${unknown.join(', ')}`)
  }

  const phoneError: string | null = checkPhone(payload.phone, 'phone')
  if (phoneError) { return fail(phoneError) }

  const studentIdError: string | null = checkStudentId(payload.studentId, 'studentId')
  if (studentIdError) { return fail(studentIdError) }

  const textError: string | null = checkText(payload.text, 'text', 1, 500)
  if (textError) { return fail(textError) }

  const normalised: any = {
    phone: payload.phone,
    studentId: payload.studentId,
    text: String(payload.text).trim()
  }

  const sizeError: string | null = checkSize(normalised)
  if (sizeError) { return fail(sizeError) }

  return { ok: true, message: 'OK', normalised }
}

/**
 * type: 'newDonor' — exactly NewPersonCard's `keysExpected`, minus `key`.
 *
 * KEEP THIS LIST IN STEP with
 * badhan-frontend/src/views/SingleDonorCreation/components/NewPersonCard.vue, because
 * the Feedback page's prefill hands this object straight to that component.
 *
 * `name`, `comment`, `address` and `roomNumber` ARE escaped here, exactly once, because
 * they are destined to become a donor through the creation route, which escapes them
 * itself. Storing them raw would produce a donor record differing from a typed one;
 * storing them escaped and handing them on unchanged would escape them twice. The other
 * half of that pair lives in the frontend, which decodes entities once before display
 * and once before hydrating the creation draft. Either half alone is a bug.
 */
const validateNewDonorPayload = (payload: any): IPayloadResult => {
  const required: string[] = ['name', 'phone', 'studentId', 'bloodGroup', 'hall']
  const optional: string[] = [
    'address', 'roomNumber', 'comment',
    'donationCount', 'lastDonation', 'plateletDonationCount', 'lastPlateletDonation',
    'availableToAll'
  ]
  const allowed: string[] = [...required, ...optional]

  const unknown: string[] = Object.keys(payload).filter((k: string): boolean => !allowed.includes(k))
  if (unknown.length > 0) {
    return fail(`feedbackJSON contains unexpected keys: ${unknown.join(', ')}`)
  }
  const missing: string[] = required.filter((k: string): boolean => payload[k] === undefined || payload[k] === null)
  if (missing.length > 0) {
    return fail(`feedbackJSON is missing required keys: ${missing.join(', ')}`)
  }

  const nameError: string | null = checkText(payload.name, 'name', 3, 100)
  if (nameError) { return fail(nameError) }

  const phoneError: string | null = checkPhone(payload.phone, 'phone')
  if (phoneError) { return fail(phoneError) }

  const studentIdError: string | null = checkStudentId(payload.studentId, 'studentId')
  if (studentIdError) { return fail(studentIdError) }

  if (!Number.isInteger(payload.bloodGroup) || !BLOOD_GROUP_INDICES.includes(payload.bloodGroup)) {
    return fail('Please input valid blood group from 0 to 7')
  }
  if (!Number.isInteger(payload.hall) || !HALL_INDICES_ALLOWED_FOR_DONOR.includes(payload.hall)) {
    return fail('Please input an allowed hall number')
  }

  const address: string = payload.address === undefined || payload.address === null || payload.address === '' ? '(Unknown)' : payload.address
  const roomNumber: string = payload.roomNumber === undefined || payload.roomNumber === null || payload.roomNumber === '' ? '(Unknown)' : payload.roomNumber
  const comment: string = payload.comment === undefined || payload.comment === null || payload.comment === '' ? '(Unknown)' : payload.comment

  const addressError: string | null = checkText(address, 'address', 2, 500)
  if (addressError) { return fail(addressError) }
  const roomError: string | null = checkText(roomNumber, 'roomNumber', 2, 500)
  if (roomError) { return fail(roomError) }
  const commentError: string | null = checkText(comment, 'comment', 2, 500)
  if (commentError) { return fail(commentError) }

  const donationCount: number = payload.donationCount === undefined || payload.donationCount === null ? 0 : payload.donationCount
  const plateletDonationCount: number = payload.plateletDonationCount === undefined || payload.plateletDonationCount === null ? 0 : payload.plateletDonationCount

  const donationCountError: string | null = checkCount(donationCount, 'donationCount')
  if (donationCountError) { return fail(donationCountError) }
  const plateletCountError: string | null = checkCount(plateletDonationCount, 'plateletDonationCount')
  if (plateletCountError) { return fail(plateletCountError) }

  const lastDonation: number | null = payload.lastDonation === undefined ? null : payload.lastDonation
  const lastPlateletDonation: number | null = payload.lastPlateletDonation === undefined ? null : payload.lastPlateletDonation

  const lastDonationError: string | null = checkDonationDate(lastDonation, 'lastDonation', donationCount)
  if (lastDonationError) { return fail(lastDonationError) }
  const lastPlateletError: string | null = checkDonationDate(lastPlateletDonation, 'lastPlateletDonation', plateletDonationCount)
  if (lastPlateletError) { return fail(lastPlateletError) }

  if (payload.availableToAll !== undefined && payload.availableToAll !== null && typeof payload.availableToAll !== 'boolean') {
    return fail('availableToAll must be boolean')
  }

  const normalised: any = {
    name: escapeTrim(payload.name),
    phone: payload.phone,
    studentId: payload.studentId,
    bloodGroup: payload.bloodGroup,
    hall: payload.hall,
    address: escapeTrim(address),
    roomNumber: escapeTrim(roomNumber),
    comment: escapeTrim(comment),
    donationCount,
    lastDonation,
    plateletDonationCount,
    lastPlateletDonation,
    availableToAll: payload.availableToAll === undefined || payload.availableToAll === null ? false : payload.availableToAll
  }

  // Checked after escaping, because escaping expands: a payload that fitted before could
  // exceed the cap afterwards, and the schema's own guard would then fail the insert as a
  // 500 rather than a 400.
  const sizeError: string | null = checkSize(normalised)
  if (sizeError) { return fail(sizeError) }

  return { ok: true, message: 'OK', normalised }
}

/**
 * The one entry point. Pure and side-effect free, so the validator chain can call it to
 * decide and the sanitiser can call it again to get the normalised value.
 */
export const validateFeedbackJSON = (type: any, payload: any): IPayloadResult => {
  if (!isPlainObject(payload)) {
    return fail('feedbackJSON must be an object')
  }
  if (type === FEEDBACK_TYPES.FEEDBACK) {
    return validateFeedbackPayload(payload)
  }
  if (type === FEEDBACK_TYPES.NEW_DONOR) {
    return validateNewDonorPayload(payload)
  }
  // An unknown type is reported by validateBODYType, not here.
  return fail('type must be one of feedback, newDonor')
}
