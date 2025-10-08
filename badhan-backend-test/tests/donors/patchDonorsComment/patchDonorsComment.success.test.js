const env = require('../../../config');
const operations = require('../../lib/operations');
const { patchCommentSchema, getCommentSchema } = require('../schemas');
const randomComment = `Developer of Badhan ${Date.now()}`;

test('PATCH/donors/comment: success', async () => {
  const signInResponse = await operations.signInSuperAdmin();
  const donorResponse = await operations.getMe(signInResponse);
  await operations.patchDonorComment(
    donorResponse.data.donor._id,
    randomComment,
    signInResponse,
    patchCommentSchema
  );
  await operations.getDonor(donorResponse.data.donor._id, signInResponse, getCommentSchema);
  await operations.signOut(signInResponse);
});
