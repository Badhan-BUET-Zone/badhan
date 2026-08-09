# 17. Rules the app enforces

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: Super admin tools](16-super-admin-tools.md) · [Contents](README.md) · [Next: When something goes wrong →](18-when-something-goes-wrong.md)

---

The app refuses things. Every refusal is one of the rules below, and each one exists for a
reason. This chapter collects them in one place so you can look up a message you have just
been shown.

---

## Rules about who you are

**You must be a member to sign in.** A donor has no password and cannot be given one. Asking
for a recovery link for a donor is refused with *"Donor is not a volunteer/admin"*. Promote
them to volunteer first ([chapter 12](12-members-and-promotions.md)).

**You work in your own hall.** Volunteers and hall admins can only reach donors of their own
hall. Anything else is *"You are not authorized to access a donor of different hall"*. Two
exceptions: donors marked **Public Data**, and donors whose hall is **(Unknown)** or
**Attached**. Super admins have no hall limit at all.

**You cannot touch someone above you.** *"You cannot modify the details of a Badhan member
with higher designation."* A volunteer cannot edit a hall admin; a hall admin cannot edit a
super admin. You can always edit yourself.

**Only hall admins and above can promote.** *"Only hall admins or above can access this
route."*

**Only super admins can create hall admins or super admins.** *"Only super admins can change
hall admin or super admin designations."*

**Only super admins can publish public contacts, run reports, archive donors, and open the
backup and diagnostic pages.**

---

## Rules about donor records

**A phone number belongs to exactly one donor.** This is the app's way of telling people
apart. A second record with the same number is refused with *"Donor found with duplicate phone
number"*. If you hit this, the person is already in the app — find them and update that record
instead of making a new one.

**Phone numbers are 11 digits, numbers only.** No spaces, no dashes, no country code.

**Student IDs are 7 digits, numbers only.** First two digits are the batch, next two the
department. Use `00` for the department if it is genuinely unknown.

**Names cannot be blank.**

**An email must look like an email**, if you fill one in at all. It is optional.

**You can only change the email of a plain donor, or your own.** For another member the box is
locked: *"You do not have permission to edit email address of another user."*

**A member's hall cannot be changed from their profile.** Demote them to donor first if the
hall really needs correcting.

**Members must belong to one of the seven halls.** You cannot promote somebody whose hall is
Attached or (Unknown) — *"Donor does not have a valid hall."* Set their real hall first.

**A new donor must name a hall.** (Unknown) is not offered on the creation form, is not an
accepted CSV hall, and is not one of the choices on the public registration page. Donors added
before this rule keep it and are left alone.

**A donor whose hall is (Unknown) has no comment box.** It is switched off until one of the
seven halls is chosen. Everything else about the record — searching, editing, archiving,
recording donations, call records — works as normal.

---

## Rules about promotion

**Levels are climbed one at a time.** Donor → Volunteer → Hall Admin. Anything else is
*"Invalid designation transition"*.

**Hall admin and super admin can only be reached from volunteer.** *"Only a volunteer can be
promoted to hall admin"* / *"…to super admin."*

**One hall admin per hall.** Appointing a new one demotes the previous one automatically,
without asking.

---

## Rules about deleting

**A person must be a plain donor before their record can be deleted.** *"Donor must be demoted
for deletion."*

**You cannot delete yourself.**

**Deleting is final.** There is no undo and no rubbish bin. Archiving
([chapter 15](15-statistics-and-reports.md)) is nearly always the better choice.

---

## Rules about donations

**There is no minimum gap.** The app will record a donation dated one week after the last one.
The 120-day and 12-day rest periods only decide who is *shown* as available; they never block
a date.

**There is no protection against recording the same date twice.** Check the existing list
first.

**You can record a donation for a donor of another hall only if they are marked Public
Data.**

---

## Rules about how often you can do things

The app limits how fast the same action can be repeated. This is not aimed at you personally —
it stops runaway loops and stops anybody guessing at passwords.

| Action | Limit |
| --- | --- |
| Signing in | 3 attempts every 5 minutes |
| Asking for a password recovery link | 3 per minute |
| Deleting a donor, deleting a donation | 12 per minute |
| Most other actions | 12 per minute |

When you cross a limit you get *"Please try again after 5 minutes"* or *"Service
unavailable"*. **Nothing is broken and nothing was lost.** Wait a minute and carry on.

If you keep hitting the limit during ordinary work, say so — it means a limit is set too low
for how the app is really used.

---

## Rules that apply quietly

**Everything is logged.** Every sign-in, search, edit, donation, deletion and promotion is
recorded with your name and the time. Super admins can read it
([chapter 15](15-statistics-and-reports.md)). Nothing you do in the app is anonymous.

**Comments are shared.** Anyone who can see the donor can read the comment. Write accordingly.

**Bookmarks are shared.** Everybody sees them, with your name attached
([chapter 10](10-bookmarked-donors.md)).

**Generating a password recovery link signs that person out everywhere.**

**Archive search switches itself off after 24 hours.**

**Archiving a member also demotes them to donor.**

**Every donor record carries a role.** There is no such thing as a record with no role — the
database itself refuses one now. Records old enough to have been saved without one have been
repaired to Donor, which is what the app had been showing for them all along
([chapter 4](04-roles-and-permissions.md)).

---

## Two messages from the app itself

**"Please update your app."** The version you are running is too old to be supported. If you
are on the phone app, update it from the Play Store; on the website, close every Badhan tab
and reopen it.

**"This feature is currently under maintenance."** That part of the app has been switched off
on purpose, usually while something is being fixed. It will come back. Nothing you did caused
it.

---

[← Previous: Super admin tools](16-super-admin-tools.md) · [Contents](README.md) · [Next: When something goes wrong →](18-when-something-goes-wrong.md)
