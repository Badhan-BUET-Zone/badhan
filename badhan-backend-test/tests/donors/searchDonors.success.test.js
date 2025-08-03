const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { searchSchema } = require("./schemas");

test("GET/search/v3: success", async () => {
  try {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let donor = donorResponse.data.donor;

    let searchResponse = await badhanAxios.get(
      `/search/v3?bloodGroup=${donor.bloodGroup}&hall=${
        donor.hall
      }&batch=${donor.studentId.substring(0, 2)}&name=${
        donor.name
      }&address=&isAvailable=true&isNotAvailable=true&availableToAll=false`,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationResult = validate(searchResponse.data, searchSchema);

    expect(validationResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
