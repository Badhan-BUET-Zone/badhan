const { guestPost, guestPatch, guestDelete } = require('../../lib');
const { postDonorSchema, patchDonorSchema, deleteDonorSchema } = require('../schemas');

test('POST&PATCH&DELETE/guest/donors: guest', async () => {
  //post/donors part
  await guestPost('/guest/donors', undefined, postDonorSchema);

  //patch/donors

  await guestPatch('/guest/donors/v2', undefined, patchDonorSchema);

  // delete/donations part

  await guestDelete('/guest/donors?donorId=', deleteDonorSchema);
});
