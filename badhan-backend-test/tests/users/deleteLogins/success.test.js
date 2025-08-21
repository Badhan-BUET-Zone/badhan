const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { deleteLogInsSchema } = require("./schemas");

test("DELETE /users/logins/{tokenId}: success", async () => {
    let loginResult = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });
    let loginResults = await badhanAxios.get("/users/logins", {
      headers: {
        "x-auth": loginResult.data.token,
      },
    });
    let currentLoginId = loginResults.data.currentLogin["_id"];
    let deleteResponse = await badhanAxios.delete(
      "/users/logins/" + currentLoginId,
      {
        headers: {
          "x-auth": loginResult.data.token,
        },
      }
    );
    let validationResult = validate(deleteResponse.data, deleteLogInsSchema);
    expect(validationResult.errors).toEqual([]);
});
