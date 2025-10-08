const env = require('../../../config');
const { authedGet, authedPatch, authedDelete, guestPost } = require('../http');
const { signInSchema } = require('../schemas/users');
const { donorSchema } = require('../schemas/users');
const { logInsSchema } = require('../schemas/users');
const { patchPasswordSchema } = require('../schemas/users');
const { deleteLogInsSchema } = require('../schemas/users');
const { signOutSchema } = require('../schemas/users');

/**
 * Sign in as super admin using environment credentials
 */
async function signInSuperAdmin() {
  return guestPost(
    '/users/signin',
    {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    },
    signInSchema
  );
}

/**
 * Sign in with phone and password
 */
async function signIn(phone, password) {
  return guestPost('/users/signin', { phone, password }, signInSchema);
}

/**
 * Sign out the current user
 */
async function signOut(signInResponse) {
  return authedDelete('/users/signout', signInResponse, signOutSchema);
}

/**
 * Get current user information
 */
async function getMe(signInResponse) {
  return authedGet('/users/me', signInResponse, donorSchema);
}

/**
 * Get all login sessions for current user
 */
async function getLogins(signInResponse) {
  return authedGet('/users/logins', signInResponse, logInsSchema);
}

/**
 * Delete a specific login session
 */
async function deleteLogin(loginId, signInResponse) {
  return authedDelete(`/users/logins/${loginId}`, signInResponse, deleteLogInsSchema);
}

/**
 * Change password for current user
 */
async function changePassword(newPassword, signInResponse) {
  return authedPatch(
    '/users/password',
    { password: newPassword },
    signInResponse,
    patchPasswordSchema
  );
}

module.exports = {
  signInSuperAdmin,
  signIn,
  signOut,
  getMe,
  getLogins,
  deleteLogin,
  changePassword,
};
