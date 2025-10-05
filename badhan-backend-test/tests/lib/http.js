const { badhanAxios } = require('../../api');
const { validate } = require('jsonschema');

function validateSchema(data, schema) {
  if (!schema) return;
  const validationResult = validate(data, schema);
  expect(validationResult.errors).toEqual([]);
  return true;
}

async function authedGet(path, signInResponse, schema) {
  const response = await badhanAxios.get(path, { headers: { 'x-auth': signInResponse.data.token } });
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function authedPost(path, body, signInResponse, schema) {
  const response = await badhanAxios.post(path, body, { headers: { 'x-auth': signInResponse.data.token } });
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function authedPatch(path, body, signInResponse, schema) {
  const response = await badhanAxios.patch(path, body, { headers: { 'x-auth': signInResponse.data.token } });
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function authedDelete(path, signInResponse, schema) {
  const response = await badhanAxios.delete(path, { headers: { 'x-auth': signInResponse.data.token } });
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function guestGet(path, schema) {
  const response = await badhanAxios.get(path);
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function guestPost(path, body, schema) {
  const response = await badhanAxios.post(path, body);
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function guestPatch(path, body, schema) {
  const response = await badhanAxios.patch(path, body);
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function guestDelete(path, schema) {
  const response = await badhanAxios.delete(path);
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function expectAuthedError(method, path, signInResponse, errorSchema, body) {
  try {
    await badhanAxios[method](path, body, { headers: { 'x-auth': signInResponse.data.token } });
    throw new Error('Expected request to fail but it succeeded');
  } catch (e) {
    validateSchema(e.response.data, errorSchema);
    return e.response;
  }
}

async function expectGuestError(method, path, errorSchema, body) {
  try {
    await badhanAxios[method](path, body);
    throw new Error('Expected request to fail but it succeeded');
  } catch (e) {
    validateSchema(e.response.data, errorSchema);
    return e.response;
  }
}

module.exports = {
  validateSchema,
  authedGet,
  authedPost,
  authedPatch,
  authedDelete,
  guestGet,
  guestPost,
  guestPatch,
  guestDelete,
  expectAuthedError,
  expectGuestError,
};


