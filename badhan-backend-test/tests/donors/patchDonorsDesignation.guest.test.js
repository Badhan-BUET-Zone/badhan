const { badhanAxios } = require("../../api");
const validate = require("jsonschema").validate;
const { patchDonorsDesignationSchema } = require("./schemas");

test("PATCH/donors/designation: guest", async () => {
  let demotionResponse = await badhanAxios.patch(
    "/guest/donors/designation",
    {
      donorId: "123456789",
      promoteFlag: false,
    },
    {}
  );

  // validate the demotion response
  let demotionValidationResult = validate(
    demotionResponse.data,
    patchDonorsDesignationSchema
  );

  expect(demotionValidationResult.errors).toEqual([]);
});
