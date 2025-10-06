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
    if (method === 'get' || method === 'delete') {
      const res = await badhanAxios[method](path, { headers: { 'x-auth': signInResponse.data.token } });
      if (errorSchema) {
        const result = validate(res.data, errorSchema);
        if (result.errors.length === 0) return res; // treat JSON error payload with 2xx as expected error
      }
      throw new Error('Expected request to fail but it succeeded');
    } else {
      const res = await badhanAxios[method](path, body, { headers: { 'x-auth': signInResponse.data.token } });
      if (errorSchema) {
        const result = validate(res.data, errorSchema);
        if (result.errors.length === 0) return res;
      }
      throw new Error('Expected request to fail but it succeeded');
    }
  } catch (e) {
    if (e && e.response && e.response.data) {
      validateSchema(e.response.data, errorSchema);
      return e.response;
    }
    throw e;
  }
}

async function expectGuestError(method, path, errorSchema, body) {
  try {
    if (method === 'get' || method === 'delete') {
      const res = await badhanAxios[method](path);
      if (errorSchema) {
        const result = validate(res.data, errorSchema);
        if (result.errors.length === 0) return res; // treat JSON error payload with 2xx as expected error
      }
      throw new Error('Expected request to fail but it succeeded');
    } else {
      const res = await badhanAxios[method](path, body);
      if (errorSchema) {
        const result = validate(res.data, errorSchema);
        if (result.errors.length === 0) return res;
      }
      throw new Error('Expected request to fail but it succeeded');
    }
  } catch (e) {
    if (e && e.response && e.response.data) {
      validateSchema(e.response.data, errorSchema);
      return e.response;
    }
    throw e;
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


