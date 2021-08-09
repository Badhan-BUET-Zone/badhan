const {validate} = require('../validations');
const {validateBODYDonorId} = require('../validations/validateRequest/validateBody')
const {validateQUERYDonorId,validateQUERYCallRecordId} = require('../validations/validateRequest/validateQuery');

const validatePOSTCallRecords = validate([
    validateBODYDonorId,
]);

const validateDELETECallRecords = validate([
    validateQUERYDonorId,
    validateQUERYCallRecordId
])

module.exports = {
    validatePOSTCallRecords,
    validateDELETECallRecords
}
