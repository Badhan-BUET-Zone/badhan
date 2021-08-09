const {validate,validateBODYAvailableToAll, validateBODYDonationCount, validateBODYComment, validateBODYName, validateBODYPhone, validateBODYBloodGroup, validateBODYHall, validateBODYStudentId} = require('../validations');
const validatePOSTDonors = validate([
    validateBODYPhone,
    validateBODYBloodGroup,
    validateBODYHall,
    validateBODYName,
    validateBODYStudentId,
    validateBODYComment,
    validateBODYDonationCount,
    validateBODYAvailableToAll
]);

module.exports = {
    validatePOSTDonors
}
