# Plan 24 — Badhan Agent moves to the backend, split into standalone phases

This document restates [plan24.md](plan24.md) as **eight self-contained phases**. Each phase
repeats the decisions, files, rules and tests it depends on rather than pointing sideways at
another phase, so it can be read, built, reviewed and merged on its own. Nothing from
`plan24.md` is dropped: §1–§9 are all carried through, and
[Appendix B](#appendix-b--traceability) maps each original section to the phase that implements
it.

| Phase | Title | Depends on | Ships to production alone |
| --- | --- | --- | --- |
| [1](#phase-1--chat-storage-and-a-members-own-chats) | Chat storage and a member's own chat routes | — | yes (invisible) |
| [2](#phase-2--route-descriptions-a-volunteer-can-read) | Route descriptions a volunteer can read | — | yes (invisible) |
| [3](#phase-3--the-agent-service-and-the-step-routes) | Agent service, model calls, step routes | 1 | yes (invisible, no key yet) |
| [4](#phase-4--the-review-routes) | Super admin review routes | 1 | yes (invisible) |
| [5](#phase-5--agentthread-extracted-no-change-in-behaviour) | `AgentThread` extracted, no change in behaviour | — | yes |
| [6](#phase-6--badhan-agent-runs-on-the-backend-for-every-member) | Badhan Agent runs on the backend, for every member | 3, 5 (2 strongly advised) | **no, waits for phase 8** |
| [7](#phase-7--the-agent-chats-review-page) | Agent Chats review page | 4, 5, 6 | **no, waits for phase 8** |
| [8](#phase-8--full-suite-development-checks-and-rollout) | Full suite, hand checks on development, rollout | all | — |

**Phases 1 to 5 ship dark.** Each can reach production on its own, and none changes what a member
sees. Today's browser-only agent keeps working throughout. **Phases 6 and 7 are the switch**:
they can be merged and deployed to development, but they reach production together, and only
after phase 8's hand checks pass on development and the production key is in place.

---

## Phase 0 — Shared context (read once; every phase repeats what it needs)

### What is being built

Today the agent runs entirely in the browser. Each super admin brings their own OpenAI key and
keeps it in localStorage. Chats live in IndexedDB and are wiped at every sign-in and sign-out.
`Agent.vue` builds the tool list, writes the system prompt, calls OpenAI and runs every request
itself.

After this plan, the backend holds the organisation's key and makes every model call. Chats are
stored in MongoDB and follow a member from device to device. Every member can use the agent,
not only super admins. Super admins get a review page with three columns: members, their chats,
and the transcript. Deleting a chat is a soft delete when a member does it and permanent when a
super admin does it.

### The decisions everything else follows from

These were asked and answered before `plan24.md` was written, and are not argued again.

**D1 — Every member can use the agent:** Volunteer, Hall Admin and Super Admin. Tool calls still
carry the member's own session token, so each person acts with their own permissions and the
hall rules in chapter 17 apply unchanged. The menu entry moves out of **Super Admin**.

**D2 — The backend calls the model, and the browser still runs the tool calls.** The backend makes
one model call per request. When the answer asks for API calls, the browser runs them with the
member's session, using the same approval flow as today. It reports each result to the backend
and then asks for the next step.

**D3 — Answers no longer stream.** App Engine standard sends each response in one piece, so an
answer appears whole once it is ready, with the "thinking" dots shown until then.

**D4 — The key lives in the backend env files as `OPENAI_API_KEY`**, taken from the secrets repo
in the same way as `JWT_SECRET`. The key is optional: a backend without it still starts, and the
agent says it is not set up. The Settings key box, its liveness check and **Clear key** are
removed. Any key still saved in a browser is erased.

**D5 — The only usage limit is 20 model calls per message, and it is fixed.** It is not a
setting, and the backend enforces it rather than trusting the browser to stop. There is no daily
budget and no rate limit on the server. The organisation's key pays for every member.

**D6 — Permission is fixed as well.** A GET call runs on its own. Every other method (POST, PUT,
PATCH, DELETE) waits for the member to press **Send request**, on every environment. The
approval choice in Settings goes. Since the 20-call limit is no longer a setting either,
**Settings is removed entirely**.

**D7 — Tool cards show a description, not a URL.** The card's one line is the first line of the
route's description in the API docs, for example *"Search for donors filtered by criteria"*. It
is the same text every time that route is called. Clicking the card opens everything: the
method, the full URL, the arguments, the request body, the status and duration, and the
response.

**D8 — Cards waiting for permission stay collapsed too.** A non-GET card shows its description
with **Send request** and **Decline**. The member clicks the card to see the request before
deciding. It no longer opens by itself.

**D9 — Only super admins see the system prompt.** Other members never see the panel, and the
backend does not send them its text.

**D10 — No example prompts.** The suggestion chips on an empty chat are removed.

**D11 — A member's delete is a soft delete.** It sets `userDeletedChat`, which is the requested
`user_deleted_chat` flag spelled in the codebase's camelCase (rename it if the literal spelling
matters). The chat disappears from that member's view everywhere, but the chat and its messages
stay in the database.

**D12 — The member is not told.** The delete confirmation still reads like an ordinary delete.
Only the super admin chapter of the manual describes the flag.

**D13 — Super admins see chats that members deleted**, tagged *Deleted by user* with the date. A
chat leaves the database only when a super admin deletes it permanently from the review page. A
member leaves the first column once they have no chats left at all; a chat the member deleted
still counts as one of theirs.

**D14 — A super admin's own Badhan Agent page works like everyone else's.** Deleting a chat there
is also a soft delete. Permanent delete exists only on the review page.

**D15 — Chats already saved in browsers are discarded.** The page deletes the old IndexedDB
database the first time it loads.

### The fixed numbers

| What | Value |
| --- | --- |
| Model | `gpt-6-luna`, `reasoning_effort: 'none'` |
| Model calls per member message | 20, a constant in the agent service, not configurable |
| User message `content` | 1 to 20,000 characters |
| Chat `title` (rename) | 1 to 100 characters |
| Automatic title | First line of the first message, at most 60 characters |
| Tool result, model's copy | At most 60,000 characters |
| Tool result, display copy | At most 250,000 characters, clipped on the server rather than rejected |
| JSON body limit for `PUT …/toolCalls/…` | 1 MB (every other route keeps 100 KB) |
| Step lock goes stale after | 3 minutes |
| OpenAI call timeout | About 90 seconds |
| Session note time zone | Asia/Dhaka, plus Unix milliseconds |

### Three things the phasing found that `plan24.md` did not say

1. **Today's page builds its tools from `/openapi.json`.** The moment `AgentController` is
   deployed, the old browser agent would offer `/agent/…` routes to the model as tools, and once
   phase 4 lands that includes the review routes: a super admin's model could read other
   members' transcripts. So **phase 1 also teaches today's `Agent.vue` to skip `/agent` routes**,
   and that guard ships no later than the controller does.
2. **`POST AGENT CHAT` cannot be covered by an automated test.** A chat is created only after the
   key check passes, and the test suite has no key. `plan24.md` §5.1 listed it among "the four App
   Activity entries are written"; three can be tested, and the fourth moves to phase 8's hand
   checks.
3. **The production key arrives last.** Once phase 3 is live and a key is configured, any member
   can call the step routes directly with their token and spend money, whether or not the new
   page exists. The key goes into `env.development` before phase 6 is deployed there, and into
   `env.production` only at the end of phase 8.

### Where the code goes

| Area | Path |
| --- | --- |
| Chat models | [AgentChat.ts](../../badhan-backend/src/db/models/AgentChat.ts), [AgentMessage.ts](../../badhan-backend/src/db/models/AgentMessage.ts) |
| Chat data access | [agentChatInterface.ts](../../badhan-backend/src/db/interfaces/agentChatInterface.ts) |
| Member gate | [authenticate.ts](../../badhan-backend/src/middlewares/authenticate.ts) (`handleAgentVolunteerCheck`) |
| Env keys | [badhan-backend/src/dotenv/index.ts](../../badhan-backend/src/dotenv/index.ts) |
| Agent service | `badhan-backend/src/services/agent/` (new): `tools.ts`, `prompt.ts`, `openai.ts`, `conversation.ts` |
| Value codes | [badhan-backend/src/doc/apiVocabulary.ts](../../badhan-backend/src/doc/apiVocabulary.ts) |
| Controller | `badhan-backend/src/tsoaControllers/AgentController.ts` (new), `@Route('agent')` |
| Validators | `badhan-backend/src/validations/agent.ts` (new) |
| Body parser | [badhan-backend/src/app.ts](../../badhan-backend/src/app.ts) |
| Seed fixture | [badhan-backend/src/internalRoutes/index.ts](../../badhan-backend/src/internalRoutes/index.ts), next to `seedMessagesController` |
| Backend tests | `badhan-backend-test/tests/agent/` (new) |
| Agent page | [badhan-frontend/src/views/Agent.vue](../../badhan-frontend/src/views/Agent.vue) |
| Shared transcript | `badhan-frontend/src/components/Agent/AgentThread.vue` (new) |
| Review page | `badhan-frontend/src/views/AgentChats.vue` (new) |
| Router, menu | [badhan-frontend/src/router/index.ts](../../badhan-frontend/src/router/index.ts), [badhan-frontend/src/components/AppShell/AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue) |
| Sign-out cleanup | [badhan-frontend/src/localDatabase/index.ts](../../badhan-frontend/src/localDatabase/index.ts) (`ldb.reset()`) |
| E2E tests | `badhan-frontend-test/cypress/e2e/agent/` (new) |
| Manual | [docs/manual/](../manual/): new `22-badhan-agent.md`; chapters 04, 05, 16; contents `README.md` |
| Root README | [README.md](../../README.md), section *The Chat Agent* |

### Running commands

Nothing runs on the host. Everything runs in a container, per [CLAUDE.md](../../CLAUDE.md). **Ask
before starting the stack**; if it is stopped, prefer one-off containers.

```
docker compose exec backend npm run tsoa:routes      # after any controller change
docker compose exec backend npx tsc --noEmit
docker compose exec frontend npm run build
docker compose run --rm backend-test <cmd>
docker compose run --rm frontend-test <cmd>
```

No new dependency is needed in any project. The OpenAI call uses Node 22's built-in `fetch`.

### Out of scope for every phase

* The contents of `SESSION_ROUTES`.
* The rate limits on the routes the tools call.
* The AI Integration setup file and `/llms.txt`.
* The member chat (chapter 21), which is unrelated despite the shared word "chat".
* A usage budget, automatic expiry of old chats, a way for anyone to restore a chat a member
  deleted, exporting chats, and guest or demo mode. The agent remains for signed-in members
  only.

---

## Phase 1 — Chat storage and a member's own chats

**Goal:** chats and messages can be stored in MongoDB, and a member can list, open, rename and
soft-delete their own chats through the API. Nothing calls the model yet and no page uses these
routes. Today's browser agent keeps working, and is stopped from seeing the new routes.

**Depends on:** nothing. **Ships to production:** yes, invisible to members.

> **Implemented.** Where the build differed from the text below, the text has been corrected and
> says so: the assistant's model is stored as `openaiModel`, not `model`; there is no separate
> `{ owner }` index; `syncIndexes.ts` and `clearDatabase.ts` needed no change; the routes use a new
> `handleAgentVolunteerCheck`; and the fixture gained an inspection route.

### 1.1 The guard in today's page — ship it first

Today's [Agent.vue](../../badhan-frontend/src/views/Agent.vue) fetches `/openapi.json` and turns
every operation into a tool, except the five in `SESSION_ROUTES`. `AgentController` will appear
in `/openapi.json` like any other controller, so without a change the old page would offer
`/agent/…` routes to the model.

In `buildTools`, skip every path that is `/agent` or starts with `/agent/`, next to the
`SESSION_ROUTES` check, with a comment saying why: the model must never read another member's
chats or drive its own. This change is thrown away in phase 6, when the browser stops building
tools, but it must be live **no later than** the controller. If the frontend and backend are
deployed separately, deploy the frontend first.

### 1.2 The models

**`AgentChat`** — `src/db/models/AgentChat.ts`. Every field is created now, including the ones
only phase 3 writes, so the schema is settled once.

| Field | Meaning |
| --- | --- |
| `owner` | The member's donor `_id` |
| `title` | The first line of the first message, at most 60 characters. The member can rename it |
| `createdAt`, `updatedAt` | Timestamps in milliseconds, the codebase's usual date format |
| `userDeletedChat` | Boolean, default `false` |
| `userDeletedAt` | Milliseconds, or `null` |
| `messageCount` | The next message's `seq` |
| `promptTokens`, `completionTokens` | Running totals across the chat's model calls, default 0 |
| `stepStartedAt` | Milliseconds, or `null`. The per-chat lock that phase 3 uses |

The owner's name, hall and designation are **not** copied onto the chat. They are looked up when
read.

Index: `{ owner, userDeletedChat, updatedAt }` for a member's own list. It also serves every query
on `owner` alone (the review page's grouping), because `owner` is its prefix, so the separate
`{ owner }` index `plan24.md` asked for was left out: it would only add work to every write.

`userDeletedAt` and `stepStartedAt` use a null-tolerant timestamp validator
(`checkNullableTimeStamp`). Mongoose runs validators on `null`, so the usual `checkTimeStamp`
would fail every chat that has not been deleted.

**`AgentMessage`** — `src/db/models/AgentMessage.ts`. Each message is a separate document rather
than being stored inside the chat. One tool response can be 250 KB, and a chat with fifty of them
would pass MongoDB's 16 MB limit for a single document.

| Field | Meaning |
| --- | --- |
| `chatId`, `seq` | Position in the chat. Unique together |
| `role` | `user`, `assistant` or `tool` |
| `content` | The user's text, the assistant's text, or for a tool message the copy sent to the model (at most 60,000 characters) |
| `toolCalls` | Assistant messages only: the calls exactly as OpenAI returned them |
| `openaiModel`, `usage` | Assistant messages only. **Not `model`**: a mongoose document already has a `model()` method, and a field of that name shadows it (and fails `tsc`) |
| `toolCallId`, `run` | Tool messages only. `run` keeps today's shape: status, name, method, path with query, args, body, `isWrite`, HTTP status, duration, the response for display (at most 250,000 characters) and a note. It adds `label`, the description the card shows |
| `createdAt` | Milliseconds |

`toolCalls`, `usage` and `run` are `Mixed`. Nested paths or a subdocument would make the Schema
Inconsistencies report flag every tool message, because it compares top-level keys with schema
paths. The cost: a `Mixed` value changed in place is not noticed by mongoose, so **phase 3 must
update them with `$set`**, never by mutating a loaded document. Role-specific fields are left
unset on the other roles, and none is `required`. The schema sets `minimize: false` so a tool call
with `args: {}` keeps its empty object. `content` has no `maxlength`: each writer clips to its own
limit, so an over-long model answer is clipped rather than lost.

**Notices are not stored.** "Stopped.", OpenAI errors and the per-message limit message belong to
one browser's session.

### 1.3 Wherever every model is listed

* `syncIndexes.ts` needs **no change**: it loads every file in `db/models/` and syncs every
  registered model, so the new indexes are built on the next boot.
* `src/db/test/clearDatabase.ts` needs **no change**: it drops the whole database, so the test
  purge empties the new collections too.
* The Schema Inconsistencies page goes through `mongoose.connection.models`, so it picks up both
  models without a change. Checked with seeded chats covering every role, a deleted chat and a
  held lock: both models report nothing.
* Backups copy whole collections, so from now on **every backup also contains chat
  transcripts**. Nothing to build; it is recorded in Appendix A.

### 1.4 The controller and the member routes

New `src/tsoaControllers/AgentController.ts`, `@Route('agent')`, `@Tags('Badhan Agent')`. The
member routes use `handleAuthentication` and then `handleAgentVolunteerCheck`, and act only on the
caller's own chats. `handleAgentVolunteerCheck` is the existing member gate with its own refusal,
*"Only Badhan members can use Badhan Agent"*: the shared one says *"…use the member chat"*, and
chapter 17 quotes it. Both are built by one `volunteerCheck(refusal)` factory. Validators run
**after** the gate, so a non-member never learns from a 400 what a route accepts.

Ownership and the deleted flag are part of the database query, not a check made afterwards. The
JSDoc above each method is published in `/openapi.json`; notes for maintainers are `//` comments.
In particular the published description of `DELETE` stops at *"It disappears from your list"*:
the soft delete is not something members are told (D12).

**The 404 rule.** A chat owned by someone else, or one the member has deleted, gets the same 404
as a chat that does not exist, so chat ids cannot be probed. A malformed id is also a 404.

| Route | Body | Does |
| --- | --- | --- |
| `GET /agent/chats` | — | The caller's chats that they have not deleted, newest `updatedAt` first: id, title, created and updated times |
| `GET /agent/chats/{chatId}` | — | One chat and all its messages, in `seq` order |
| `PATCH /agent/chats/{chatId}` | `{ title }` | Renames the chat |
| `DELETE /agent/chats/{chatId}` | — | Soft delete: sets `userDeletedChat` and `userDeletedAt`. The chat and its messages stay |

**No `commonLimiter`** on any `/agent` route. One turn with ten tool calls makes eleven or more
agent requests in under a minute, and the limit of 12 per minute would cut it off. There is no
paging; the organisation has hundreds of members, not tens of thousands.

### 1.5 Validation

`src/validations/agent.ts`, following the existing validators. This phase needs only
`title`: 1 to 100 characters after trimming. Phase 3 adds the rest to the same file.

Every body also goes through `onlyBodyKeys([...])`, which refuses unknown keys with a 400. This is
required, not tidiness: tsoa runs with `throw-on-extras`, and its `ValidateError` reaches the app's
last-resort handler as a **500**. Phase 3's bodies must use it too.

### 1.6 App Activity

Through `logInterface.addLog`, ids and counts only, never message text, as `MessagesController`
already does:

| Log entry | Written when | Details |
| --- | --- | --- |
| `DELETE AGENT CHAT` | A member deletes their own chat (soft delete) | Chat id |

Reads and renames are not logged.

### 1.7 The seed fixture

The tests cannot create chats through the API without a model call, so add a fixture on the
internal server, following `seedMessagesController` and its `POST /seed/messages` route in
[internalRoutes/index.ts](../../badhan-backend/src/internalRoutes/index.ts). Built as
`POST /seed/agentChats` with body `{ chats: [{ owner, …chat fields, messages: [...] }] }`; the
fixture assigns `seq` and `messageCount` from the order of `messages` and refuses them if passed.
Test helpers: `seedChat` / `seedChats` in `badhan-backend-test/tests/agent/helpers.js`. Phases 3
and 4 reuse it. It can insert:

* chats for several owners, including chats the owner has deleted (with `userDeletedAt`);
* messages of every role, with `seq` and `messageCount` kept consistent;
* tool messages whose `run.status` is `pending`;
* a chat whose `stepStartedAt` is recent (lock held) and one where it is over three minutes old;
* token totals on the chat.

A second fixture, `GET /inspect/agentChats/:chatId` (helper `inspectChat`), returns a chat
exactly as stored, deleted or not, with how many messages it still has. The member routes cannot
show a deleted chat, so this is how a suite proves a soft delete kept everything, and how phase 4
can prove a permanent delete removed it.

### 1.8 Regenerate and typecheck

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
```

### 1.9 Tests — `badhan-backend-test/tests/agent/`

* 401 without a token, and 403 for a demoted member at designation 0.
* The list shows only the caller's chats that they have not deleted, newest first.
* Another member's chat, the caller's own deleted chat, an unknown id and a malformed id all
  give 404, on `GET`, `PATCH` and `DELETE`.
* Rename validation: empty and 101-character titles are refused; a valid rename is returned by
  the list.
* Soft delete hides the chat from the list and from `GET /agent/chats/{chatId}`, but the record
  and its messages are still in the database with the flag and date set.
* `DELETE AGENT CHAT` is written.

### 1.10 Manual

No change. Nothing a member sees is different. Chapter 15 does not name App Activity entries, so
it needs no row for the new one.

**Done when:** the suite passes, `tsc` is clean, and today's agent page, opened as a super admin,
shows no `/agent` tool in its tool count.

---

## Phase 2 — Route descriptions a volunteer can read

**Goal:** the first line of every route description the agent can use makes sense to a
non-technical member, because from phase 6 it becomes the heading of a tool card in front of
volunteers.

**Depends on:** nothing. **Ships to production:** yes. Today's page sends these descriptions to
the model as tool descriptions, so the only effect is clearer wording.

> **Implemented.** Thirty first lines were rewritten across eleven controllers. The old
> wording stays as the next line wherever it still told the model something. One was **wrong**,
> not just unclear: `GET /volunteers/all` said "designated donors" but returns every non-archived
> donor (it is a legacy alias of `GET /donors/all`). The test in 2.3 also checks that every label
> is at most 90 characters and contains no `/`, so no card shows a path.

### 2.1 How a card's label is chosen

Phase 3 implements this rule; this phase makes its input good:

1. The route's **summary**, if it has one.
2. Otherwise the **first line of its description**.
3. Otherwise its operation id split into words. This is a fallback only: a URL is never shown,
   but a bare operation id reads badly, so no route should reach it.

### 2.2 The work

Go through every controller method in `badhan-backend/src/tsoaControllers/` that the agent
exposes (everything except `/agent/…` and the five session routes: `POST /users/signin`,
`DELETE /users/signout`, `DELETE /users/signout/all`, `POST /users/redirection`,
`PATCH /users/password`). Fix any first line that describes the code rather than the action. For
example, `DELETE /users/logins` currently reads *"Handle missing tokenId - validation error"*.
That route is a stub that only answers 400 when the device id is missing, so its line should say
what the member was trying to do, not how the code fails. Write each first line as a short action
in plain words, like *"Search for donors filtered by criteria"*.

Only the first line matters for the card. The longer text under it, which the model reads, stays
as it is.

Then regenerate and typecheck (`tsoa:routes`, `tsc --noEmit`).

### 2.3 Test — `badhan-backend-test/tests/agent/`

Read `/openapi.json` and check that every operation the agent exposes (the same exclusions as
above) has a non-empty summary or description, so no card ever falls back to a bare operation
id. Whether a first line is *readable* cannot be tested; that is the reviewer's job.

### 2.4 Manual

No change.

**Done when:** the test passes and a reviewer has read the list of first lines as a volunteer
would.

---

## Phase 3 — The agent service and the step routes

**Goal:** the backend can run the agent: it builds the tools and the system prompt, calls OpenAI
once per request, stores the answer and the requested tool calls, records the browser's results,
and enforces the 20-call limit and the per-chat lock. No page calls these routes yet, and no env
file has a key yet, so on every server they answer "not set up".

**Depends on:** phase 1 (the models, the controller, the 404 rule and the seed fixture).
**Ships to production:** yes, invisible. **The production key is not added in this phase**
(phase 8): once a key exists, any member can call these routes directly.

> **Implemented.** Details the build settled, which phase 6 must match:
>
> * The step itself is `runStep` in `src/services/agent/step.ts`, and the PUT is
>   `recordToolCallResult` beside it. The fixed numbers are in `src/services/agent/constants.ts`.
> * **Every 409 carries `reason`:** `busy`, `limit`, `nothingToContinue` (step routes) or
>   `alreadyAnswered` (PUT). The `busy` message already reads *"This chat is busy in another tab
>   or window."*, so the page can show it as it stands.
> * **A 502 carries `chat` and `messages`** (the saved user message). Without the chat id a brand-new
>   chat whose first model call failed could not be retried.
> * Step answers also carry `finishReason`; `length` means the answer was cut off.
> * **The PUT body's `response` is the response body as text**, as the API sent it. The server
>   parses it if it can, to send the model a compact copy, and clips it to 250,000 characters for
>   the card. `httpStatus` is required when `status` is `done`.
> * A tool message's `run.path` is the request path **with its query string**; the page puts its
>   API base URL in front. Failed calls keep the route's template path.
> * **A body over the size limit now answers 413 on every route.** Before, the parser's error was
>   swallowed and the request reached its route with no body.
> * The test project gained `authedPut` and `guestPut`. The step suites call
>   `assertAgentNotConfigured` first and refuse to run if the backend has a key, so a key in
>   `env.local` can never make the suite spend money.
> * The model path itself (steps 5 to 9, the history sent to OpenAI, the error mapping) was checked
>   once by driving `runStep` in the container against a scripted fake `fetch`. That check is not
>   in the suite; phase 8's hand checks remain the real test.

### 3.0 How a turn runs, from the backend's side

1. The browser posts the member's message to `POST /agent/chats` (new chat) or
   `POST /agent/chats/{chatId}/messages` (existing chat).
2. The backend closes out any tool calls the chat left unanswered, saves the message and makes
   **one** model call: the fixed system prompt, a session note, the chat's history and the tool
   list. It saves the answer, and one tool message per requested call. Each tool message is
   either already turned into a request (method, path with query, body) or recorded as failed
   when no request can be built. The new messages go back to the browser.
3. The browser runs each pending call with the member's `x-auth` and reports the outcome with
   `PUT /agent/chats/{chatId}/toolCalls/{toolCallId}`. A declined call is reported as `denied`.
4. When nothing is pending, the browser calls `POST /agent/chats/{chatId}/continue`, which repeats
   step 2 without a new user message. The loop ends when an answer has no tool calls, or after 20
   model calls since the member's last message. The backend refuses a 21st.
5. **Stop** is the browser sending nothing further. Results already reported stay saved. Calls
   never reported are marked cancelled the next time the chat moves on. If a model call is already
   running, the backend finishes it and saves the answer, because behind App Engine's front end it
   cannot reliably tell that the browser has gone. The tool calls in that answer are never run.

### 3.1 Configuration

* `src/dotenv/index.ts`: add `OPENAI_API_KEY` **outside** the check that stops the server when a
  required key is missing. A backend without it starts normally.
* `env.local` gets no key. A developer who wants to try the agent locally adds their own.
* The model stays `gpt-6-luna` with `reasoning_effort: 'none'`; both live in the agent service.
* The key never appears in a response or a log line.

### 3.2 The service — `src/services/agent/`

| File | Responsibility |
| --- | --- |
| `tools.ts` | A port of `toJsonSchema`, `describe`, `buildTools` and `buildRequest` from `Agent.vue`. It reads `dist/tsoa/swagger.json` from disk the first time it is needed and keeps the result for the life of the process. It leaves out the five `SESSION_ROUTES` **and every `/agent` route**: the model must never read another member's chats or drive its own. Each tool records its **label**: the route's summary if it has one, otherwise the first line of its description, otherwise its operation id split into words. `isWrite` is true for every method except GET |
| `prompt.ts` | The fixed system prompt, moved from `Agent.vue`, followed by the value codes **imported** from `apiVocabulary.ts`, then the session note: environment (`NODE_ENV`), the member's name, designation and hall from the token's donor, and the current time in **Asia/Dhaka** with Unix milliseconds. One line changes: *"The app may ask the user to approve it"* becomes *"The app asks the user to approve it, and they may decline"* |
| `openai.ts` | One non-streaming Chat Completions call with built-in `fetch`, no SDK, a timeout of about 90 seconds, and the error mapping in 3.7 |
| `conversation.ts` | A port of `toApiMessages`, including the stand-in result for a call that has no answer, and of `titleFrom` and the clipping helpers. It also works out the model's copy of a tool result (at most 60,000 characters) from the response the browser reports |

The 20-call limit is one exported constant here, not configurable.

Update the comment in `apiVocabulary.ts`, which points at the frontend copy, to say the file is
now imported directly. Leave `Agent.vue`'s own copies alone in this phase: today's page still
uses them until phase 6 deletes them.

### 3.3 The routes

Added to `AgentController`. Same middlewares as phase 1 (`handleAuthentication`,
`handleAgentVolunteerCheck`, then the validator), same 404 rule (someone else's chat, a deleted
chat, an unknown or malformed id), and no `commonLimiter`. Assistant messages store the model name
as `openaiModel`.

| Route | Body | Does |
| --- | --- | --- |
| `GET /agent/config` | — | Returns `configured`, `model` and `toolCount`. **Super admins only** also get `systemPrompt`: the prompt with their own session note, for a read-only panel. Other members get no `systemPrompt` field at all |
| `POST /agent/chats` | `{ content }` | Creates a chat from its first message and runs one step. Answers 201 with the chat and the new messages |
| `POST /agent/chats/{chatId}/messages` | `{ content }` | Closes out unanswered calls, saves the message and runs one step |
| `PUT /agent/chats/{chatId}/toolCalls/{toolCallId}` | `{ status, httpStatus?, durationMs?, response?, note? }` | Records the outcome of one call and works out the model's copy. Does not call the model |
| `POST /agent/chats/{chatId}/continue` | — | Closes out unanswered calls and runs one step. Used both for the next step after tool calls and for **Retry** |

### 3.4 Validation

Add to `src/validations/agent.ts`:

* `content`: 1 to 20,000 characters.
* Tool call `status`: one of `done`, `failed`, `denied` or `cancelled`.
* `response`: clipped on the server to 250,000 characters rather than rejected when too long.

### 3.5 The larger body limit, for one path only

Each `PUT …/toolCalls/…` request can carry about 250 KB, but the global `express.json()` in
[app.ts](../../badhan-backend/src/app.ts) stops at 100 KB. Give that one path its own JSON parser
with a 1 MB limit, placed **before** the global parser. Every other route keeps 100 KB.

### 3.6 One step, in order

Shared by `POST /agent/chats`, `…/messages` and `…/continue`. Every check that can refuse the
request comes before anything is saved, and the checks that depend only on the chat's state come
before the key check, so the test suite can reach them without a key.

1. **Find the chat**, using the 404 rule.
2. **For `…/continue` only, two checks:**
   * There must be something to continue. The last message must be a user message or a tool
     result. If it is a finished answer, answer **409**.
   * **The 20-call limit.** If the chat already has 20 assistant messages since its last user
     message, answer **409** with *"Stopped after 20 model calls for one message. Send a message
     to carry on."* `…/messages` never hits this limit, because its new user message starts the
     count again.
3. **Take the chat's lock.** Atomically set `stepStartedAt`, but only when it is empty or more
   than three minutes old. If another step holds it, answer **409**. This stops two tabs from
   running steps on the same chat at the same time.
4. If no key is configured, release the lock, answer **503** and save nothing.

   For `POST /agent/chats`, steps 1 to 3 do not apply. The chat is created only after this key
   check passes.
5. **Close out unanswered calls.** Mark every tool message still `pending` as `cancelled`, with
   the result *"No result was recorded; the request may or may not have reached the server."*
6. Save the user message, for the routes that carry one. On a new chat, also set the title.
7. Build the model request and make the call. If it fails, release the lock and answer **502**.
   The user message stays saved, so **Retry** is simply `…/continue`. A failed call saves no
   assistant message, so it does not count towards the limit.
8. Save the assistant message, add its token usage to the chat's totals, and save one tool message
   per call. Each one is `pending` with its request and `label` already worked out, or `failed`
   with a note.
9. Update `updatedAt`, release the lock, and return the new messages.

### 3.7 Errors

| Situation | Answer |
| --- | --- |
| No key configured | 503 *"The agent is not set up on this server."* |
| OpenAI refuses the key (401) | 502 *"The server's OpenAI key was refused. Tell a super admin."* |
| OpenAI quota or rate limit (429) | 502 with OpenAI's own message |
| OpenAI unreachable or timed out | 502 *"OpenAI could not be reached."* |
| Any other OpenAI error | 502 with OpenAI's own message |
| Chat missing, owned by someone else, or deleted by the member | 404 |
| Step lock already held | 409 |
| Nothing to continue | 409 |
| `…/continue` after 20 model calls since the last user message | 409 *"Stopped after 20 model calls for one message. Send a message to carry on."* |
| Tool call already answered | 409 |
| Tool call id not in the chat | 404 |

### 3.8 App Activity

| Log entry | Written when | Details |
| --- | --- | --- |
| `POST AGENT CHAT` | A chat is created | Chat id |

Ids only, never message text. Individual steps are not logged: every API call the agent makes is
already logged under the route it calls.

### 3.9 Regenerate and typecheck

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
```

`AgentController` appears in `/openapi.json` and `/llms.txt` like any other controller. `tools.ts`
is what keeps these routes away from the model.

### 3.10 Tests — `badhan-backend-test/tests/agent/`

The suite cannot make real model calls: `env.local` has no key, and a test run must not spend
money. Coverage is everything around the model call. Use the phase 1 seed fixture.

* **Tool results:**
  * A result is recorded, and the stored model's copy is worked out from it.
  * An unknown tool call id gives 404, and an already-answered call gives 409.
  * A 250 KB response is accepted, and a body over 1 MB gives 413.
  * An invalid `status` is refused.
* **Steps without a key:**
  * `…/messages`, `…/continue` and `POST /agent/chats` answer 503 and save nothing (no chat, no
    message, lock released).
  * Three checks each answer 409, each tested by seeding a chat in that state: nothing left to
    continue, the 20-call limit (20 assistant messages since the last user message), and a held
    lock.
  * `…/messages` on that same 20-call chat answers 503, not 409: a new message starts the count
    again.
  * A lock older than three minutes does not block; the request reaches the key check and
    answers 503.
  * The 404 rule holds on all three step routes.
  * `content` validation: empty and 20,001 characters are refused.
* **Config:**
  * `GET /agent/config` reports `configured: false` and a tool count above zero.
  * A super admin gets `systemPrompt`. A volunteer and a hall admin get no such field.
  * The tool count equals the operations in `/openapi.json` minus the five session routes and
    every `/agent` route, so the exclusion cannot quietly break.

**Gap, stated plainly:** no automated test reaches OpenAI, and `POST AGENT CHAT` cannot be
written without a key. Both are checked by hand in phase 8.

### 3.11 Manual

No change. No page uses these routes yet.

**Done when:** the suite passes and `tsc` is clean.

---

## Phase 4 — The review routes

**Goal:** a super admin can, through the API, list every member who has agent chats, list one
member's chats including the ones they deleted, read any transcript, and delete a chat for good.
No page uses these routes yet.

**Depends on:** phase 1 (the models, the controller and the seed fixture). Not on phase 3.
**Ships to production:** yes, invisible.

> **Implemented.** The shapes phase 7 builds on:
>
> * `GET /agent/review/members` → `members: [{ donorId, member, chatCount, deletedChatCount,
>   lastActivity }]`. `lastActivity` is the newest `updatedAt` among the member's chats, deleted
>   ones included.
> * `GET /agent/review/members/{donorId}/chats` → `{ member, chats }`. Each chat is everything but
>   the step lock: `_id, owner, title, createdAt, updatedAt, userDeletedChat, userDeletedAt,
>   messageCount, promptTokens, completionTokens`. A malformed donor id is a 400; a member with no
>   chats is an empty list.
> * `GET /agent/review/chats/{chatId}` → `{ chat, member, messages }`.
> * **`member` is `{ _id, name, hall, designation }`, or `null` when the donor record is gone.** The
>   page shows `null` as *Deleted member*; the API does not invent a name.
> * A permanent delete removes the messages first and then the chat. If it lands while one of the
>   member's steps is running, that step fails with a 500 rather than writing into a chat that no
>   longer exists.

### 4.1 The routes

Added to `AgentController`, with `handleAuthentication`, `handleAgentVolunteerCheck` **and**
`handleSuperAdminCheck`. No `commonLimiter`, no paging. Use phase 1's `inspectChat` fixture to
prove a permanent delete removed the chat and its messages.

| Route | Does |
| --- | --- |
| `GET /agent/review/members` | Every member with at least one chat, **counting chats they deleted**. For each: donor id, name, hall, designation, number of chats, number they deleted, and last activity. Most recent activity first |
| `GET /agent/review/members/{donorId}/chats` | All of that member's chats, including deleted ones, with the deleted flag and date, message count and token totals |
| `GET /agent/review/chats/{chatId}` | The full transcript of any chat, whoever owns it and whether or not it was deleted |
| `DELETE /agent/review/chats/{chatId}` | Permanent: deletes the chat's messages, then the chat |

The owner's name, hall and designation are looked up from the donor record when read, never
copied onto the chat. If a chat's donor record has since been deleted, it is listed under
*Deleted member*.

A super admin's own chats appear here like anyone else's. Deleting one here is permanent; on
their own Badhan Agent page it is a soft delete.

### 4.2 App Activity

Ids and counts only:

| Log entry | Written when | Details |
| --- | --- | --- |
| `GET AGENT CHAT (REVIEW)` | A super admin opens a transcript | Chat id, owner id |
| `DELETE AGENT CHAT PERMANENTLY` | A super admin deletes a chat for good | Chat id, owner id, message count |

Listing members and chats is not logged.

### 4.3 Regenerate and typecheck

`tsoa:routes`, then `tsc --noEmit`, in the `backend` container.

### 4.4 Tests — `badhan-backend-test/tests/agent/`

Seed with the phase 1 fixture.

* 403 for volunteers and hall admins on all four routes.
* A member whose only chats are ones they deleted is still listed, and their chats carry the
  deleted flag and date.
* Counts, token totals and ordering are as seeded.
* A transcript of a deleted chat, and of another member's chat, can be read.
* Permanent delete removes the chat **and** its messages.
* Deleting a member's last chat removes them from the members list.
* A chat whose owner's donor record is gone is listed under *Deleted member*.
* `GET AGENT CHAT (REVIEW)` and `DELETE AGENT CHAT PERMANENTLY` are written.

### 4.5 Manual

No change. Nothing a member sees is different.

**Done when:** the suite passes and `tsc` is clean.

---

## Phase 5 — `AgentThread` extracted, no change in behaviour

**Goal:** the transcript (user bubbles, plain-text answers, tool cards and the token usage line)
moves out of `Agent.vue` into a component both agent pages can use. The page looks and behaves
exactly as before. This is a refactor and nothing else, so that phase 6's changes are reviewed
against a stable base.

**Depends on:** nothing. **Ships to production:** yes.

> **Implemented.** What phases 6 and 7 build on:
>
> * `AgentThread` takes `messages` (the chat's messages in order, tool messages included),
>   `server` (`{ label, live }`, for the approval prompt) and `readOnly`. It emits
>   `approve(toolCallId)`, `decline(toolCallId)` and `retry`, and has a `notice-actions` slot
>   (`{ message }`) for extra buttons beside a notice. Today's page puts its **Settings** link
>   there; phase 6 removes it with Settings.
> * The card **opening itself** for approval moved into the component (a watcher, once per call),
>   since the open/closed state now lives there. Phase 6 deletes that watcher.
> * `pretty` and `when` live in `src/components/Agent/format.js`, for the page, the component and
>   phase 7's review page.
> * The component still reads today's message shape (`tool_calls`, `tool_call_id`, `model`,
>   `streaming`). Phase 6 switches it to the server's (`toolCalls`, `toolCallId`, `openaiModel`).
> * Checked with a throwaway Cypress spec that drove the page with OpenAI stubbed by
>   `cy.intercept`: a GET card, a write waiting with its card open, Decline, the usage line,
>   expanding and collapsing a card, an error notice and Retry. It passed against both the original
>   `Agent.vue` and the refactored one, and was then deleted.

### 5.1 The component

New `badhan-frontend/src/components/Agent/AgentThread.vue`. It takes the chat's messages and
renders them as today's page does, including today's card heading and today's streaming text.
The display helpers move with it: `when`, `pretty`, the method and status colours, `toolLabel`
and **Copy as curl**.

It has a **read-only mode** (a prop) with no approval buttons and no **Retry**, for phase 7's
review page. In this phase only the normal mode is used. Approval and Retry are emitted as events
for `Agent.vue` to handle, so the run logic stays in the page.

Answers keep being drawn as text, never as HTML. A transcript can quote free text that the public
typed into a form.

### 5.2 Comments and README

* Rewrite the header comment in `Agent.vue` that says the whole page lives in this one file.
* The root [README.md](../../README.md) *The Chat Agent* section says the same. Correct that one
  sentence to name both files. The rest of that section is rewritten in phase 6.

### 5.3 Checks

There are no Cypress tests for the agent yet; phase 6 adds them. Check by hand on local, with a
super admin's own OpenAI key in Settings as today:

* a read-only question: GET cards, expand and collapse, **Copy as curl**;
* a write: the card opens for approval, **Send request** and **Decline** both work;
* **Retry** after a failed call, and **Stop** mid-turn;
* the token usage line.

`docker compose exec frontend npm run build` must succeed.

### 5.4 Manual

No change. Nothing a member sees is different.

**Done when:** the build succeeds and the hand checks show no difference from before.

---

## Phase 6 — Badhan Agent runs on the backend, for every member

**Goal:** `Agent.vue` stops calling OpenAI and stops storing chats in the browser. It uses the
backend's `/agent` routes, every member from Volunteer up can open it, tool cards show a
description instead of a URL, and Settings is gone.

**Depends on:** phase 3 (the step routes and `/agent/config`) and phase 5 (`AgentThread`). Phase 2
is strongly advised, because this phase puts route descriptions in front of volunteers.
**Ships to production:** **no, not on its own.** It goes to development, and reaches production
together with phase 7 at the end of phase 8.

**Before deploying to development:** add `OPENAI_API_KEY` to `env.development` in the secrets
repo. That is the maintainer's step, because this plan cannot reach the secrets repo. Without it
the page deploys but says the agent is not set up.

> **Implemented** (not yet deployed; the development key is still the maintainer's step). Details
> the build settled:
>
> * **New chats.** New chat adds a local entry, *"Not sent yet"*, at the top of the list; there is
>   one at a time, and its title cannot be edited until the server has created it. With no chats
>   at all the page shows **Start a chat** and makes nothing by itself.
> * **Retry knows whether the message was saved.** The member's message shows at once. If the step
>   fails before the server saved it (503, 409, 404, a network error), the bubble stays and Retry
>   sends it again; once it is saved (any success, or a 502), Retry is `…/continue`.
> * **Messages are numbered**, so a step whose `seq` does not follow on — after Stop, while the
>   server finished a model call the page stopped waiting for, or after another tab — makes the
>   page read the whole chat again.
> * **A 403 signs the member out**, as the member chat does: it means they were demoted.
> * **Guest mode** shows *"Badhan Agent is not available in the demo."*; the agent has no guest
>   mirror.
> * The agent's API calls sit in `src/api/index.ts` with the others: config, list, open, rename and
>   delete through `badhanAxios`; the steps and result reports through plain `fetch`.
> * `AgentThread` takes a `thinking` prop for the dots, reads the server's message shape, and an
>   opened card shows Request (method and full URL, Copy as curl), Arguments, Request body, Status,
>   Note and Response.
> * Chapter 17 got a short **Rules about Badhan Agent** section (the 20-step limit, the busy chat,
>   not set up, members only), not only the one line.
> * Tests: `cypress/e2e/agent/page.cy.ts` and `turn.cy.ts`, with stubs in
>   `cypress/support/helpers/agent.ts`.

### 6.0 How a turn runs, from the browser's side

1. The member sends a message. The page posts it to `POST /agent/chats` for a new chat, or to
   `POST /agent/chats/{chatId}/messages` for an existing one. The backend makes one model call
   and returns the new messages: the answer, and one tool message per requested call, each
   already turned into a request with its `label`, or already marked failed.
2. For each pending tool call, in order: a **GET runs straight away**; **every other method asks**
   with **Send request** and **Decline**. The page sends the request to the API with the member's
   `x-auth`, exactly as today, and reports the outcome straight after with
   `PUT /agent/chats/{chatId}/toolCalls/{toolCallId}`. A declined call is reported as `denied`.
   The request is `run.method` to the page's API base URL plus `run.path` (which already carries
   the query string), with `run.body` as JSON when it is not null. The report's `response` is the
   body **as text** (JSON pretty-printed, or the text as sent; a binary answer as today's one-line
   note), `httpStatus` and `durationMs` with it; a request that never got an answer is `failed`
   with a `note`.
3. When nothing is pending, the page calls `POST /agent/chats/{chatId}/continue` and goes back to
   step 2 with what it returns.
4. The loop ends when an answer has no tool calls, or after **20 model calls** since the member's
   last message. The page stops itself and shows today's limit notice with the number fixed at 20.
   The backend's 409 is the backstop if the page does not stop.
5. **Stop** makes the page send nothing further. Results already reported stay saved; the backend
   marks unreported calls cancelled the next time the chat moves on.

### 6.1 Menu and route

* `/agent` changes to `designation: 1`. Update the router comment that calls it super-admin only.
* In `AppBar.vue`, **Badhan Agent** leaves the Super Admin submenu and becomes a top-level entry
  for Volunteer and above, placed after **Messages**.

### 6.2 The tool card changes shape (in `AgentThread`)

GET and non-GET cards work the same way:

* **Collapsed**, which is how every card starts, it shows the chevron, the `label` and the status
  chip (*queued*, *needs approval*, *running…*, *200 · 140 ms*, *declined* and so on). The method
  chip, the path and the tool name are no longer in the heading.
* **Expanded**, after a click, it shows everything: the method, the full URL with **Copy as
  curl**, the arguments, the request body, the status and duration, any note, and the response.
* **A card waiting for permission** (later decision: no prompt line, only the buttons) shows its label, a one-line prompt (*"This changes data on
  ‹environment›. Send it?"*) and the **Send request** and **Decline** buttons. It stays collapsed
  like any other card. The member clicks it to see what will be sent.

The read-only mode from phase 5 keeps working: no buttons, no Retry.

### 6.3 Removed from `Agent.vue`

* the OpenAI client and `checkApiKey`;
* the OpenAPI-to-tools code, loading `/openapi.json`, and phase 1's `/agent` guard with it;
* `SYSTEM_PROMPT` and `VALUE_CODES`;
* the IndexedDB `chatStore`;
* **Settings as a whole**: the button, the fold-out panel, the API key box, the approval radio
  buttons, the "model calls per message" field, and `loadSettings` with its
  `badhan-agent:settings` storage;
* `needsApproval`'s three modes and its production special case, replaced by one rule: a GET
  runs, anything else asks;
* the **example prompt chips** (`EXAMPLES`, `useExample`). An empty chat keeps only its one line
  about what the agent can look up;
* the cards opening by themselves when they need a decision (the `openCards` line in `runTool`);
* the streaming text: while a step runs, the "thinking" dots show where it used to be.

### 6.4 Changed in `Agent.vue`

* **Loading.** The page calls `GET /agent/config` and `GET /agent/chats`. Opening a chat fetches
  `GET /agent/chats/{chatId}`.
* **New chat.** A new chat exists only in the page until its first message is sent, so the server
  never holds empty chats. The page no longer creates a chat by itself on first load.
* **Rename** calls `PATCH /agent/chats/{chatId}`, debounced as today's save is. **Delete** calls
  `DELETE /agent/chats/{chatId}`, and the confirmation keeps today's wording. Nothing tells the
  member the chat is kept.
* **Not set up.** When `configured` is false, the composer shows *"The agent is not set up on
  this server yet. Ask a super admin."* and **Send** stays disabled.
* **The system prompt panel** is drawn only when `/agent/config` returns `systemPrompt`, which
  happens only for super admins. Other members see the chat start straight away. The model name
  in the footer also comes from `/agent/config`.
* **Errors.** A failed step shows as today's notice in the chat, with **Retry**, which calls
  `…/continue`. On a 502 for a new chat, take the chat id from the response's `chat` so Retry has
  something to continue. Tell the 409s apart by `reason`, not by message. A 409 from the lock
  (`busy`) reads *"This chat is busy in another tab or window."* The step
  calls use plain `fetch`, so errors appear in the chat rather than as app-wide toasts. List,
  rename and delete use `badhanAxios`, as other pages do.
* **The production warning strip** stays.
* Notices ("Stopped.", OpenAI errors, the limit message) are shown and then forgotten; the
  backend does not store them.

### 6.5 One-time cleanup, and sign-out

* **On load**, delete the `badhan-agent` IndexedDB database and the whole
  `badhan-agent:settings` localStorage key, which removes any saved OpenAI key with it.
* **Sign-out** no longer removes chats, because they are on the server and come back at the next
  sign-in. `ldb.reset()` in
  [localDatabase/index.ts](../../badhan-frontend/src/localDatabase/index.ts) still deletes the old
  IndexedDB name, for browsers that never open the page again. Update its comment to say so.

A browser tab left open across the deploy keeps running the old page, with its own key and
IndexedDB, until it is reloaded. That is harmless.

### 6.6 Manual and README

Written for readers with no coding experience, like the rest of the manual.

* **New [docs/manual/22-badhan-agent.md](../manual/22-badhan-agent.md)**, for every member. The
  member-facing part of chapter 16's Badhan Agent section moves here and is rewritten:
  * there is no key to enter and no Settings;
  * chats are kept by Badhan and follow you to any device you sign in on;
  * signing out no longer deletes them;
  * deleting a chat removes it from your list;
  * answers appear all at once;
  * the agent works as you, within your own permissions, so a volunteer's agent cannot reach
    another hall's restricted donors;
  * what you type, and what Badhan sends back, goes to OpenAI;
  * **cards**: each one names what the assistant is doing in plain words, and tapping it shows
    the exact request and what came back;
  * **looking things up happens on its own, and anything that would add, change or delete waits
    for Send request**, everywhere and always. Tap the card first to see exactly what it will
    send;
  * **one message allows at most 20 steps.** After that the assistant stops, and you send another
    message to carry on.

  This chapter does **not** describe the deleted-by-user flag or the system prompt.
* **[16-super-admin-tools.md](../manual/16-super-admin-tools.md).** Replace the Badhan Agent
  section with a pointer to chapter 22. Keep its **System prompt** subsection here, rewritten to
  say that only super admins see the panel. (Phase 7 adds the Agent Chats section.)
* **[05-the-screen-and-the-menu.md](../manual/05-the-screen-and-the-menu.md).** The Badhan Agent
  row becomes a top-level entry for Volunteer and above, linking to chapter 22.
* **[04-roles-and-permissions.md](../manual/04-roles-and-permissions.md).** Wherever the chapter
  lists what each level can use, add the agent for Volunteer and above.
* **[17-rules-the-app-enforces.md](../manual/17-rules-the-app-enforces.md).** Next to the member
  chat's rule, add the agent's: *"Only Badhan members can use Badhan Agent"* means your account
  is no longer a member's, which is what a demoted member sees.
* **Manual [README.md](../manual/README.md)** gains chapter 22. Fix the previous and next links
  of chapters 21 and 22.
* **Root [README.md](../../README.md)**, *The Chat Agent*: it is now a top-level menu entry for
  every member; the backend holds the key as the optional `OPENAI_API_KEY` (not in `env.local`;
  add your own to try it locally); chats are stored in MongoDB; the model calls happen in
  `badhan-backend/src/services/agent/`.

### 6.7 Tests — `badhan-frontend-test/cypress/e2e/agent/`

These use `cy.intercept` on the `/agent` routes to script the model's answers, so they need no
key.

* A volunteer sees the top-level menu entry and opens the page. There is no Settings button, no
  system prompt panel and no example chips.
* A super admin sees the system prompt panel.
* **A GET call** runs without a prompt. Its card heading shows the label and no URL. Clicking the
  card shows the method, the full URL, the arguments and the response.
* **A write call** waits, collapsed, with **Send request** and **Decline**. Clicking it shows the
  request before sending. Sending it reports the result and continues to the final answer.
  Declining reports `denied`.
* The page stops after 20 model calls in one turn, using a scripted run that never stops calling
  tools, and shows the limit notice.
* The *not set up* message, and **Send** disabled.
* A lock 409 shows the "busy in another tab" notice.
* Delete removes the chat from the list.
* An old `badhan-agent:settings` key is removed from localStorage on load.

Also run `docker compose exec frontend npm run build`.

**Done when:** the Cypress tests pass, the build succeeds, the manual and README are updated, and
the page works on development with the development key.

---

## Phase 7 — The Agent Chats review page

**Goal:** super admins get **Agent Chats**, a three-column page to read every member's agent
chats, including the ones members deleted, and to delete a chat for good.

**Depends on:** phase 4 (the review routes), phase 5 (`AgentThread`'s read-only mode) and phase 6
(the menu change that frees the slot, and the chats worth reading). **Ships to production:**
**no, not on its own.** It reaches production together with phase 6 at the end of phase 8.

> **Implemented.** `src/views/AgentChats.vue`, route `/agentChats`, menu entry
> `agentChatsNavigationId` between *Use Badhan with AI* and *Dev Console*. Notes:
>
> * The four review calls are in `src/api/index.ts` through `badhanAxios`, so their errors toast
>   like any other page's.
> * `agentServer()`, `day()` and `tokens()` joined `when()` and `pretty()` in
>   `src/components/Agent/format.js`; the agent page and `AgentThread` use them too.
> * A member row also says how many of their chats they deleted (*"2 chats, 1 deleted by user"*).
> * **Later decision: the system prompt is shown only here**, from a *System prompt* button above
>   the columns (a dialog), and no longer on the Badhan Agent page, even for super admins. The
>   backend still sends it to super admins only, from `GET /agent/config`.
> * **Later decisions on the agent page:** a card waiting for approval shows only its label and the
>   **Approve** (was *Send request*) and **Decline** buttons, with no prompt line; and the model and
>   token line under each answer shows only on this page (`AgentThread`'s `showUsage`). The agent
>   page also no longer shows the model name (under the message box) or the tool count (in the
>   header), and an empty chat says only *"Ask about donors, donations, call records or reports."*
> * Chapter 16's Agent Chats section also says that a backup taken before a permanent delete
>   still holds the chat.
> * Tests: `cypress/e2e/agent/review.cy.ts`, with the review routes stubbed by a small stateful
>   intercept, so a delete really changes what the next list returns; `NavigationDrawer` gained
>   `goToAgentChats()`. The full Cypress suite was not run for phases 6 and 7; every agent spec
>   (17) passes.

### 7.1 Route and menu

New route `/agentChats`, **Agent Chats**, `designation: 3`. It goes in the Super Admin submenu
where Badhan Agent used to be. A volunteer or hall admin who opens `/agentChats` is redirected,
as for every other super admin page.

### 7.2 The page — `src/views/AgentChats.vue`

It uses the review routes only: `GET /agent/review/members`,
`GET /agent/review/members/{donorId}/chats`, `GET /agent/review/chats/{chatId}` and
`DELETE /agent/review/chats/{chatId}`.

**Wide screens** show three columns:

1. **Members.** Name, hall, designation, number of chats and last activity, most recent first.
   A member whose donor record is gone appears as *Deleted member*.
2. **Chats** of the selected member. Each shows the title, when it was last updated, the token
   totals, a *Deleted by user · date* tag where it applies, and a bin button.
3. **Transcript.** `AgentThread` in **read-only mode**, under a header that shows the title, the
   member, the creation date, the deleted tag if any, and the same permanent-delete button.

**Permanent delete** asks for confirmation: *"Permanently delete "‹title›" by ‹member›? It is
removed from Badhan for good and cannot be undone."* Afterwards the page fetches the members list
again rather than working out the change locally. The chat leaves column 2. If it was the
member's last chat, the member leaves column 1 and columns 2 and 3 go back to their empty hints.

**Narrow screens** show one column at a time: members, then chats, then transcript, with a back
button in the header.

**Empty state:** *"No member has an agent chat yet."*

The page has **no composer**. A super admin can read other members' chats but never continue
them. Answers are drawn as text, never as HTML.

### 7.3 Manual

* **[16-super-admin-tools.md](../manual/16-super-admin-tools.md)**: add an **Agent Chats**
  section covering:
  * the three columns;
  * what *Deleted by user* means: the member deleted it, and it is kept until a super admin
    deletes it;
  * permanent delete, and why a member disappears from the list once their last chat goes;
  * that opening a transcript is recorded in App Activity;
  * what the token counts mean, given that the organisation pays and there is no daily limit.
* **[05-the-screen-and-the-menu.md](../manual/05-the-screen-and-the-menu.md)**: add a row for
  *→ Agent Chats*, Super Admin only.
* **[04-roles-and-permissions.md](../manual/04-roles-and-permissions.md)**: wherever the chapter
  lists what each level can use, add Agent Chats for Super Admin.
* Chapter 15 names no App Activity entries, so it needs no change.

### 7.4 Tests — `badhan-frontend-test/cypress/e2e/agent/`

As a super admin, with `cy.intercept` or seeded chats:

* selecting through the three columns;
* a *Deleted by user* tag;
* permanent delete removing the chat;
* a member disappearing after their last chat is deleted;
* the one-column layout at phone width, with the back button;
* the empty state.

And: a volunteer who opens `/agentChats` is redirected.

Also run `docker compose exec frontend npm run build`.

**Done when:** the Cypress tests pass, the build succeeds and the manual is updated.

---

## Phase 8 — Full suite, development checks, and rollout

**Goal:** prove the whole change on development with a real key, then turn it on in production.

**Depends on:** every earlier phase.

### 8.1 Full suites

```
docker compose run --rm backend-test <cmd>
docker compose run --rm frontend-test <cmd>
```

Ask before starting the stack.

### 8.2 Development

With `OPENAI_API_KEY` in `env.development` (phase 6) and phases 1 to 7 deployed to development,
check by hand:

* a read-only question, as a volunteer and as a super admin;
* a write that needs approval: open the card, then **Send request**; and again with **Decline**;
* a volunteer's agent cannot reach another hall's restricted donors;
* **Stop** in the middle of a turn, then a new message in the same chat;
* reloading in the middle of a turn;
* the same chat open in two tabs (the second gets *"busy in another tab or window"*);
* the same chat on a second device, and after signing out and in again;
* the review page: columns, a chat the member deleted, and a permanent delete;
* App Activity shows `POST AGENT CHAT` for a new chat, the one log entry no automated test can
  write;
* a volunteer sees no system prompt panel, and `/agent/config` sends them no `systemPrompt`.

### 8.3 Production

Only when 8.2 passes:

1. Add `OPENAI_API_KEY` to `env.production` in the secrets repo (the maintainer's step).
2. Merge to `production` and deploy. Phases 6 and 7 go together, with the backend.

A browser tab left open across the deploy keeps running the old page until it is reloaded. That
is harmless.

---

## Appendix A — Risks this plan accepts (§9)

* **Cost.** The backend holds each message to 20 model calls, but nothing limits how many messages
  a member sends. Any member can run up the organisation's OpenAI bill with no daily cap. The
  token totals on the review page are the only view of what is being spent. Adding a cap later
  needs only a server change. (Phases 3, 7, 8.)
* **Approving without looking.** A card waiting for permission shows only the route's
  description, such as *"Update donor details"*, which says nothing about which donor or what
  values. A member who presses **Send request** without opening the card approves a change they
  have not seen. Chapter 22 tells members to open the card first, and nothing enforces it.
  (Phases 2, 6.)
* **Personal data kept indefinitely.** Transcripts quote donor records. They sit in MongoDB and
  in every backup until a super admin deletes them, including chats members believe they
  deleted. (Phases 1, 4.)
* **Results come from the browser.** The browser reports what the API answered, so a member could
  put invented results into their own chat. This only misleads that member's own conversation and
  the transcript a super admin reads; the review page cannot tell a fabricated result from a real
  one. Every real call is still in App Activity under the route it called, so a mismatch can be
  checked. (Phases 3, 7.)
* **No streaming.** Long answers arrive after a visible wait. (Phases 3, 6.)
* **The step routes are callable directly.** Once a key is configured, any member's token can
  drive the model without the page. This is the cost risk above by another door, and the reason
  the production key arrives last. (Phases 3, 8.)

---

## Appendix B — Traceability

| plan24.md section | Phase |
| --- | --- |
| Decisions | 0 (D1–D15), applied throughout |
| §1 How a turn runs | 3.0 (backend side), 6.0 (browser side) |
| §1 What moves where | 1.2, 3.1, 3.2, 6.2–6.5 |
| §1 Session note time zone | 3.2 (`prompt.ts`) |
| §2.1 `AgentChat` | 1.2 |
| §2.2 `AgentMessage`, notices not stored | 1.2, 3.2 (model's copy), 6.4 |
| §2.3 Model registration, backups | 1.3 |
| §3.1 Configuration | 3.1; secrets repo in 6 (development) and 8.3 (production) |
| §3.2 Agent service | 3.2 |
| §3.2 Route descriptions become text members read | 2 |
| §3.3 Member routes | 1.4 (list, open, rename, delete), 3.3 (config, steps, tool results) |
| §3.3 Review routes | 4.1 |
| §3.3 Validation | 1.5 (title), 3.4 (content, status, response) |
| §3.3 Rate limiting, paging | 1.4, 4.1 |
| §3.3 Request size | 3.5 |
| §3.4 One step, in order | 3.6 |
| §3.5 Errors | 3.7 |
| §3.6 App Activity logging | 1.6, 3.8, 4.2 |
| §3.7 OpenAPI | 3.9; the old page's exposure is closed in 1.1 |
| §4.1 Menu and routes | 6.1 (`/agent`), 7.1 (`/agentChats`) |
| §4.2 Shared thread component | 5 (extraction), 6.2 (card shape) |
| §4.3 `Agent.vue` | 6.3–6.5 |
| §4.4 `AgentChats.vue` | 7.2 |
| §5.1 Backend tests | 1.9, 2.3, 3.10, 4.4; `POST AGENT CHAT` moves to 8.2 |
| §5.2 Frontend tests | 6.7, 7.4 |
| §6 Manual | 6.6 (chapter 22, 16, 05, 04, contents, root README), 7.3 (Agent Chats); chapter 15 needs no change |
| §7 Order of work | This document's phase order, with the production gate in 8 |
| §8 Left alone | 0 (Out of scope) |
| §9 Risks | Appendix A |
