// @ts-nocheck
// tslint:disable
import { query, ValidationChain } from 'express-validator'
import mongoose from 'mongoose'

export const validateQUERYDonorId: ValidationChain = query('donorId')
  .exists().withMessage('donorId is required')
  .customSanitizer((value:string):string => String(value))
  .escape().trim().custom((donorId: string):boolean => mongoose.Types.ObjectId.isValid(donorId)).withMessage('Enter a valid donorId')

export const validateQUERYBloodGroup: ValidationChain = query('bloodGroup')
  .exists().not().isEmpty().withMessage('bloodGroup is required')
  .isInt().toInt().withMessage('bloodGroup must be integer')
  .isIn([-1, 0, 1, 2, 3, 4, 5, 6, 7]).withMessage('Please input valid blood group from 0 to 7 or -1')

export const validateQUERYHall: ValidationChain = query('hall')
  .exists().not().isEmpty().withMessage('hall is required')
  .isInt().toInt().withMessage('hall must be integer')
  .isIn([0, 1, 2, 3, 4, 5, 6, 8]).withMessage('Please input an allowed hall number')

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

export const validateQUERYDate: ValidationChain = query('date')
  .exists().not().isEmpty().withMessage('date is required')
  .isInt().toInt().withMessage('date must be integer')

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
