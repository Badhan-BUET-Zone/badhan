# Plan 21 — a global chat for members, without sockets and without polling

One room, for every member at Volunteer or above, across every hall. A floating button on
every signed-in screen, a panel that opens under it, and a full page behind a drawer entry.
Messages arrive **only when something asks for them**: on app open, when you press *Fetch
messages*, and immediately after you send one. There is no socket, no `setInterval`, no
long poll, no service-worker push.

That constraint is the whole design. Everything below — the cursor shape, the unread badge,
the local-storage timestamps — falls out of "the server is never allowed to speak first".

---

## Decisions taken before this plan was written

Asked and answered. Not re-litigated below.

* **Sender details are joined live from `Donors`, not snapshotted onto the message.** A
  message row stores `senderId` and nothing else about the person. Name, batch, hall and
  rank are resolved by a `$lookup` on every read, so a promotion or a rename updates every
  message that person ever sent. The cost is a join per page — which is why the page is cut
  *before* the join in the aggregate (Phase B2), and why pagination is mandatory rather than
  nice to have.
* **A message can be deleted by its author, or by a Super Admin.** Nobody else, including a
  Hall Admin. There is no edit.
* **The unread badge is cleared by *opening* the chat, not by fetching.** Two separate
  timestamps live in local storage and they do different jobs — see Phase F2. A fetch on app
  open is expected to leave a badge showing.
* **Guest mode gets a full mirror with faker data.** `GET`, `POST` and `DELETE` are all
  mirrored under `/guest`, the same way feedback, certificates and search already are.
* **Nothing about the chat is cached on the device.** App open always fetches the newest page
  from scratch and ignores the fetch watermark; the `after` cursor is used only by the *Fetch
  messages* button and by the post-send refresh. See Phase F7 for what this costs.
* **A deleted message vanishes silently.** Hard delete, no tombstone, no "message was deleted"
  placeholder. The full text stays recoverable from the Super Admin activity log.
* **A demoted sender's old messages show their current rank, `Donor` included.** The live join
  is applied literally, with no special case. See Phase F4.
* **No retention policy in this plan.** No TTL, no purge route. The collection grows without
  bound and that is accepted for now; the risk is restated at the end.

### Decisions taken in this plan, stated up front

* **The room is not scoped by hall.** "Global" is literal: one collection, no `hall` column,
  no visibility `$match`. This is the first collection in the codebase where a Hall Admin and
  a Volunteer from different halls see byte-identical data. That is deliberate and it is the
  feature; do not "improve" it into a per-hall filter later without a plan that says so.
* **Membership is checked on the route, not inferred from having a token.** A demoted member
  keeps their existing token until it expires or is revoked, so `designation >= VOLUNTEER`
  has to be a middleware, not an assumption. See Phase B0.
* **`text` is stored raw and rendered with `{{ }}`.** This follows the precedent already set
  and documented for feedback text at
  [feedbackPayload.ts:104-111](../../badhan-backend/src/validations/feedbackPayload.ts#L104):
  escaping is wrong for a value a human reads verbatim — it turns `I can't come` into
  `I can&#x27;t come` on screen — and safety is enforced at render time instead. Chat message
  bodies therefore need **no** `decodeEntities` call, unlike the registration fields in
  [decodeEntities.ts](../../badhan-frontend/src/views/Feedback/decodeEntities.ts). The rule
  that makes this safe is absolute: **never `v-html`, never VueMarkdown, never a link
  autolinker that builds an `<a>` from message text.**
* **`markAllRead` fires on opening, and on nothing else.** Not when a fetch lands while the
  panel is already open, not when the scroller reaches the bottom. So a *Fetch messages* press
  with the panel open, or the refresh after a send, can leave a badge over messages the reader
  watched arrive; closing and reopening clears it. That is accepted in exchange for one rule
  with one trigger — the badge means *"something arrived since you last opened this"*, and
  "opened" stays a single unambiguous event. Do not add a second trigger to smooth this over.
* **A 403 from any chat route signs the user out.** The frontend's cached `designation` is the
  thing that went stale (Phase B0), and there is no way to serve a member-only room to someone
  the server has stopped calling a member. See Phase F3.
* **Out of scope, named so nobody has to guess:** typing indicators, read receipts, replies
  and threads, reactions, attachments, per-user mute, @mentions, search over history, and any
  form of notification when the app is closed. Each of those wants a server that can speak
  first, and this one cannot.

---

## Phase B0 — the membership middleware

[authenticate.ts](../../badhan-backend/src/middlewares/authenticate.ts) has
`handleSuperAdminCheck` and `handleHallAdminCheck` but nothing for "Volunteer or above",
because until now every authenticated route was reachable by anyone holding a token.

Add, beside the other two:

```ts
const handleVolunteerCheck = async (req, res, next) => {
  if (res.locals.middlewareResponse.donor.designation < DESIGNATIONS_INDEX.VOLUNTEER) {
    return res.status(HTTP_STATUS.FORBIDDEN)
      .send(new ForbiddenError403('Only Badhan members can use the member chat', {}))
  }
  next()
}
```

**Why this is not decorative.** A donor at `DESIGNATIONS_INDEX.DONOR` normally has no
password and never signs in, so it is tempting to treat "holds a valid token" as "is a
member". But
[DonorsController.ts:695](../../badhan-backend/src/tsoaControllers/DonorsController.ts#L695)
demotes a member to `DONOR` in place, and nothing in that path revokes their tokens. Between
the demotion and their token expiring, a demoted person is an authenticated `designation: 0`
caller. Without this middleware they keep posting to the member chat.

Every route in this plan chains `authenticator.handleAuthentication` **then**
`authenticator.handleVolunteerCheck`. There is no unauthenticated surface anywhere in the
feature.

**Verification:** a token belonging to a `designation: 0` donor gets 403, not 401 and not
200, on all three routes.

---

## Phase B1 — the `Messages` collection

New model at `badhan-backend/src/db/models/Message.ts`, modelled on
[Feedback.ts](../../badhan-backend/src/db/models/Feedback.ts) — same `versionKey: false,
id: false`, same `checkNumber`/`checkTimeStamp` validators from
[validators](../../badhan-backend/src/db/models/validators/index.ts), same swagger block.

```ts
export const MESSAGE_TEXT_MAX_LENGTH: number = 2000

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId
  text: string
  date: number
}
```

| Column | Rule |
| --- | --- |
| `senderId` | `ObjectId`, `ref: 'Donors'`, required. The **only** thing stored about the sender. |
| `text` | `String`, required, `trim: true`, `maxlength: MESSAGE_TEXT_MAX_LENGTH`, and a validator rejecting a value that is empty after trimming. |
| `date` | `Number`, required, `default: () => Date.now()`, `checkNumber` + `checkTimeStamp`. Milliseconds, as everywhere else in this schema set. |

There is deliberately **no** `hall`, no `senderName`, no `senderDesignation`, no `editedAt`,
no `deletedAt`. Hall is not a property of a global room; the other four are the decisions
recorded above.

### The one index

```ts
messageSchema.index({ date: -1, _id: -1 })
```

One compound index, descending on both keys, and it is load-bearing for every read in
Phase B2. `{ date: -1 }` alone is not enough: two messages sent in the same millisecond are
ordered arbitrarily without the `_id` tiebreak, and an arbitrary order under a keyset cursor
does not merely reshuffle the page — it **drops** messages at the page boundary. The
descending direction matches the only sort the API ever issues.

No index on `senderId`: nothing queries by sender. Add one when something does.

**No TTL index and no retention policy in this plan.** A global room with no expiry will grow
without bound, and that is a real cost that this plan accepts rather than hides: at BUET-zone
volume it is a few thousand short documents a year. When it does need trimming, the answer is
a Super Admin purge route and a documented retention window, not a silent TTL that deletes
history nobody was told was temporary.

### Interface module

`badhan-backend/src/db/interfaces/messageInterface.ts`, following the
`{ data, message, status }` convention every other interface in
[db/interfaces/](../../badhan-backend/src/db/interfaces/) uses:

* `insertMessage(senderId, text)`
* `findMessagesPage(cursor)` — Phase B2
* `findMessageById(messageId)`
* `deleteMessageById(messageId)`

---

## Phase B2 — `GET /messages`, and the cursor that makes no-polling work

This is the load-bearing phase. Read it before writing any of it.

### The three reads, one route

```
GET /messages                          → the newest `limit` messages   (first open)
GET /messages?after=<ms>               → everything strictly newer     (catch-up / fetch button / post-send)
GET /messages?before=<ms>&beforeId=<id> → the page older than a message (scroll up)
```

`after` and `before` are mutually exclusive; sending both is a **400**. `beforeId` is
required whenever `before` is present, and vice versa — a lone `before` is a **400**.
`limit` defaults to **30** and is capped at **100**.

Every response returns messages **oldest-first**, in all three modes, so the frontend never
has to reverse an array and the two directions differ only in which end of the list they are
spliced onto.

### Response shape

Same envelope as every other controller:

```jsonc
{
  "status": "OK",
  "statusCode": 200,
  "message": "Messages fetched successfully",
  "messages": [ /* oldest-first */ ],
  "serverTime": 1756512000123,   // see below — the client stores this, not its own clock
  "hasMore": true                // more pages exist in the direction asked for
}
```

Each element:

```jsonc
{
  "_id": "...",
  "text": "...",
  "date": 1756511999000,
  "sender": {                    // null if the donor record is gone
    "_id": "...",
    "name": "Mir Mahathir Mohammad",
    "studentId": "1605045",      // batch is the first two digits — derived on the client
    "hall": 6,
    "designation": 2
  }
}
```

### `serverTime`, and why the client must never use its own clock

The brief says the fetch button "triggers an API call with the current timestamp". It must
be the **server's** current timestamp, not the browser's. A phone whose clock is two minutes
fast would store a `lastFetchedAt` two minutes in the future and then silently skip every
message sent in that window — a data-loss bug that only appears on other people's devices.

So the handler does this, and the order of the two statements is the whole point:

```ts
const now: number = Date.now()                     // 1. sample FIRST
const page = await messageInterface.findMessagesPage({ after, upperBound: now, limit })  // 2. then query
return { ..., serverTime: now }
```

Sampling before querying means a message inserted *during* the query has `date > now`, falls
outside `date <= now`, and is therefore picked up by the **next** fetch. Sampling after the
query would let that message fall into the gap between the last returned row and the recorded
watermark, and it would never be delivered to that client again. The `upperBound` clause is
not optional decoration; it is what makes `serverTime` a safe watermark.

### A truncated catch-up must not advance the watermark past what it returned

`now` is only a safe watermark when the response actually contained everything up to it. It
usually does. It does not when someone has been away and five hundred messages arrived: the
`after` page is cut at `limit`, but a `serverTime` of `now` would tell the client it has been
shown everything up to this instant, and the four hundred and seventy messages that did not
fit would never be requested by anything.

So the watermark is whichever of the two is smaller — and the truncation flag is the same
`limit + 1` probe the `before` mode already uses:

```ts
const now: number = Date.now()                     // 1. sample FIRST
const rows = await messageInterface.findMessagesPage({ after, upperBound: now, limit })
const truncated: boolean = rows.length > limit     // the +1 probe came back
const page = rows.slice(0, limit)

return {
  messages: page,                                  // oldest-first, as always
  hasMore: truncated,
  // 2. a full page means "you have been told about everything up to the newest row I
  //    returned", NOT "up to now". Anything after it is still owed to this client.
  serverTime: truncated ? page[page.length - 1].date : now
}
```

Two consequences, and both are load-bearing:

* **`after` mode must page from the *oldest* end of the gap, not the newest.** The `$match`
  is `{ date: { $gt: after, $lte: upperBound } }` and the internal `$sort` for this mode is
  therefore **ascending** — `{ date: 1, _id: 1 }` — so the `limit` rows kept are the ones
  immediately following the watermark and the returned page is contiguous with what the client
  already holds. (The `before` mode keeps its descending sort, and both modes still hand back
  oldest-first.) A descending cut here would return the *newest* thirty and leave a hole in
  the middle that the watermark then closes over. The index `{ date: -1, _id: -1 }` serves an
  ascending sort by walking backwards; no second index is needed.
* **`hasMore` is now meaningful in two directions**, so the field is not `before`-only. In
  `after` mode it means *more catch-up is waiting*; in `before` mode it means *more history
  exists*. The frontend reads it in both places — Phase F3 for the first, Phase F4 for the
  second.

Because the returned `date` is used verbatim as the next `after`, and `after` is exclusive on
the timestamp alone, a truncation landing between two messages that share a millisecond drops
the second one. So the page cut in `after` mode must never split a millisecond: if
`page[limit - 1].date === rows[limit].date`, drop trailing rows until the last kept row's
`date` differs from the first discarded row's, then use that date. With a `limit` of 30 this
costs at most a few rows, and it is what lets the newer cursor stay `_id`-free.

### The keyset cursor, and why the two directions are asymmetric

**Newer direction (`after`).** Exclusive on the timestamp alone:

```js
{ date: { $gt: after, $lte: upperBound } }
```

No `_id` tiebreak is needed and none is wanted. `after` is always a `serverTime` the client
was previously handed, and the previous response already returned *everything* with
`date <= after`. A message sharing that exact millisecond was therefore already delivered.
The cursor points at an instant, so an instant is all it needs.

**Older direction (`before` + `beforeId`).** The cursor points at a *message*, so it needs
both halves:

```js
{ $or: [
    { date: { $lt: before } },
    { date: before, _id: { $lt: beforeId } }
] }
```

A plain `{ date: { $lt: before } }` looks fine and is wrong: if the oldest message on the
current page shares its millisecond with another message that did not fit, that other message
is skipped forever, and the user scrolling up never learns it existed. Two people pressing
send at the same moment during a blood-drive push is exactly when this happens.

`hasMore` is computed by requesting `limit + 1` rows and reporting whether the extra one came
back — never by a second `countDocuments`.

### Pipeline order: cut the page *before* the join

Because sender details are joined live, the `$lookup` runs on every read. It must run on the
page, not on the collection:

```js
[
  { $match: cursorFilter },
  { $sort: { date: -1, _id: -1 } },   // matches the index exactly
  { $limit: limit + 1 },
  { $lookup: { from: 'donors', localField: 'senderId', foreignField: '_id',
               pipeline: [ senderSummaryProjection ], as: 'senderMatches' } },
  { $addFields: { sender: { $ifNull: [ { $arrayElemAt: ['$senderMatches', 0] }, null ] } } },
  { $project: { _id: 1, text: 1, date: 1, sender: 1 } },
  { $sort: { date: 1, _id: 1 } }      // hand back oldest-first
]
```

`senderSummaryProjection` is an **inclusion** projection — `_id`, `name`, `studentId`,
`hall`, `designation` and nothing else — for the reason spelled out at
[feedbackInterface.ts:114-124](../../badhan-backend/src/db/interfaces/feedbackInterface.ts#L114):
an exclusion list leaks every field added to the `Donor` schema later. `password`, `email`,
`phone` and `address` must never reach this response. **Note that `phone` is absent
deliberately** — the chat is not a directory, and a member's profile is one tap away through
the existing search.

`sender: null` is a real, expected state (a deleted donor), not an error. The frontend renders
it as a former member; see Phase F4.

### Route

```ts
@Get()
@Middlewares([messageValidator.validateGETMessages, rateLimiter.commonLimiter,
              authenticator.handleAuthentication, authenticator.handleVolunteerCheck])
```

`commonLimiter` (60/minute) is right here: the fetch button is manual, but a user scrolling
up fast issues one request per page and should not be throttled mid-scroll.

Log via `logInterface.addLog(user._id, 'GET MESSAGES', { resultCount, mode })` — matching
what the feedback list does. `mode` is `'initial' | 'after' | 'before'`.

**Verification for B2:**
* Seed two messages with an identical `date`; a `before`/`beforeId` page boundary landing
  between them returns both across two pages, never one.
* A message inserted while a fetch is in flight is returned by the next `after` fetch.
* Seed 80 messages newer than a watermark, fetch with `limit=30`: `hasMore` is true, the page
  is the **oldest** 30 of the 80, and `serverTime` equals the last returned message's `date`.
  Feeding that back as `after` twice more delivers all 80 with no duplicates and no gap.
* A truncation landing on a shared millisecond returns fewer than `limit` rows rather than
  splitting it, and the following `after` fetch still returns the message that was held back.
* `after` and `before` together → 400. `before` without `beforeId` → 400. `limit=500` is
  clamped to 100, not rejected.
* The response body contains no `password`, `email`, `phone` or `address` under any key.

---

## Phase B3 — `POST /messages`

```ts
@Post()
@SuccessResponse(201, 'Message sent successfully')
@Middlewares([messageValidator.validatePOSTMessage, rateLimiter.messageSendLimiter,
              authenticator.handleAuthentication, authenticator.handleVolunteerCheck])
```

Body is `{ text: string }` and nothing else. `senderId` and `date` are the server's to
decide — a body that states either is a **400** for an unexpected key, following the
`allowed`/`unknown` key check pattern at
[feedbackPayload.ts:114-118](../../badhan-backend/src/validations/feedbackPayload.ts#L114).

Validator, in a new `badhan-backend/src/validations/messages.ts`:
* `text` exists, is a string, `.trim()`, length 1…2000 after trimming.
* **Not** `.escape()` — see the decision above.

New limiter in [rateLimiter.ts](../../badhan-backend/src/middlewares/rateLimiter.ts):

```ts
const messageSendLimiter = rateLimit({ windowMs: minute, max: 20 * rateLimiterEnabled, ... })
```

20/minute. High enough for a real back-and-forth, low enough that a scripted flood into a
room every member sees is capped.

The response returns the created message **already joined**, in the same element shape
`GET` returns, so the client can render it without a second round trip. Status **201**.

Log `'POST MESSAGES'` with `{ messageId, length: text.length }` — the id and the length, not
the body. The body is already stored in the collection; duplicating it into the log doubles
the deletion surface for Phase B4.

---

## Phase B4 — `DELETE /messages`

Author or Super Admin. The order of the checks matters and mirrors
[FeedbacksController.ts:344-372](../../badhan-backend/src/tsoaControllers/FeedbacksController.ts#L344):

1. **Find it first.** Gone → **404** `'This message has already been deleted.'` Two people
   deleting the same message is an expected race, not an error, and the frontend removes the
   bubble on 404 exactly as it does on 200.
2. **Then permission.** `message.senderId` equals the caller, or the caller is
   `SUPER_ADMIN` → proceed. Otherwise **403** `'You can only delete your own messages.'`
   The order means "not yours" is never reported for something that no longer exists.
3. **Delete, then log.** `addLog(user._id, 'DELETE MESSAGES', { messageId, senderId, text, date })`
   — the full text goes into the log, written only after a successful delete, so that a
   Super Admin can still recover what was removed. This is the same bargain the feedback
   discard makes at [FeedbacksController.ts:378](../../badhan-backend/src/tsoaControllers/FeedbacksController.ts#L378).

**The delete is hard, and there is no tombstone.** The row is removed; nobody who fetches
afterwards sees any trace of it. Someone who already had the message on screen keeps seeing
it until their next fetch — which, given Phase F7, means until they press *Fetch messages*,
send something, or reopen the app. A stale bubble therefore lives for a session at most, and
never survives a restart. If a deletion needs to be *seen* to have happened, that is a
tombstone and a `deletedAt` column, and it is a different plan.

**Query parameter, matching the controllers it sits beside.** The route is
`DELETE /messages?messageId=<id>` — `@Delete()` with an `@Query() messageId: string`, exactly
as [FeedbacksController.ts:336-346](../../badhan-backend/src/tsoaControllers/FeedbacksController.ts#L336)
does, and as `Donations`, `CallRecords`, `PublicContacts`, `PlateletDonations` and `Donors`
all do. `ActiveDonors` is the lone path-param delete in the codebase and it is the exception,
not the direction. A path param would be better REST in the abstract, but a single new route
built to a convention nothing else follows is a route that has to be moved twice; when the
rest of the API moves, this one moves with it.

Returns **200** with the standard envelope.

---

## Phase B5 — the guest mirror

Three `@Hidden()` routes in
[GuestController.ts](../../badhan-backend/src/tsoaControllers/GuestController.ts):

* `GET /guest/messages` — a stable, deterministic set of ~40 faker messages built from
  `faker.getName()`, `faker.getStudentId()`, `faker.getHall()`, `faker.getDesignation()` and
  `faker.getTimestamp()`. It must honour `after`/`before` well enough that the panel's scroll
  and fetch buttons visibly do something: `after` returns an empty array (nothing new ever
  arrives in a demo), `before` returns the next slice of the fixed set with a truthful
  `hasMore` that eventually goes false.
* `POST /guest/messages` — echoes the posted text back as a 201 with a faker sender, and
  stores nothing.
* `DELETE /guest/messages` — takes `messageId` as a query parameter, like its real
  counterpart and like `DELETE /guest/feedbacks`. Returns 200, stores nothing.

Add `getMessageText()` to [faker.ts](../../badhan-backend/src/doc/faker.ts) beside
`getComment()`.

Nothing on the frontend branches on guest mode for this feature — the base-URL rewrite in
[api/index.ts:28](../../badhan-frontend/src/api/index.ts#L28) does all of it, which is the
point of mirroring rather than hiding.

---

## Phase B6 — backend tests

New `badhan-backend-test/tests/messages/`, following the existing layout of
[tests/feedbacks/](../../badhan-backend-test/tests/feedbacks/):

| File | Covers |
| --- | --- |
| `fetch/initial.test.js` | no cursor → newest 30, oldest-first, sender joined, no leaked donor fields |
| `fetch/after.test.js` | catch-up semantics; `serverTime` monotonic; in-flight insert delivered next time; **a truncated catch-up returns the oldest rows in the gap, reports `hasMore`, and watermarks at the last returned `date` — three chained fetches deliver 80 messages with no gap and no duplicate**; a truncation never splits a millisecond |
| `fetch/before.test.js` | scroll-up paging; `hasMore`; **same-millisecond boundary drops nothing** |

**Seeding a shared millisecond is not optional and not automatic.** Sends through the local
stack land about 3ms apart, so a sequential seeder NEVER produces two messages sharing a
timestamp — a same-millisecond test written on one asserts its invariant without ever reaching
the case that breaks it, and passes forever. A parallel burst does collide, reliably but not
certainly, so `seedBurstWithSharedMillisecond` in `tests/messages/helpers.js` retries until it
sees a collision and throws if it cannot get one. Do not relax that into a skip.
| `fetch/validation.test.js` | `after`+`before` → 400; lone `before` → 400; `limit` clamp |
| `send/submit.test.js` | 201, joined echo, trim, 1…2000 length bounds, unexpected-key rejection |
| `send/rateLimit.test.js` | the 21st send in a minute → 429 |
| `remove/delete.test.js` | author 200, Super Admin 200, Hall Admin on someone else's 403, missing 404, log written; `messageId` passed as a **query** parameter |
| `permission/designation.test.js` | `designation: 0` token → 403 on all three routes |

Run: `docker compose run --rm backend-test npm test -- tests/messages`

Not `npx jest`: the project has both a `jest.config.js` and a `jest` key in `package.json`, so
jest refuses to pick one implicitly, and — more importantly — the suites need `--runInBand`.
The `npm test` script supplies both. Test files run in parallel by default, and the per-test
database purge in `setup-after-env.js` is global, so a parallel run has one file wiping the
super admin out from under another; the failures look like `Account not found` on sign-in and
have nothing to do with the code under test.

---

## Phase F1 — the API layer

Four functions in [api/index.ts](../../badhan-frontend/src/api/index.ts), in the established
try/catch-and-return-`e.response` style, exported from the default object at the bottom:

```ts
const handleGETMessages = async (params: { after?: number, before?: number,
                                           beforeId?: string, limit?: number }) =>
  await badhanAxios.get('/messages', { params })

const handlePOSTMessage   = async (payload: { text: string }) =>
  await badhanAxios.post('/messages', payload)

const handleDELETEMessage = async (messageId: string) =>
  await badhanAxios.delete('/messages', { params: { messageId } })
```

Nothing special: the request interceptor already attaches `x-auth` and the guest base URL.

---

## Phase F2 — local storage: two timestamps, two jobs, and nothing else

New `badhan-frontend/src/localDatabase/chat.ts`, in the shape of
[donationCountYearMonth.ts](../../badhan-frontend/src/localDatabase/donationCountYearMonth.ts),
registered in [localDatabase/index.ts](../../badhan-frontend/src/localDatabase/index.ts).

**Two keys, and no message cache.** Message bodies are never written to local storage; the
list lives in Vuex and dies with the tab. That is a decision, not an omission — see Phase F7
for what it buys and what it costs.

**These are two values and merging them into one breaks the badge.** This is the single most
likely thing to be got wrong when implementing this plan.

| Key | Written by | Read by | Meaning |
| --- | --- | --- | --- |
| `chatLastFetchedAt` | every successful fetch, set to the response's `serverTime` — which is the newest returned message's `date`, not the server clock, whenever the page came back truncated (Phase B2) | the *Fetch messages* button and the post-send refresh, as `after` | *what this session has been told about* |
| `chatLastReadAt` | opening the panel or the page, set to the newest held message's `date` | the badge | *what the human has looked at* |

A single timestamp would advance on fetch, so the mount fetch would mark its own results read
and the badge would be permanently zero — the exact failure the chosen design avoids.

**Only `chatLastReadAt` genuinely has to survive a restart.** It is what makes a badge appear
over the messages that arrived while the app was closed. `chatLastFetchedAt` is overwritten by
the boot fetch before anything reads it, so its cross-session value is never used; it is
persisted anyway because it costs nothing and because a watermark that only sometimes exists
is harder to reason about than one that always does. Do not build logic that depends on its
value at boot — there isn't one worth trusting.

Both are cleared by `ldb.reset()`, which
[auth.ts:159](../../badhan-frontend/src/store/auth.ts#L159) already calls on logout and on a
401. That is correct and wants no special-casing: the next person to sign in on this device
must not inherit a read watermark.

`chatLastReadAt` absent — first ever open, or post-logout — means everything fetched counts as
unread, so the first boot after signing in shows a badge over the whole first page. That is
the right answer: it is all new to this person.

---

## Phase F3 — the Vuex module

New `badhan-frontend/src/store/chat.ts`, namespaced, registered in
[store.ts](../../badhan-frontend/src/store/store.ts).

```
state:   messages[]        // oldest-first, the single source of truth for both UIs
         lastReadAt        // hydrated from ldb on module init
         hasMore           // is there older history
         moreToCatchUp     // did the last `after` fetch come back truncated
         fetchingFlag, sendingFlag, loadingOlderFlag
         panelOpenFlag

getters: getMessages
         getUnreadCount
         hasMoreMessages, hasMoreToCatchUp, isFetching, isSending, isPanelOpen

actions: fetchInitialMessages // no cursor — newest page. App open only. REPLACES messages[]
         fetchNewMessages     // after = ldb.chat.loadLastFetchedAt(). APPENDS
         fetchOlderMessages   // before/beforeId from messages[0]. PREPENDS
         sendMessage          // POST, splice the 201 echo in, then fetchNewMessages
         deleteMessage
         markAllRead
         openPanel / closePanel
```

`fetchInitialMessages` and `fetchNewMessages` are **two actions, not one action with a mode
flag**, because they differ in the thing most easily got wrong: the first *replaces* the array
and resets `hasMore` to true, the second *appends* to it. A single action that branched on
whether a watermark existed is how the cold-start hole got into the first draft of this plan.

### `getUnreadCount`, precisely

```
messages.filter(m => m.date > lastReadAt && m.sender?._id !== myId).length
```

Own messages never count — you do not have unread mail from yourself.

`lastReadAt` moves **only** on `markAllRead`, and `markAllRead` is dispatched **only** by
opening the panel and by mounting `/chat`. A fetch that completes while the panel is already
open therefore raises the badge behind the open panel, and it stays raised until the panel is
closed and reopened. Leave it that way; the reasoning is in the decisions at the top.

**Say this plainly in the code comment and in the manual:** the badge counts unread messages
*among those the device has fetched*. It is not a server-side unread count, and it cannot be:
a true count would need the server to speak first, or the client to poll, and this feature
does neither. So the badge answers "is there something new since you last looked?" — which
is the useful question — and not "how many messages exist that you have never seen".

### `fetchNewMessages`, and the catch-up that does not finish in one press

`after = ldb.chat.loadLastFetchedAt()`, append, dedupe by `_id`, then store the response's
`serverTime` — which, per Phase B2, is the newest returned message's `date` rather than the
server's clock whenever the page came back full. Commit `hasMore` to `moreToCatchUp`.

**It does not loop.** A member back from a week away has a genuinely large gap, and an action
that re-dispatches itself until drained turns one button press into an unbounded burst against
a 60/minute limiter, on the slow connection where that member most likely is. Instead
`moreToCatchUp` stays true and `FetchMessagesButton` says so — one more press fetches the next
thirty. Each press is a bounded, cancellable, visible step, which is the same bargain the rest
of the feature makes.

`fetchInitialMessages` sets `moreToCatchUp` to false: the newest page is by definition current,
and there is nothing behind it to catch up on — only history to scroll back through, which is
`hasMore`'s job and a different direction.

### The 403 handler

Every one of the three chat actions wraps its call the same way:

```
if (response.status === HTTP_STATUS.FORBIDDEN) {
  dispatch('logout', null, { root: true })
  return
}
```

Phase B0 exists because a demoted member keeps a working token, and this is the other half of
it. Their store still says `designation: 1`, so the FAB, the drawer entry and the `/chat`
route guard all still pass locally while every request 403s — a member-only room that is
visible, reachable, and permanently broken. Refreshing just the designation would fix the chat
and leave every other cached permission in the app equally stale, so the honest response is
the one already used for a 401: clear the session and send them to sign in again, where the
server hands back what they actually are now. `logout` at
[auth.ts:105](../../badhan-frontend/src/store/auth.ts#L105) already does all of it —
`removeToken`, `ldb.token.clear()`, `ldb.reset()`, `resetBaseURL()` — and `ldb.reset()` takes
both chat watermarks with it, which is correct.

This is a blunt response to a rare event, and it is chosen knowingly: a demotion is not
supposed to be silent, and someone who was a member five minutes ago being asked to sign in
again is a smaller harm than a UI that lies about who they are.

### `sendMessage`, and the double round trip

The brief asks that sending triggers a fetch. It does, and both halves are needed:

1. `POST /messages` returns the created message, joined. Splice it in immediately so the
   composer clears with no perceived latency.
2. Then `fetchNewMessages()`, which pulls everything anyone else sent since the last
   watermark and advances `chatLastFetchedAt`.

Step 2 must **dedupe by `_id`** before appending — the just-sent message will normally come
back in it, since its `date` is newer than the previous watermark. Dedupe on `_id`, never on
`text` + `date`, or two people sending "ok" in the same second lose one.

A failed send leaves the composer's text intact. The user retypes nothing.

### `fetchOlderMessages`

Guarded by `hasMore` and by `loadingOlderFlag` so a fast scroll cannot issue three
overlapping page requests. Prepends, and the caller is responsible for scroll anchoring
(Phase F4).

---

## Phase F4 — the shared message list

**One list component, used by both the panel and the page.** If the panel and the page grow
separate list implementations they will drift, and the drift will be in the scroll and
dedupe logic, which is where the bugs are. New directory
`badhan-frontend/src/views/Chat/`:

* **`MessageList.vue`** — the scroller. Renders `getMessages` oldest-first, newest at the
  bottom. Takes a `height` prop so the panel can be short and the page tall, and that is the
  *only* thing that differs between the two mounts.
* **`MessageBubble.vue`** — one message. Own messages right-aligned, everyone else's left.
  Header line: **name · batch · hall · rank**, e.g. `Mir Mahathir · 16 · Titumir · Hall Admin`.
  - batch = `sender.studentId.substring(0, 2)`, the definition the
    [glossary](../manual/19-glossary.md) already gives.
  - hall via the existing hall-name filter; rank via `getDesignationString`, the filter
    [AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue) already uses.
  - `sender === null` — the donor record is gone — → `Former member`, everything else
    omitted, bubble still shown. A deleted account must not delete other people's
    conversation.
  - **A sender at `designation: 0` renders as `Donor`, with no special case.** The live join
    is applied literally: rank is whatever that person's rank is now. A members-only room
    will therefore occasionally show a message labelled `Donor`, because somebody was demoted
    after sending it. That is truthful and it is intended — do not add a branch that hides the
    rank, substitutes the sender's rank at send time, or falls back to `Former member`. The
    only `null`-sender case is a *deleted* record, not a demoted one.
  - Timestamp under the text, and a day divider between messages that fall on different
    dates.
  - The text is rendered with `{{ }}` only. **No `v-html`, no VueMarkdown, no autolinker.**
    Repeat this in a comment on the template — it is the entire XSS story for the feature.
  - A delete affordance appears only when `sender._id === myId || myDesignation === 3`, and
    goes through the existing `confirmationBox` store module, as the sign-out flow does.
* **`MessageComposer.vue`** — text field, character counter at 2000, Send button. Enter sends
  and Shift+Enter inserts a newline on a wide screen; on mobile Enter always inserts a
  newline and only the button sends. Disabled while `isSending`.
* **`FetchMessagesButton.vue`** — the explicit *Fetch messages* control, pinned at the top of
  the list, showing when the last fetch happened (`Last checked 4 minutes ago`). This button
  is not a fallback for a missing socket that we are embarrassed about; it is the interaction
  model, so label it plainly and make it prominent.
  - When `hasMoreToCatchUp` is true the label changes to say so — `More messages waiting` —
    and the button is styled as the obvious next action rather than as a passive refresh.
    Otherwise a member returning from a long absence presses it once, sees thirty messages,
    and concludes that is all there was.

### Scroll behaviour, in three rules

1. On open, jump to the bottom without animating.
2. When new messages arrive, auto-scroll to the bottom **only if the user was already within
   ~100px of the bottom**. Someone reading history must not be yanked away.
3. When older messages are prepended, record `scrollHeight` before the splice and restore
   `scrollTop += (newScrollHeight - oldScrollHeight)` after `$nextTick`, so the viewport
   stays on the message the user was reading. Without this, scrolling up jumps and the
   history is unusable.

Older messages load when the scroller reaches the top — via an `IntersectionObserver` on a
sentinel `div`, not a scroll-event handler.

---

## Phase F5 — the floating button and the panel

New `badhan-frontend/src/components/AppShell/ChatFab.vue`, mounted in
[App.vue](../../badhan-frontend/src/App.vue) beside `<app-bar>` and behind the same
`v-if="$store.getters['getToken']"`, plus a `designation >= 1` guard.

* **It is a global, App.vue-level component — exactly one instance, outside `<router-view>`.**
  No view imports it, no view mounts its own copy. That placement is what makes "a floating
  button on every signed-in screen" true without touching a single view file, and it is what
  keeps the FAB and its open panel alive across a route change: because the component never
  unmounts when the route changes, the panel does not blink shut and the unread badge does not
  re-mount and re-read local storage on every navigation. Visibility is decided by the guards
  above plus the `/chat` route check below, never by which view happens to be rendered.
* `position: fixed`, top-right. It sits **below** the app bar, not inside it — the app bar is
  `collapse-on-scroll`, so a button anchored to it would move as the user scrolls, and a chat
  button that wanders is a chat button nobody hits. A fixed offset from the viewport top
  (`top: 76px; right: 16px`) keeps it still.
* `v-badge` with `getUnreadCount`, `overlap`, and `:value="getUnreadCount > 0"` so no empty
  dot shows at zero. Cap the label at `99+`.
* Hidden on the `/chat` route itself — a floating button that opens the page you are already
  on is noise.
* `z-index` below the existing `Notification`, `MessageBox` and `ConfirmationBox` overlays, so
  a confirmation dialog is never obscured by it.
* `id`/`data-cy`: `chatFabId`.

`ChatPanel.vue` opens from it — a `v-menu` anchored to the FAB, `content-class="rounded-xl"`,
holding `MessageList` at a fixed ~420px height, `FetchMessagesButton` and `MessageComposer`.
Opening dispatches `chat/markAllRead`.

On a narrow screen the panel is a bottom sheet at full width instead of a floating card; a
340px-wide popup with a text field is unusable on a phone, and the phone is where this will
mostly be read.

---

## Phase F6 — the page, the route, the drawer

* **`views/Chat.vue`** — `PageTitle`, then `MessageList` sized to the viewport, then the
  composer pinned at the bottom. Same components, more room. `mounted` dispatches
  `chat/markAllRead`.
* **Route** in [router/index.ts](../../badhan-frontend/src/router/index.ts):

```ts
{ name: 'Chat', path: '/chat',
  component: () => import('../views/Chat.vue'),
  meta: { requiresAuth: true, title: 'Member Chat', designation: 1, reRouteIfAuthorized: false } }
```

  Lazy-imported, like every other non-home route.
* **Drawer entry** in `menusForAll` in
  [AppBar.vue](../../badhan-frontend/src/components/AppShell/AppBar.vue), placed directly
  after Home and before Feedback:

```js
{ icon: 'mdi-forum', text: 'Messages', to: '/chat', id: 'chatNavigationId', designation: 1 }
```

  It carries **no badge**. The FAB is the badge, it is visible on every screen, and two
  counters that can disagree is worse than one that cannot.

---

## Phase F7 — when the fetch actually fires

Exactly four triggers, and no fifth. **Two of them use no cursor at all**, which is the part
that has to be got right:

| # | Trigger | Action | Cursor |
| --- | --- | --- | --- |
| 1 | App open, after auth is confirmed | `fetchInitialMessages` | **none** — newest 30 |
| 2 | A fresh sign-in | `fetchInitialMessages` | **none** — newest 30 |
| 3 | The *Fetch messages* button | `fetchNewMessages` | `after = chatLastFetchedAt` |
| 4 | Immediately after a successful send | `fetchNewMessages` | `after = chatLastFetchedAt` |

**1 — App open.** In [App.vue](../../badhan-frontend/src/App.vue)'s `mounted`, the existing
call is `await this.$store.dispatch('autoLogin')`. The chat fetch goes **after** it and only
on a truthy result — firing it in parallel races the token check and produces a 401 toast on
every cold start with an expired session.

**2 — A fresh sign-in.** The `login` action in
[auth.ts](../../badhan-frontend/src/store/auth.ts) dispatches it too. Without this, someone
who signs in mid-session sees an empty room until they touch something.

### Why app open ignores the watermark

The tempting version is that app open sends `after = chatLastFetchedAt` like every other
fetch. It is wrong, and wrong in a way that is invisible in development.

The message list lives in Vuex, which is memory. A page reload empties it. But
`chatLastFetchedAt` is in local storage and survives, so an `after` fetch on boot asks "what
is new since yesterday evening?", correctly gets back nothing, and renders an **empty room**
over a conversation with a thousand messages in it. On a developer's machine, where the tab is
never really closed and messages are being seeded constantly, this never reproduces.

So app open always asks for the newest page from scratch, and the watermark it saves is used
only within that session.

**What this costs, stated plainly:**

* Every cold start is a round trip. The room is blank until it lands — so `MessageList` needs a
  real loading state, not an empty-room message that flashes first. The empty-room copy renders
  only once a fetch has completed and returned nothing.
* **Offline, the chat shows nothing at all.** The request interceptor at
  [api/index.ts:52-62](../../badhan-frontend/src/api/index.ts#L52) cancels requests when
  `navigator.onLine` is false, so an offline open produces an empty list. Other parts of the
  app do cache to `ldb` and keep working offline; this one deliberately does not, so the
  manual has to say so rather than let a volunteer on a bad connection conclude the feature is
  broken. Persisting a capped message cache is the obvious future change if that turns out to
  matter — it needs no API change, only a new `ldb.chat` key and a hydrate step before
  trigger 1.

Not on route change, not on window focus, not on a timer. Adding any of those turns this into
polling, which is the one thing the feature is defined as not doing.

The mount fetch is deliberately **not** blocking: it does not gate rendering, it uses the
existing `appBarLoadingFlag` interceptor like every other call, and a failure produces a
toast and nothing worse. Nobody should be unable to search for a donor because chat history
would not load.

---

## Phase F8 — Cypress

New `badhan-frontend-test/cypress/e2e/chat/`:

* `fab.cy.ts` — the FAB renders for a Volunteer, is hidden on `/chat`, and hidden when signed
  out.
* `badge.cy.ts` — **the specification test for the badge.** A fetch that returns three new
  messages leaves a badge of 3; opening the panel takes it to 0; a subsequent fetch returning
  nothing leaves it at 0; own messages never increment it.
* `coldStart.cy.ts` — **the regression test for Phase F7.** Seed local storage with a
  `chatLastFetchedAt` from an hour ago and no `chatLastReadAt`, reload, and assert the room is
  populated — that the boot request went out with **no** `after` parameter. This is the one
  failure mode that a hand-test in an open tab will never surface.
* `panel.cy.ts` — open, send, the composer clears, the message appears.
* `deletion.cy.ts` — the author sees a delete affordance on their own bubble and not on
  anyone else's; a Super Admin sees it on every bubble; confirming removes the bubble, and so
  does a stubbed 404.
* `pagination.cy.ts` — scrolling to the top loads older messages, and the viewport stays put.
* `page.cy.ts` — the drawer entry navigates, and the page shows the same messages as the panel.
* `permission.cy.ts` — **the regression test for the demoted member.** With a valid session,
  stub `GET /messages` as 403, open the chat, and assert the app lands on the login screen with
  the token cleared and `chatLastReadAt` gone from local storage — not a blank room, and not a
  chat that stays visible and keeps failing. Repeat for the 403 on `POST` and on `DELETE`.
* `catchUp.cy.ts` — **the regression test for the truncated catch-up.** Stub the *Fetch
  messages* response as a full page with `hasMore: true` and a `serverTime` older than the
  clock; assert the button switches to *More messages waiting*, and that the next press sends
  `after` equal to that `serverTime` rather than to the browser's `Date.now()`.

Screenshots for the manual: `cypress/docs-screenshots/new-feature-global-chat/`, matching the
existing folders' numbering convention —
`01-fab-badge`, `02-panel-open`, `03-drawer-entry`, `04-chat-page`, `05-fetch-button`,
`06-delete-confirm`, `07-offline-empty`, `08-more-messages-waiting`.

Run: `docker compose run --rm frontend-test npx cypress run --spec 'cypress/e2e/chat/**'`

---

## Phase D — documentation

Required by [CLAUDE.md](../../CLAUDE.md) in the same change as the behaviour.

**New chapter `docs/manual/21-member-chat.md`**, numbered 21 because chapters are never
renumbered. It must cover, in the manual's plain-language voice:

* What the room is: everyone in Badhan at Volunteer or above, all halls, one conversation.
* Who can see it, and that a donor cannot.
* The two ways in: the round button in the corner, and **Messages** in the menu.
* **The refresh model, stated honestly and early.** Messages do not arrive on their own. The
  app checks when you open it, when you press *Fetch messages*, and when you send something.
  If you leave the app open on a table for an hour, you will not see anything new until you
  ask for it. This is the chapter's most important paragraph — a reader who misses it will
  think the feature is broken.
* What the red number on the button means, and that it counts what the app has fetched since
  you last opened the chat. **And that it only clears when you open the chat** — messages that
  arrive while you already have it open still raise the number; close it and open it again to
  clear it.
* **That one press of *Fetch messages* brings back thirty at most.** After a few days away the
  button will say **More messages waiting** — keep pressing until it stops. Nothing is lost in
  between; it is being handed over a page at a time.
* Scrolling up for older messages.
* **That the chat needs a connection, every time.** Unlike donor searches, nothing about the
  chat is kept on your phone. Open the app with no internet and the chat is empty — that is
  not lost messages, and nothing has gone wrong; they come back when you are online. Say this
  in the chapter rather than leaving a volunteer on a bad connection to guess.
* Deleting: your own, any time; a Super Admin can delete anyone's; nothing can be edited.
  **And that a deleted message simply disappears** — no "message deleted" marker is left
  behind, so unless you were looking at it, you will not know it was there.
* That everything you post is visible to every member in every hall, and that it is not
  private, and that nothing is ever deleted automatically or expires with age.

**Edits to existing chapters:**

| Chapter | Change |
| --- | --- |
| [README.md](../manual/README.md) | Chapter 21 in the contents, under *Everyday work*, with the same footnote treatment chapter 20 has |
| [05-the-screen-and-the-menu.md](../manual/05-the-screen-and-the-menu.md) | The floating button and the **Messages** menu entry |
| [04-roles-and-permissions.md](../manual/04-roles-and-permissions.md) | Chat is Volunteer-and-above; delete is author-or-Super-Admin |
| [17-rules-the-app-enforces.md](../manual/17-rules-the-app-enforces.md) | Empty message refused; 2000-character limit; 20-per-minute limit; "you can only delete your own messages" |
| [18-when-something-goes-wrong.md](../manual/18-when-something-goes-wrong.md) | "I am not seeing new messages" → press *Fetch messages*; this is expected. "The chat is empty" → check your connection; nothing is stored on the phone. "A message I saw is gone" → someone deleted it. "It says *More messages waiting* after I already fetched" → press it again; you are being caught up a page at a time. "I was signed out when I opened the chat" → your membership was changed; sign in again and the app will know your new role |
| [19-glossary.md](../manual/19-glossary.md) | **Member chat**, **Fetch messages**, **Unread badge**, **More messages waiting** |
| [03-signing-in.md](../manual/03-signing-in.md) | The guest-login section already says every donor is made up and nothing is saved. Add what the chat does in a demo specifically: the messages are invented, sending shows your own message but posts it nowhere, and **no new message ever arrives**, so *Fetch messages* correctly reports nothing new every time. Without this a demo looks broken at exactly the point somebody presses the one button the feature is named for |

---

## Build order

The phases are written to be landed in this order, and each one is independently verifiable:

```
B0 → B1 → B2 → B3 → B4 → B6   (backend complete and tested, no UI yet)
B5                            (guest mirror)
F1 → F2 → F3                  (data layer; testable from the dev console)
F4 → F5 → F6 → F7             (UI)
F8 → D                        (tests and manual)
```

After every backend phase: `docker compose exec backend npx tsc --noEmit`, then
`docker compose exec backend npm run tsoa:routes` — the routes are generated, and a new
controller that is not regenerated is a 404 that looks like a bug in the frontend.
After every frontend phase: `docker compose exec frontend npm run build`.

---

## The risks worth naming

* **The badge is approximate, by construction.** Covered above; documented in the manual
  rather than papered over. It also does not clear while the chat is open, which will read as
  a bug to somebody at some point and is a deliberate choice recorded in the decisions.
* **Catching up after a long absence takes several presses.** `fetchNewMessages` does not
  loop, so a member back from a week away presses *Fetch messages* once per thirty messages.
  This is bounded and visible rather than fast, and the button says so. If it turns out to be
  the common case rather than the rare one, the fix is a larger `limit` for catch-up
  specifically — not a self-dispatching loop.
* **A chat 403 signs the user out of everything.** One stale permission ejects them from the
  whole app. That is intentional (Phase F3) and it is the correct blunt response to a store
  that no longer matches the server, but it means a backend bug that 403s the chat route
  logs out every member who opens it. The `permission.cy.ts` stub is the guard against
  shipping that accidentally; the route-level test in `permission/designation.test.js` is the
  guard against the backend causing it.
* **The chat is useless offline, and slow to first paint.** Nothing is cached on the device,
  so a cold start is always a round trip and an offline open is always an empty room, in an
  app that otherwise caches enough to keep working on a bad connection. This is the accepted
  cost of never showing a stale room; the fix, if it turns out to be needed, is a capped
  message cache in `ldb.chat` hydrated before trigger 1, and it needs no backend change.
* **Unbounded growth.** No retention policy, no TTL, no purge route. A global room every
  member can post to grows forever. At BUET-zone volume this is a few thousand short documents
  a year, so it is accepted here rather than solved — but it is accepted knowingly, and the
  answer when it does bite is a Super Admin purge route with a documented window, never a
  silent TTL that deletes history nobody was told was temporary.
* **A global room is a moderation surface, and deletion leaves no trace.** There is no report
  button, no mute, no block. The only lever is a Super Admin deleting a message after the
  fact, every member sees everything until they do, and once they do the message simply
  vanishes — nobody who did not already have it on screen learns that anything was removed.
  The activity log is the only record. If the room turns out to need more than that, the next
  plan is moderation, not features.
* **The same-millisecond cursor bug is the one that will be introduced.** It passes every
  hand-test, because two messages rarely share a millisecond on a quiet system. The seeded
  test in `fetch/before.test.js` is not optional.
