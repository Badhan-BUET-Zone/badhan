const { validate } = require('../validations')
const { validateBODYPhone, validateBODYPassword } = require('../validations/validateRequest/validateBody')
const { validatePARAMTokenId } = require('../validations/validateRequest/validateParam')
const validateLogin = validate([
  validateBODYPhone,
  validateBODYPassword
])

const validatePATCHPassword = validate([
  validateBODYPassword
])

const validatePOSTPasswordForgot = validate([
  validateBODYPhone
])

const validateDELETELogins = validate([
  validatePARAMTokenId
])

module.exports = {
  validateLogin,
  validatePATCHPassword,
  validatePOSTPasswordForgot,
  validateDELETELogins
}
