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

## AI Integration

This page connects an **AI assistant** — one you type instructions to in plain English — to
Badhan's records, so it can answer questions like *"find O+ donors in Titumir who have not donated
since March"* without anyone writing code.

There is one way to do it: you hand the assistant a setup file at the start of a conversation, and
it works from the description of the records inside it. The page names no particular assistant;
any that can read an uploaded file and make web requests will do.

### Hand your assistant a setup file

1. On this page, press **Download Setup File**. It saves to your device as
   `badhan-api-prompt.md`.
2. Upload it to a conversation with your AI assistant.
3. Ask the AI to do anything that you would have done by clicking or typing on the app.

**The assistant has to be able to reach Badhan.** Some assistants make their requests from a
sandbox that blocks the internet except for domains you allow. Such an assistant reads the file
happily and then cannot reach Badhan at all, which looks like the file being wrong rather than a
setting being unset. If yours has a setting like that, allow the Badhan domain the page prints
above the steps — the **Copy Domain** button beside it saves typing it out.

You do not need to understand what is in the file. Nothing is created until you press the
button — no sign-in exists before then.

Most of the file is a full description of Badhan's records — every action the assistant can take,
with what each one needs and returns — so the assistant has everything it needs in the one file and
has nothing else to look up before it starts. That description is copied in when you press the
button. If Badhan has been updated since, the old file keeps working, and the assistant is told
where the server publishes the current description (`/llms.txt`) in case something has changed; pressing the
button again gives you a file with the new one inside. Anyone can open that address in a browser;
it holds no records and no sign-in, only the description.

If the button says it **could not load the API reference**, nothing was created — no sign-in was
made and nothing needs ending. Press it again.

The assistant can also search **every hall at once**, as the search page's **All Halls** option
does ([chapter 6](06-searching-for-donors.md)). Ask it for *"every A+ donor who can donate now"*
without naming a hall and it searches them all in one go, rather than hall by hall. It is allowed
because the file signs the assistant in as you, a super admin; the app refuses it to every other
role.

### The token does not expire — you end it yourself

The sign-in the assistant is given is **not your own**: each press of **Download Setup File** asks the
server for a separate token, and your own session is untouched. But that token has **no clock on
it**: it keeps working until somebody deliberately ends it.

Every press adds one entry to the device list on your **My Profile** page, alongside the phones and
computers you have signed in from. **That entry is how you end it**: open My Profile, find it, and
press **Logout** on it. Ending one does not touch the others.

Two things about that, both worth knowing before you need them:

- **Signing out of this browser does not end it.** The ordinary Sign Out ends only the session you
  are using right now. The assistant's token is a separate entry and keeps working.
- **Sign out from all devices does end it** — along with every other session you have, on every
  device.

Because there is no clock, **make the file when you are ready to use it**, and end it
when you are done rather than leaving it in the list. There is no limit on how many you make.

Every entry in that list looks much the same — an operating system, a browser, an address — so if
you make several, end the ones you are unsure about and make a fresh one. That is cheap; guessing
is not.

**Nothing lasts forever regardless.** The app clears out sign-ins that are 30 days old, so a file
you forget about stops working a month after you made it. That is a backstop, not a
plan: end the ones you are done with.

If the assistant suddenly says the file is not authorised, that is what happened — press the button
again and upload the new file instead of the old one.

### Read this before you send that file anywhere

The token **is you**, for as long as it exists. Anyone holding the file can do
everything your role allows, as you, without knowing your password — read every donor, and change
or delete records.

So treat it as you would treat your password:

- **Do not email it, post it in a group chat, or put it in shared storage.**
- **Do not give it to an assistant you would not trust with your password.** Uploading it to an
  online service sends that token to that company.
- **Delete the downloaded file when you are done with it**, and end its entry in My Profile. The
  file lying about on your computer is a live sign-in, not an expired one.

**If one goes somewhere it should not have, go to My Profile and press Logout on its entry.** If you
cannot tell which entry it is, **Sign out from all devices** ends everything at once. Waiting is
not a fix here: nothing expires on its own.

The assistant is **not restricted** to reading. It can add, change and
delete real records, and the app cannot tell its actions apart from yours — the App Activity page
will show them as yours. Everything in
[chapter 17](17-rules-the-app-enforces.md) still applies: it can do exactly what your role allows,
no more, and **this page is Super Admin only**, so it is a super admin's role you would be lending
it.

---

## Badhan Agent

Badhan Agent — the chat with an AI assistant that works inside Badhan for you — is no longer a
super admin tool. Every member has it, at the top of the menu, and
[chapter 22](22-badhan-agent.md) describes it. It works the same for you as for anyone: it acts
with your own role, and every change waits for you to press **Approve**.

What is for super admins only — every member's chats, and the assistant's instructions — is on
**Agent Chats**, below.

---

## Agent Chats

Every member's Badhan Agent chats, for you to read — including the ones they deleted. It is
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

### Deleting a chat for good

The **bin icon**, beside a chat in the second column or at the top of an open chat, deletes it
**permanently**. You are asked first: *"Permanently delete "…" by …? It is removed from Badhan for
good and cannot be undone."* After that the chat and everything in it are gone — from this page,
from the member's own list if it was still there, and from Badhan. Only the record in App Activity
that a chat was deleted, and by whom, remains — and any backup taken before the delete
([Backup & Restore](#backup--restore)) still holds a copy, as it does of everything else.

If it was the member's last chat, the member leaves the first column too.

### Reading is recorded

**Opening a chat here is recorded in App Activity** under your name, like opening the Activity
Summary. So is every permanent delete. Listing members and chats is not.

### Token counts

Each chat shows two numbers, such as **2.4k in · 60 out**. They are how much text went to the
assistant and how much came back, in OpenAI's unit, the *token* (roughly three quarters of a
word). OpenAI charges for both, and **the organisation pays for every member's chats**. There is
no daily limit on how much anyone can use the agent — only the 20-step limit on a single message —
so these numbers are the only view of what it is costing. A chat with very large numbers is worth
a look.


### The system prompt

The **System prompt** button above the columns shows the instructions the assistant reads before
anything a member types. It is shown here and nowhere else: not on the Badhan Agent page, and not
to any member below super admin. It cannot be changed here, and it is the same for every chat and
every member.

Besides how to behave, it tells the assistant the way Badhan writes things down — for example
that blood groups and halls are stored as numbers. At its end is a short note filled in each time
the assistant is asked something: which copy of Badhan the chat is on, who is signed in, and the
current date and time in Bangladesh, so the assistant can work out things like "the last four
months". In a member's chat that note names the member; the copy shown here names you, at the
time you opened the page.

---

[← Previous: Statistics and reports](15-statistics-and-reports.md) · [Contents](README.md) · [Next: Rules the app enforces →](17-rules-the-app-enforces.md)
