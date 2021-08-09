const {validate} = require('../validations');
const {validateBODYPromoteFlag, validateBODYPassword,validateBODYDonorId,validateBODYAddress,validateBODYRoomNumber,validateBODYAvailableToAll, validateBODYDonationCount, validateBODYComment, validateBODYName, validateBODYPhone, validateBODYBloodGroup, validateBODYHall, validateBODYStudentId} = require('../validations/validateRequest/validateBody')
const {validateQUERYDonorId, validateQEURYIsNotAvailable, validateQUERYAddress, validateQUERYAvailableToAll, validateQUERYBatch, validateQUERYBloodGroup, validateQUERYHall, validateQUERYIsAvailable, validateQUERYName} = require('../validations/validateRequest/validateQuery');

const validatePOSTDonors = validate([
    validateBODYPhone,
    validateBODYBloodGroup,
    validateBODYHall,
    validateBODYName,
    validateBODYStudentId,
    validateBODYComment,
    validateBODYDonationCount,
    validateBODYAvailableToAll,
    validateBODYAddress,
    validateBODYRoomNumber
]);

const validatePATCHDonors = validate([
    validateBODYDonorId,
    validateBODYName,
    validateBODYPhone,
    validateBODYStudentId,
    validateBODYBloodGroup,
    validateBODYHall,
    validateBODYRoomNumber,
    validateBODYAddress,
    validateBODYAvailableToAll
]);

const validatePATCHDonorsPassword = validate([
    validateBODYDonorId,
    validateBODYPassword
])

const validatePATCHDonorsComment = validate([
    validateBODYDonorId,
    validateBODYComment,
]);

const validatePATCHDonorsDesignation = validate([
    validateBODYDonorId,
    validateBODYPromoteFlag,
    validateBODYPassword,
]);

const validatePATCHAdmins = validate([
    validateBODYDonorId,
])

const validateGETDonors = validate([
    validateQUERYDonorId,
])

const validateGETSearchDonors = validate([
    validateQUERYBloodGroup,
    validateQUERYHall,
    validateQUERYBatch,
    validateQUERYName,
    validateQUERYAddress,
    validateQUERYIsAvailable,
    validateQEURYIsNotAvailable,
    validateQUERYAvailableToAll,
])

const validateDELETEDonors = validate([
    validateQUERYDonorId
])

module.exports = {
    validatePOSTDonors,
    validatePATCHDonors,
    validatePATCHDonorsComment,
    validatePATCHDonorsPassword,
    validatePATCHDonorsDesignation,
    validatePATCHAdmins,
    validateGETDonors,
    validateGETSearchDonors,
    validateDELETEDonors
}
