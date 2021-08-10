const {validate} = require('../validations');
const {validateBODYPhone, validateBODYPassword} = require('../validations/validateRequest/validateBody')
const validateLogin = validate([
    validateBODYPhone,
    validateBODYPassword
]);

module.exports = {
    validateLogin
}
