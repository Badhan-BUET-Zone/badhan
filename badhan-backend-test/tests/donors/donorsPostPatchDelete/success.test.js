const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const {
  postDonorSchema,
  patchDonorSchema,
  deleteDonorSchema,
} = require("../schemas");
const { newDonorInfo } = require("../infos");

const { createDonor} = require("../../operations");

test("POST&PATCH&DELETE/donors: success", async () => {
    //post/donors part

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

    let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);

    //patch/donors

    let donorUpdateResponse = await badhanAxios.patch(
      "/donors/v2",
      {
        donorId: donorCreationResponse.data.newDonor["_id"],
        name: "Blah Blah",
        phone: newDonorInfo.phone,
        studentId: newDonorInfo.studentId,
        bloodGroup: newDonorInfo.bloodGroup,
        hall: newDonorInfo.hall,
        roomNumber: "3009",
        address: "Azimpur",
        availableToAll: true,
        email: "",
      },
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationUpdateResult = validate(
      donorUpdateResponse.data,
      patchDonorSchema
    );

    expect(validationUpdateResult.errors).toEqual([]);

    // delete/donations part

    let donationDeletionResponse = await badhanAxios.delete(
      "/donors?donorId=" + donorCreationResponse.data.newDonor["_id"],
      {
        headers: {
          "x-auth": signInResponse.data.token,
        },
      }
    );

    let validationResult = validate(
      donationDeletionResponse.data,
      deleteDonorSchema
    );
    expect(validationResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
});
