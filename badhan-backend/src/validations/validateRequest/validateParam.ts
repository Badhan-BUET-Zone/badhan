import {param, ValidationChain} from 'express-validator'
import mongoose from 'mongoose'

export const validatePARAMDonorId:ValidationChain = param('donorId')
  .exists().withMessage('donorId is required')
  .customSanitizer((value:string):string => String(value))
  .escape().trim().custom((donorId:string):boolean => mongoose.Types.ObjectId.isValid(donorId)).withMessage('Enter a valid donorId')

export const validatePARAMDate: ValidationChain = param('date')
  .exists().not().isEmpty().withMessage('date is required')
  .isInt().toInt().withMessage('date must be integer')

export const validatePARAMTokenId: ValidationChain = param('tokenId')
  .exists().withMessage('tokenId is required')
  .customSanitizer((value:string):string => String(value))
  .escape().trim().custom((tokenId:string):boolean => mongoose.Types.ObjectId.isValid(tokenId)).withMessage('Enter a valid tokenId')
