const {validate} = require('../validations');
const {validateBODYPhone, validateBODYPassword} = require('../validations/validateRequest/validateBody')
const validateLogin = validate([
    validateBODYPhone,
    validateBODYPassword
]);

const validatePATCHPassword = validate([
   validateBODYPassword
]);

module.exports = {
    validateLogin,
    validatePATCHPassword
}
