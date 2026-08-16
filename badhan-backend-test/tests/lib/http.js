const { badhanAxios } = require('../../api');
const { validate } = require('jsonschema');

function validateSchema(data, schema) {
  if (!schema) return;
  const validationResult = validate(data, schema);
  expect(validationResult.errors).toEqual([]);
  return true;
}

async function authedGet(path, signInResponse, schema) {
  const response = await badhanAxios.get(path, {
    headers: { 'x-auth': signInResponse.data.token },
  });
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function authedPost(path, body, signInResponse, schema) {
  const response = await badhanAxios.post(path, body, {
    headers: { 'x-auth': signInResponse.data.token },
  });
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function authedPatch(path, body, signInResponse, schema) {
  const response = await badhanAxios.patch(path, body, {
    headers: { 'x-auth': signInResponse.data.token },
  });
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function authedDelete(path, signInResponse, schema) {
  const response = await badhanAxios.delete(path, {
    headers: { 'x-auth': signInResponse.data.token },
  });
  if (schema) validateSchema(response.data, schema);
  return response;
}

async function guestGet(path, schema) {
  const response = await badhanAxios.get(path);
  if (schema) validateSchema(response.data, schema);
  return response;
}

// For the one route that answers with a file rather than JSON. arraybuffer keeps axios from
// running the bytes through a UTF-8 decode, which would quietly corrupt them before a test could
// look at the signature.
async function guestGetBinary(path) {
  return badhanAxios.get(path, { responseType: 'arraybuffer' });
}

// The same file route, asked for with a session. The certificate is the one route whose answer
// differs by whether a token is present, so both halves of that need a way to be called.
async function authedGetBinary(path, signInResponse) {
  return badhanAxios.get(path, {
    responseType: 'arraybuffer',
    headers: { 'x-auth': signInResponse.data.token },
  });
}

// A token that is well formed and signed by us but no longer resolves to a session — what a
// signed-out device still holds. The certificate route must treat it as anonymous rather than
// answering 401, so it needs to be forgeable in a test.
async function getBinaryWithToken(path, token) {
  return badhanAxios.get(path, {
    responseType: 'arraybuffer',
    headers: { 'x-auth': token },
  });
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
      const res = await badhanAxios[method](path, {
        headers: { 'x-auth': signInResponse.data.token },
      });
      if (errorSchema) {
        const result = validate(res.data, errorSchema);
        if (result.errors.length === 0) return res; // treat JSON error payload with 2xx as expected error
      }
      throw new Error('Expected request to fail but it succeeded');
    } else {
      const res = await badhanAxios[method](path, body, {
        headers: { 'x-auth': signInResponse.data.token },
      });
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

async function expectErrorWithToken(method, path, token, errorSchema, body) {
  try {
    if (method === 'get' || method === 'delete') {
      await badhanAxios[method](path, { headers: { 'x-auth': token } });
    } else {
      await badhanAxios[method](path, body, { headers: { 'x-auth': token } });
    }
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
  guestGetBinary,
  authedGetBinary,
  getBinaryWithToken,
  guestPost,
  guestPatch,
  guestDelete,
  expectAuthedError,
  expectGuestError,
  expectErrorWithToken,
};
