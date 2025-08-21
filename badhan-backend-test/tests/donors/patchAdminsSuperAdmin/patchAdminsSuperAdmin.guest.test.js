const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;
const { patchAdminsSuperAdminSchema } = require("../schemas");

test("PATCH/guest/admins: guest", async () => {
  let superAdminPromotionResult = await badhanAxios.patch(
    "/guest/admins/superadmin",
    {
      donorId: "123456",
      promoteFlag: true,
    },
    {}
  );

  // validate hall admin promotion result
  let superAdminPromotionValidation = validate(
    superAdminPromotionResult.data,
    patchAdminsSuperAdminSchema
  );

  expect(superAdminPromotionValidation.errors).toEqual([]);
});
