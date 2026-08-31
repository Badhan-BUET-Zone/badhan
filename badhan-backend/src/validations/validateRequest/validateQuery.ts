import { query, ValidationChain } from 'express-validator'
import { checkTimeStamp, checkTimeStampMessage } from './others'
import mongoose from 'mongoose'
import { BLOOD_GROUP_ANY, BLOOD_GROUP_INDICES, HALL_ANY, HALL_INDICES_ALLOWED_FOR_DONOR } from '../../constants'

export const validateQUERYStartTime: ValidationChain = query('startTime')
  .exists().withMessage('startTime is required')
  .not().isEmpty().withMessage('startTime cannot be empty')
  .isNumeric().withMessage('startTime must be a number');

export const validateQUERYEndTime: ValidationChain = query('endTime')
  .exists().withMessage('endTime is required')
  .not().isEmpty().withMessage('endTime cannot be empty')
  .isNumeric().withMessage('endTime must be a number');

export const validateQUERYDonorId: ValidationChain = query('donorId')
  .exists().withMessage('donorId is required')
  .customSanitizer((value:string):string => String(value))
  .escape().trim().custom((donorId: string):boolean => mongoose.Types.ObjectId.isValid(donorId)).withMessage('Enter a valid donorId')

export const validateQUERYBloodGroup: ValidationChain = query('bloodGroup')
  .exists().not().isEmpty().withMessage('bloodGroup is required')
  .isInt().toInt().withMessage('bloodGroup must be integer')
  .isIn([BLOOD_GROUP_ANY, ...BLOOD_GROUP_INDICES]).withMessage('Please input valid blood group from 0 to 7 or -1')

export const validateQUERYHall: ValidationChain = query('hall')
  .exists().not().isEmpty().withMessage('hall is required')
  .isInt().toInt().withMessage('hall must be integer')
  .isIn(HALL_INDICES_ALLOWED_FOR_DONOR).withMessage('Please input an allowed hall number')

// Same as validateQUERYHall, but also accepts the HALL_ANY sentinel used by the
// report drill-down when the report is being viewed for 'All Halls'.
export const validateQUERYHallOrAny: ValidationChain = query('hall')
  .exists().not().isEmpty().withMessage('hall is required')
  .isInt().toInt().withMessage('hall must be integer')
  .isIn([HALL_ANY, ...HALL_INDICES_ALLOWED_FOR_DONOR]).withMessage('Please input an allowed hall number or -1')

export const validateQUERYBatch: ValidationChain = query('batch')
  .exists().withMessage('Batch is required')
  .customSanitizer((value:string):string => String(value))
  .customSanitizer((batch:string):string => {
    return isNaN(parseInt(batch,10)) ? '' : batch
  })

export const validateQUERYName: ValidationChain = query('name')
  .exists().withMessage('Name is required')
  .customSanitizer((value:string):string => String(value)).escape().trim()

export const validateQUERYAddress: ValidationChain = query('address')
  .exists().withMessage('Address is required')
  .customSanitizer((value:string):string => String(value)).escape().trim()

export const validateQUERYIsAvailable: ValidationChain = query('isAvailable')
  .exists().withMessage('isAvailable is required')
  .isBoolean().withMessage('isAvailable must be boolean')

export const validateQEURYIsNotAvailable: ValidationChain = query('isNotAvailable')
  .exists().withMessage('isNotAvailable is required')
  .isBoolean().withMessage('isNotAvailable must be boolean')

export const validateQUERYAvailableToAll: ValidationChain = query('availableToAll')
  .exists().withMessage('availableToAll is required')
  .isBoolean().withMessage('availableToAll must be boolean')

// `.toBoolean()` comes last, after `.withMessage()` binds to `.isBoolean()`: a query param arrives
// as the string 'false', which is truthy, and generateSearchQuery only emits the predicate for a
// real boolean — without the coercion an archiveFlag=false search would go unpartitioned.
export const validateQUERYArchiveFlag: ValidationChain = query('archiveFlag')
  .exists().withMessage('archiveFlag is required')
  .isBoolean().withMessage('archiveFlag must be boolean')
  .toBoolean()

export const validateQUERYDate: ValidationChain = query('date')
  .exists().not().isEmpty().withMessage('date is required')
  .isInt().toInt().withMessage('date must be integer').custom(checkTimeStamp).withMessage(checkTimeStampMessage('date'))

export const validateQUERYStartDate: ValidationChain = query('startDate')
.exists().not().isEmpty().withMessage('startDate is required')
.isInt().toInt().withMessage('date must be integer').custom(checkTimeStamp).withMessage(checkTimeStampMessage('startDate'))

export const validateQUERYEndDate: ValidationChain = query('endDate')
.exists().not().isEmpty().withMessage('endDate is required')
.isInt().toInt().withMessage('date must be integer').custom(checkTimeStamp).withMessage(checkTimeStampMessage('endDate'))

export const validateQUERYCallRecordId: ValidationChain = query('callRecordId')
  .exists().withMessage('callRecordId is required')
  .customSanitizer((value:string):string => String(value))
  .escape().trim().custom((callRecordId:string):boolean => mongoose.Types.ObjectId.isValid(callRecordId)).withMessage('Enter a valid callRecordId')

export const validateQUERYPhone: ValidationChain = query('phone')
  .exists().withMessage('Phone number is required')
  .isLength({ min: 13, max: 13 }).withMessage('Phone number must be of 13 digits')
  .isNumeric().isInt().toInt().withMessage('Phone number must be integer')

export const validateQUERYPublicContactId: ValidationChain = query('contactId')
  .exists().withMessage('contactId is required')
  .customSanitizer((value:string):string => String(value))
  .escape().trim().custom((contactId:string):boolean => mongoose.Types.ObjectId.isValid(contactId)).withMessage('Enter a valid contactId')

export const validateQUERYMarkedByMe: ValidationChain = query('markedByMe')
  .exists().withMessage('markedByMe is required')
  .isBoolean().withMessage('markedByMe must be boolean')

export const validateQUERYAvailableToAllOrHall: ValidationChain = query('availableToAllOrHall')
  .exists().withMessage('availableToAllOrHall is required')
  .isBoolean().withMessage('availableToAllOrHall must be boolean')

export const validateQUERYPhoneList: ValidationChain = query('phoneList').exists().withMessage('phoneList is required')
  .toArray().custom((phoneList:string[]):boolean => {
    return phoneList.every((phone: string):boolean => {
      return phone.length === 13 && !isNaN(parseInt(phone,10)) && phone.substr(0, 3) === '880'
    })
  }).withMessage('phoneList must be of minimum length 1 where elements must be integers of 13 digits starting with 880')
  .customSanitizer((phoneList:string[]):number[] => {
    return phoneList.map((phone: string):number => parseInt(phone,10))
  }).withMessage('Error occurred at phoneList element parseInt')

export const validateQUERYFeedbackId: ValidationChain = query('feedbackId')
  .exists().withMessage('feedbackId is required')
  .customSanitizer((value:string):string => String(value))
  .escape().trim().custom((feedbackId: string):boolean => mongoose.Types.ObjectId.isValid(feedbackId)).withMessage('Enter a valid feedbackId')

// ---------------------------------------------------------------------------
// Member chat cursors.
//
// All four are OPTIONAL — `GET /messages` with no query at all is the first-open read.
// The mutual-exclusion and pairing rules between them are not expressible per-field, so
// they live in validations/messages.ts; these chains only police the shape of a value that
// is present.
// ---------------------------------------------------------------------------

// The newer cursor. Always a `serverTime` this client was previously handed, never a value
// the browser invented — see the controller for why its own clock must not be used.
export const validateQUERYAfterOptional: ValidationChain = query('after')
  .optional()
  .isInt().toInt().withMessage('after must be integer')
  .custom(checkTimeStamp).withMessage(checkTimeStampMessage('after'))

// The older cursor's timestamp half.
export const validateQUERYBeforeOptional: ValidationChain = query('before')
  .optional()
  .isInt().toInt().withMessage('before must be integer')
  .custom(checkTimeStamp).withMessage(checkTimeStampMessage('before'))

// The older cursor's tiebreak half. `before` points at a MESSAGE, not at an instant, so it
// needs both halves: two messages sharing a millisecond at a page boundary are otherwise
// ordered arbitrarily and one of them is skipped forever.
export const validateQUERYBeforeIdOptional: ValidationChain = query('beforeId')
  .optional()
  .customSanitizer((value: string): string => String(value))
  .escape().trim().custom((beforeId: string): boolean => mongoose.Types.ObjectId.isValid(beforeId)).withMessage('Enter a valid beforeId')

// Clamped, never rejected: an out-of-range limit is a client that wants more than it may
// have, not a malformed request, and answering 400 would break a scroll mid-gesture.
export const MESSAGE_PAGE_DEFAULT_LIMIT: number = 30
export const MESSAGE_PAGE_MAX_LIMIT: number = 100

export const validateQUERYLimitOptional: ValidationChain = query('limit')
  .optional()
  .isInt().toInt().withMessage('limit must be integer')
  .customSanitizer((value: number): number => {
    return Math.min(Math.max(value, 1), MESSAGE_PAGE_MAX_LIMIT)
  })

// DELETE /messages?messageId=<id>. A query parameter rather than a path one, matching
// Feedbacks, Donations, CallRecords, PublicContacts, PlateletDonations and Donors — every
// delete in the codebase but ActiveDonors, which is the exception and not the direction.
export const validateQUERYMessageId: ValidationChain = query('messageId')
  .exists().withMessage('messageId is required')
  .customSanitizer((value: string): string => String(value))
  .escape().trim().custom((messageId: string): boolean => mongoose.Types.ObjectId.isValid(messageId)).withMessage('Enter a valid messageId')
