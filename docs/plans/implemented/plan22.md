# Plan 22 — an MCP server for Badhan, mounted on the backend

Badhan already knows how to hand its API to a language model: the AI Integration page
([AIIntegration.vue](../../badhan-frontend/src/views/AIIntegration.vue)) mints a short-lived
token and wraps it in a markdown briefing that says "fetch `/openapi.json` and figure it out".
That works, and it is entirely manual — the model reads a spec, writes HTTP calls by hand,
and gets no help from its client about what is safe to call.

This plan replaces the guesswork with a **Model Context Protocol server**: one HTTP endpoint,
`POST /mcp`, on the backend that already exists, exposing a hand-written set of tools that map
onto the routes volunteers actually use. A member adds one line of config to Claude Code (or
any MCP client), and from then on "log a donation for Mahathir dated last Tuesday" is a tool
call the client can show, confirm and audit, rather than a URL the model invented.

Nothing about the permission model changes. Every tool call is turned back into an ordinary
request through the real express stack — the same validators, the same middlewares, the same
rate limiters, the same audit log rows — so an MCP caller can do exactly what its token's
owner can do, and not one route more.

---

## Decisions taken before this plan was written

Asked and answered. Not re-litigated below.

* **The MCP server is mounted on the existing backend, over HTTP.** Not a new project, not a
  new App Engine service, not a locally-installed stdio binary. It ships with
  [badhan-backend](../../badhan-backend/) and deploys through the pipeline that is already
  there; `environments.js` gains nothing and no new GCP project exists.
* **The tools are hand-written and curated.** Not generated from `swagger.json`. Roughly
  twenty-five named tools for the jobs people actually do, with descriptions written for a
  model to read — not ninety, most of which would be guest mirrors and internal plumbing.
  The cost is stated at the end: a new route does not become a tool by itself.
* **The credential is the redirection token the AI Integration page already mints.** No new
  credential class, no API-key table, no OAuth, and no sign-in tool that would put a real
  password into a model's context. `POST /users/redirection` is the whole auth story.
* **The server can write.** Every tool the caller's role permits, donations and call records
  and donor edits included. The server enforces the role; the client is expected to confirm
  destructive calls, and the tool annotations in Phase M2 exist to make that possible.

### Decisions taken in this plan, stated up front

* **The protocol layer is hand-written, not `@modelcontextprotocol/sdk`.** The backend is
  TypeScript 4.7, `"module": "commonjs"`, with default (node10) module resolution
  ([tsconfig.json](../../badhan-backend/tsconfig.json)). The SDK is ESM-first with an
  `exports` subpath map that node10 resolution cannot follow, so adopting it means bumping
  TypeScript and switching `moduleResolution` across a codebase whose tsoa decorators and
  generated routes all compile under the current settings. Stateless streamable HTTP is a
  small protocol — `initialize`, `tools/list`, `tools/call`, `ping`, and JSON-RPC framing —
  and Phase M0 writes it in one file. See "Risks restated" for when this decision should be
  revisited.
* **The transport is stateless.** No session id, no server-held transport, no SSE stream.
  Every `POST /mcp` is self-contained and answered with a single JSON body. This is not a
  simplification for its own sake: App Engine standard runs `automatic_scaling` on `F1`
  instances ([app.development.yaml](../../badhan-backend/app.development.yaml)), so two
  requests in one MCP session routinely land on two instances, and any session state held in
  process memory is a bug that appears only under load. `GET /mcp` and `DELETE /mcp` answer
  405.
* **A tool call is executed by replaying it through the app's own express stack**, not by
  calling controller methods and not by an HTTP loopback to `127.0.0.1`. Phase M1 explains
  why both alternatives are worse, and the one thing the dispatcher must get right (the
  client's IP) is the reason.
* **The MCP endpoint is invisible to the OpenAPI spec.** It is not a tsoa controller and must
  not become one: `/mcp` speaks JSON-RPC, not the `status`/`statusCode`/`message` envelope,
  and documenting it beside routes that do would misdescribe both. It is registered as plain
  express in [app.ts](../../badhan-backend/src/app.ts).
* **Guest mode gets no MCP endpoint.** There is no `/guest/mcp`. The guest mirror exists so a
  demo account can click around the app with faker data; an assistant wired to a demo is not
  a use case anybody has asked for, and mirroring twenty-five tools onto `GuestController`'s
  partial coverage would double the surface for nothing. The AI Integration page says so in
  guest mode rather than offering a config that would 404.
* **`initialize` carries the encoding vocabulary as `instructions`.** Blood groups, halls,
  designations, millisecond dates and the 7-digit student ID are already written out once, in
  the spec's `info.description`. Phase M0b makes that prose a module both the spec build and
  the MCP handshake read, so there is one copy rather than a third.
* **Only a super admin can obtain MCP config.** The AI Integration page is already gated at
  `designation: 3` ([router/index.ts:344-357](../../badhan-frontend/src/router/index.ts#L344)) and
  that gate is inherited rather than revisited — the section lives on that page and nowhere else.
  Note what this does *not* mean: the endpoint itself checks a token, not a page, so a volunteer
  holding a valid token is served normally. The restriction is on where a token can be *minted*
  for this purpose, which is the same restriction the prompt file has always had.
* **It ships to both environments in one change, with no feature flag.** `/mcp` is reachable by
  anyone who can reach the API, and answers nothing without a token — the same condition every
  other route is already deployed under. A flag would be one more thing that must stay `true`
  forever.
* **The token may travel in the header or in the path.** `POST /mcp` with `x-auth`, and
  `POST /mcp/<token>` with nothing else. The second form exists because claude.ai's web and
  mobile connectors and ChatGPT's connectors both take a URL and offer OAuth or no
  authentication, with nowhere to type a header — without it, the page called *AI Integration*
  would not work with the two assistants most members have heard of. It is the same token with
  the same lifetime; only its carrier changes. Phase M3b covers what that costs.
* **Out of scope, named so nobody has to guess:** MCP resources and prompts (tools only),
  OAuth or any browser-based authorization flow, elicitation and sampling, certificates
  (`GET /certificates/{donorId}` returns a PDF, which is not a tool result worth designing
  for now), password and device-management routes, `DELETE /log`, and the guest mirror.

---

## Phase M0 — the protocol layer

New file `badhan-backend/src/mcp/protocol.ts`. It knows about JSON-RPC and the MCP handshake
and nothing about Badhan.

```ts
export const MCP_PROTOCOL_VERSION: string = '2025-06-18'
export const MCP_SUPPORTED_VERSIONS: string[] = ['2025-06-18', '2025-03-26']

export const JSON_RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
} as const

export interface JsonRpcRequest { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: any }
export interface JsonRpcResponse { jsonrpc: '2.0'; id: string | number | null; result?: any; error?: { code: number; message: string; data?: any } }
```

The four methods that must be answered:

| Method | Answer |
| --- | --- |
| `initialize` | `{ protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'badhan', version }, instructions }` |
| `notifications/initialized` | A notification — no `id`, therefore **no response body at all**. HTTP `202` with an empty body. |
| `tools/list` | `{ tools: [...] }` from the table in Phase M2. No pagination: twenty-five tools fit in one page and a `nextCursor` nobody sets is a lie. |
| `tools/call` | Phase M1 and M2. |
| `ping` | `{}` |

Three rules that are easy to get wrong and each cost a full debugging session:

1. **A notification gets no response.** A JSON-RPC message with no `id` is a notification;
   answering one with `{"jsonrpc":"2.0","id":null,...}` makes a strict client drop the
   connection. Return `202` with an empty body.
2. **Protocol version negotiation echoes, it does not assert.** If the client's
   `params.protocolVersion` is in `MCP_SUPPORTED_VERSIONS`, echo it back; otherwise answer
   with `MCP_PROTOCOL_VERSION` and let the client decide whether to continue. Do not 400.
3. **A tool that fails is a `result`, not an `error`.** JSON-RPC `error` means *the call could
   not be dispatched* — unknown tool, malformed params. A tool that ran and got a 403 from the
   API returns `result: { content: [...], isError: true }`, because the model has to see the
   message and adjust; an `error` is handled by the client and often never reaches the model.
   This distinction is the whole reason a 403 from Badhan is useful rather than fatal.

Batching: a JSON array body is answered with an array of responses, notifications omitted; if
every message in the batch was a notification the answer is `202` with no body.

**Verification:** `initialize` → `tools/list` → `tools/call` over `curl` returns well-formed
JSON-RPC at every step; `notifications/initialized` returns `202` with a zero-length body;
`{"jsonrpc":"2.0","id":1,"method":"nope"}` returns error `-32601` and HTTP 200.

## Phase M0b — one copy of the encoding vocabulary

The prose that explains that a blood group is `2` and not `"B+"` currently lives as a single
escaped string inside `info.description` in
[tsoa.json](../../badhan-backend/tsoa.json). The MCP handshake needs the same text, and a
second copy would drift within a release.

Move it to `badhan-backend/src/doc/apiVocabulary.ts`:

```ts
export const API_VOCABULARY_MARKDOWN: string = [
  '## How values are encoded',
  '',
  'The API speaks **indices, not names**...'
].join('\n')
```

— the same array-of-lines shape, and for the same reason, as
[aiPrompt.ts](../../badhan-frontend/src/mixins/aiPrompt.ts): it is markdown full of backticks
and a template literal would need every one escaped.

Two consumers:

* `initialize` returns it as `instructions`, prefixed by two sentences saying what Badhan is.
* [trim-openapi.js](../../badhan-backend/scripts/trim-openapi.js) — which already rewrites the
  generated spec in place — writes it into `info.description`, and `tsoa.json` keeps only the
  title, version and the first paragraph.

This requires **reordering the build**. Today:

```
"build": "npm run tsoa:routes && npm run tsoa:spec && tsc"
```

becomes `tsoa:routes && tsc && tsoa:spec`, so that `trim-openapi.js` — a standard-library-only
CommonJS script, and it stays one — can `require('../dist/doc/apiVocabulary.js')`. The order is
safe: `tsoa:routes` generates `src/tsoaRoutes/routes.ts`, which `tsc` needs; `tsoa:spec` reads
the `.ts` sources directly and writes `dist/tsoa/swagger.json`, which `tsc` neither reads nor
cleans.

**Verification:** `docker compose exec backend npm run build`, then
`curl localhost:3000/openapi.json | jq -r .info.description` still contains the blood-group
table, and an `initialize` response's `instructions` contains the same text byte for byte.

## Phase M1 — the dispatcher

New file `badhan-backend/src/mcp/dispatch.ts`. This is the load-bearing part of the plan: it
turns `{ method, path, query, body }` into a real request against the real app.

```ts
export interface ApiCall { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; query?: Record<string, string | number | boolean>; body?: unknown }
export interface ApiResult { statusCode: number; body: any }

export const dispatchApiCall = (app: Express, origin: Request, token: string, call: ApiCall): Promise<ApiResult>
```

It builds a synthetic `http.IncomingMessage` on a bare `net.Socket`, pushes the JSON body into
it as stream content, hands it with a synthetic `http.ServerResponse` to `app.handle(req, res)`,
and collects what `res.write`/`res.end` emit.

**Why not call the controllers directly.** The permission rules are not in a service layer.
`postDonation` in [DonationsController.ts:47-71](../../badhan-backend/src/tsoaControllers/DonationsController.ts#L47)
loads the target donor, applies the hall rule and writes the audit log *inside the controller
method*, reading its inputs off `req.res.locals.middlewareResponse` — which the authentication
middleware put there. Calling the method needs a fabricated `req` anyway; fabricating one that
skips the validators means the tools accept bodies the API rejects.

**Why not an HTTP loopback to `127.0.0.1`.** It would work, and it would silently break rate
limiting. `express-rate-limit` keys on `req.ip`; every loopback request has the same one, so all
MCP traffic from every member on the planet would share a single 12-per-minute bucket, and the
first symptom would be volunteers getting `429`s from a server that is not busy.

The dispatcher exists to avoid exactly that, so **the one thing it must get right is the IP**:

```ts
const socket: Socket = new Socket()
Object.defineProperty(socket, 'remoteAddress', { value: origin.ip })
```

Everything else it copies from the originating MCP request is small and named here so nobody
has to rediscover it:

* `host` — some middleware and every absolute-URL construction reads it.
* `x-auth` — the token, taken from the MCP request (Phase M3), not from the tool input. A tool
  can never name its own credential.
* `content-type: application/json` and a correct `content-length`, or `express.json()` skips
  the body and every write tool sees `{}`.
* `user-agent` — set to `Badhan-MCP/1 (<the client's own UA>)`. The audit log and the device
  list already record a user agent; without this every MCP action would be logged as whatever
  browser minted the token, and "which of these rows was an assistant" would be unanswerable.

`req.push(JSON.stringify(body)); req.push(null)` supplies the stream; express sets its own
`request`/`response` prototypes and initializes `res.locals` inside `app.handle`, so nothing
else needs faking.

**Verification:** a unit-level test that dispatches `GET /users/me` with a valid token returns
`200` and the caller's donor; the same call with a junk token returns `401` with
`Invalid Authentication`; and a dispatched request run 13 times in a minute against a
`commonLimiter` route returns `429` on the 13th — proving the limiter sees the call at all.

## Phase M2 — the tool table

New file `badhan-backend/src/mcp/tools.ts`. One table, one entry per tool:

```ts
export interface ToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: object          // hand-written JSON Schema, draft 2020-12
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean }
  toCall: (input: any) => ApiCall
}
```

JSON Schema is written by hand rather than derived from zod: `tools/list` transmits JSON
Schema, so a validation library would exist only to be converted back into what we would have
written anyway, and it would be a new runtime dependency in a deployed backend.

`annotations` is not decoration. `destructiveHint` is what an MCP client reads to decide
whether to ask the human before running a tool, and it is the mechanism that makes the
"full read/write from the start" decision survivable. Every `DELETE`, every designation
change, and `update_donor` carry `destructiveHint: true`.

### Read tools

| Tool | Route | Notes |
| --- | --- | --- |
| `whoami` | `GET /users/me` | Always call this first; it is how the model learns its own role and hall. |
| `search_donors` | `GET /search/v3` | The workhorse. Description spells out the `-1` sentinels and that `batch` is two digits. |
| `get_donor` | `GET /donors` | Full profile with donations, call records and comment. |
| `find_donor_by_phone` | `GET /donors/phone` | |
| `check_duplicate_donor` | `GET /donors/checkDuplicate` | Call before `create_donor`; the description says so. |
| `list_members` | `GET /donors/designation` | Volunteers and admins of a hall. |
| `list_all_donors` | `GET /donors/all` | Super admin only — the description says it, the server enforces it. |
| `list_recent_donors` | `GET /donors/new` | |
| `list_bookmarked_donors` | `GET /activeDonors` | |
| `get_donation_report` | `GET /donations/report` | |
| `get_donation_report_donors` | `GET /donations/report/donors` | The drill-down behind a report cell. |
| `get_platelet_report` | `GET /platelet-donations/report` | |
| `get_platelet_report_donors` | `GET /platelet-donations/report/donors` | |
| `get_statistics` | `GET /log/statistics` | |
| `list_activity_log` | `GET /log` | |
| `list_public_contacts` | `GET /publicContacts` | |
| `list_messages` | `GET /messages` | Volunteer or above; the room from plan 21. |

### Write tools

| Tool | Route | `destructiveHint` |
| --- | --- | --- |
| `log_donation` | `POST /donations` | false |
| `delete_donation` | `DELETE /donations` | **true** |
| `log_platelet_donation` | `POST /platelet-donations` | false |
| `delete_platelet_donation` | `DELETE /platelet-donations` | **true** |
| `add_call_record` | `POST /callrecords` | false |
| `delete_call_record` | `DELETE /callrecords` | **true** |
| `create_donor` | `POST /donors` | false |
| `update_donor` | `PATCH /donors/v2` | **true** — it replaces the whole record |
| `update_donor_comment` | `PATCH /donors/comment` | **true** |
| `change_designation` | `PATCH /donors/designation` | **true** |
| `delete_donor` | `DELETE /donors` | **true** |
| `bookmark_donor` | `POST /activeDonors` | false |
| `unbookmark_donor` | `DELETE /activeDonors/{donorId}` | false |
| `send_message` | `POST /messages` | false |

`update_donor` deserves its flag explained in its own description, not just in this table:
`PATCH /donors/v2` takes a **full** donor body, so a model that sends three fields wipes the
rest. The description must say, in words: *fetch the donor with `get_donor` first, change what
you mean to change, and send the whole object back.*

### Deliberately absent

`POST /users/signin`, `POST /users/redirection`, `DELETE /users/signout`,
`DELETE /users/signout/all`, `PATCH /users/password`, `POST /donors/password`,
`GET /users/logins` and its deletions, `DELETE /log`, everything under `/feedbacks`,
`/certificates`, `/test` and `/guest`.

The four that matter most, and why they are not oversights:

* **`signin` and `redirection`** are the two ways to obtain a credential. A tool that mints a
  token from a token turns a 30-minute grant into an unbounded one — the same reason
  `PATCH /users/redirection` was deleted in the AI Integration commit. The prompt file already
  tells a model not to call these; the MCP server simply does not offer them.
* **`signout` and `signout/all`** end the session the token hangs off. An assistant "cleaning
  up after itself" would sign the member out of their own phone.

### Result shape

Every tool returns:

```ts
{ content: [{ type: 'text', text: JSON.stringify(body, null, 2) }], isError: statusCode >= 400 }
```

JSON as text, not `structuredContent`: the API's responses are already JSON with a
`message` field a model can act on, and wrapping them in an output schema would mean writing
one for twenty-five routes to say nothing new. On `isError: true` the `message` from the
envelope is the first line of the text, so a 403's reason survives into the model's context.

**Verification:** `tools/list` returns every tool with a valid JSON Schema (assert against a
meta-schema in the test); each read tool called with realistic input returns `isError: false`;
`update_donor`'s description contains the read-modify-write instruction.

## Phase M3 — the endpoint

New file `badhan-backend/src/mcp/router.ts`, exporting an express router.

**Auth.** The token is looked for in three places, in this order: the `x-auth` header, an
`Authorization: Bearer <token>` header, and the path segment of `POST /mcp/<token>`. The first
one found wins, and a request carrying two is not an error worth inventing.

Three places because MCP clients differ in what they will let a member type:

| Client | What it accepts | Which form it uses |
| --- | --- | --- |
| Claude Code | `claude mcp add --transport http badhan <url> --header "x-auth: ..."` | header |
| Cursor, VS Code, Zed | a JSON block with a `headers` object | header |
| Claude Desktop | a connector URL, or a stdio command | path (or `npx mcp-remote` with a header) |
| claude.ai web and mobile | a connector URL, OAuth or none | **path** |
| ChatGPT connectors | a connector URL, OAuth or none | **path** |

`Authorization: Bearer` is a header rename and nothing more. The path form is a genuine
widening and is dealt with in M3b.

Routing: `router.post('/', ...)` and `router.post('/:token', ...)` reach the same handler; a
JWT is base64url plus dots, so it needs no encoding to sit in a path segment. `GET` and
`DELETE` answer 405 on both.

Missing token, or a request that is not `initialize`/`ping` without one, gets HTTP `401` with a
JSON-RPC error body. `initialize` is answered without a token on purpose: a client that cannot
complete a handshake reports "server unreachable" rather than "not authorized", and the
difference is a support conversation.

**The endpoint is not authenticated by itself.** Nothing here calls
`authenticator.handleAuthentication`. The token is carried into the dispatched request and
checked there, once, by the middleware that already owns that job. A second check here would be
a second place for the rules to drift.

**Its own rate limit.** A new `mcpLimiter` in
[rateLimiter.ts](../../badhan-backend/src/middlewares/rateLimiter.ts) at 60 per minute, applied
to the endpoint. It sits **above** the per-route budgets, it does not replace them: a tool call
consumes one `mcpLimiter` unit and one unit of whatever limiter its route carries. The reason
for a limiter here at all is `initialize` and `tools/list`, which dispatch nothing and would
otherwise be free to hammer.

**Method handling.** `GET /mcp` and `DELETE /mcp` return `405` with a JSON-RPC error saying the
server is stateless and does not offer a stream. Say it in the message; a client author reading
a bare 405 will assume a routing mistake.

## Phase M3b — a token in a URL is a token in the logs

The path form buys two clients and costs one property: a URL is written down in places a
header is not. This phase is the honest accounting of where, and what is done about each.

**Morgan, which we control.** [app.ts:11](../../badhan-backend/src/app.ts#L11) mounts
`logger('dev')` *before* `RegisterRoutes`, so it sees and prints the raw URL of every request —
token included, on stdout, which on App Engine means Cloud Logging. Fix it at the source with a
custom morgan `url` token that rewrites anything matching `^/mcp/.+` to `/mcp/<redacted>`:

```ts
logger.token('url', (req: Request): string =>
  req.originalUrl.replace(/^\/mcp\/.+$/, '/mcp/<redacted>'))
```

Registered before `app.use(logger('dev'))`, because morgan resolves its tokens at mount time.

**App Engine's own request log, which we do not control.** The platform writes an access-log
entry per request with the full path, and no application code can redact it. So a path-form
token *will* sit in Cloud Logging for that project's retention window.

This is accepted rather than solved, and the reasoning has to be written down or somebody will
"fix" it later with a token store nobody wants:

* Reading those logs requires a Logs Viewer role on the GCP project. Anyone holding that already
  has, or can trivially grant themselves, more access to donor data than a super admin token
  gives — they can read the database. The token discloses nothing to them that they did not
  already have.
* The token expires on its own — 30 minutes by default, 24 hours at the outside — while the log
  entry is retained for far longer. What is in the log is therefore a dead credential within a
  day.
* The alternative — issuing an opaque handle and storing the mapping — is a new credential class
  with its own table, lifecycle and revocation. That was rejected up front, and it is not worth
  reopening for a risk whose holder is already an administrator.

**What is not a risk here, so nobody spends time on it:** there is no browser in this path, so no
`Referer` leakage and no history entry. The connector stores the URL exactly as a header-based
client stores the header — both are a credential at rest in a config file.

**Verification:** `docker compose logs backend` after a `POST /mcp/<token>` shows
`/mcp/<redacted>` and no JWT; the same request still authenticates.

## Phase M4 — wiring

In [app.ts](../../badhan-backend/src/app.ts), after `RegisterRoutes(app)` and before the
`app.use('*', routeNotFoundHandler)` catch-all:

```ts
app.use('/mcp', mcpRouter(app))
```

The router takes the app because the dispatcher replays through it — a circular-looking
dependency that is really just late binding, and passing it explicitly is what keeps
`dispatch.ts` free of an import back into `app.ts`.

Placement after `express.json()` is required, not incidental: the body arrives parsed.

**Verification:** `docker compose exec backend npx tsc --noEmit` is clean;
`docker compose up -d` then `curl -s localhost:3000/openapi.json | jq '.paths["/mcp"]'` is
`null`; `/docs` renders unchanged.

## Phase F1 — the AI Integration page grows a second half

[AIIntegration.vue](../../badhan-frontend/src/views/AIIntegration.vue) keeps everything it has.
Below the existing buttons, a second section: **Connect an MCP client**.

It shows the endpoint (`{baseURL}/mcp`), and **three** buttons that behave exactly like the two
above them — each press mints a fresh token via `requestRedirectionToken` and puts it into text
the member copies. Three rather than one because no single string works everywhere: the table in
Phase M3 is the reason, and the page has to answer "which one do I press" without making anyone
read it.

* **Copy MCP config** — the JSON block:

  ```json
  {
    "mcpServers": {
      "badhan": {
        "type": "http",
        "url": "https://badhan-buet.uc.r.appspot.com/mcp",
        "headers": { "x-auth": "<the freshly minted token>" }
      }
    }
  }
  ```

  Labelled for its clients — *Cursor, VS Code, Zed, and any assistant with a config file.*

* **Copy CLI command** — the one-liner for Claude Code:
  `claude mcp add --transport http badhan <url> --header "x-auth: <token>"`

* **Copy connector URL** — `{baseURL}/mcp/<token>`, labelled *ChatGPT, and Claude on the web or
  your phone: paste this as a connector URL and choose "no authentication".*

  This button needs its own warning line, not the shared one, because the shape of the secret
  changes: **the whole URL is the password.** A member who has learned that a URL is safe to
  paste into a chat has learned the wrong thing here. Put it beside the button, not in the block
  above.

The warning block above already says the right things and the section reuses its language
rather than restating it. One sentence is new, because MCP config is a file people forget
about: **the config stops working when the token in it lapses, and the dead token stays in that
file until they replace it.** How long that is, is Phase F1b's selector.

In guest mode (`isGuestEnabled()`), the whole section is replaced by a line saying the demo has
no MCP endpoint. Do not offer a `/guest/mcp` URL that will 404.

New constants beside the existing ones in
[aiPrompt.ts](../../badhan-frontend/src/mixins/aiPrompt.ts): `getMCPEndpointURL`,
`buildMCPConfigJSON`, `buildMCPCLICommand`, `buildMCPConnectorURL`.

### Phase F1b — the token lifetime selector

Thirty minutes was chosen for a *file*, which is made and used in one sitting. MCP config is
written once and left alone, so a fixed 30-minute token means editing a config file every thirty
minutes, which nobody will do — they will find a way to get a permanent token instead, and that
is a worse outcome than the one this guards against.

So the section carries a `v-select` beside the two copy buttons: **30 minutes (default)**,
**8 hours**, **24 hours**. This needs **no backend change** — `POST /users/redirection` already
accepts `durationSeconds` and clamps it at 24 hours
([redirectionToken.ts](../../badhan-backend/src/services/redirectionToken.ts)) — and no change to
the two buttons above it either: the prompt file keeps its fixed 30 minutes, because a file has
no reason to outlive the sitting it was made in.

Two rules about the default, both load-bearing:

* **30 minutes stays selected on load.** Nobody gets a longer-lived token by accident; a member
  who wants one has to choose it, which is the moment the warning below is read.
* **The page prints what the server granted, not what it asked for.** The existing code already
  does this — `response.data.durationSeconds` — and the selector must not tempt anyone into
  echoing the requested number instead.

The warning text scales with the choice, in bold, and says the thing plainly: a 24-hour token is
48 times the window in which a leaked config is a live credential, and **signing out remains the
only way to revoke it**. Reuse the language already in the alert above rather than writing a
second, softer version of it.

## Phase T1 — backend tests

New suite `badhan-backend-test/tests/mcp/`, following the conventions in
[tests/users/redirection/](../../badhan-backend-test/tests/users/redirection/) — `operations`
helpers, a `schemas.js` per folder, jsonschema assertions.

* `handshake.test.js` — `initialize` returns a supported `protocolVersion`, advertises
  `tools`, and carries `instructions` containing the blood-group table;
  `notifications/initialized` returns 202 with an empty body; an unknown method returns
  `-32601` at HTTP 200.
* `toolsList.test.js` — every tool has a unique name, a non-empty description and an
  `inputSchema` that is itself valid JSON Schema; every `DELETE`-backed tool carries
  `destructiveHint: true`. This is the test that catches a tool added without annotations.
* `auth.test.js` — no token → 401; a junk token → a tool call whose result is `isError: true`
  carrying `Invalid Authentication`, **not** a transport error; a token minted by
  `POST /users/redirection` works. Then the same three assertions again against
  `POST /mcp/<token>`, because two carriers means two code paths and only one of them is
  exercised by every other test in the folder. Plus: a request carrying both a header and a path
  token uses the header, and `GET /mcp/<token>` is 405 rather than a 200 that would put the
  token in a URL a browser could follow.
* `permissions.test.js` — a volunteer's token calling `list_all_donors` gets
  `isError: true` and the server's own 403 message; a hall admin searching another hall gets
  the same treatment. The point is that the MCP layer adds no permission logic and removes
  none.
* `write.test.js` — `log_donation` through MCP creates the donation, and
  `GET /log` shows a row attributed to the calling donor. The audit trail is the reason writes
  are acceptable at all, so it is asserted rather than assumed.
* `dispatch.test.js` — the `429` case from Phase M1's verification.

Run with `docker compose --profile test run --rm backend-test npx jest tests/mcp`.

## Phase T2 — Cypress

Extend
[ai-integration.cy.ts](../../badhan-frontend-test/cypress/e2e/super-admin/ai-integration.cy.ts)
rather than adding a file — it already signs in, opens the page and knows how to pull a token
out of copied text.

Add one test: press **Copy MCP config**, parse the clipboard as JSON, assert the URL ends in
`/mcp`, assert the header token is not the session token from local storage, and then use that
token in a `cy.request` `POST` to `{apiBaseURL}/mcp` with an `initialize` body — asserting 200
and a `serverInfo.name` of `badhan`. Same shape as the existing assertion that the file's token
authenticates: shape is not enough, the credential has to work.

Add a third: press **Copy connector URL**, and `cy.request` an `initialize` straight at the
copied URL with no headers at all. That is the whole claim of the path form — the URL alone is
enough — and it is one line to check.

Add a second, smaller assertion for Phase F1b: with the selector untouched, the copied token's
JWT lifetime is 1800 seconds. The default is the safety property of that phase, so it is the one
worth pinning in a test — read it off the token the way
[duration.test.js](../../badhan-backend-test/tests/users/redirection/duration.test.js) does.

## Phase D1 — the manual

Required by [CLAUDE.md](../../CLAUDE.md): behaviour that ships is documented in the same change.

[16-super-admin-tools.md](../../docs/manual/16-super-admin-tools.md) gains a subsection under
**AI Integration**, written for someone who has never heard of MCP:

* What it is, in two sentences: a way to connect an assistant to Badhan once, instead of
  pasting a file each time.
* The three buttons and which assistant each is for — written as "if you use X, press Y", since
  a member who has to work out what a transport is has already been failed by the page. Claude
  Code gets the CLI line; a config-file assistant gets the JSON; **ChatGPT and Claude on the web
  or a phone get the connector URL**, pasted as a connector with no authentication.
* That the connector URL **is** the password, in as many words: it looks like a link, and a link
  is the one kind of text everybody has been taught is safe to share.
* **The same clock applies**, and here it bites differently: the config file keeps the dead
  token until it is replaced. Explain the lifetime selector in the same breath — 30 minutes by
  default, up to 24 hours if they choose it — and what choosing longer costs.
* That this page, and therefore MCP config, is **super admin only**, so the role being lent is
  always the widest one.
* What the assistant can then do — everything the member's role allows, reading and writing —
  and that the App Activity page shows those actions as theirs.
* That signing out kills it, same as the file.

Also update [05-the-screen-and-the-menu.md](../../docs/manual/05-the-screen-and-the-menu.md) if
the drawer entry's description mentions the file specifically.

---

## What this plan does not do

* **It does not track the API.** A route added next month is not a tool until somebody adds a
  row to `tools.ts`. That is the accepted cost of the curated decision; the mitigation is that
  the prompt file and `/openapi.json` still exist, and a model that needs a route with no tool
  can be pointed at them.
* **It does not give the model anything a member cannot do.** No new permission, no new query,
  no cross-hall read that the app forbids.
* **It does not solve revocation.** Signing out is the only way to kill a live token, exactly
  as today.

## Risks restated

* **A 24-hour token is still a token nobody can revoke.** F1b makes the lifetime usable at the
  cost of widening the window, and signing out — which kills every session token the member
  holds, on every device — remains the only way to end one early. If members start asking for
  something longer still, that is the signal that the "new long-lived, revocable API key"
  option — rejected up front — needs its own plan, with naming, listing and revocation designed
  properly rather than bolted onto the redirection token.
* **Super-admin-only is a gate on the page, not on the endpoint.** Nothing in Phase M3 asks what
  designation the token's owner has, and nothing should: a volunteer's token is served, at a
  volunteer's permissions, exactly as the API already serves it. If that ever needs to change,
  it is a rule about who may hold a token at all, and it belongs in the authentication
  middleware rather than in the MCP router.
* **Hand-writing the protocol means owning it.** The MCP spec revises; a client that adopts a
  newer version may send something Phase M0 does not know. The version negotiation echoes
  rather than asserts, so the failure mode is a client that declines to connect rather than one
  that half-works — but if this file starts growing to track spec revisions, that is the moment
  to bump TypeScript and take the SDK instead. Do not grow it quietly.
* **A model with write access will write confidently and wrongly at some point.**
  `destructiveHint` moves the decision to the client's confirmation prompt, and the audit log
  makes it recoverable, but neither prevents it. `update_donor`'s whole-body semantics is the
  sharpest edge in the table and the likeliest first casualty.
* **The path form widens what a leak is.** A URL is copied, pasted and screenshotted more
  freely than a header ever is, and it lands in Cloud Logging where nothing can redact it
  (Phase M3b). The reasoning for accepting that is written out there; what is *not* accepted is
  extending the pattern — if a third carrier is ever proposed, this is the risk it has to argue
  against.
* **Connector UIs change.** The table in Phase M3 describes what claude.ai and ChatGPT accepted
  when this was written. If either grows a custom-header field, the path form stops being
  necessary for it — and the right response is to change what the page recommends, not to remove
  a carrier members already have in their configs.
* **The dispatcher is clever, and clever code rots.** It depends on express setting its
  prototypes and `res.locals` inside `app.handle`, and on `express.json()` reading a pushed
  stream. Both are stable, neither is documented API. A major express upgrade must re-run
  Phase M1's verification before anything else is believed.
