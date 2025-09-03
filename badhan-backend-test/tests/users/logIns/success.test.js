const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { logInsSchema } = require("./schemas");
const { sleep } = require("../../helpers");
const operations = require("../../operations");

test("GET/users/logins: success", async () => {
    let signInResponse = await operations.signInSuperAdmin()
    await sleep(1000);
    let signInResponse_2 = await operations.signInSuperAdmin()

    await operations.getLogins(signInResponse);

});
