// Barrel file for user-related schemas
const { signInSchema } = require('../../users/signIn/schemas');
const { donorSchema } = require('../../users/fetchMe/schemas');
const { logInsSchema } = require('../../users/logIns/schemas');
const { patchPasswordSchema } = require('../../users/password/schemas');
const { deleteLogInsSchema } = require('../../users/deleteLogins/schemas');
const { signOutSchema } = require('../../users/signOut/schemas');

module.exports = {
  signInSchema,
  donorSchema,
  logInsSchema,
  patchPasswordSchema,
  deleteLogInsSchema,
  signOutSchema,
};

