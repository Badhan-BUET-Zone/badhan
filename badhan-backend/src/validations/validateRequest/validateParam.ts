// @ts-nocheck
// tslint:disable
import { param } from 'express-validator'
import mongoose from 'mongoose'

export const validatePARAMDonorId = param('donorId')
  .exists().withMessage('donorId is required')
  .customSanitizer(value => String(value))
  .escape().trim().custom(donorId => mongoose.Types.ObjectId.isValid(donorId)).withMessage('Enter a valid donorId')

export const validatePARAMDate = param('date')
  .exists().not().isEmpty().withMessage('date is required')
  .isInt().toInt().withMessage('date must be integer')

export const validatePARAMTokenId = param('tokenId')
  .exists().withMessage('tokenId is required')
  .customSanitizer(value => String(value))
  .escape().trim().custom(tokenId => mongoose.Types.ObjectId.isValid(tokenId)).withMessage('Enter a valid tokenId')
