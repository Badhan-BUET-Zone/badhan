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

This page connects **Claude** — the assistant you type instructions to in plain English — to
Badhan's records, so it can answer questions like *"find O+ donors in Titumir who have not donated
since March"* without anyone writing code.

Claude is the only assistant this page sets up, and it offers two ways to do it. There is nothing
else to choose between.

| | **Hand Claude a setup file** | **Connect Claude once** |
| --- | --- | --- |
| For | one conversation, now | using it again and again |
| You give Claude | a file you upload | a link you paste into its settings |
| Claude works from | a written description of the records | a list of named things it can do |

The second is the better one if you expect to come back to it: setting it up is a one-off, and a
connected Claude is given named actions — search donors, log a donation, read the member chat — rather than being left to work it
out from a document, and it asks you before the ones that change something.

### Hand Claude a setup file

#### One time setup

1. On this page, press **Download Setup File**. It saves to your device as
   `badhan-api-prompt.md`. Keep it — you upload the same file every time.
2. Open **claude.ai** in your web browser and sign in.
3. Select your name at the bottom left of Claude, then **Settings**, then **Capabilities**.
4. Turn on **Code execution and file creation**, then turn on **Allow network egress**.
5. Choose the network option that allows **specific domains** — not package managers only — and
   paste the Badhan domain into **Additional allowed domains**. Save.

#### For your everyday use

1. Start a new chat in Claude.
2. Press **+** beside the message box and upload `badhan-api-prompt.md`.
3. Ask your question in plain language. If Claude asks whether it may use the Badhan domain,
   allow it.

**Step 5 of the one time setup is the one that catches people out.** Claude reads the file happily
and then cannot reach Badhan at all, which looks like the file being wrong rather than a setting
being unset. The page prints the exact domain above the button, with a **Copy Domain** button
beside it, so there is nothing to type out or mistype.

On a **Team or Enterprise** Claude plan those settings live under **Organization settings**, then
**Capabilities**, and only an owner can change them. Ask your owner for the domain to be added;
nothing else about the steps changes.

You do not need to understand what is in the file. Nothing is created until you press the
button — no sign-in exists before then.

### Connect Claude once

#### One time setup

1. On this page, press **Copy Claude Link**.
2. Open **claude.ai** in your web browser and sign in.
3. Select your name at the bottom left of Claude, then **Customize**, then **Connectors**.
4. Press **+**, then **Add custom connector**.
5. Paste the link into the URL box, name it **Badhan**, and select **Add**.
6. On the **Badhan** connector that now appears, press **Connect**.

**Step 6 is the one that catches people out.** Adding a connector is not the same as connecting to
it: until you press **Connect** that once, Claude has it listed and still cannot use it. Once
connected it stays connected.

#### For your everyday use

1. Start a new chat in Claude.
2. Ask your question in plain language. Claude asks you before anything that changes a record.

That really is the whole of it. The connector is there in every chat once you have connected it, so
there is nothing to upload, nothing to switch on, and no domain to allow — Claude reaches Badhan
from its own servers rather than from the sandbox the setup file uses.

On a **Team or Enterprise** Claude plan an owner adds the connector under **Organization
settings**, then **Connectors**; everyone else then finds it under **Customize**, then
**Connectors**, and presses **Connect** there — that press is still theirs to make.

#### The connector link *is* the password

This one is worth its own warning. A setup file obviously looks like a secret. The connector link
looks like an ordinary web link — and a link is the one kind of text everybody has been taught is
safe to pass around.

It is not. **The sign-in is inside the address itself.** Anyone you send that link to is signed in
as you until you end it. Do not put it in a group chat, in an email, or in a screenshot.

**The demo has no connection to offer.** If you are signed in to the demo, this half of the page
asks you to sign in to Badhan instead of showing the button.

### The token does not expire — you end it yourself

This holds for both halves of the page. The sign-in Claude is given is **not your own**: each press
of either button asks the server for a separate token, and your own session is untouched. But that
token has **no clock on it**: it keeps working until somebody deliberately ends it.

Every press adds one entry to the device list on your **My Profile** page, alongside the phones and
computers you have signed in from. **That entry is how you end it**: open My Profile, find it, and
press **Logout** on it. Ending one does not touch the others.

Two things about that, both worth knowing before you need them:

- **Signing out of this browser does not end it.** The ordinary Sign Out ends only the session you
  are using right now. Claude's token is a separate entry and keeps working.
- **Sign out from all devices does end it** — along with every other session you have, on every
  device.

Because there is no clock, **make the file or the link when you are ready to use it**, and end it
when you are done rather than leaving it in the list. There is no limit on how many you make.

Every entry in that list looks much the same — an operating system, a browser, an address — so if
you make several, end the ones you are unsure about and make a fresh one. That is cheap; guessing
is not.

**Nothing lasts forever regardless.** The app clears out sign-ins that are 30 days old, so a file
or a connection you forget about stops working a month after you made it. That is a backstop, not a
plan: end the ones you are done with.

If a connected Claude suddenly says it is not authorised, that is what happened — press the button
again and paste the new link over the old one.

### Read this before you send that file or link anywhere

The token **is you**, for as long as it exists. Anyone holding the file or the link can do
everything your role allows, as you, without knowing your password — read every donor, and change
or delete records.

So treat both as you would treat your password:

- **Do not email them, post them in a group chat, or put them in shared storage.**
- **Do not give them to an assistant you would not trust with your password.** Pasting one into an
  online service sends that token to that company.
- **Delete the downloaded file when you are done with it**, and end its entry in My Profile. The
  file lying about on your computer is a live sign-in, not an expired one.

**If one goes somewhere it should not have, go to My Profile and press Logout on its entry.** If you
cannot tell which entry it is, **Sign out from all devices** ends everything at once. Waiting is
not a fix here: nothing expires on its own.

Claude, either way round, is **not restricted** to reading. It can add, change and
delete real records, and the app cannot tell its actions apart from yours — the App Activity page
will show them as yours. Everything in
[chapter 17](17-rules-the-app-enforces.md) still applies: it can do exactly what your role allows,
no more, and **this page is Super Admin only**, so it is a super admin's role you would be lending
it.

---

[← Previous: Statistics and reports](15-statistics-and-reports.md) · [Contents](README.md) · [Next: Rules the app enforces →](17-rules-the-app-enforces.md)
