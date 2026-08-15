// Barrel file re-exporting all domain operations
// This provides a stable public API for test specs

const donorOps = require('./donors');
const userOps = require('./users');
const donationOps = require('./donations');
const plateletDonationOps = require('./plateletDonations');
const callRecordOps = require('./callRecords');
const activeDonorOps = require('./activeDonors');
const publicContactOps = require('./publicContacts');
const logOps = require('./logs');
const searchOps = require('./search');

// Re-export http utilities (for backward compatibility)
const {
  authedGet,
  authedPost,
  authedPatch,
  authedDelete,
  guestGet,
  guestGetBinary,
  guestPost,
  guestPatch,
  guestDelete,
  expectAuthedError,
  expectGuestError,
  validateSchema,
  expectErrorWithToken,
} = require('../http');

module.exports = {
  // Donor operations
  ...donorOps,

  // User operations
  ...userOps,

  // Donation operations
  ...donationOps,

  // Platelet donation operations
  ...plateletDonationOps,

  // Call record operations
  ...callRecordOps,

  // Active donor operations
  ...activeDonorOps,

  // Public contact operations
  ...publicContactOps,

  // Log operations
  ...logOps,

  // Search operations
  ...searchOps,

  // HTTP utilities (re-exported for convenience)
  authedGet,
  authedPost,
  authedPatch,
  authedDelete,
  guestGet,
  guestGetBinary,
  guestPost,
  guestPatch,
  guestDelete,
  expectAuthedError,
  expectGuestError,
  validateSchema,
  expectErrorWithToken,
};
