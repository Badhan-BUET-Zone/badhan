const {validate, validateBODYPhone, validateBODYPassword} = require('../validations');
const validateLogin = validate([
    validateBODYPhone,
    validateBODYPassword
]);

module.exports = {
    validateLogin
}
