const { badhanAxios } = require('../../api');
const operations = require('../lib/operations');
const flows = require('../lib/flows');
const { uniquePhone } = require('../helpers');
const { HALLS_INDEX } = require('../lib/utils/constants');

// Everything the MCP suites need to talk JSON-RPC to POST /mcp.
//
// The endpoint is not a tsoa route and does not speak the status/statusCode/message envelope, so
// it cannot go through tests/lib/operations — these call badhanAxios directly. The database is
// purged before every test (setup-after-env.js), so nothing here is shared state.

const MCP_PATH = '/mcp';

let studentIdCounter = 0;

function uniqueStudentId() {
  studentIdCounter += 1;
  return `1905${String(studentIdCounter % 1000).padStart(3, '0')}`;
}

function buildDonorInfo(overrides = {}) {
  return {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'MCP Suite Member',
    fatherName: 'MCP Suite Member Father',
    motherName: 'MCP Suite Member Mother',
    studentId: uniqueStudentId(),
    address: 'Test Address',
    roomNumber: '1003',
    comment: 'mcp suite',
    extraDonationCount: 0,
    availableToAll: false,
    ...overrides,
  };
}

let requestId = 0;
const nextId = () => {
  requestId += 1;
  return requestId;
};

// One JSON-RPC request. `carrier` decides how the token travels: 'header' is x-auth, 'bearer' is
// Authorization, 'path' is POST /mcp/<token>, and 'none' sends no credential at all. Two of these
// are code paths nothing else in the suite exercises, which is why the choice is a parameter
// rather than a hard-coded header.
async function rpc(method, { params, token, carrier = 'header', id = nextId() } = {}) {
  const body = params === undefined
    ? { jsonrpc: '2.0', id, method }
    : { jsonrpc: '2.0', id, method, params };
  return rpcRaw(body, { token, carrier });
}

async function rpcRaw(body, { token, carrier = 'header' } = {}) {
  const headers = {};
  let path = MCP_PATH;
  if (token && carrier === 'header') headers['x-auth'] = token;
  if (token && carrier === 'bearer') headers.authorization = `Bearer ${token}`;
  if (token && carrier === 'path') path = `${MCP_PATH}/${token}`;
  return badhanAxios.post(path, body, { headers });
}

// A notification carries no id and must come back with no body at all.
async function notify(method, options = {}) {
  return rpcRaw({ jsonrpc: '2.0', method }, options);
}

// tools/call, unwrapped to the result the model would see.
async function callTool(name, args, options = {}) {
  const response = await rpc('tools/call', { params: { name, arguments: args }, ...options });
  return response.data;
}

// The text of a tool result, which is JSON for a success and "HTTP <code>: <message>" plus the
// body for a failure.
const resultText = (body) => body.result.content[0].text;

// badhanAxios rejects on any non-2xx, and several of these assertions are ABOUT the status code.
async function expectStatus(request, expectedStatus) {
  try {
    const response = await request();
    throw new Error(`Expected ${expectedStatus} but the request succeeded with ${response.status}`);
  } catch (e) {
    if (!e.response) throw e;
    expect(e.response.status).toBe(expectedStatus);
    return e.response;
  }
}

// A member of the given rank, holding their own token — the whole point of the permission suite
// is that MCP serves a volunteer at a volunteer's permissions.
async function createVolunteer(signInResponse, overrides = {}) {
  const donorInfo = buildDonorInfo(overrides);
  const { donorId, volunteerToken } = await flows.createVolunteerWithToken(donorInfo, signInResponse);
  return { donorId, token: volunteerToken, donorInfo };
}

async function createHallAdmin(signInResponse, overrides = {}) {
  const donorInfo = buildDonorInfo(overrides);
  const { donorId, volunteerToken } = await flows.createVolunteerWithToken(donorInfo, signInResponse, {
    alsoPromoteHallAdmin: true,
  });
  return { donorId, token: volunteerToken, donorInfo };
}

// The credential this whole feature is built on: the redirection token the AI Integration page
// mints. Tests use it rather than a sign-in token wherever the point is "what a member would
// actually put in their MCP config".
async function mintRedirectionToken(signInResponse, durationSeconds) {
  const body = durationSeconds === undefined ? {} : { durationSeconds };
  const response = await operations.authedPost('/users/redirection', body, signInResponse);
  return response.data.token;
}

module.exports = {
  MCP_PATH,
  buildDonorInfo,
  uniqueStudentId,
  rpc,
  rpcRaw,
  notify,
  callTool,
  resultText,
  expectStatus,
  createVolunteer,
  createHallAdmin,
  mintRedirectionToken,
};
