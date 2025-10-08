const operations = require('../../lib/operations');
const { patchAdminsSuperAdminSchema } = require('../schemas');

test('PATCH/guest/admins: guest', async () => {
  await operations.guestPatch(
    '/guest/admins/superadmin',
    { donorId: '123456', promoteFlag: true },
    patchAdminsSuperAdminSchema
  );
});
