// @ts-nocheck
const { param } = require('express-validator')
const mongoose = require('mongoose')

const validatePARAMDonorId = param('donorId')
  .exists().withMessage('donorId is required')
  .customSanitizer(value => String(value))
  .escape().trim().custom(donorId => mongoose.Types.ObjectId.isValid(donorId)).withMessage('Enter a valid donorId')

const validatePARAMDate = param('date')
  .exists().not().isEmpty().withMessage('date is required')
  .isInt().toInt().withMessage('date must be integer')

const validatePARAMTokenId = param('tokenId')
  .exists().withMessage('tokenId is required')
  .customSanitizer(value => String(value))
  .escape().trim().custom(tokenId => mongoose.Types.ObjectId.isValid(tokenId)).withMessage('Enter a valid tokenId')

module.exports = {
  validatePARAMDonorId,
  validatePARAMDate,
  validatePARAMTokenId
}
