# Plan 9 — A Complete User Manual for Badhan

**What this document is:** a plan for writing a manual, not the manual itself. It says what
the manual will cover, how it will be organised, where each fact comes from in the code, how
it will be written, and in what order it gets built.

**Language of the manual: English.** Plain, everyday English — the kind used when explaining
something to a friend, not the kind used in a specification. (Earlier plan documents in this
folder are in Bangla; this one is deliberately not, and neither is the manual it produces.)

---

## At a glance

Badhan has grown into a fairly large app. A volunteer joining today learns it by watching
someone else use it, and whatever that person forgot to mention simply never gets learned.
There is no single place that says *what the app can do*.

The goal is one manual that covers **everything the app supports** — every page, every
button, every rule the system enforces quietly in the background — written so that a person
who has never seen a line of code can read it start to finish and understand the whole
system.

Two things follow from "no coding knowledge":

- **No code, no file paths, no API names in the manual.** Not in the body, not in footnotes.
  If something can only be explained by mentioning an endpoint, it is being explained wrong.
- **Backend behaviour still gets documented — as behaviour.** The reader will never learn
  that there is a `DonorsController`. They *will* learn that only a Hall Admin can promote
  someone, that a donor's phone number must be unique across the whole database, and that
  editing a donor of another hall is refused. Those are backend rules, and they are exactly
  what users bump into and get confused by.

---

## 1. Who the manual is for

Written for, in this order of priority:

1. **A brand-new volunteer** who has just been given an account and has never opened the app.
2. **A hall admin** who needs to know what they can do that a volunteer cannot.
3. **A super admin** who needs the reports, backup and diagnostic pages explained.

Anyone in group 1 should be able to read chapters 1–8 and start working. Groups 2 and 3 read
their own chapters on top.

**Note:** a plain donor (designation 0) has **no account and cannot sign in** — the app
refuses to issue them a password, and every signed-in page requires Volunteer or above. So
the manual has no donor-facing reader today. Donors are people the app *stores*, not people
who use it. ([plan7](plan7.md) proposes giving them accounts; until that ships, the manual
must not imply they have one.)

**Not written for:** developers. Contributor and setup documentation stays where it is
(`README.md`, `docs/new-member.md`); the manual will not duplicate or replace it.

---

## 2. Where the manual lives

A new folder, `docs/manual/`, one file per chapter, numbered so the reading order is obvious:

```
docs/manual/
  README.md                  ← table of contents + how to read this
  01-what-is-badhan.md
  02-getting-the-app.md
  03-signing-in.md
  04-roles-and-permissions.md
  05-the-screen-and-the-menu.md
  06-searching-for-donors.md
  07-the-donor-profile.md
  08-recording-donations.md
  09-call-records.md
  10-bookmarked-donors.md
  11-adding-new-donors.md
  12-members-and-promotions.md
  13-public-contacts.md
  14-my-profile-and-devices.md
  15-statistics-and-reports.md
  16-super-admin-tools.md
  17-rules-the-app-enforces.md
  18-when-something-goes-wrong.md
  19-glossary.md
  images/
```

Split into files rather than one long page so a chapter can be linked to and sent to a person
on its own — that is how it will actually get used.

---

## 3. Chapter outline

Each chapter below lists **what it must cover** and **where in the code the facts come from**.
The source column is for whoever writes the chapter; none of it appears in the manual.

### 1. What Badhan is

The purpose of the app, who uses it, what a donor record is, what a donation record is, and
the one-sentence version of how a blood request actually gets fulfilled through the app.
*Source: `README.md`, `badhan-frontend/src/views/About.vue`.*

### 2. Getting the app

Website, Android app from Play Store, and installing the website to a phone home screen. That
the app keeps working with a weak connection and stores some data on the device, and what
that means in practice (data may be slightly stale; how to force it fresh).
*Source: `badhan-frontend/src/registerServiceWorker.ts`, `badhan-frontend/src/localDatabase/`,
`badhan-frontend/bubblewrap/`.*

### 3. Signing in

Phone number and password. What a password-reset link is, who can generate one, that it
expires, and how a person sets their password for the first time. That signing in requires
being a Volunteer or above — a plain donor cannot be given a password at all, and asking for
one produces "Donor is not a volunteer/admin"; the way to give someone access is to promote
them first (chapter 12). The guest/demo login and what is fake about it.
*Source: `SignInCover.vue`, `PasswordReset.vue`, `UsersController`, `GuestController`.*

### 4. Roles and permissions

The four levels — **Donor, Volunteer, Hall Admin, Super Admin** — and a single table showing
which of them can do each action in the app. This is the chapter people will re-read most,
so it gets an actual grid, not prose. The first row of that table has to be stated plainly:
**Donor is not a user of the app.** It is the level everyone starts at, it means "a record in
the database", and it grants no login at all. Also: hall-based restriction (a volunteer works
within their own hall), what "Attached" and "(Unknown)" hall mean, and that you cannot change
the details of someone at a higher level than you.
*Source: `badhan-backend/src/constants` (`designations`, `halls`), the `designation` field on
every route in `badhan-frontend/src/router/index.ts`, and the hall checks in the controllers.*

### 5. The screen and the menu

A walk through the side menu, item by item, saying which role sees which item. Dark mode, the
notification bar, the confirmation pop-ups, and the "open this page in a new tab" behaviour.
*Source: `components/AppShell/AppBar.vue` (the `menusForAll` list is the definitive menu),
`Notification.vue`, `ConfirmationBox.vue`, `Redirection.vue`.*

### 6. Searching for donors

The home page search: filtering by blood group, hall, availability, and how to read the
result cards. What each badge and colour on a card means. Why a search sometimes returns
donors from other halls and sometimes does not.
*Source: `views/Home.vue`, `components/Filters.vue`, `components/PersonCardNew.vue`,
`SearchController`.*

### 7. The donor profile

Every field on a donor's page and what it is for — name, phone, student ID, blood group,
hall, room, address, comment, availability, last donation. Which fields can be edited by
whom. What the comment box is for and the fact that comments are visible to other volunteers.
*Source: `views/Home/Details.vue`, `components/PersonDetails.vue`, `DonorsController`.*

### 8. Recording donations

Adding and removing a blood donation date, and the same for platelet donations. The
difference between the two. The 120-day and 12-day rest periods and — importantly — that
these only control whether a donor is *shown* as available; the app does **not** refuse a
date that falls inside them. Also how donation counts and the "last donated" date are derived
rather than typed in.
*Source: `DonationsController`, `PlateletDonationsController`, `Home/components/DonationCard.vue`.*

### 9. Call records

What a call record is, why volunteers log calls, what other volunteers see when a donor has
been called recently, and deleting a record.
*Source: `CallRecordsController`, `Home/components/CallRecordCard.vue`.*

### 10. Bookmarked donors

What bookmarking does, that the list is personal to the person who made it, and how it
differs from search. (Note for the writer: this feature was renamed from "Active Donors" —
the manual uses **Bookmarked Donors** everywhere, since that is what the screen now says.)
*Source: `views/ActiveDonors.vue`, `ActiveDonorsController`.*

### 11. Adding new donors

Creating one donor by form; the duplicate-detection screen and what to do when it fires;
uploading a CSV of many donors, with the exact column format and a worked example; and the
"Newly Created Donors" review list.
*Source: `views/SingleDonorCreation.vue`, `SingleDonorCreation/DuplicateDetails.vue`,
`views/CsvDonorCreation.vue`, `views/NewDonors.vue`, `DonorsController` (`checkDuplicate`, `new`).*

### 12. Members and promotions

The members list, promoting and demoting people, who is allowed to do it, and what changes
for a person the moment their level changes — in particular that promoting a donor to
volunteer is what makes it possible to give them a login, and that demoting them back to
donor takes it away.
*Source: `views/Members.vue`, `VolunteersController`, the designation-change route.*

### 13. Public contacts

What the public contact list is, that it is visible without signing in, and who can add or
remove an entry.
*Source: `views/PublicContacts.vue`, `PublicContactsController`.*

### 14. My profile and devices

Changing your own password, the list of devices you are signed in on, signing out one device
versus all devices, and sharing your profile.
*Source: `views/MyProfile.vue`, `MyProfile/components/LoginCard.vue`, `ShareProfileButton.vue`,
the logins/sign-out routes in `UsersController`.*

### 15. Statistics and reports

Super-admin only. The donation report and how to read it, the month-by-month chart, logs by
date, the full donor list, and archived donors. Explicitly: what "archived" means and how a
donor ends up archived.
*Source: `views/Statistics/*`, `LogsController`, the donation-report routes.*

### 16. Super admin tools

Backup and restore, schema inconsistencies (described as "records with something wrong in
them", with the plain-English meaning of each check), and the developer console — the last
one described only as *what it shows and when to look at it*.
*Source: `views/BackupRestore.vue`, `views/SchemaInconsistencies.vue`,
`badhan-backend/src/services/schemaInconsistencies.ts`, `views/DevConsole.vue`.*

### 17. Rules the app enforces

The chapter that makes the backend visible without naming it. One rule per bullet, each with
the message the user sees and what to do about it. Phone numbers are unique. You cannot edit
a donor outside your hall. You cannot demote someone above you. Two donations too close
together are rejected. Repeated rapid requests are throttled. Every action is logged.
Maintenance mode and app-version deprecation and what those screens mean.
*Source: `badhan-backend/src/validations/`, `middlewares/rateLimiter.ts`,
`middlewares/authenticate.ts`, `response/models/errorTypes/`, `OtherController`
(`maintenance`, `deprecated`), `logInterface`.*

### 18. When something goes wrong

The common failures and the fix: wrong password, expired reset link, signed out
unexpectedly, "you don't have permission", stale data on screen, upload rejected, offline.
Ends with how to reach a developer.
*Source: the error types in `response/models/errorTypes/`, plus the notification strings in
the frontend.*

### 19. Glossary

Every term the manual uses, defined in one line: donor, donation, platelet donation, hall,
designation, bookmark, call record, archived donor, token/session, CSV.

---

## 4. How the manual is written

Rules for whoever writes it, enforced at review:

- **Second person, present tense.** "You tap Save and the donor is updated" — not "the
  donor shall be updated".
- **One idea per paragraph, short paragraphs.** Three to four lines maximum.
- **Every feature answers three questions in order:** what it is, when you would use it,
  what exactly you tap. Never a button list with no reason attached.
- **Name things exactly as the screen names them.** If the screen says "Bookmarked Donors",
  the manual never says "active donors". If a label is wrong or confusing on screen, note it
  in the tracking issue — do not silently write something different.
- **No jargon without a definition on first use**, and the definition also goes in the
  glossary. Banned outright: API, endpoint, database, token, cache, schema, deploy, JSON,
  frontend, backend. Where a concept is genuinely needed, use the everyday word — "the app
  remembers you are signed in" rather than "a token is stored".
- **Screenshots for anything with more than three steps.** Stored in
  `docs/manual/images/`, taken on a phone-width window, from demo/guest data only — never a
  real donor's name, phone number or student ID. Every screenshot needs alt text, because the
  alt text is what a person searching the file will actually match on.
- **Every permission claim is verified against the code, not against memory.** Role tables
  are the easiest thing in this manual to get wrong and the most damaging when wrong.

---

## 5. Order of work

Six steps. Each one ends with something usable, so the effort is not wasted if it pauses.

**Step 1 — Inventory.** Walk the menu list, the router, and the backend controllers and
produce a flat checklist of every screen, action and rule that must appear somewhere in the
manual. Tick items off as chapters land; anything left unticked at the end is a gap. This
checklist is the real definition of "entire frontend and backend".

**Step 2 — Skeleton.** Create all chapter files with headings and one-line summaries, plus
`README.md` with the table of contents. Nothing written yet, but the shape is reviewable and
someone can say "chapter 12 is missing X" before any words are spent.

**Step 3 — The core path (chapters 1–11).** Everything a new volunteer needs. This is the
bulk of the value; if the work stops after this step it is still worth shipping.

**Step 4 — Admin chapters (12–16).** Hall admin and super admin material.

**Step 5 — Rules, troubleshooting, glossary (17–19).** Written last on purpose: by then the
earlier chapters have surfaced the rules worth naming, and the glossary can be assembled from
terms actually used rather than terms guessed at in advance.

**Step 6 — Read-through and screenshots.** One person reads the whole manual start to finish
against a live demo account, fixing anything the app does not actually do. Screenshots are
taken in this pass, not earlier, so they match the final wording.

---

## 6. When it is done

- Every item on the Step 1 checklist appears in some chapter.
- Every menu item in the app has a chapter, and every chapter matches a real screen.
- All four levels have their permissions stated in one table, verified against the code —
  including that Donor grants no login.
- A person who has never used Badhan can create a donor, record a donation and run a search
  using only the manual, without asking anyone.
- No code, file path, endpoint or technical term survives outside the glossary.

---

## 7. Keeping it true

A manual that goes stale is worse than none, because people trust it and get wrong answers.
Two habits, both cheap:

- **Any pull request that adds or changes a screen, a button or a permission updates the
  matching chapter in the same pull request.** Added to the review checklist in
  `docs/branch-and-commit-convention.md`.
- **The manual describes what the app does today, never what is planned.** Upcoming work
  lives in the plan documents in this folder. When a plan ships, its user-facing content moves
  into the manual and the plan stays as the historical record — including
  [plan7](plan7.md) (donor accounts and pending donations) and [plan8](plan8.md) (the public
  donor portal and feedback), which will each need their own chapter once built.
