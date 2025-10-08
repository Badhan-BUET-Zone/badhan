const operations = require('../../lib/operations');

test('DELETE/users/signOut: success', async () => {
    const signInResponse = await operations.signInSuperAdmin();
    await operations.signOut(signInResponse);
})


