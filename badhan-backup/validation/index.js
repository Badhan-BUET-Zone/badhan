const { validate } = require('./validationMiddle')
const { validatePARAMDate} = require('./elements')

const validateDELETEBackup = validate([
    validatePARAMDate,
])

const validatePOSTRestore = validate([
    validatePARAMDate
])

module.exports = {
    validateDELETEBackup,
    validatePOSTRestore
}
