const { guestPatch } = require('../../lib');
const { patchDonorsDesignationSchema } = require('../schemas');

test('PATCH/donors/designation: guest', async () => {
  await guestPatch(
    '/guest/donors/designation',
    {
      donorId: '123456789',
      promoteFlag: false,
    },
    patchDonorsDesignationSchema
  );
});
