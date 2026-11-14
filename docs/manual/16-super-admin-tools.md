# 16. Super admin tools

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: Statistics and reports](15-statistics-and-reports.md) · [Contents](README.md) · [Next: Rules the app enforces →](17-rules-the-app-enforces.md)

---

*Super admins only. These pages are under **Super Admin** in the menu.*

These are the maintenance tools. Most super admins will never need them from one month to the
next, and that is fine. What follows is enough to know **what each page is, when to open it,
and when to stop and ask a developer.**

---

## Backup & Restore

A backup is a complete copy of the record book as it stood at a moment in time. If something
goes badly wrong — a bulk change that should not have happened, a corrupted record — a backup
is what gets the organisation back.

> **Important: this page only works on a computer that is running the backup service.** It is
> not something you can use from a phone or an ordinary browser. If the page says *"Error
> loading backups"* or *"Firebase credentials not found"*, you are on a machine that is not
> set up for it. That is not a fault you can fix from this page — ask a developer.

When it does load, you see **Latest Backup** at the top and **All Backups** below, each with
the date and time it was taken.

### The buttons at the top

| Button | What it does |
| --- | --- |
| **Create New Backup** | Takes a fresh copy of the record book as it stands right now. |
| **Trim Backups** | Deletes older backups to save space. |
| **Reset Local DB** | Empties the copy of the record book held on this computer and puts a small set of made-up practice records in its place. ("DB" is short for database — the record book itself.) |
| **Reset Development DB** | The same, but for the practice copy of the app — the shared test site. Everyone using the test site loses whatever was in it. |
| **Copy to Local DB** | Copies the live record book down onto this computer. |

### The buttons on each backup

| Button | What it does |
| --- | --- |
| **Delete** | Removes that backup permanently. |
| **Restore to Local** | Loads it into the copy on this computer. |
| **Restore to Development** | Loads it into the practice copy of the app — the shared test site. |
| **Restore to Production** | **Loads it into the real, live app, replacing what is there now.** |

### Read this before touching anything

**Restore to Production replaces the live record book.** Everything recorded since that backup
was taken — every donation, every new donor, every comment — is gone. This is the single most
destructive button in the whole application.

**The two Reset buttons throw away everything in the database they name.** They are for a
developer setting up a clean starting point, not for fixing a problem with real records.
*Reset Local DB* only touches the machine you are sitting at, so it is harmless. *Reset
Development DB* wipes the shared test site for everyone using it — tell the team before you
press it. Neither one can touch the live app.

Sensible habits:

- **Take a new backup before restoring an old one.** Then a mistake is recoverable.
- **Restore to Local or Development first** and look at the result before touching production.
- **Do not restore in the middle of a busy day.** Whatever volunteers are entering at that
  moment will be lost.
- **When in doubt, don't.** Ask a developer. Nothing here is so urgent that it cannot wait an
  hour.

Creating a backup, on the other hand, is completely safe. Do that whenever you like.

---

## Schema Inconsistencies

This page finds **records with something wrong in them**. Not wrong information — the app
cannot know that a phone number is out of date — but records that are malformed: a field that
should always be filled in and is empty, a field holding the wrong kind of value, a leftover
field from an older version of the app.

These usually arrive through bulk imports, or from data that predates a change in the app.

Tap **Refresh** and the page lists what it found, grouped into kinds:

- **Missing required fields** — something that must be present is not there
- **Empty required fields** — present, but blank
- **Wrong type of value** — text where a number belongs, and similar
- **Extra fields** — leftovers the app no longer uses
- **Rule violations** — a value outside what is allowed, such as an impossible phone number

**The list got longer, and that is the fix.** Until recently this page could not see a missing
field whenever the app had a sensible stand-in value for it. A donor record with no role recorded,
for instance, was read as "Donor" everywhere in the app, so the page saw a role and reported
nothing — while the record itself still had none. That blind spot is gone, so the list may now name
things that were always there and were never shown to you. Longer is not worse.

**What you should do with it:** treat it as a to-do list, not an emergency. Most entries are
harmless leftovers. Where a real donor record is named, you can usually fix it by opening that
donor's profile and filling in what is missing.

If the list is long, or nothing on it makes sense, send it to a developer. The output is aimed
at them, not at you, and reading it is not part of your job.

**If the page cannot reach the server**, it says so in a yellow box, tells you the server is
expected at `localhost:4000`, and links to the setup instructions. This is normal when you are
not running the app on your own machine — the report comes from a developer-only server. Nothing
is broken; the page simply has nothing to show. Any other failure appears in a red box with the
reason. Either way, **Refresh** tries again.

---

## Dev Console

A running log of what the app is doing behind the scenes, kept while the page is open.

**You do not need to understand it.** Its only purpose is this: when something misbehaves and
a developer asks "what does the Dev Console say?", this is where you look. Open the page,
reproduce the problem, screenshot what appears, send it on.

Nothing on this page changes anything. It is safe to open and safe to ignore.

---

## Certificate Enabled Donors

A list of **every donor who can produce a certificate**, across every hall, on one page.

A donor has no certificate until somebody switches it on for them, by ticking **Enable
certificate** on their profile — see [The certificate](07-the-donor-profile.md#the-certificate).
That tick is not a super admin's job: **any volunteer or hall admin who can edit a donor can
enable that donor's certificate**, and they are meant to. This page is the other side of that.
It is the only place in the app where the whole set is visible at once.

That matters because a certificate is the one document the app produces that leaves the building.
It gets printed, signed, carried, and checked by people who scan the QR code on the paper and have
no account here. Once it exists, you cannot see where it went.

The page opens straight into the list — there is no button to press. At the top is the count. Each
row shows the donor's name, hall, student ID, blood group and role, and rows are grouped by hall so
they can be checked against the person who would know. **Tap a row to open that donor's profile**
in a new window, which is where you would turn the certificate off again if it should not be on.

Archived donors appear here too, marked **Archived**. That is deliberate and it is worth
understanding: archiving a donor does **not** disable their certificate. Someone who has left, whose
record was archived, may still have a certificate that verifies. Those rows are the ones most worth
a second look.

### What to do with it

Read down it occasionally and ask whether each name should be there. What you are looking for is a
name nobody can account for. If you find one, open the profile and untick the box.

Two things this page does not tell you:

- **It does not say who has actually printed or used a certificate.** Nothing records that. The
  list is who *can*, not who *did*.
- **It does not undo anything.** Turning the tick off stops the certificate verifying from that
  moment. It does nothing to paper already printed and already in someone's hands — that copy still
  looks exactly as it did, and its QR code will simply stop confirming it.

The page changes nothing on its own. It is safe to open.

---

## Badhan AI

Badhan AI — the chat with an AI assistant that works inside Badhan for you — is no longer a
super admin tool. Every member has it, at the top of the menu, and
[chapter 22](22-badhan-agent.md) describes it. It works the same for you as for anyone: it acts
with your own role, and every change waits for you to press **Approve**.

What is for super admins only — every member's chats, and the assistant's instructions — is on
**Agent Chats**, below.

---

## Agent Chats

Every member's Badhan AI chats, for you to read — including the ones they deleted. It is
**Agent Chats** under **Super Admin** in the menu.

### The three columns

On a computer the page has three columns, side by side:

1. **Members** — everyone who has at least one agent chat: their name, hall and role, how many
   chats they have, how many of those they deleted, and when they last used the agent. The most
   recently active come first.
2. **Chats** — tap a member to see their chats here, newest first. Each shows its title, when it
   last moved, and its token counts (see below).
3. **The chat itself** — tap a chat to read it, exactly as the member saw it: their messages, the
   assistant's answers, and a card for everything the assistant did in Badhan. Tap a card to see
   the exact request and what came back. The header shows the title, the member, and the date the
   chat was started.

On a phone you see one column at a time; tap a member, then a chat, and use the arrow at the top
left to go back.

You can only read here. There is no box to type in: nobody can carry on another member's chat.
The **Call** buttons the member saw in the answers ([chapter 22](22-badhan-agent.md)) are shown
greyed out, so reading a chat never rings a donor.

A member whose record has since been deleted from Badhan is listed as **Deleted member**.

### "Deleted by user"

A chat tagged **Deleted by user** with a date is one the member deleted. When a member deletes a
chat it disappears from their own list on every device, but **Badhan keeps it**, and it stays here
until a super admin deletes it for good. Members are not told this; the delete in their own chat
list looks like any other delete. A member stays in the first column for as long as they have any
chat left here, deleted ones included.

### Downloading a chat

The **download icon**, beside a chat in the second column or at the top of an open chat, saves
that chat to your device as a file named `badhan-agent-chat-` followed by the chat's id, ending in
`.json`. It is meant for looking into what went wrong in a chat, not for reading. It holds
**everything Badhan has stored for the chat**, exactly as stored — the title, the dates, whether
the member deleted it, the token counts, and every message with all its details, including the
exact requests the assistant made in Badhan and the full answers that came back. Alongside that it
carries the member's name, hall and role (or nothing, if their record has since been deleted), the
time you downloaded it, and which copy of Badhan it came from.

It also lists **every time the assistant was asked something** — each call to OpenAI, the company
whose model answers — with:

- **what was sent**: the system prompt exactly as it was that time (with its note naming the
  member and the time), the list of everything the assistant could do in Badhan, the model and its
  settings, and the whole conversation up to that point;
- **what came back**: OpenAI's full answer, including why it stopped (finished, or cut off at its
  length limit), or, for a call that **failed**, what went wrong — out of quota, unreachable,
  refused — and OpenAI's own error message;
- OpenAI's reference for the call, which their support can look up, and how long it took.

Failed calls are kept for this file only. The member never sees them in their chat, and neither do
you when you read it here; the member only saw a message at the time, and **Retry**.

Calls are listed only for chats used after Badhan started keeping them. An older chat's file has
its messages, but no list of calls.

How it is kept: Badhan stores the long parts every call repeats — the system prompt's fixed text,
the list of everything the assistant can do, the settings — **once per chat**, and each call points
at them; the conversation each call was sent is not stored again, but rebuilt for the file from
the chat's messages. So nothing is kept twice in a chat, however many calls it makes. If the app
was updated while a chat was going on, the file shows which calls had the old prompt or list and
which had the new one.

A few things are never kept, so they are not in the file: OpenAI's error text when it refuses the
organisation's key (that text quotes part of the key), the pop-up messages a member sees in the
moment (such as *"Stopped."* or *"This chat is busy in another tab or window"*), and anything past
the first 250,000 characters of a single answer from Badhan.

The file has every message of a member's conversation in it, and the answers can include donors'
names and phone numbers. Keep it as carefully as you would the chat itself, and delete it when you
are done.

### Deleting a chat for good

The **bin icon**, beside a chat in the second column or at the top of an open chat, deletes it
**permanently**. You are asked first: *"Permanently delete "…" by …? It is removed from Badhan for
good and cannot be undone."* After that the chat and everything in it are gone — from this page,
from the member's own list if it was still there, and from Badhan. Only the record in App Activity
that a chat was deleted, and by whom, remains — and any backup taken before the delete
([Backup & Restore](#backup--restore)) still holds a copy, as it does of everything else, and so
does any file someone downloaded with the download icon.

If it was the member's last chat, the member leaves the first column too.

### Reading is recorded

**Opening a chat here is recorded in App Activity** under your name, like opening the Activity
Summary. So is every download and every permanent delete. Listing members and chats is not.

### Token counts

Each chat shows two numbers, such as **2.4k in · 60 out**. They are how much text went to the
assistant and how much came back, in OpenAI's unit, the *token* (roughly three quarters of a
word). OpenAI charges for both, and **the organisation pays for every member's chats**. There is
no daily limit on how much anyone can use the agent — only the 20-step limit on a single message —
so these numbers are the only view of what it is costing. A chat with very large numbers is worth
a look.


### The system prompt

The **System prompt** button above the columns shows the instructions the assistant reads before
anything a member types. It is shown here and nowhere else: not on the Badhan AI page, and not
to any member below super admin. It cannot be changed here, and it is the same for every chat and
every member.

Besides how to behave, it tells the assistant the way Badhan writes things down — for example
that blood groups and halls are stored as numbers. At its end is a short note filled in each time
the assistant is asked something: which copy of Badhan the chat is on, who is signed in, and the
current date and time in Bangladesh, so the assistant can work out things like "the last four
months". In a member's chat that note names the member; the copy shown here names you, at the
time you opened the page. The exact prompt each call in a chat was given, note included, is in
that chat's download ([Downloading a chat](#downloading-a-chat), above).

---

[← Previous: Statistics and reports](15-statistics-and-reports.md) · [Contents](README.md) · [Next: Rules the app enforces →](17-rules-the-app-enforces.md)
