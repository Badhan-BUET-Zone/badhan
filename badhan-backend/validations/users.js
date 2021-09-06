const {validate} = require('../validations');
const {validateBODYPhone, validateBODYPassword} = require('../validations/validateRequest/validateBody')
const validateLogin = validate([
    validateBODYPhone,
    validateBODYPassword,
]);

const validatePATCHPassword = validate([
   validateBODYPassword
]);

const validatePOSTPasswordForgot = validate([
    validateBODYPhone
])

module.exports = {
    validateLogin,
    validatePATCHPassword,
    validatePOSTPasswordForgot
}
