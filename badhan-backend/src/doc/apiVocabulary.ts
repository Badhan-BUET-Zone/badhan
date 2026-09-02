// The one copy of the prose that tells a caller a blood group is `2` and not "B+".
//
// It used to live as a single escaped string inside `info.description` in tsoa.json, which was
// fine while the OpenAPI spec was its only reader. The MCP handshake needs the same text as its
// `instructions`, and a second copy would drift inside a release — so it lives here, and both
// consumers read it:
//
//   - scripts/trim-openapi.js appends it to `info.description` of the generated spec, which is
//     why `npm run build` compiles before it runs the spec step (that script requires the
//     compiled dist/doc/apiVocabulary.js).
//   - the MCP server returns MCP_INSTRUCTIONS_MARKDOWN from `initialize`.
//
// Kept as an array of single-quoted lines rather than one template literal, for the same reason
// and in the same shape as badhan-frontend/src/mixins/aiPrompt.ts: it is markdown full of
// `backticks`, and a template literal would need every one of them escaped.
export const API_VOCABULARY_MARKDOWN: string = [
  '## How values are encoded',
  '',
  'The API speaks **indices, not names**. A client that sends `"B+"` where a blood group belongs',
  'gets a validation error; the value is `2`. The mappings below are the whole vocabulary, and the',
  'individual fields below repeat them where they appear.',
  '',
  '**Blood group** — `0` A+, `1` A-, `2` B+, `3` B-, `4` O+, `5` O-, `6` AB+, `7` AB-.',
  '`-1` is a search-only sentinel meaning *any blood group*; no stored record holds it.',
  'Public contacts accept Rh-positive groups only (`0`, `2`, `4`, `6`).',
  '',
  '**Hall** — `0` Ahsan Ullah, `1` Sabekun Nahar Sony, `2` Kazi Nazrul Islam, `3` Dr. M. A. Rashid,',
  '`4` Sher-E-Bangla, `5` Suhrawardy, `6` Titumir, `7` Attached, `8` (Unknown).',
  'A donor record may hold any of these **except `7` Attached**. `8` means the hall was never',
  'recorded, and `-1` is a search and report-drill-down sentinel meaning *any hall*.',
  'Halls `0`-`6` are the residence halls a hall admin is scoped to; `7` and `8` belong to nobody,',
  'so no hall admin can act on those records.',
  '',
  '**Designation** (role) — `0` Donor, `1` Volunteer, `2` Hall Admin, `3` Super Admin.',
  '',
  '**Dates** are Unix timestamps in **milliseconds**, sent and returned as numbers. Never ISO',
  'strings. `0` is used for "never" on fields such as `lastDonation`.',
  '',
  '**Student ID** is a 7-digit string, not a number, and it is structured: `1905005` is batch',
  '`19` (admission year 2019), department `05`, roll `005`. The batch must be between `01` and the',
  "current year's last two digits. Department codes are `01` Arch, `02` Ch.E, `04` CE, `05` CSE,",
  '`06` EEE, `08` IPE, `10` ME, `11` MME, `12` NAME, `15` URP, `16` WRE, `17` NCE, `18` BME —',
  'plus `00`, which names no department and is accepted only because older records carry it.',
  'Codes not in that list are rejected.',
  '',
  '## Response envelope',
  '',
  'Every JSON response carries `status` (`"OK"` or `"ERROR"`), `statusCode` and `message`, with',
  'the payload alongside on success. Check `status`, not only the HTTP status code.'
].join('\n')

// What an MCP client is handed at `initialize`. The vocabulary is the whole of it bar two
// sentences of context: the spec's reader arrives with the page around it, a model arrives with
// nothing.
export const MCP_INSTRUCTIONS_MARKDOWN: string = [
  'Badhan is a voluntary blood-donation platform run by BUET students; this server exposes its',
  'API as tools. Every tool call runs as the member whose token is configured here, with exactly',
  'the permissions their role gives them in the app, and is recorded in the activity log as',
  'theirs. Call `whoami` first to learn that role.',
  '',
  API_VOCABULARY_MARKDOWN
].join('\n')
