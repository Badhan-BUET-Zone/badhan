const {validate} = require('../validations');
const {validatePARAMDonorId} = require('./validateRequest/validateParam');
const {validateBODYDonorId} = require('./validateRequest/validateBody');

const validatePOSTPublicBookmarks = validate([
    validateBODYDonorId,
])

const validateDELETEPublicBookmarks = validate([
    validatePARAMDonorId,
])

module.exports = {
    validatePOSTPublicBookmarks,
    validateDELETEPublicBookmarks,
}