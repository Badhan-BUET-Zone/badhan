const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const env = require("../../../config");
// Removed processError; errors will bubble to a global Jest handler
const {
  searchSchema,
  postDonorSchema,
  donorsSchema,
  deleteDonorSchema
} = require("../schemas");

const { signInSchema } = require("../../users/signIn/schemas");
const { donorSchema } = require("../../users/fetchMe/schemas");

// Helper function to create a donor

async function createDonor(donorInfo, signInResponse) {
  const response = await badhanAxios.post(
    "/donors",
    donorInfo,
    { headers: { "x-auth": signInResponse.data.token } }
  );
  const validationResult = validate(response.data, postDonorSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

// Helper function for sign in
async function signInSuperAdmin() {
  const response = await badhanAxios.post("/users/signin", {
    phone: env.SUPERADMIN_PHONE,
    password: env.SUPERADMIN_PASSWORD,
  });
  const validationResult = validate(response.data, signInSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

// Helper function to get current user
async function getMe(signInResponse) {
  const response = await badhanAxios.get("/users/me", {
    headers: { "x-auth": signInResponse.data.token },
  });
  const validationResult = validate(response.data, donorSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}

// Helper function to create a donation
async function createDonation(donorId, signInResponse) {
  // No schema for donation response in schemas.js, so skipping validation
  return badhanAxios.post(
    "/donations",
    { donorId, date: new Date().getTime() },
    { headers: { "x-auth": signInResponse.data.token } }
  );
}

// Helper function to delete a donor
async function deleteDonor(donorId, signInResponse) {
  const response = await badhanAxios.delete(`/donors?donorId=${donorId}`, {
    headers: { "x-auth": signInResponse.data.token },
  });
  const validationResult = validate(response.data, deleteDonorSchema);
  expect(validationResult.errors).toEqual([]);
  return response;
}


// Helper function for search and validation
async function searchDonors({
  bloodGroup,
  hall,
  batch,
  name = "",
  address = "",
  isAvailable,
  isNotAvailable,
  availableToAll,
  signInResponse,
  expectedTotalItems,
  expectedDonorIds
}) {
  const url = `/search/v3?bloodGroup=${bloodGroup}&hall=${hall}&batch=${batch}&name=${name}&address=${address}&isAvailable=${isAvailable}&isNotAvailable=${isNotAvailable}&availableToAll=${availableToAll}`;
  const response = await badhanAxios.get(url, {
    headers: {
      "x-auth": signInResponse.data.token,
    },
  });
  const validationResult = validate(response.data, searchSchema({ totalItems: expectedTotalItems }));
  expect(validationResult.errors).toEqual([]);
  const foundIds = response.data.filteredDonors.map(d => d._id);
  expect(foundIds.sort()).toEqual(expectedDonorIds.sort());
  return response;
}

test("GET/search/v3: success", async () => {
    let signInResponse = await signInSuperAdmin();
    let donorResponse = await getMe(signInResponse);

    const newDonorInfo = {
      phone: 8801555444777,
      bloodGroup: 2,
      hall: 5,
      name: "Blah Blah",
      studentId: 1606060,
      address: "Azimpur",
      roomNumber: "3009",
      comment: "developer of badhan",
      extraDonationCount: 0,
      availableToAll: true,
    };

    let donorCreationResponse = await createDonor(newDonorInfo, signInResponse);

    const newDonorId = donorCreationResponse.data.newDonor._id;

    await searchDonors({
      bloodGroup: newDonorInfo.bloodGroup,
      hall: newDonorInfo.hall,
      batch: String(newDonorInfo.studentId).substring(0, 2),
      name: "",
      address: "",
      isAvailable: true,
      isNotAvailable: true,
      availableToAll: true,
      signInResponse,
      expectedTotalItems: 1,
      expectedDonorIds: [newDonorId]
    });

    await searchDonors({
      bloodGroup: newDonorInfo.bloodGroup,
      hall: newDonorInfo.hall,
      batch: String(newDonorInfo.studentId).substring(0, 2),
      name: "",
      address: "",
      isAvailable: false,
      isNotAvailable: false,
      availableToAll: true,
      signInResponse,
      expectedTotalItems: 0,
      expectedDonorIds: []
    });

    let donationResponse = await createDonation(newDonorId, signInResponse);

    await searchDonors({
      bloodGroup: newDonorInfo.bloodGroup,
      hall: newDonorInfo.hall,
      batch: String(newDonorInfo.studentId).substring(0, 2),
      name: "",
      address: "",
      isAvailable: true,
      isNotAvailable: false,
      availableToAll: true,
      signInResponse,
      expectedTotalItems: 0,
      expectedDonorIds: []
    });

    await searchDonors({
      bloodGroup: newDonorInfo.bloodGroup,
      hall: newDonorInfo.hall,
      batch: String(newDonorInfo.studentId).substring(0, 2),
      name: "",
      address: "",
      isAvailable: false,
      isNotAvailable: true,
      availableToAll: true,
      signInResponse,
      expectedTotalItems: 1,
      expectedDonorIds: [newDonorId]
    });

  let deleteResponse = await deleteDonor(donorCreationResponse.data.newDonor["_id"], signInResponse);

});
