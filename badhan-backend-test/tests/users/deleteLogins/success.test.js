const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { deleteLogInsSchema } = require("./schemas");
const operations = require("../../lib/operations");
const { sleep } = require("../../helpers");

test("DELETE /users/logins/{tokenId}: success", async () => {
    let signInResponse = await operations.signInSuperAdmin()
    await sleep(1000);
    let signInResponse_2 = await operations.signInSuperAdmin()

    const loginResults = await operations.getLogins(signInResponse);
    let currentLoginId = loginResults.data.currentLogin["_id"];
    await operations.deleteLogin(currentLoginId, signInResponse);

});
