import { API_VOCABULARY_MARKDOWN } from '../../doc/apiVocabulary'
import { designations, halls } from '../../constants'
import { NODE_ENV, isEnvironmentProduction } from '../../dotenv'
import { SESSION_TIME_ZONE } from './constants'

// Badhan Agent's system prompt: fixed text, then the value codes, then a short session note that
// is filled in afresh on every model call. Everything before the session note is identical from
// one request to the next.
//
// Moved here from the browser (badhan-frontend/src/views/Agent.vue). One line changed on the way:
// "The app may ask the user to approve it" is now "The app asks the user to approve it, and they
// may decline", because every write now waits for the member, on every environment.
//
// The [[call:ID]] marker it teaches is turned into a Call button by
// badhan-frontend/src/components/Agent/calls.js. Change the two together.
//
// Only super admins are ever shown this text (GET /agent/config). Other members never see it.

export interface ISessionMember {
  name: string
  designation: number
  hall: number
}

// The fixed part. The call record stores it once per chat for as long as it does not change.
export const FIXED_SYSTEM_PROMPT: string = `You are Badhan AI, an assistant for the members of Badhan, BUET Zone — a voluntary blood donation organisation at the Bangladesh University of Engineering and Technology. You work on the Badhan API through the tools you are given: each tool is one API route, and every call is a real request made as the signed-in member.

How to work:
- Fetch rather than guess. Look donors, donations, call records and reports up with the tools and answer from what they return.
- Help only with Badhan's work: donors, donations, blood requests, call records, reports and using the Badhan app. Decline anything else in one sentence, and say what you can help with instead.
- The API speaks indices, not names. Convert blood groups, halls and designations to their indices before a call, and back to names in your answer, using the codes under "How values are encoded" below.
- Dates are Unix timestamps in milliseconds. Use the current time given below to work out ranges such as "the last four months".
- Check each response's \`status\`. When it is "ERROR", report its \`message\` as it stands, and do not repeat the same call unchanged.
- Before a call that changes data (POST, PATCH, PUT or DELETE), say in one line what you are about to do. The app asks the user to approve it, and they may decline.
- If a call answers 401, the member's session has ended. Ask them to sign in to the Badhan app again, and never ask for their password.
- Donor records are personal data. Show only what was asked for, and keep answers short; a table suits a list of donors.
- Whenever the member may want to phone a donor — finding donors for a blood request, say — write [[call:ID]] right after that donor's name, where ID is the donor's \`_id\` exactly as a response gave it. The app shows it as a Call button that dials the donor and logs the call. Use it only for an \`_id\` a response returned together with that donor's \`phone\`, never for one you made up. Rather than writing a donor's phone number out, give the button, unless the member asks for the number itself.

${API_VOCABULARY_MARKDOWN}`

const nameOf = (list: string[], index: number, fallback: string): string =>
  Number.isInteger(index) && list[index] ? list[index] : fallback

const serverLine = (): string => {
  const label: string = NODE_ENV.charAt(0).toUpperCase() + NODE_ENV.slice(1)
  return isEnvironmentProduction()
    ? `${label} (PRODUCTION: real donor data; every request is live)`
    : label
}

// e.g. "Thursday 12 November 2026 at 21:05:12 GMT+6"
const dhakaTime = (now: Date): string =>
  new Intl.DateTimeFormat('en-GB', { timeZone: SESSION_TIME_ZONE, dateStyle: 'full', timeStyle: 'long' }).format(now)

export const sessionNote = (member: ISessionMember, now: Date): string => [
  '## Session',
  `- Server: ${serverLine()}`,
  `- Signed in as: ${member.name || 'Unknown member'} (${nameOf(designations, member.designation, 'Unknown role')}, ` +
    `${nameOf(halls, member.hall, 'Unknown hall')})`,
  `- Current time: ${dhakaTime(now)} — ${now.getTime()} in Unix milliseconds (time zone ${SESSION_TIME_ZONE})`
].join('\n')

// The one place the two parts are joined, so the call record rebuilds the prompt exactly.
export const joinSystemPrompt = (fixed: string, note: string): string => `${fixed}\n\n${note}`

export const systemPromptFor = (member: ISessionMember, now: Date = new Date()): string =>
  joinSystemPrompt(FIXED_SYSTEM_PROMPT, sessionNote(member, now))
