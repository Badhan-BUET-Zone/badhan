const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { duplicateDonorSchema } = require("../schemas");
const { newDonorInfo } = require("../infos");

test("POST/donors handle duplicate: duplicate donor post", async () => {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    try {
      await badhanAxios.post("/donors", newDonorInfo, {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      });
    } catch (e) {
      let duplicateValidationResult = validate(
        e.response.data,
        duplicateDonorSchema
      );
      expect(duplicateValidationResult.errors).toEqual([]);
    } finally {
      await badhanAxios.delete("/users/signout", {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      });
    }
});
