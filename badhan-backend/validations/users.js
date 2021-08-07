const {body, checkSchema, validationResult} = require('express-validator');
const {validate} = require('../validations');
const validateLogin = validate([
        body('phone')
            .exists().withMessage('Phone number is required')
            .isNumeric().isInt().toInt().withMessage('Phone number must be integer')
            .isLength({min:13,max:13}).withMessage('Phone number must be of 13 digits'),
        body('password')
            .exists().withMessage('Password is required')
            .isLength({min: 6}).customSanitizer(value => String(value))
            .withMessage('Password must be a string of 6 characters minimum')
]);


module.exports = {
    validateLogin
}
