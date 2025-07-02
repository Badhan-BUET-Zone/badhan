import { body, ValidationChain } from 'express-validator'
import mongoose from 'mongoose'
import {checkEmail} from "./others";
import { checkTimeStamp, checkTimeStampMessage } from './others';

export const validateBODYPhone: ValidationChain = body('phone')
  .exists().withMessage('Phone number is required')
  .isLength({ min: 13, max: 13 }).withMessage('Phone number must be of 13 digits')
  .isNumeric().isInt({ min: 8801000000000, max: 8801999999999 }).toInt().withMessage('Phone number must an integer between 8801000000000 and 8801999999999')

export const validateBODYBloodGroup: ValidationChain = body('bloodGroup')
  .exists().withMessage('bloodGroup is required')
  .isInt().toInt().withMessage('bloodGroup must be integer')
  .isIn([0, 1, 2, 3, 4, 5, 6, 7]).withMessage('Please input valid blood group from 0 to 7')

export const validateBODYPublicContactBloodGroup: ValidationChain = body('bloodGroup')
  .exists().withMessage('bloodGroup is required')
  .isInt().toInt().withMessage('bloodGroup must be integer')
  .isIn([-1, 0, 2, 4, 6]).withMessage('Please input valid blood group (-1,0,2,4,6)')

export const validateBODYHall: ValidationChain = body('hall')
  .exists().withMessage('hall is required')
  .isInt().toInt().withMessage('hall must be integer')
  .isIn([0, 1, 2, 3, 4, 5, 6, 8]).withMessage('Please input an allowed hall number')

export const validateBODYName: ValidationChain = body('name')
  .exists().withMessage('name is required')
  .customSanitizer((value:any):string => { return String(value) }).escape().trim()
  .isLength({ min: 3, max: 100 }).withMessage('name must be between 3 and 100 characters')

export const validateBODYStudentId: ValidationChain = body('studentId')
  .exists().withMessage('studentId is required')
  .customSanitizer((value:any):string => String(value)).escape().trim()
  .isLength({ min: 7, max: 7 }).withMessage('studentId must be of 7 digits')
  .custom((value: string):boolean => [0, 1, 2, 4, 5, 6, 8, 10, 11, 12, 15, 16, 17, 18].includes(parseInt(value.substr(2, 2),10))).withMessage('Please input a valid department number')
  .custom((value:string):boolean => {
    const inputYear: number = parseInt('20' + value.substr(0, 2),10)
    return inputYear <= new Date().getFullYear() && inputYear >= 2001
  }).withMessage('Please input a valid batch between 01 and last two digits of current year')
  .isInt().withMessage('studentId must be integer')

export const validateBODYPassword: ValidationChain = body('password')
  .exists().withMessage('Password is required').customSanitizer((value:any):string => String(value))
  .trim().isLength({ min: 4 }).withMessage('Password length must be more than 4')

export const validateBODYComment: ValidationChain = body('comment')
  .exists().not().isEmpty().withMessage('comment is required')
  .customSanitizer((value:any):string => String(value))
  .escape().trim().isLength({ min: 2, max: 500 }).withMessage('Comment length must be between 2 and 500')

export const validateBODYDonationCount: ValidationChain = body('extraDonationCount')
  .exists().withMessage('extraDonationCount is required')
  .isInt().toInt().withMessage('extraDonationCount must be an integer')
  .custom((value:number):boolean => value < 99 && value >= 0).withMessage('Max extra donation count must be between 0 and 99')

export const validateBODYAvailableToAll: ValidationChain = body('availableToAll')
  .exists().withMessage('availableToAll is required')
  .isBoolean().toBoolean().withMessage('availableToAll must be boolean')

export const validateBODYAddress: ValidationChain = body('address')
  .exists().not().isEmpty().withMessage('address is required')
  .customSanitizer((value:any):string => String(value))
  .escape().trim().isLength({ min: 2, max: 500 }).withMessage('Address length must be between 2 and 500')

export const validateBODYRoomNumber: ValidationChain = body('roomNumber')
  .exists().not().isEmpty().withMessage('roomNumber is required')
  .customSanitizer((value:any):string => String(value))
  .escape().trim().isLength({ min: 2, max: 500 }).withMessage('roomNumber length must be between 2 and 500')

export const validateBODYDonorId: ValidationChain = body('donorId')
  .exists().withMessage('donorId is required')
  .customSanitizer((value:any):string => String(value))
  .escape().trim().custom((donorId:string):boolean => mongoose.Types.ObjectId.isValid(donorId)).withMessage('Enter a valid donorId')

export const validateBODYPromoteFlag: ValidationChain = body('promoteFlag')
  .exists().withMessage('promoteFlag is required')
  .isBoolean().toBoolean().withMessage('promoteFlag must be boolean')

export const validateBODYDate: ValidationChain = body('date')
  .exists().not().isEmpty().withMessage('date is required')
  .isInt().toInt().withMessage('date must be integer').custom(checkTimeStamp).withMessage(checkTimeStampMessage('date'))

export const validateBODYEmail: ValidationChain = body('email')
  .exists().withMessage('email is required')
  .customSanitizer((value:any):string => String(value)).escape().trim()
  .custom((email:string):boolean => {
    if (email === '') {
      return true
    }
    return checkEmail(email)
  }).withMessage('email is not valid')
