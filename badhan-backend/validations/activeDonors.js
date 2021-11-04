const {validate} = require('../validations');
const {validatePARAMDonorId} = require('./validateRequest/validateParam');
const {validateBODYDonorId} = require('./validateRequest/validateBody');

const validatePOSTActiveDonors = validate([
    validateBODYDonorId,
])

const validateDELETEActiveDonors = validate([
    validatePARAMDonorId,
])

module.exports = {
    validatePOSTActiveDonors,
    validateDELETEActiveDonors,
}