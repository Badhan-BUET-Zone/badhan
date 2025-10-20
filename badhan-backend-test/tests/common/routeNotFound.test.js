const { expectGuestError } = require('../lib');
const { routeNotFoundErrorSchema } = require('./schemas');

test('route not found testing', async () => {
  await expectGuestError('delete', '/blahblahblahblah', routeNotFoundErrorSchema);
});
