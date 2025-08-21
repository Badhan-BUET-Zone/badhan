const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const {
  postActiveDonorSchema,
  deleteActiveDonorSchema,
  activeDonorSearchResultSchema,
} = require("./schemas");

test("POST & DELETE /activeDonors: success", async () => {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    // clear up any existing active donor to begin testing
    try {
      await badhanAxios.delete(
        `/activeDonors/${donorResponse.data.donor._id}`,
        {
          headers: {
            "x-auth": signInResponse.data.token,
          },
        }
      );
    } catch (e) {}

    let createActiveDonorResponse = await badhanAxios.post(
      "/activeDonors",
      {
        donorId: donorResponse.data.donor._id,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let createActiveDonorValidationResult = validate(
      createActiveDonorResponse.data,
      postActiveDonorSchema
    );

    expect(createActiveDonorValidationResult.errors).toEqual([]);

    let getActiveDonorResponse = await badhanAxios.get(
      `/activeDonors?bloodGroup=-1&hall=${donorResponse.data.donor.hall}&batch=&name=&address=&isAvailable=true&isNotAvailable=true&availableToAll=false&markedByMe=false&availableToAllOrHall=false`,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let activeDonorSearchValidationResult = validate(
      getActiveDonorResponse.data,
      activeDonorSearchResultSchema
    );

    expect(activeDonorSearchValidationResult.errors).toEqual([]);

    let deleteActiveDonorResponse = await badhanAxios.delete(
      `/activeDonors/${donorResponse.data.donor._id}`,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let deleteActiveDonorValidateResult = validate(
      deleteActiveDonorResponse.data,
      deleteActiveDonorSchema
    );
    expect(deleteActiveDonorValidateResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
});
