import { validate } from './index'
import { validateBODYPhone, validateBODYPassword } from './validateRequest/validateBody'
import { validatePARAMTokenId } from './validateRequest/validateParam'
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

export default {
  validateLogin,
  validatePATCHPassword,
  validatePOSTPasswordForgot,
  validateDELETELogins
}
