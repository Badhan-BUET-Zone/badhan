const { authedPost } = require('../http');
const { postActiveDonorSchema } = require('../schemas/activeDonors');

/**
 * Mark a donor as active
 */
async function markDonorAsActive(donorId, signInResponse) {
  return authedPost('/activeDonors', { donorId }, signInResponse, postActiveDonorSchema);
}

module.exports = {
  markDonorAsActive,
};

