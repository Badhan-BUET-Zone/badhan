const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const env = require("../../config");
const { processError } = require("../fixtures/helpers");
const { patchDonorsDesignationSchema } = require("./schemas");
const { newDonorInfo } = require("./infos");

test("PATCH/donors/designation: success", async () => {
  try {
    //sign in for authorization
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let duplicateResponse = await badhanAxios.get(
      `/donors/checkDuplicate?phone=${newDonorInfo.phone}`,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    if (duplicateResponse.data.donor) {
      await badhanAxios.delete(
        `/donors?donorId=${duplicateResponse.data.donor._id}`,
        {
          headers: {
            "x-auth": signInResponse.data.token,
          },
        }
      );
    }

    //create a new donor
    let donorCreationResponse = await badhanAxios.post(
      "/donors",
      newDonorInfo,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    // promote that newly created donor to volunteer
    let promotionResponse = await badhanAxios.patch(
      "/donors/designation",
      {
        donorId: donorCreationResponse.data.newDonor._id,
        promoteFlag: true,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    //validate the promotion response
    let promotionValidationResult = validate(
      promotionResponse.data,
      patchDonorsDesignationSchema
    );

    expect(promotionValidationResult.errors).toEqual([]);

    //demote the newly promoted volunteer to a normal donor
    let demotionResponse = await badhanAxios.patch(
      "/donors/designation",
      {
        donorId: donorCreationResponse.data.newDonor._id,
        promoteFlag: false,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    // validate the demotion response
    let demotionValidationResult = validate(demotionResponse.data, {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { type: "string" },
        statusCode: { const: 200 },
        message: { type: "string" },
      },
      required: ["status", "statusCode", "message"],
    });

    expect(demotionValidationResult.errors).toEqual([]);

    //delete the new donor
    await badhanAxios.delete(
      "/donors?donorId=" + donorCreationResponse.data.newDonor._id,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    //logout to remove token
    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
  } catch (e) {
    throw processError(e);
  }
});
