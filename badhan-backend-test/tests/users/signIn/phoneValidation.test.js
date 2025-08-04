const { badhanAxios } = require("../../../api");
const validate = require("jsonschema").validate;

const {
  BODY_phone_LengthError_Schema,
} = require("../../common/validations/body/phoneValidationSchemas");

test("POST/users/signIn: phone validation", async () => {
  try {
    await badhanAxios.post("/users/signin", {
      phone: "dummy string",
      password: null,
    });
  } catch (e) {
    let validationResult = validate(
      e.response.data,
      BODY_phone_LengthError_Schema
    );
    expect(validationResult.errors).toEqual([]);
  }
});
