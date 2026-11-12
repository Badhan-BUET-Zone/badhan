# Plan 24 — Badhan Agent moves its model calls and its chats to the backend

Today the agent runs entirely in the browser. Each super admin brings their own OpenAI key and
keeps it in localStorage. Chats live in IndexedDB and are wiped at every sign-in and sign-out.
`Agent.vue` builds the tool list, writes the system prompt, calls OpenAI and runs every request
itself.

After this plan, the backend holds the organisation's key and makes every model call. Chats are
stored in MongoDB and follow a member from device to device. Every member can use the agent,
not only super admins. Super admins get a review page with three columns: members, their chats,
and the transcript. Deleting a chat is a soft delete when a member does it and permanent when a
super admin does it.

---

## Decisions taken before this plan was written

These were asked and answered, and are not argued again below.

* **Every member can use the agent:** Volunteer, Hall Admin and Super Admin. Tool calls still
  carry the member's own session token, so each person acts with their own permissions and the
  hall rules in chapter 17 apply unchanged. The menu entry moves out of **Super Admin**.
* **The backend calls the model, and the browser still runs the tool calls.** The backend makes
  one model call per request. When the answer asks for API calls, the browser runs them with the
  member's session, using the same approval flow as today. It reports each result to the backend
  and then asks for the next step.
* **Answers no longer stream.** App Engine standard sends each response in one piece, so an
  answer appears whole once it is ready, with the "thinking" dots shown until then.
* **The key lives in the backend env files as `OPENAI_API_KEY`**, taken from the secrets repo
  in the same way as `JWT_SECRET`. The key is optional: a backend without it still starts, and
  the agent says it is not set up. The Settings key box, its liveness check and **Clear key**
  are removed. Any key still saved in a browser is erased.
* **The only usage limit is 20 model calls per message, and it is fixed.** It is not a
  setting, and the backend enforces it (§3.4) rather than trusting the browser to stop. There is
  no daily budget and no rate limit on the server. The organisation's key pays for every member.
  §9 records the risk.
* **Permission is fixed as well.** A GET call runs on its own. Every other method (POST, PUT,
  PATCH, DELETE) waits for the member to press **Send request**, on every environment. The
  approval choice in Settings goes. Since the 20-call limit is no longer a setting either,
  **Settings is removed entirely**.
* **Tool cards show a description, not a URL.** The card's one line is the first line of the
  route's description in the API docs, for example *"Search for donors filtered by criteria"*.
  It is the same text every time that route is called. Clicking the card opens everything: the
  method, the full URL, the arguments, the request body, the status and duration, and the
  response.
* **Cards waiting for permission stay collapsed too.** A non-GET card shows its description
  with **Send request** and **Decline**. The member clicks the card to see the request before
  deciding. It no longer opens by itself.
* **Only super admins see the system prompt.** Other members never see the panel, and the
  backend does not send them its text.
* **No example prompts.** The suggestion chips on an empty chat are removed.
* **A member's delete is a soft delete.** It sets `userDeletedChat`, which is the requested
  `user_deleted_chat` flag spelled in the codebase's camelCase (rename it if the literal
  spelling matters). The chat disappears from that member's view everywhere, but the chat and
  its messages stay in the database.
* **The member is not told.** The delete confirmation still reads like an ordinary delete. Only
  the super admin chapter of the manual describes the flag.
* **Super admins see chats that members deleted**, tagged *Deleted by user* with the date. A
  chat leaves the database only when a super admin deletes it permanently from the review
  page. A member leaves the first column once they have no chats left at all; a chat the member
  deleted still counts as one of theirs.
* **A super admin's own Badhan Agent page works like everyone else's.** Deleting a chat there is
  also a soft delete. Permanent delete exists only on the review page.
* **Chats already saved in browsers are discarded.** The page deletes the old IndexedDB
  database the first time it loads.

---

## 1. How a turn runs after this change

1. The member sends a message. The browser posts it to `POST /agent/chats` for a new chat, or to
   `POST /agent/chats/{chatId}/messages` for an existing one.
2. The backend first closes out any tool calls the chat left unanswered (§3.4). It then saves
   the message and makes **one** model call. That call sends the fixed system prompt, a session
   note, the chat's history and the tool list. The backend saves the answer. If the answer asks
   for tool calls, the backend saves one tool message per call. Each tool message is either
   already turned into a request (method, path with query, body) or recorded as failed when no
   request can be built. The new messages are returned to the browser.
3. For each pending tool call, in order, the browser runs a GET straight away and asks the
   member before any other method. It sends the request to the API with the member's `x-auth`,
   exactly as today, and reports the result with
   `PUT /agent/chats/{chatId}/toolCalls/{toolCallId}`. A declined call is reported as `denied`.
4. When no tool call is left pending, the browser calls `POST /agent/chats/{chatId}/continue`.
   That repeats step 2 without a new user message. The loop ends when an answer has no tool
   calls, or after 20 model calls since the member's last message. The backend refuses a 21st
   (§3.4).
5. **Stop** makes the browser stop sending anything further. Results it has already reported
   stay saved. Calls it never reported are marked cancelled the next time the chat moves on. If
   a model call is already running, the backend finishes it and saves the answer, because behind
   App Engine's front end it cannot reliably tell that the browser has gone. The tool calls in
   that answer are never run.

### What moves where

| Piece | Today | After |
| --- | --- | --- |
| OpenAI key | The member's own, in localStorage | `OPENAI_API_KEY` in the backend env |
| Model call | `streamCompletion` in `Agent.vue`, streaming | Backend, one non-streaming call per step |
| System prompt and value codes | `SYSTEM_PROMPT` plus a copy of `VALUE_CODES` in `Agent.vue`, shown to everyone who opens the page | Backend. It imports `src/doc/apiVocabulary.ts` directly, so the copy goes. Shown to super admins only |
| Session note | Filled in by the browser | Filled in by the backend from the token's donor, `NODE_ENV` and the current time |
| Tool list | Built from a fetched `/openapi.json` | Built by the backend from its own `dist/tsoa/swagger.json`, once per process |
| Turning a tool call into a request | `buildRequest` in the browser | Backend, stored on the tool message |
| Sending the request, and approval | Browser | Browser (unchanged) |
| Chats | IndexedDB, deleted at sign-in and sign-out | MongoDB, kept across devices and sign-outs |
| Approval and the per-message limit | The member's own settings, in localStorage | Fixed: GET runs on its own and every other method asks; 20 model calls per message, enforced by the backend |
| Tool card heading | Method, path and tool name | The route's description from the API docs. The rest appears on click |

The session note's time zone changes. Today it uses the browser's zone. The backend runs in
UTC, so the note states the current time in **Asia/Dhaka**, together with the Unix
milliseconds as today.

---

## 2. Data model

### 2.1 `AgentChat` — new model, `src/db/models/AgentChat.ts`

| Field | Meaning |
| --- | --- |
| `owner` | The member's donor `_id` |
| `title` | The first line of the first message, at most 60 characters (today's `titleFrom`). The member can rename it |
| `createdAt`, `updatedAt` | Timestamps in milliseconds, the codebase's usual date format |
| `userDeletedChat` | Boolean, default `false` |
| `userDeletedAt` | Milliseconds, or `null` |
| `messageCount` | The next message's `seq` |
| `promptTokens`, `completionTokens` | Running totals across the chat's model calls. The review page shows them |
| `stepStartedAt` | Milliseconds, or `null`. This is the per-chat lock described in §3.4 |

The owner's name, hall and designation are **not** copied onto the chat. They are looked up when
read. If a chat's donor record has since been deleted, it is listed under *Deleted member*.

Indexes: `{ owner, userDeletedChat, updatedAt }` for a member's own list, and `{ owner }` for
grouping chats on the review page.

### 2.2 `AgentMessage` — new model, `src/db/models/AgentMessage.ts`

Each message is a separate document rather than being stored inside the chat. One tool response
can be 250 KB, and a chat with fifty of them would pass MongoDB's 16 MB limit for a single
document.

| Field | Meaning |
| --- | --- |
| `chatId`, `seq` | Position in the chat. Unique together |
| `role` | `user`, `assistant` or `tool` |
| `content` | The user's text, the assistant's text, or for a tool message the copy sent to the model (at most 60,000 characters) |
| `toolCalls` | Assistant messages only: the calls exactly as OpenAI returned them |
| `model`, `usage` | Assistant messages only |
| `toolCallId`, `run` | Tool messages only. `run` keeps today's shape: status, name, method, path with query, args, body, `isWrite`, HTTP status, duration, the response for display (at most 250,000 characters) and a note. It adds `label`, the description the card shows (§3.2) |
| `createdAt` | Milliseconds |

The model's copy of a tool result is **worked out by the backend** from the response the browser
reports. It is never sent separately.

**Notices are not stored.** "Stopped.", OpenAI errors and the per-message limit message belong
to one browser's session. The page shows them and then forgets them, so super admins do not see
them.

### 2.3 Wherever every model is listed

* Add both models to `syncIndexes.ts`.
* Add both models to `src/db/test/clearDatabase.ts`, so the test purge empties them.
* The Schema Inconsistencies page goes through `mongoose.connection.models`, so it will pick up
  both models without a change. Check that their field rules do not produce false reports.
* Backups copy whole collections, so from now on **every backup also contains chat
  transcripts**.

---

## 3. Backend

### 3.1 Configuration

* `src/dotenv/index.ts`: add `OPENAI_API_KEY` **outside** the check that stops the server when
  a required key is missing.
* The model stays fixed at `gpt-6-luna` with `reasoning_effort: 'none'`. Both move into the
  agent service (§3.2).
* **Secrets repo:** add the key to `env.development` and `env.production`. That is your step,
  because this plan cannot reach the secrets repo. `env.local` gets no key. A developer who
  wants to try the agent locally adds their own.

### 3.2 New service — `src/services/agent/`

| File | Responsibility |
| --- | --- |
| `tools.ts` | A port of `toJsonSchema`, `describe`, `buildTools` and `buildRequest` from `Agent.vue`. It reads `dist/tsoa/swagger.json` from disk the first time it is needed and keeps the result. It leaves out today's five `SESSION_ROUTES` **and every `/agent` route**: the model must never read another member's chats or drive its own. Each tool also records its **label**: the route's summary if it has one, otherwise the first line of its description. If a route has neither, the label is its operation id split into words, so a URL is never shown. `isWrite` is true for every method except GET |
| `prompt.ts` | The fixed system prompt, moved from `Agent.vue`, followed by the value codes imported from `apiVocabulary.ts` and then the session note (environment, the member's name, designation and hall, and the time in Asia/Dhaka). One line changes: *"The app may ask the user to approve it"* becomes *"The app asks the user to approve it, and they may decline"*, which is now always true |
| `openai.ts` | One non-streaming Chat Completions call using Node 22's built-in `fetch`. No SDK is added. It has a timeout of about 90 seconds and the error mapping in §3.5 |
| `conversation.ts` | A port of `toApiMessages`, including the stand-in result for a call that has no answer, and of `titleFrom` and the clipping helpers |

Update the comment in `apiVocabulary.ts`, which currently points at the frontend copy, to say
the file is now imported directly.

**Route descriptions become text that members read.** The first line of each controller
method's description is now a card heading in front of volunteers, so it must make sense to a
non-technical member. Go through the first lines and fix any that describe the code rather than
the action. For example, `DELETE /users/logins` currently reads *"Handle missing tokenId -
validation error"*. Only the first line matters for the card. The longer text under it, which
the model reads, stays as it is.

### 3.3 Routes — `src/tsoaControllers/AgentController.ts`, `@Route('agent')`

**Member routes.** These use `handleAuthentication` and `handleVolunteerCheck` and act only on
the caller's own chats. A chat owned by someone else, or one the member has deleted, gets the
same 404 as a chat that does not exist, so chat ids cannot be probed.

| Route | Body | Does |
| --- | --- | --- |
| `GET /agent/config` | — | Returns `configured`, `model` and `toolCount`. **Super admins only** also get `systemPrompt`: the prompt with their session note, for the read-only panel. Other members get no `systemPrompt` field at all |
| `GET /agent/chats` | — | The caller's chats that they have not deleted, newest first: id, title, created and updated times |
| `GET /agent/chats/{chatId}` | — | One chat and all its messages, in `seq` order |
| `POST /agent/chats` | `{ content }` | Creates a chat from its first message and runs one step. Answers 201 with the chat and the new messages |
| `POST /agent/chats/{chatId}/messages` | `{ content }` | Closes out unanswered calls, saves the message and runs one step |
| `PUT /agent/chats/{chatId}/toolCalls/{toolCallId}` | `{ status, httpStatus?, durationMs?, response?, note? }` | Records the outcome of one call. Does not call the model |
| `POST /agent/chats/{chatId}/continue` | — | Closes out unanswered calls and runs one step. Used both for the next step after tool calls and for **Retry** |
| `PATCH /agent/chats/{chatId}` | `{ title }` | Renames the chat |
| `DELETE /agent/chats/{chatId}` | — | Soft delete: sets `userDeletedChat` and `userDeletedAt` |

**Review routes.** These add `handleSuperAdminCheck`.

| Route | Does |
| --- | --- |
| `GET /agent/review/members` | Every member with at least one chat, counting chats they deleted. For each: donor id, name, hall, designation, number of chats, number they deleted and last activity. Most recent activity first |
| `GET /agent/review/members/{donorId}/chats` | All of that member's chats, including deleted ones, with the deleted flag and date, message count and token totals |
| `GET /agent/review/chats/{chatId}` | The full transcript of any chat, whoever owns it and whether or not it was deleted |
| `DELETE /agent/review/chats/{chatId}` | Permanent: deletes the chat's messages, then the chat |

There is no paging. The organisation has hundreds of members, not tens of thousands.

**Validation** lives in `src/validations/agent.ts`, following the existing validators:

* `content`: 1 to 20,000 characters.
* `title`: 1 to 100 characters.
* Tool call `status`: one of `done`, `failed`, `denied` or `cancelled`.
* `response`: clipped on the server to the display limit rather than rejected when too long.

**Rate limiting.** None of these routes uses `commonLimiter`. One turn with ten tool calls makes
eleven or more agent requests in under a minute, and the limit of 12 per minute would cut it
off. This matches the "no limits" decision. The limits on the routes the tools call are not
changed.

**Request size.** Each `PUT …/toolCalls/…` request can carry about 250 KB, but the global
`express.json()` stops at 100 KB. In `app.ts`, give that one path its own JSON parser with a
1 MB limit, placed before the global parser. Every other route keeps 100 KB.

### 3.4 One step, in order

This is shared by `POST /agent/chats`, `…/messages` and `…/continue`.

Every check that can refuse the request comes before anything is saved. The checks that depend
only on the chat's state come before the key check, so the test suite can reach them without a
key (§5.1).

1. **Find the chat**, using the 404 rules above.
2. **For `…/continue` only, two checks:**
   * There must be something to continue. The last message must be a user message or a tool
     result. If it is a finished answer, answer **409**.
   * **The 20-call limit.** If the chat already has 20 assistant messages since its last user
     message, answer **409** with *"Stopped after 20 model calls for one message. Send a message
     to carry on."* `…/messages` never hits this limit, because its new user message starts the
     count again. The limit is one constant in the agent service and is not configurable.
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
8. Save the assistant message, add its token usage to the chat's totals, and save one tool
   message per call. Each one is `pending` with its request and `label` already worked out, or
   `failed` with a note.
9. Update `updatedAt`, release the lock, and return the new messages.

### 3.5 Errors

| Situation | Answer |
| --- | --- |
| No key configured | 503 *"The agent is not set up on this server."* |
| OpenAI refuses the key (401) | 502 *"The server's OpenAI key was refused. Tell a super admin."* |
| OpenAI quota or rate limit (429) | 502 with OpenAI's own message |
| OpenAI unreachable or timed out | 502 *"OpenAI could not be reached."* |
| Any other OpenAI error | 502 with OpenAI's own message |
| Chat missing, owned by someone else, or deleted by the member | 404 |
| Step lock already held | 409 |
| `…/continue` after 20 model calls since the last user message | 409 *"Stopped after 20 model calls for one message. Send a message to carry on."* |
| Tool call already answered | 409. A tool call id that is not in the chat gets 404 |

The key never appears in a response or a log line.

### 3.6 App Activity logging

Each entry goes through `logInterface.addLog` and records ids and counts only, never message
text, as `MessagesController` already does.

| Log entry | Written when | Details |
| --- | --- | --- |
| `POST AGENT CHAT` | A chat is created | Chat id |
| `DELETE AGENT CHAT` | A member deletes their own chat (soft delete) | Chat id |
| `GET AGENT CHAT (REVIEW)` | A super admin opens a transcript | Chat id, owner id |
| `DELETE AGENT CHAT PERMANENTLY` | A super admin deletes a chat for good | Chat id, owner id, message count |

Individual steps are not logged. Every API call the agent makes is already logged under the route
it calls. If the App Activity page maps log names to friendlier labels, add these four.

### 3.7 OpenAPI

`AgentController` appears in `/openapi.json` and `/llms.txt` like any other controller. `tools.ts`
is what keeps these routes away from the model. Run `tsoa:routes` and `tsc --noEmit` inside the
`backend` container.

---

## 4. Frontend

### 4.1 Menu and routes

* `/agent` changes to `designation: 1`. In `AppBar.vue`, **Badhan Agent** leaves the Super Admin
  submenu and becomes a top-level entry for Volunteer and above, placed after **Messages**.
  Update the router comment that calls it super-admin only.
* New route `/agentChats`, **Agent Chats**, `designation: 3`. It goes in the Super Admin submenu
  where Badhan Agent used to be.

### 4.2 A shared thread component

The transcript must look the same on both pages: user bubbles, plain-text answers, tool cards
and the token usage line. Move it out of `Agent.vue` into
`src/components/Agent/AgentThread.vue`. That component has a read-only mode with no approval
buttons and no Retry. The display helpers move with it (`when`, `pretty`, the method and status
colours, `toolLabel`, **Copy as curl**). Rewrite the "the whole page lives in this one file"
header in `Agent.vue`.

**The tool card changes shape.** GET and non-GET cards work the same way:

* **Collapsed**, which is how every card starts, it shows the chevron, the `label` (§3.2) and
  the status chip (*queued*, *needs approval*, *running…*, *200 · 140 ms*, *declined* and so
  on). The method chip, the path and the tool name are no longer in the heading.
* **Expanded**, after a click, it shows everything: the method, the full URL with **Copy as
  curl**, the arguments, the request body, the status and duration, any note, and the response.
* **A card waiting for permission** shows its label, a one-line prompt ("This changes data on
  ‹environment›. Send it?") and the **Send request** and **Decline** buttons. It stays collapsed
  like any other card. The member clicks it to see what will be sent.

Answers keep being drawn as text, never as HTML. A transcript can quote free text that the
public typed into a form.

### 4.3 `Agent.vue`

**Removed:**

* the OpenAI client and `checkApiKey`;
* the OpenAPI-to-tools code, and loading the spec from `/openapi.json`;
* `SYSTEM_PROMPT` and `VALUE_CODES`;
* the IndexedDB `chatStore`;
* **Settings as a whole**: the button, the fold-out panel, the API key box, the approval radio
  buttons, the "model calls per message" field, and `loadSettings` with its `badhan-agent:settings`
  storage;
* `needsApproval`'s three modes and its production special case, now replaced by a single rule:
  a GET runs, anything else asks;
* the **example prompt chips** (`EXAMPLES`, `useExample`) on an empty chat. An empty chat keeps
  only its one line about what the agent can look up;
* the cards opening by themselves when they need a decision (the `openCards` line in
  `runTool`).

**Changed:**

* **Loading.** The page calls `GET /agent/config` and `GET /agent/chats`. Opening a chat fetches
  it.
* **New chat.** A new chat exists only in the page until its first message is sent, so the
  server never holds empty chats. The page no longer creates a chat by itself on first load.
* **The loop** follows §1. While a step runs, the dots show where the streaming text used to
  be. The browser stops after 20 model calls in one turn and shows today's notice with the
  number fixed at 20. The backend's 409 is the backstop if the browser does not stop.
* **Tool runs.** The request now arrives already built from the server, along with its label.
  The browser sends GETs without asking and holds every other method for **Send request** or
  **Decline**. Each result is reported straight after its call. The production warning strip
  stays.
* **Rename** calls `PATCH`, debounced as today's save is. **Delete** calls `DELETE`, and the
  confirmation keeps today's wording.
* **Not set up.** When `configured` is false, the composer shows *"The agent is not set up on
  this server yet. Ask a super admin."* and **Send** stays disabled.
* **The system prompt panel** is drawn only when `/agent/config` returns `systemPrompt`, which
  happens only for super admins. Other members see the chat start straight away. The model
  name in the footer also comes from `/agent/config`.
* **Errors.** A failed step shows as today's notice in the chat, with **Retry**, which calls
  `…/continue`. A 409 from the lock reads *"This chat is busy in another tab or window."* The
  agent's own routes use plain `fetch` for the step calls, so that errors appear in the chat
  rather than as app-wide toasts. List, rename and delete use `badhanAxios`, as other pages do.
* **One-time cleanup on load.** Delete the `badhan-agent` IndexedDB database and the whole
  `badhan-agent:settings` localStorage key, which removes any saved OpenAI key along with it.
* **Sign-out** no longer removes chats, because they are on the server and come back at the next
  sign-in. `ldb.reset()` still deletes the old IndexedDB name for browsers that never open the
  page again. Update its comment to say so.

### 4.4 New page — `src/views/AgentChats.vue`

**Wide screens** show three columns:

1. **Members.** Name, hall, designation, number of chats and last activity, most recent first.
2. **Chats** of the selected member. Each shows the title, when it was last updated, the token
   totals, a *Deleted by user · date* tag where it applies, and a bin button.
3. **Transcript.** `AgentThread` in read-only mode, under a header that shows the title, the
   member, the creation date, the deleted tag if any, and the same permanent-delete button.

**Permanent delete** asks for confirmation: *"Permanently delete "‹title›" by ‹member›? It is
removed from Badhan for good and cannot be undone."* Afterwards the page fetches the members list
again rather than working out the change locally. The chat leaves column 2. If it was the
member's last chat, the member leaves column 1 and columns 2 and 3 go back to their empty hints.

**Narrow screens** show one column at a time: members, then chats, then transcript, with a back
button in the header.

**Empty state:** *"No member has an agent chat yet."*

The page has no composer. A super admin can read other members' chats but never continue them.

---

## 5. Tests

### 5.1 Backend — `badhan-backend-test/tests/agent/`

The test suite cannot run real model calls: `env.local` has no key, and a test run must not spend
money. Coverage is therefore everything around the model call.

* **Seed fixture.** Add a fixture on the internal server, following `seedMessagesController`. It
  inserts chats and messages directly, including chats a member has deleted, chats with pending
  tool messages, and a chat whose lock is held.
* **Member routes:**
  * 401 without a token, and 403 for a demoted member at designation 0.
  * The list shows only the caller's chats that they have not deleted.
  * Another member's chat, and the caller's own deleted chat, both give 404.
  * Rename validation.
  * Soft delete hides the chat but keeps the record.
* **Tool results:**
  * A result is recorded and the model's copy is worked out from it.
  * An unknown id gives 404, and an already-answered call gives 409.
  * A 250 KB response is accepted, and a body over 1 MB gives 413.
* **Steps without a key:**
  * `…/messages`, `…/continue` and `POST /agent/chats` answer 503 and save nothing.
  * Three checks each answer 409, and each is tested by seeding a chat in that state: nothing
    left to continue, the 20-call limit, and the lock. The limit test uses a chat with 20
    assistant messages since its last user message. All three come before the key check
    (§3.4), so they can run without a key.
  * `…/messages` on that same 20-call chat answers 503, not 409. A new message starts the
    count again.
* **Review routes:**
  * 403 for volunteers and hall admins.
  * A member whose only chats are ones they deleted is still listed, with the tag.
  * Permanent delete removes the chat and its messages.
  * Deleting a member's last chat removes them from the list.
  * The four App Activity entries are written.
* **Config:**
  * `GET /agent/config` reports `configured: false` and a tool count above zero.
  * A super admin gets `systemPrompt`. A volunteer and a hall admin get no such field.
* **Labels:** read `/openapi.json` and check that every operation the agent exposes has a
  non-empty summary or description, so no card ever falls back to a bare operation id.

**Gap, stated plainly:** no automated test covers the path that actually reaches OpenAI. It is
checked by hand on development (§7, step 6).

### 5.2 Frontend — `badhan-frontend-test/cypress/e2e/agent/`

These tests use `cy.intercept` on the `/agent` routes to script the model's answers, so they need
no key.

* A volunteer sees the menu entry and opens the page. There is no Settings button, no system
  prompt panel and no example chips.
* A super admin sees the system prompt panel.
* **A GET call** runs without a prompt. Its card heading shows the label and no URL. Clicking
  the card shows the method, the full URL, the arguments and the response.
* **A write call** waits, collapsed, with **Send request** and **Decline**. Clicking it shows
  the request before sending. Sending it reports the result and continues to the final answer.
  Declining reports `denied`.
* The browser stops after 20 model calls in one turn, using a scripted run that never stops
  calling tools, and shows the limit notice.
* The *not set up* message, and **Send** disabled.
* Delete removes the chat from the list.
* An old `badhan-agent:settings` key is removed from localStorage on load.
* **Review page as a super admin:** selecting through the three columns, a deleted-by-user tag,
  permanent delete removing the chat, a member disappearing after their last chat is deleted,
  and the one-column layout at phone width.
* A volunteer who opens `/agentChats` is redirected.

Run the backend tests with `docker compose run --rm backend-test <cmd>` and the frontend tests
with `docker compose run --rm frontend-test <cmd>`. Ask before starting the stack. No new
dependencies are needed in either test project.

---

## 6. Manual — `docs/manual/`

* **New `22-badhan-agent.md`**, written for every member. The member-facing part of chapter 16's
  Badhan Agent section moves here and is rewritten:
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
  * **one message allows at most 20 steps.** After that the assistant stops, and you send
    another message to carry on.

  As decided, this chapter does not describe the deleted-by-user flag or the system prompt.
* **`16-super-admin-tools.md`.** Replace the Badhan Agent section with a pointer to chapter 22.
  Keep its **System prompt** subsection here, rewritten to say that only super admins see the
  panel. Then add an **Agent Chats** section covering:
  * the three columns;
  * what *Deleted by user* means (the member deleted it, and it is kept until a super admin
    deletes it);
  * permanent delete, and why a member disappears from the list once their last chat goes;
  * that opening a transcript is recorded in App Activity;
  * what the token counts mean, given that the organisation pays and there is no daily limit.
* **`05-the-screen-and-the-menu.md`.** The Badhan Agent row becomes a top-level entry for
  Volunteer and above, linking to chapter 22. Add a row for *→ Agent Chats*, Super Admin only.
* **`04-roles-and-permissions.md`.** Wherever the chapter lists what each level can use, add
  the agent for Volunteer and above, and Agent Chats for Super Admin.
* **`15-statistics-and-reports.md`.** Add the four new App Activity entries if the chapter
  names entries.
* **`README.md` (manual contents)** gains chapter 22. Fix the previous and next links of
  chapters 21 and 22.
* **Root `README.md`.** Update the agent paragraph, which today says the key is the member's own
  and chats live in IndexedDB. Add `OPENAI_API_KEY` wherever the backend's env keys are listed.

---

## 7. Order of work

1. Backend: models, the agent service, the controller, validators and the larger request limit
   for one path. Then run `tsoa:routes` and `tsc --noEmit` in the container.
2. Internal-server seed fixture, then the backend tests.
3. Frontend: extract `AgentThread` first and confirm the page behaves as before. Then rewire
   `Agent.vue`, then build `AgentChats.vue`, the router and the menu.
4. Cypress tests.
5. Manual and root README.
6. Add `OPENAI_API_KEY` to `env.development` in the secrets repo and deploy development. Check by
   hand:
   * a read-only question;
   * a write that needs approval;
   * **Stop** in the middle of a turn;
   * reloading in the middle of a turn;
   * the same chat open in two tabs;
   * the review page, including a permanent delete.

   Only then add the key to `env.production`.

The backend and frontend ship in the same release. A browser tab left open across the deploy
keeps running the old page, with its own key and IndexedDB, until it is reloaded. That is
harmless.

---

## 8. What this plan deliberately leaves alone

* The contents of `SESSION_ROUTES`.
* The rate limits on the routes the tools call.
* The AI Integration setup file and `/llms.txt`.
* The member chat (chapter 21), which is unrelated despite the shared word "chat".
* Things not being added: a usage budget, automatic expiry of old chats, a way for anyone to
  restore a chat a member deleted, exporting chats, and guest or demo mode. The agent remains
  for signed-in members only.

---

## 9. Risks this plan accepts

* **Cost.** The backend holds each message to 20 model calls, but nothing limits how many
  messages a member sends. Any member can run up the organisation's OpenAI bill with no daily
  cap. The token totals on the review page are the only view of what is being spent. Adding a
  cap later needs only a server change.
* **Approving without looking.** A card waiting for permission shows only the route's
  description, such as *"Update donor details"*. That says nothing about which donor or what
  values. A member who presses **Send request** without opening the card approves a change they
  have not seen. Chapter 22 tells members to open the card first, and nothing enforces it.
* **Personal data kept indefinitely.** Transcripts quote donor records. They now sit in MongoDB
  and in every backup until a super admin deletes them. That includes chats members believe
  they deleted.
* **Results come from the browser.** The browser reports what the API answered, so a member
  could put invented results into their own chat. This only misleads that member's own
  conversation and the transcript a super admin reads; the review page cannot tell a
  fabricated result from a real one. Every real call is still in App Activity under the route
  it called, so a mismatch can be checked.
* **No streaming.** Long answers arrive after a visible wait.
