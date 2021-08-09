const {validate,validateBODYPassword,validateBODYDonorId,validateBODYAddress,validateBODYRoomNumber,validateBODYAvailableToAll, validateBODYDonationCount, validateBODYComment, validateBODYName, validateBODYPhone, validateBODYBloodGroup, validateBODYHall, validateBODYStudentId} = require('../validations');
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

module.exports = {
    validatePOSTDonors,
    validatePATCHDonors,
    validatePATCHDonorsComment,
    validatePATCHDonorsPassword
}
