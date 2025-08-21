const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { passwordSchema } = require("../schemas");

test("POST/donors/password: success", async () => {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let response = await badhanAxios.post(
      "/donors/password",
      {
        donorId: donorResponse.data.donor._id,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationResult = validate(response.data, passwordSchema);

    expect(validationResult.errors).toEqual([]);
    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": response.data.token,
      },
    });
});
