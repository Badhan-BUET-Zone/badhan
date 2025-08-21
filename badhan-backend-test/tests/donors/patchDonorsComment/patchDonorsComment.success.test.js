const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { patchCommentSchema, getCommentSchema } = require("../schemas");

const randomComment = `Developer of Badhan ${new Date().getTime()}`;

test("PATCH/donors/comment: success", async () => {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    let donorResponse = await badhanAxios.get("/users/me", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let response = await badhanAxios.patch(
      "/donors/comment",
      {
        donorId: donorResponse.data.donor._id,
        comment: randomComment,
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let commentPatchValidationResult = validate(
      response.data,
      patchCommentSchema
    );

    expect(commentPatchValidationResult.errors).toEqual([]);

    let getCommentResponse = await badhanAxios.get(
      "/donors?donorId=" + donorResponse.data.donor._id,
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let commentGetValidationResult = validate(
      getCommentResponse.data,
      getCommentSchema
    );

    expect(commentGetValidationResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
});
