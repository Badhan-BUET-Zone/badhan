const axios = require('axios');
const operations = require('../lib/operations');
const flows = require('../lib/flows');
const { uniquePhone } = require('../helpers');
const { HALLS_INDEX } = require('../lib/utils/constants');

// Everything the Badhan Agent suites need to put members and chats in place.
//
// The database is purged before EVERY test (setup-after-env.js), so nothing here is shared state
// between tests — each test builds the members and chats it needs from scratch.

let studentIdCounter = 0;

function uniqueStudentId() {
  studentIdCounter += 1;
  // Batch 18, department 05, then a counter. A different batch from the message suites' members,
  // so the two sets of helpers can never hand out the same id.
  return `1805${String(studentIdCounter % 1000).padStart(3, '0')}`;
}

function buildDonorInfo(overrides = {}) {
  return {
    phone: uniquePhone(),
    bloodGroup: 2,
    hall: HALLS_INDEX.CHATRI,
    name: 'Agent Suite Member',
    fatherName: 'Agent Suite Member Father',
    motherName: 'Agent Suite Member Mother',
    studentId: uniqueStudentId(),
    address: 'Test Address',
    roomNumber: '1003',
    comment: 'agent suite',
    extraDonationCount: 0,
    availableToAll: false,
    ...overrides,
  };
}

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

async function createSuperAdmin(signInResponse, overrides = {}) {
  const member = await createVolunteer(signInResponse, overrides);
  await operations.promoteToSuperAdmin(member.donorId, signInResponse);
  return member;
}

/**
 * A member demoted back to Donor who is STILL HOLDING THE TOKEN they were issued as a volunteer.
 * Demotion rewrites the designation in place and revokes nothing, so this is exactly the state a
 * demoted member is in until their token expires.
 */
async function createDemotedMemberHoldingToken(signInResponse, overrides = {}) {
  const member = await createVolunteer(signInResponse, overrides);
  await operations.demoteToDonor(member.donorId, signInResponse);
  return member;
}

// --- the member routes, driven by a raw token ----------------------------------------------

const asSignIn = (token) => ({ data: { token } });

const listChats = (token, schema) => operations.authedGet('/agent/chats', asSignIn(token), schema);

const getChat = (token, chatId, schema) => operations.authedGet(`/agent/chats/${chatId}`, asSignIn(token), schema);

const renameChat = (token, chatId, body, schema) =>
  operations.authedPatch(`/agent/chats/${chatId}`, body, asSignIn(token), schema);

const deleteChat = (token, chatId, schema) =>
  operations.authedDelete(`/agent/chats/${chatId}`, asSignIn(token), schema);

const getConfig = (token, schema) => operations.authedGet('/agent/config', asSignIn(token), schema);

// The three step routes and the result report.
const startChat = (token, body, schema) => operations.authedPost('/agent/chats', body, asSignIn(token), schema);

const sendMessage = (token, chatId, body, schema) =>
  operations.authedPost(`/agent/chats/${chatId}/messages`, body, asSignIn(token), schema);

const continueChat = (token, chatId, schema) =>
  operations.authedPost(`/agent/chats/${chatId}/continue`, {}, asSignIn(token), schema);

const reportToolCall = (token, chatId, toolCallId, body, schema) =>
  operations.authedPut(`/agent/chats/${chatId}/toolCalls/${toolCallId}`, body, asSignIn(token), schema);

// The review page's routes, super admins only.
const reviewMembers = (token, schema) => operations.authedGet('/agent/review/members', asSignIn(token), schema);

const reviewMemberChats = (token, donorId, schema) =>
  operations.authedGet(`/agent/review/members/${donorId}/chats`, asSignIn(token), schema);

const reviewChat = (token, chatId, schema) => operations.authedGet(`/agent/review/chats/${chatId}`, asSignIn(token), schema);

const exportChat = (token, chatId, schema) =>
  operations.authedGet(`/agent/review/chats/${chatId}/export`, asSignIn(token), schema);

const deleteChatPermanently = (token, chatId, schema) =>
  operations.authedDelete(`/agent/review/chats/${chatId}`, asSignIn(token), schema);

/**
 * These suites have no OpenAI key and must never spend money: every step they send is expected to
 * stop at the key check. If the backend they run against has a key (someone put one in the root
 * .env to try the agent), a step would make a real, billed model call — so refuse to go on, and
 * say why.
 */
async function assertAgentNotConfigured() {
  const signInResponse = await operations.signInSuperAdmin();
  const response = await operations.authedGet('/agent/config', signInResponse);
  if (response.data.configured !== false) {
    throw new Error(
      'The backend under test has OPENAI_API_KEY set, so these step tests would make real, billed ' +
        'model calls. Recreate the backend without it: OPENAI_API_KEY= docker compose up -d --force-recreate backend'
    );
  }
}

// --- the internal-server fixtures -----------------------------------------------------------
// They sit beside the purge route, which is already how these suites reset the database, so their
// address is derived from that one setting rather than configured a second time.

const INTERNAL_BASE_URL = (process.env.BACKUP_PURGE_URL || 'http://localhost:4000/purge-local-db')
  .replace(/\/purge-local-db$/, '');

/**
 * Write chats straight into the database. See seedAgentChatsController for the body; `seq` and
 * `messageCount` are assigned by the fixture from the order of `messages`.
 *
 * Returns the seeded chats in the order given, each with its `_id` and its messages' ids.
 */
async function seedChats(chats) {
  const response = await axios.post(`${INTERNAL_BASE_URL}/seed/agentChats`, { chats });
  const seeded = response.data.chats;
  if (!Array.isArray(seeded) || seeded.length !== chats.length) {
    throw new Error(
      `The internal seed fixture returned ${Array.isArray(seeded) ? seeded.length : 'no'} chats, ` +
        `expected ${chats.length}. Without them these suites verify nothing.`
    );
  }
  return seeded;
}

async function seedChat(chat) {
  const [seeded] = await seedChats([chat]);
  return seeded;
}

/** A chat exactly as stored, deleted or not: { chat: <document> | null, storedMessageCount }. */
async function inspectChat(chatId) {
  const response = await axios.get(`${INTERNAL_BASE_URL}/inspect/agentChats/${chatId}`);
  return response.data;
}

// A short, ordinary exchange: a question, an answer that asks for one GET, its result, and the
// final answer. Every role appears once or more.
function sampleMessages() {
  return [
    { role: 'user', content: 'How many O+ donors are in Ahsanullah hall?' },
    {
      role: 'assistant',
      content: '',
      openaiModel: 'gpt-6-luna',
      usage: { prompt_tokens: 1200, completion_tokens: 40 },
      toolCalls: [
        { id: 'call_1', type: 'function', function: { name: 'SearchDonors', arguments: '{"bloodGroup":4,"hall":0}' } },
      ],
    },
    {
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"status":"OK","filteredDonors":[]}',
      run: {
        status: 'done',
        name: 'SearchDonors',
        label: 'Search for donors filtered by criteria',
        method: 'GET',
        path: '/search/v3?bloodGroup=4&hall=0',
        args: { bloodGroup: 4, hall: 0 },
        body: null,
        isWrite: false,
        httpStatus: 200,
        durationMs: 140,
        response: '{"status":"OK","filteredDonors":[]}',
        note: '',
      },
    },
    { role: 'assistant', content: 'There are no O+ donors in Ahsanullah hall.', openaiModel: 'gpt-6-luna' },
  ];
}

// A chat whose model calls were recorded (services/agent/callRecord.ts): the parts every call
// shares, each stored once on the chat, and a turn in which the first call failed and the next two
// answered. The keys have the shape the backend writes; here they only have to match each other.
const PART_KEYS = {
  systemPrompt: 'systemPrompt_0000000000000a01',
  tools: 'tools_0000000000000a02',
  settings: 'settings_0000000000000a03',
};

function recordedParts() {
  return {
    [PART_KEYS.systemPrompt]: 'You are Badhan AI. (the fixed part)',
    [PART_KEYS.tools]: [
      { type: 'function', function: { name: 'SearchDonors', description: 'Search', parameters: { type: 'object', properties: {} } } },
    ],
    [PART_KEYS.settings]: { model: 'gpt-6-luna', reasoning_effort: 'none' },
  };
}

// Seeded at seq 0 to 4: user, error, assistant (asks for a tool), tool, assistant (answers). Each
// stored response is what the backend keeps: OpenAI's answer minus what the message already holds.
function recordedMessages() {
  const toolCalls = [{ id: 'call_1', type: 'function', function: { name: 'SearchDonors', arguments: '{"bloodGroup":4,"hall":0}' } }];
  return [
    { role: 'user', content: 'How many O+ donors are in Ahsanullah hall?' },
    {
      role: 'error',
      modelCall: {
        parts: PART_KEYS,
        sessionNote: '## Session\n- Call 1',
        requestId: 'req_1',
        durationMs: 30000,
        error: { kind: 'quota', httpStatus: 429, body: '{"error":{"message":"Rate limit reached"}}' },
      },
    },
    {
      role: 'assistant',
      content: '',
      openaiModel: 'gpt-6-luna-2026-01-01',
      usage: { prompt_tokens: 1200, completion_tokens: 40 },
      toolCalls,
      modelCall: {
        parts: PART_KEYS,
        sessionNote: '## Session\n- Call 2',
        requestId: 'req_2',
        durationMs: 1500,
        response: {
          id: 'chatcmpl-2',
          object: 'chat.completion',
          created: 1794597056,
          choices: [{ index: 0, message: { role: 'assistant', content: null, refusal: null, annotations: [] }, logprobs: null, finish_reason: 'tool_calls' }],
          system_fingerprint: 'fp_2',
        },
        responseOmits: ['model', 'usage', 'toolCalls'],
      },
    },
    {
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"httpStatus":200,"body":{"status":"OK","filteredDonors":[]}}',
      run: {
        status: 'done',
        name: 'SearchDonors',
        label: 'Search for donors filtered by criteria',
        method: 'GET',
        path: '/search/v3?bloodGroup=4&hall=0',
        args: { bloodGroup: 4, hall: 0 },
        body: null,
        isWrite: false,
        httpStatus: 200,
        durationMs: 140,
        response: '{"status":"OK","filteredDonors":[]}',
        note: null,
      },
    },
    {
      role: 'assistant',
      content: 'There are no O+ donors in Ahsanullah hall.',
      openaiModel: 'gpt-6-luna-2026-01-01',
      usage: { prompt_tokens: 1300, completion_tokens: 12 },
      modelCall: {
        parts: PART_KEYS,
        sessionNote: '## Session\n- Call 3',
        requestId: 'req_3',
        durationMs: 900,
        response: {
          id: 'chatcmpl-3',
          object: 'chat.completion',
          created: 1794597060,
          choices: [{ index: 0, message: { role: 'assistant', refusal: null, annotations: [] }, logprobs: null, finish_reason: 'stop' }],
          system_fingerprint: 'fp_2',
        },
        responseOmits: ['model', 'usage', 'content'],
      },
    },
  ];
}

// badhanAxios rejects on any non-2xx, so an expected failure has to be caught.
async function expectStatus(request, expectedStatus) {
  try {
    await request();
  } catch (e) {
    if (!e.response) throw e;
    expect(e.response.status).toBe(expectedStatus);
    return e.response;
  }
  throw new Error(`Expected the request to fail with ${expectedStatus} but it succeeded`);
}

// A well-formed id that no chat has.
const UNKNOWN_CHAT_ID = '5e6b8b3f1c9d440000a1b2c3';

module.exports = {
  buildDonorInfo,
  createVolunteer,
  createHallAdmin,
  createSuperAdmin,
  createDemotedMemberHoldingToken,
  asSignIn,
  listChats,
  getChat,
  renameChat,
  deleteChat,
  getConfig,
  startChat,
  sendMessage,
  continueChat,
  reportToolCall,
  assertAgentNotConfigured,
  reviewMembers,
  reviewMemberChats,
  reviewChat,
  exportChat,
  deleteChatPermanently,
  seedChats,
  seedChat,
  inspectChat,
  sampleMessages,
  PART_KEYS,
  recordedParts,
  recordedMessages,
  expectStatus,
  UNKNOWN_CHAT_ID,
};
