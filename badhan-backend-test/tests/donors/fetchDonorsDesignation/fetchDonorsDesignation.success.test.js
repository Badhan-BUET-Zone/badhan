const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
const { designationSchema } = require("../schemas");
const { createDonor } = require("../../operations");
const { promoteToVolunteer, promoteToHallAdmin, getMe } = require("../../operations");

test("GET/donors/designation: success", async () => {
    let signInResponse = await badhanAxios.post("/users/signin", {
      phone: env.SUPERADMIN_PHONE,
      password: env.SUPERADMIN_PASSWORD,
    });

    const getMeResponse = await getMe(signInResponse);

    const newDonor1 = {
      phone: 8801555444777,
      bloodGroup: 2,
      hall: getMeResponse.data.donor.hall,
      name: "Blah Blah",
      studentId: 1606060,
      address: "Azimpur",
      roomNumber: "3009",
      comment: "developer of badhan",
      extraDonationCount: 0,
      availableToAll: true,
    }

    const newDonor2 = {
      phone: 8801500000001,
      bloodGroup: 2,
      hall: getMeResponse.data.donor.hall,
      name: "Blah Blah 2",
      studentId: 1606061,
      address: "Azimpur",
      roomNumber: "3009",
      comment: "developer of badhan",
      extraDonationCount: 0,
      availableToAll: true,
    }

    const donorCreationResponse1 = await createDonor(newDonor1, signInResponse);
    const donorCreationResponse2 = await createDonor(newDonor2, signInResponse);

    // Promote the first donor to volunteer
    await promoteToVolunteer(donorCreationResponse1.data.newDonor._id, signInResponse);
    await promoteToVolunteer(donorCreationResponse2.data.newDonor._id, signInResponse);

    // Promote the first donor to hall admin
    await promoteToHallAdmin(donorCreationResponse1.data.newDonor._id, signInResponse);

    let designationResponse = await badhanAxios.get("/donors/designation", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });

    let validationResult = validate(
      designationResponse.data,
      designationSchema
    );

    expect(validationResult.errors).toEqual([]);

    await badhanAxios.delete("/users/signout", {
      headers: {
        "x-auth": signInResponse.data.token,
      },
    });
});
