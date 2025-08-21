const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { patchPasswordSchema } = require("./schemas");
const operations = require("../../operations");

test("PATCH/users/password: success", async () => {
    let signInResponse = await operations.signInSuperAdmin()
    let passwordResponse = await operations.changePassword(env.SUPERADMIN_PASSWORD, signInResponse);
    await operations.signOut(passwordResponse);
});
