const { body, param } = require('express-validator')
const validateBODYDate = body('date')
    .exists().not().isEmpty().withMessage('date is required')
    .isInt().toInt().withMessage('date must be integer')

const validatePARAMDate = param('date')
    .exists().not().isEmpty().withMessage('date is required')
    .isInt().toInt().withMessage('date must be integer')

module.exports = {
    validateBODYDate,
    validatePARAMDate
}
