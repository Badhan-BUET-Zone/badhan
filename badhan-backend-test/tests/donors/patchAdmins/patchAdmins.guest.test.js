const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { patchAdminsSchema } = require("../schemas");

test("PATCH/guest/admins: guest", async () => {
  let hallAdminPromotionResult = await badhanAxios.patch(
    "/guest/admins",
    {
      donorId: "123456",
    },
    {}
  );

  // validate hall admin promotion result
  let hallAdminPromotionValidation = validate(
    hallAdminPromotionResult.data,
    patchAdminsSchema
  );

  expect(hallAdminPromotionValidation.errors).toEqual([]);
});
