import { environmentService } from '@/mixins/environment'

// The prompt is kept as an array of single-quoted lines rather than one template literal on
// purpose: it is markdown, it is full of `backticks`, and a template literal would need every
// one of them escaped — which is exactly the kind of noise that rots a document nobody reads
// in source form. Placeholders are substituted in buildAIIntegrationPrompt below.
const PROMPT_TEMPLATE_LINES: string[] = [
  'You are working against the **Badhan API** — the backend of Badhan, a voluntary blood-donation',
  'platform run by BUET students. Everything below is what you need to call it.',
  '',
  '## Server',
  '',
  '| Environment | Base URL |',
  '| --- | --- |',
  '| {{ENVIRONMENT}} | `{{BASE_URL}}` |',
  '',
  'This is the environment the token below belongs to. A token minted on one environment is',
  'not valid on any other, so do not point these calls at a different host.',
  '',
  '## Documentation',
  '',
  '- Raw OpenAPI 3 spec (JSON): **{{BASE_URL}}/openapi.json**',
  '',
  'Fetch `/openapi.json` first and read it. It is the authoritative, generated list of every',
  'route, parameter, request body and response shape — prefer it over any assumption. Nothing',
  'below replaces it; it only tells you what the spec cannot.',
  '',
  '**Read its `info.description` before constructing a single request.** The API speaks integer',
  'indices rather than names — blood groups, halls and roles are numbers, dates are milliseconds,',
  'and a student ID is a structured 7-digit string — and that section, with the per-field',
  '`description` and `enum` on each schema, is where those mappings are written down. Guessing',
  'them produces requests that validate and mean the wrong thing.',
  '',
  '## Authentication',
  '',
  'Send the token in the **`x-auth`** request header on every authenticated call. It is',
  'not an `Authorization: Bearer` header — the header name is literally `x-auth`.',
  '',
  '```',
  'x-auth: {{TOKEN}}',
  '```',
  '',
  'Token to use:',
  '',
  '```',
  '{{TOKEN}}',
  '```',
  '',
  '**This token expires at {{EXPIRES_AT}}** — {{DURATION_LABEL}} after the file was made. It is a',
  'temporary token, not the sign-in that produced it: when it lapses, every call answers `401` and',
  'the only fix is a fresh file from the app. Do not try to renew it.',
  '',
  'Notes on auth:',
  '',
  '- The token is a JWT tied to a server-side session row. `401 Invalid Authentication` means the',
  '  JWT itself failed to verify or has expired; `401 You have been logged out` means the session',
  '  row is gone (the person signed out) — in either case, stop and ask for a fresh file rather',
  '  than retrying.',
  '- **Never call `POST /users/redirection`.** It mints another token from this one, which would',
  '  outlive the access you were deliberately given for {{DURATION_LABEL}}. There is no route that',
  '  turns this token into a permanent one, and looking for one is not the task.',
  '- Do not sign in as anybody. `POST /users/signin` needs a password you were not given, and',
  '  asking for one is not a way around an expired token.',
  '- Never call `DELETE /users/signout` or `DELETE /users/signout/all` — they end the session this',
  '  token hangs off, signing the person out of their own app.',
  '',
  '## Response envelope',
  '',
  'Every JSON response carries `status` (`"OK"` or `"ERROR"`), `statusCode`, and `message`, with',
  'the payload alongside on success. Check `status`, not just the HTTP code.',
  '',
  '```json',
  '{ "status": "OK", "statusCode": 200, "message": "Donors queried successfully", "donors": [ ... ] }',
  '```',
  '',
  '## Permission model (the server enforces it; expect 403s)',
  '',
  'A Donor sees only themselves. A Volunteer can search and record donations. A Hall Admin acts',
  'within their own hall only. A Super Admin has cross-hall access and is the only role allowed on',
  'the report, `/donors/all` and `/volunteers/all` endpoints. If a call returns 403, the account',
  'behind the token lacks the role — do not try to route around it.',
  '',
  '## Rate limits',
  '',
  'Endpoints are rate-limited per IP, typically 3–20 requests per minute (sign-in is 3 per 5',
  'minutes). On `429`, back off; do not hammer or parallelise bulk loops.',
  '',
  '## Working rules',
  '',
  '1. Read `/openapi.json` before constructing any request.',
  '2. Treat this server as live: read freely, but confirm before any `POST`, `PATCH` or `DELETE`',
  '   that writes donor, donation, call-record or message data.',
  '3. Report the server\'s `message` verbatim when something fails — it is specific and useful.',
  ''
]

export const AI_PROMPT_FILE_NAME = 'badhan-api-prompt.md'

// What the page asks POST /users/redirection for. Thirty minutes is long enough to be worth
// handing to an assistant and short enough that a leaked file is a stale file by the time
// anyone finds it — the session token in local storage, by contrast, never expires.
export const AI_TOKEN_DURATION_SECONDS = 30 * 60
export const AI_TOKEN_DURATION_LABEL = '30 minutes'

// The base URL the file should name: the one this app is actually talking to, guest suffix and
// all, so a file downloaded from a guest session does not send an AI at the real backend.
export const getAIPromptBaseURL = (isGuest: boolean): string => {
  const base = environmentService.getAPIBaseURL()
  return isGuest ? base + '/guest' : base
}

export const buildAIIntegrationPrompt = (token: string, baseURL: string, environmentName: string, expiresAt: string): string => {
  // Function replacements, not string ones: a `$&` or `$1` inside a JWT would otherwise be read
  // as a substitution pattern rather than as the character it is.
  return PROMPT_TEMPLATE_LINES.join('\n')
    .replace(/\{\{TOKEN\}\}/g, () => token)
    .replace(/\{\{BASE_URL\}\}/g, () => baseURL)
    .replace(/\{\{ENVIRONMENT\}\}/g, () => environmentName)
    .replace(/\{\{EXPIRES_AT\}\}/g, () => expiresAt)
    .replace(/\{\{DURATION_LABEL\}\}/g, () => AI_TOKEN_DURATION_LABEL)
}
