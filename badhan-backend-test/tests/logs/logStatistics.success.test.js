const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { statisticsSchema } = require("./schemas");

test("GET/log/statistics: success", async () => {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let statisticsResponse = await badhanAxios.get("/log/statistics", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let validationResult = validate(statisticsResponse.data, statisticsSchema);

    expect(validationResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
});
