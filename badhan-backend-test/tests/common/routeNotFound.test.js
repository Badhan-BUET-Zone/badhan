const { guestDelete } = require("../lib");
test('route not found testing', async () => {
    await guestDelete('/blahblahblahblah');
})
