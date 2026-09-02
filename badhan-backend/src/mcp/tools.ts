import { ApiCall, ApiResult } from './dispatch'
import { McpDispatchError, ToolCallResult, JSON_RPC } from './protocol'

// The curated tool table: one entry per job a member actually does, mapped onto the route that
// already does it. Hand-written rather than generated from swagger.json, and the cost of that is
// stated plainly: a route added next month is not a tool until somebody adds a row here. What is
// bought is descriptions written for a model to read, and a surface that is thirty-one tools
// rather than ninety, most of which would be guest mirrors and internal plumbing.
//
// The JSON Schema is hand-written too. tools/list transmits JSON Schema, so a validation library
// would exist only to be converted back into what is written here anyway — and it would be a new
// runtime dependency in a deployed backend.

export interface ToolAnnotations {
  readOnlyHint: boolean
  destructiveHint: boolean
  idempotentHint: boolean
}

export interface ToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: object
  annotations: ToolAnnotations
  toCall: (input: any) => ApiCall
}

// Annotations are not decoration. destructiveHint is what an MCP client reads to decide whether
// to ask the human first, and it is the mechanism that makes "full read/write from the start"
// survivable. Every DELETE, every designation change and update_donor carry it.
const READ: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
const ADD: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
const REPLACE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: true }
const REMOVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: true }

/* ── schema helpers ─────────────────────────────────────────────── */

const text = (description: string): object => ({ type: 'string', description })
const integer = (description: string): object => ({ type: 'integer', description })
const flag = (description: string): object => ({ type: 'boolean', description })

// additionalProperties: false mirrors the backend's own tsoa setting
// (noImplicitAdditionalProperties: "throw-on-extras"): a body with an unexpected key is a 400
// there, so a schema that quietly allowed one would be lying to the model.
const schema = (properties: Record<string, object>, required: string[]): object => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false
})

const NO_INPUT: object = { type: 'object', properties: {}, additionalProperties: false }

/* ── shared field text ──────────────────────────────────────────── */

const DONOR_ID: object = text('The donor\'s database id, as returned by search_donors or get_donor.')
const DATE_MS: object = integer('Unix timestamp in MILLISECONDS. Not an ISO string.')
const PHONE: object = integer('Phone number as a number, country code included, e.g. 8801500000000.')
const HALL: object = integer('Hall index: 0 Ahsan Ullah, 1 Sabekun Nahar Sony, 2 Kazi Nazrul Islam, 3 Dr. M. A. Rashid, 4 Sher-E-Bangla, 5 Suhrawardy, 6 Titumir, 8 (Unknown). 7 (Attached) is not allowed on a donor record.')
const BLOOD_GROUP: object = integer('Blood group index: 0 A+, 1 A-, 2 B+, 3 B-, 4 O+, 5 O-, 6 AB+, 7 AB-.')

// Search and the bookmark list share nine of their filters and all of their traps.
const searchFilterProperties = (): Record<string, object> => ({
  bloodGroup: integer('Blood group index (0 A+, 1 A-, 2 B+, 3 B-, 4 O+, 5 O-, 6 AB+, 7 AB-), or -1 for any. Defaults to -1.'),
  hall: HALL,
  batch: text('The two-digit batch of a student id, e.g. "19" for the 2019 intake. Omit or pass "" for any batch.'),
  name: text('Matched as a case-insensitive subsequence. Omit or pass "" for any name.'),
  address: text('Matched case-insensitively. Omit or pass "" for any address.'),
  isAvailable: flag('Include donors who are eligible to donate now. Defaults to true.'),
  isNotAvailable: flag('Include donors who are inside their waiting period. Defaults to true.'),
  availableToAll: flag('When true the hall filter is IGNORED and the search returns donors flagged available to every hall. Defaults to false.')
})

const searchFilterQuery = (input: any): Record<string, string | number | boolean> => ({
  bloodGroup: input.bloodGroup === undefined ? -1 : input.bloodGroup,
  hall: input.hall,
  batch: input.batch === undefined ? '' : input.batch,
  name: input.name === undefined ? '' : input.name,
  address: input.address === undefined ? '' : input.address,
  // Both default to true because the API intersects nothing when both are false: the pipeline
  // builds an empty $or and returns zero donors, which reads as "no such donor" and is not.
  isAvailable: input.isAvailable === undefined ? true : input.isAvailable,
  isNotAvailable: input.isNotAvailable === undefined ? true : input.isNotAvailable,
  availableToAll: input.availableToAll === undefined ? false : input.availableToAll
})

/* ── the table ──────────────────────────────────────────────────── */

export const TOOLS: ToolDefinition[] = [
  /* ── read ─────────────────────────────────────────────────────── */
  {
    name: 'whoami',
    title: 'Who am I',
    description: 'The profile of the member this connection acts as, including their designation (role) and hall. Call this FIRST in any session: every other tool is permitted or refused according to what comes back here, and a hall admin cannot read another hall.',
    inputSchema: NO_INPUT,
    annotations: READ,
    toCall: (): ApiCall => ({ method: 'GET', path: '/users/me' })
  },
  {
    name: 'search_donors',
    title: 'Search donors',
    description: [
      'The workhorse: find donors by blood group, hall, batch, name, address and availability.',
      '',
      '`hall` is REQUIRED and has no "any" sentinel — unlike bloodGroup, which takes -1 for any.',
      'There is no all-halls search: to look beyond one hall, set availableToAll true, which',
      'ignores `hall` and returns only donors flagged available to every hall. A hall admin',
      'searching a hall other than their own gets a 403.',
      '',
      'Everything else is optional and defaults to "any". Note that isAvailable and',
      'isNotAvailable both default to true: setting both to false returns an empty list rather',
      'than an error.'
    ].join('\n'),
    inputSchema: schema({
      ...searchFilterProperties(),
      archiveFlag: flag('true searches archived donors instead of active ones. Defaults to false.')
    }, ['hall']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/search/v3',
      query: {
        ...searchFilterQuery(input),
        archiveFlag: input.archiveFlag === undefined ? false : input.archiveFlag
      }
    })
  },
  {
    name: 'get_donor',
    title: 'Get a donor',
    description: 'The full profile of one donor: contact details, the comment, every donation and platelet donation, and the call records. This is the read half of the read-modify-write that update_donor requires.',
    inputSchema: schema({ donorId: DONOR_ID }, ['donorId']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({ method: 'GET', path: '/donors', query: { donorId: input.donorId } })
  },
  {
    name: 'find_donor_by_phone',
    title: 'Find donors by phone number',
    description: 'Look up one or more phone numbers and get back the donors that hold them. Use it when someone gives a phone number rather than a name.',
    inputSchema: schema({
      phoneList: {
        type: 'array',
        items: { type: 'integer' },
        minItems: 1,
        description: 'Phone numbers as numbers, country code included, e.g. [8801500000000].'
      }
    }, ['phoneList']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({ method: 'GET', path: '/donors/phone', query: { phoneList: input.phoneList } })
  },
  {
    name: 'check_duplicate_donor',
    title: 'Check for a duplicate phone number',
    description: 'Whether a phone number is already on a donor record. Call this BEFORE create_donor: the phone number is the identity of a donor, and creating a second record for one splits their donation history in two.',
    inputSchema: schema({ phone: PHONE }, ['phone']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({ method: 'GET', path: '/donors/checkDuplicate', query: { phone: input.phone } })
  },
  {
    name: 'list_members',
    title: 'List the members of my hall',
    description: 'The volunteers and admins of the caller\'s own hall — the people, not the donors. It takes no arguments: the hall is the caller\'s, taken from the token.',
    inputSchema: NO_INPUT,
    annotations: READ,
    toCall: (): ApiCall => ({ method: 'GET', path: '/donors/designation' })
  },
  {
    name: 'list_all_donors',
    title: 'List every donor',
    description: 'Every donor in the database, of every hall. SUPER ADMIN ONLY — a volunteer or hall admin gets a 403. It returns a large list; prefer search_donors when the question has any filter in it at all.',
    inputSchema: schema({
      archiveFlag: flag('true lists archived donors instead of active ones. Defaults to false.')
    }, []),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/donors/all',
      query: { archiveFlag: input.archiveFlag === undefined ? false : input.archiveFlag }
    })
  },
  {
    name: 'list_recent_donors',
    title: 'List recently created donors',
    description: 'Donor records created inside a time window — who was added to the database, and by whom. Hall admin or above.',
    inputSchema: schema({
      startTime: integer('Start of the window, Unix milliseconds, inclusive.'),
      endTime: integer('End of the window, Unix milliseconds.')
    }, ['startTime', 'endTime']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/donors/new',
      query: { startTime: input.startTime, endTime: input.endTime }
    })
  },
  {
    name: 'list_bookmarked_donors',
    title: 'List bookmarked donors',
    description: 'The bookmarked ("active") donors — the shortlist volunteers keep of people worth calling — filtered exactly as search_donors is, plus markedByMe. Same rules: `hall` is required and has no any-sentinel.',
    inputSchema: schema({
      ...searchFilterProperties(),
      markedByMe: flag('true returns only the donors the caller bookmarked themselves. Defaults to false.')
    }, ['hall']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/activeDonors',
      query: {
        ...searchFilterQuery(input),
        markedByMe: input.markedByMe === undefined ? false : input.markedByMe,
        // Required by the route's validator but read by nothing downstream. Sending it is what
        // keeps this call out of a 400; it is deliberately not exposed as a tool input.
        availableToAllOrHall: false
      }
    })
  },
  {
    name: 'get_donation_report',
    title: 'Blood donation report',
    description: 'Counts of blood donations over a date range, broken down by blood group and hall. SUPER ADMIN ONLY. Use get_donation_report_donors to see the donations behind one cell.',
    inputSchema: schema({
      startDate: integer('Start of the range, Unix milliseconds.'),
      endDate: integer('End of the range, Unix milliseconds.')
    }, ['startDate', 'endDate']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/donations/report',
      query: { startDate: input.startDate, endDate: input.endDate }
    })
  },
  {
    name: 'get_donation_report_donors',
    title: 'Donors behind a report cell',
    description: 'The individual donations behind one cell of the blood donation report. SUPER ADMIN ONLY. Here -1 IS meaningful in both directions: bloodGroup -1 is the report\'s "Total" column and hall -1 is its "All Halls" row.',
    inputSchema: schema({
      startDate: integer('Start of the range, Unix milliseconds.'),
      endDate: integer('End of the range, Unix milliseconds.'),
      bloodGroup: integer('Blood group index 0-7, or -1 for the Total column.'),
      hall: integer('Hall index 0-6 or 8, or -1 for All Halls.')
    }, ['startDate', 'endDate', 'bloodGroup', 'hall']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/donations/report/donors',
      query: { startDate: input.startDate, endDate: input.endDate, bloodGroup: input.bloodGroup, hall: input.hall }
    })
  },
  {
    name: 'get_platelet_report',
    title: 'Platelet donation report',
    description: 'Counts of platelet donations over a date range, broken down by blood group and hall. SUPER ADMIN ONLY.',
    inputSchema: schema({
      startDate: integer('Start of the range, Unix milliseconds.'),
      endDate: integer('End of the range, Unix milliseconds.')
    }, ['startDate', 'endDate']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/platelet-donations/report',
      query: { startDate: input.startDate, endDate: input.endDate }
    })
  },
  {
    name: 'get_platelet_report_donors',
    title: 'Donors behind a platelet report cell',
    description: 'The individual platelet donations behind one cell of the platelet report. SUPER ADMIN ONLY. bloodGroup -1 is the "Total" column and hall -1 is "All Halls".',
    inputSchema: schema({
      startDate: integer('Start of the range, Unix milliseconds.'),
      endDate: integer('End of the range, Unix milliseconds.'),
      bloodGroup: integer('Blood group index 0-7, or -1 for the Total column.'),
      hall: integer('Hall index 0-6 or 8, or -1 for All Halls.')
    }, ['startDate', 'endDate', 'bloodGroup', 'hall']),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/platelet-donations/report/donors',
      query: { startDate: input.startDate, endDate: input.endDate, bloodGroup: input.bloodGroup, hall: input.hall }
    })
  },
  {
    name: 'get_statistics',
    title: 'Database statistics',
    description: 'Headline counts for the whole database — donors, donations, volunteers and so on. SUPER ADMIN ONLY.',
    inputSchema: NO_INPUT,
    annotations: READ,
    toCall: (): ApiCall => ({ method: 'GET', path: '/log/statistics' })
  },
  {
    name: 'list_activity_log',
    title: 'App activity log',
    description: 'The audit trail behind the App Activity page: one row per recorded action, carrying who did it (name and hall), what they did, and when. SUPER ADMIN ONLY. This is where a tool call made through this server shows up, attributed to the member whose token it used.',
    inputSchema: NO_INPUT,
    annotations: READ,
    toCall: (): ApiCall => ({ method: 'GET', path: '/log' })
  },
  {
    name: 'list_public_contacts',
    title: 'List public contacts',
    description: 'The donors published as public points of contact, by blood group. This is the one read that needs no permission at all — it is the list the public landing page shows.',
    inputSchema: NO_INPUT,
    annotations: READ,
    toCall: (): ApiCall => ({ method: 'GET', path: '/publicContacts' })
  },
  {
    name: 'list_messages',
    title: 'Read the member room',
    description: [
      'One page of the shared member room, oldest-first. Volunteer or above.',
      '',
      'Three reads, one tool, chosen by which cursor is given:',
      '  no cursor                      the newest `limit` messages (start here)',
      '  after                          everything strictly newer than that timestamp',
      '  before + beforeId (together)   the page older than that message (scrolling up)',
      '',
      '`after` and `before` are mutually exclusive, and `before` and `beforeId` must travel',
      'together; anything else is a 400.'
    ].join('\n'),
    inputSchema: schema({
      after: integer('Return messages strictly newer than this Unix millisecond timestamp.'),
      before: integer('Return the page older than this Unix millisecond timestamp. Must be sent with beforeId.'),
      beforeId: text('The id of the message `before` refers to. Must be sent with before.'),
      limit: integer('How many messages to return.')
    }, []),
    annotations: READ,
    toCall: (input: any): ApiCall => ({
      method: 'GET',
      path: '/messages',
      query: {
        ...(input.after === undefined ? {} : { after: input.after }),
        ...(input.before === undefined ? {} : { before: input.before }),
        ...(input.beforeId === undefined ? {} : { beforeId: input.beforeId }),
        ...(input.limit === undefined ? {} : { limit: input.limit })
      }
    })
  },

  /* ── write ────────────────────────────────────────────────────── */
  {
    name: 'log_donation',
    title: 'Log a blood donation',
    description: 'Record that a donor gave blood on a date. The date is Unix MILLISECONDS — resolve a phrase like "last Tuesday" to a timestamp before calling, and prefer midnight of the day meant.',
    inputSchema: schema({
      donorId: DONOR_ID,
      date: DATE_MS,
      phone: integer('Optional. The donor\'s phone number, if it is being corrected at the same time.')
    }, ['donorId', 'date']),
    annotations: ADD,
    toCall: (input: any): ApiCall => ({
      method: 'POST',
      path: '/donations',
      body: {
        donorId: input.donorId,
        date: input.date,
        ...(input.phone === undefined ? {} : { phone: input.phone })
      }
    })
  },
  {
    name: 'delete_donation',
    title: 'Delete a blood donation',
    description: 'Remove a recorded blood donation. The date must match the stored one exactly, to the millisecond — read it off get_donor rather than recomputing it.',
    inputSchema: schema({ donorId: DONOR_ID, date: DATE_MS }, ['donorId', 'date']),
    annotations: REMOVE,
    toCall: (input: any): ApiCall => ({
      method: 'DELETE',
      path: '/donations',
      query: { donorId: input.donorId, date: input.date }
    })
  },
  {
    name: 'log_platelet_donation',
    title: 'Log a platelet donation',
    description: 'Record that a donor gave platelets on a date. Platelets are tracked separately from blood and carry a shorter waiting period; do not use this for a whole-blood donation.',
    inputSchema: schema({ donorId: DONOR_ID, date: DATE_MS }, ['donorId', 'date']),
    annotations: ADD,
    toCall: (input: any): ApiCall => ({
      method: 'POST',
      path: '/platelet-donations',
      body: { donorId: input.donorId, date: input.date }
    })
  },
  {
    name: 'delete_platelet_donation',
    title: 'Delete a platelet donation',
    description: 'Remove a recorded platelet donation. The date must match the stored one exactly, to the millisecond.',
    inputSchema: schema({ donorId: DONOR_ID, date: DATE_MS }, ['donorId', 'date']),
    annotations: REMOVE,
    toCall: (input: any): ApiCall => ({
      method: 'DELETE',
      path: '/platelet-donations',
      query: { donorId: input.donorId, date: input.date }
    })
  },
  {
    name: 'add_call_record',
    title: 'Record a call to a donor',
    description: 'Note that the caller telephoned this donor, timestamped now. It records THAT a call happened, not what was said — put anything worth keeping in update_donor_comment.',
    inputSchema: schema({ donorId: DONOR_ID }, ['donorId']),
    annotations: ADD,
    toCall: (input: any): ApiCall => ({ method: 'POST', path: '/callrecords', body: { donorId: input.donorId } })
  },
  {
    name: 'delete_call_record',
    title: 'Delete a call record',
    description: 'Remove one call record. Both ids come from get_donor, which lists the donor\'s call records with their ids.',
    inputSchema: schema({
      donorId: DONOR_ID,
      callRecordId: text('The call record\'s id, from get_donor.')
    }, ['donorId', 'callRecordId']),
    annotations: REMOVE,
    toCall: (input: any): ApiCall => ({
      method: 'DELETE',
      path: '/callrecords',
      query: { donorId: input.donorId, callRecordId: input.callRecordId }
    })
  },
  {
    name: 'create_donor',
    title: 'Create a donor',
    description: 'Add a new donor record. Call check_duplicate_donor first — the phone number identifies a donor, and a second record for the same person splits their history. studentId is a 7-digit STRING, e.g. "1905005": batch 19, department 05, roll 005.',
    inputSchema: schema({
      phone: PHONE,
      name: text('The donor\'s full name.'),
      studentId: text('7-digit student id as a string, e.g. "1905005".'),
      bloodGroup: BLOOD_GROUP,
      hall: HALL,
      address: text('Home or current address. Pass "" if unknown.'),
      roomNumber: text('Hall room number. Pass "" if unknown.'),
      comment: text('Free-text note about the donor. Pass "" if there is none.'),
      fatherName: text('Father\'s name. Pass "" if unknown.'),
      motherName: text('Mother\'s name. Pass "" if unknown.'),
      availableToAll: flag('true makes the donor visible to volunteers of every hall, not just their own.'),
      extraDonationCount: integer('Donations made before this record existed, counted but not dated. Pass 0 if there are none.'),
      extraPlateletDonationCount: integer('Optional. Platelet donations made before this record existed.'),
      lastDonation: integer('Optional. Date of their most recent blood donation, Unix milliseconds. 0 means never.'),
      lastPlateletDonation: integer('Optional. Date of their most recent platelet donation, Unix milliseconds. 0 means never.'),
      batch: integer('Optional. Rarely needed: the batch is normally read off studentId.')
    }, ['phone', 'name', 'studentId', 'bloodGroup', 'hall', 'address', 'roomNumber', 'comment', 'fatherName', 'motherName', 'availableToAll', 'extraDonationCount']),
    annotations: ADD,
    toCall: (input: any): ApiCall => ({ method: 'POST', path: '/donors', body: { ...input } })
  },
  {
    name: 'update_donor',
    title: 'Update a donor (whole record)',
    description: [
      'Replaces a donor\'s record. THIS IS NOT A PARTIAL UPDATE: every field listed is required,',
      'and a call that names three of them wipes the rest.',
      '',
      'So: call get_donor first, take the donor it returns, change only the fields you mean to',
      'change, and send the whole object back. Never assemble this body from what the member',
      'said alone.',
      '',
      'It does not touch donations, call records or the comment — use update_donor_comment for',
      'the comment.'
    ].join('\n'),
    inputSchema: schema({
      donorId: DONOR_ID,
      name: text('The donor\'s full name.'),
      phone: PHONE,
      studentId: text('7-digit student id as a string, e.g. "1905005".'),
      bloodGroup: BLOOD_GROUP,
      hall: HALL,
      address: text('Home or current address.'),
      roomNumber: text('Hall room number.'),
      fatherName: text('Father\'s name.'),
      motherName: text('Mother\'s name.'),
      email: text('Email address. Pass "" if there is none.'),
      availableToAll: flag('true makes the donor visible to volunteers of every hall.'),
      archiveFlag: flag('true moves the donor into the archive, out of ordinary search results.'),
      isCertificateEnabled: flag('true lets the donor download a donation certificate.')
    }, ['donorId', 'name', 'phone', 'studentId', 'bloodGroup', 'hall', 'address', 'roomNumber', 'fatherName', 'motherName', 'email', 'availableToAll', 'archiveFlag', 'isCertificateEnabled']),
    annotations: REPLACE,
    toCall: (input: any): ApiCall => ({ method: 'PATCH', path: '/donors/v2', body: { ...input } })
  },
  {
    name: 'update_donor_comment',
    title: 'Replace a donor\'s comment',
    description: 'Sets the free-text note on a donor. It REPLACES the existing comment rather than appending to it, so read the current one with get_donor first if the intent is to add to it.',
    inputSchema: schema({
      donorId: DONOR_ID,
      comment: text('The new comment, replacing whatever is there. Pass "" to clear it.')
    }, ['donorId', 'comment']),
    annotations: REPLACE,
    toCall: (input: any): ApiCall => ({
      method: 'PATCH',
      path: '/donors/comment',
      body: { donorId: input.donorId, comment: input.comment }
    })
  },
  {
    name: 'change_designation',
    title: 'Change a member\'s role',
    description: [
      'Sets a donor\'s designation to an explicit level: 0 donor, 1 volunteer, 2 hall admin,',
      '3 super admin. This grants or removes access to the app, so confirm with the member',
      'before calling it.',
      '',
      'A hall admin may only move people between 0 and 1, and only inside their own hall. A',
      'super admin may additionally promote a VOLUNTEER to 2 or 3, and demote a super admin',
      'back to 1. Levels 2 and 3 are always reached through 1, and a hall admin is never',
      'demoted directly — that happens only as a side effect of promoting somebody else.'
    ].join('\n'),
    inputSchema: schema({
      donorId: DONOR_ID,
      designation: integer('Target level: 0 donor, 1 volunteer, 2 hall admin, 3 super admin.')
    }, ['donorId', 'designation']),
    annotations: REPLACE,
    toCall: (input: any): ApiCall => ({
      method: 'PATCH',
      path: '/donors/designation',
      body: { donorId: input.donorId, designation: input.designation }
    })
  },
  {
    name: 'delete_donor',
    title: 'Delete a donor',
    description: 'Permanently removes a donor and their donation history. There is no undo. If the intent is to hide someone rather than erase them, set archiveFlag with update_donor instead — that is almost always what is actually wanted.',
    inputSchema: schema({ donorId: DONOR_ID }, ['donorId']),
    annotations: REMOVE,
    toCall: (input: any): ApiCall => ({ method: 'DELETE', path: '/donors', query: { donorId: input.donorId } })
  },
  {
    name: 'bookmark_donor',
    title: 'Bookmark a donor',
    description: 'Adds a donor to the shared bookmarked ("active donor") list, which every volunteer can see, attributed to the caller.',
    inputSchema: schema({ donorId: DONOR_ID }, ['donorId']),
    annotations: ADD,
    toCall: (input: any): ApiCall => ({ method: 'POST', path: '/activeDonors', body: { donorId: input.donorId } })
  },
  {
    name: 'unbookmark_donor',
    title: 'Remove a bookmark',
    description: 'Removes a donor from the shared bookmarked list. It removes the bookmark only; the donor record is untouched.',
    inputSchema: schema({ donorId: DONOR_ID }, ['donorId']),
    annotations: ADD,
    toCall: (input: any): ApiCall => ({ method: 'DELETE', path: `/activeDonors/${encodeURIComponent(String(input.donorId))}` })
  },
  {
    name: 'send_message',
    title: 'Post to the member room',
    description: 'Posts one message to the shared member room, visible to every volunteer and admin. Volunteer or above. The body is the text and nothing else — the sender is the token\'s owner and the timestamp is the server\'s.',
    inputSchema: schema({ text: text('The message to post.') }, ['text']),
    annotations: ADD,
    toCall: (input: any): ApiCall => ({ method: 'POST', path: '/messages', body: { text: input.text } })
  }
]

/* ── lookup and result shaping ──────────────────────────────────── */

const TOOLS_BY_NAME: Map<string, ToolDefinition> = new Map(
  TOOLS.map((tool: ToolDefinition): [string, ToolDefinition] => [tool.name, tool])
)

// What tools/list transmits: everything but toCall, which is this server's private business.
export const listToolDefinitions = (): object[] => {
  return TOOLS.map((tool: ToolDefinition): object => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations
  }))
}

export const findTool = (name: string): ToolDefinition => {
  const tool: ToolDefinition | undefined = TOOLS_BY_NAME.get(name)
  if (!tool) {
    throw new McpDispatchError(`Unknown tool: ${name}`, JSON_RPC.METHOD_NOT_FOUND)
  }
  return tool
}

// JSON as text rather than structuredContent: the API's responses are already JSON carrying a
// `message` a model can act on, and an output schema for thirty-one routes would say nothing new.
// On a failure the envelope's message leads, so a 403's reason survives into the model's context
// instead of being buried at the end of a body it may not read.
export const toToolResult = (result: ApiResult): ToolCallResult => {
  const isError: boolean = result.statusCode >= 400
  const message: string = result.body && typeof result.body.message === 'string' ? result.body.message : ''
  const payload: string = JSON.stringify(result.body, null, 2)
  return {
    content: [{
      type: 'text',
      text: isError ? `HTTP ${result.statusCode}: ${message}\n\n${payload}` : payload
    }],
    isError
  }
}
