// @ts-nocheck
const { query } = require('express-validator')
const mongoose = require('mongoose')

const validateQUERYDonorId = query('donorId')
  .exists().withMessage('donorId is required')
  .customSanitizer(value => String(value))
  .escape().trim().custom(donorId => mongoose.Types.ObjectId.isValid(donorId)).withMessage('Enter a valid donorId')

const validateQUERYBloodGroup = query('bloodGroup')
  .exists().not().isEmpty().withMessage('bloodGroup is required')
  .isInt().toInt().withMessage('bloodGroup must be integer')
  .isIn([-1, 0, 1, 2, 3, 4, 5, 6, 7]).withMessage('Please input valid blood group from 0 to 7 or -1')

const validateQUERYHall = query('hall')
  .exists().not().isEmpty().withMessage('hall is required')
  .isInt().toInt().withMessage('hall must be integer')
  .isIn([0, 1, 2, 3, 4, 5, 6, 8]).withMessage('Please input an allowed hall number')

const validateQUERYBatch = query('batch')
  .exists().withMessage('Batch is required')
  .customSanitizer(value => String(value))
  .customSanitizer((batch) => {
    return isNaN(parseInt(batch)) ? '' : batch
  })

const validateQUERYName = query('name')
  .exists().withMessage('Name is required')
  .customSanitizer(value => String(value)).escape().trim()

const validateQUERYAddress = query('address')
  .exists().withMessage('Address is required')
  .customSanitizer(value => String(value)).escape().trim()

const validateQUERYIsAvailable = query('isAvailable')
  .exists().withMessage('isAvailable is required')
  .isBoolean().toBoolean().withMessage('isAvailable must be boolean')

const validateQEURYIsNotAvailable = query('isNotAvailable')
  .exists().withMessage('isNotAvailable is required')
  .isBoolean().toBoolean().withMessage('isNotAvailable must be boolean')

const validateQUERYAvailableToAll = query('availableToAll')
  .exists().withMessage('availableToAll is required')
  .isBoolean().toBoolean().withMessage('availableToAll must be boolean')

const validateQUERYDate = query('date')
  .exists().not().isEmpty().withMessage('date is required')
  .isInt().toInt().withMessage('date must be integer')

const validateQUERYCallRecordId = query('callRecordId')
  .exists().withMessage('callRecordId is required')
  .customSanitizer(value => String(value))
  .escape().trim().custom(callRecordId => mongoose.Types.ObjectId.isValid(callRecordId)).withMessage('Enter a valid callRecordId')

const validateQUERYPhone = query('phone')
  .exists().withMessage('Phone number is required')
  .isLength({ min: 13, max: 13 }).withMessage('Phone number must be of 13 digits')
  .isNumeric().isInt().toInt().withMessage('Phone number must be integer')

const validateQUERYPublicContactId = query('contactId')
  .exists().withMessage('contactId is required')
  .customSanitizer(value => String(value))
  .escape().trim().custom(contactId => mongoose.Types.ObjectId.isValid(contactId)).withMessage('Enter a valid contactId')

const validateQUERYMarkedByMe = query('markedByMe')
  .exists().withMessage('markedByMe is required')
  .isBoolean().toBoolean().withMessage('markedByMe must be boolean')

const validateQUERYAvailableToAllOrHall = query('availableToAllOrHall')
  .exists().withMessage('availableToAllOrHall is required')
  .isBoolean().toBoolean().withMessage('availableToAllOrHall must be boolean')

const validateQUERYPhoneList = query('phoneList').exists().withMessage('phoneList is required')
  .toArray().custom((phoneList) => {
    return phoneList.every((phone) => {
      return phone.length === 13 && !isNaN(phone) && phone.substr(0, 3) === '880'
    })
  }).withMessage('phoneList must be of minimum length 1 where elements must be integers of 13 digits starting with 880')
  .customSanitizer((phoneList) => {
    return phoneList.map((phone) => parseInt(phone))
  }).withMessage('Error occurred at phoneList element parseInt')

module.exports = {
  validateQUERYDonorId,
  validateQUERYBloodGroup,
  validateQUERYHall,
  validateQUERYBatch,
  validateQUERYName,
  validateQUERYAddress,
  validateQUERYIsAvailable,
  validateQEURYIsNotAvailable,
  validateQUERYAvailableToAll,
  validateQUERYDate,
  validateQUERYCallRecordId,
  validateQUERYPhone,
  validateQUERYPublicContactId,
  validateQUERYMarkedByMe,
  validateQUERYAvailableToAllOrHall,
  validateQUERYPhoneList
}
