# 7. The donor profile

[← Previous: Searching for donors](06-searching-for-donors.md) · [Contents](README.md) · [Next: Recording donations →](08-recording-donations.md)

---

The profile is everything the app knows about one person. You get there by tapping **See
profile** on a donor's card, or by opening a link somebody sent you.

At the very top is the person's **name**, and beside it two buttons: a **bookmark**
([chapter 10](10-bookmarked-donors.md)) and a **share** icon that copies a link to this
profile.

## The badges

Under the name is a row of small coloured badges:

- **Donor / Volunteer / Hall Admin / Super Admin** — this person's level
- **Archived**, in orange, if the record has been set aside
- **N Blood Donations** and **N Platelet Donations**
- either **Available for Donation** in green, or **43 Days remaining** in orange

## Person Details

Tap **Person Details** to open or close this section. It holds the facts about the person.

| Field | Rules |
| --- | --- |
| **Name** | Cannot be left empty. |
| **Phone** | Exactly 11 digits, numbers only. **No two donors may share a phone number** — this is how the app tells people apart. |
| **Email** | Optional. Used only for password recovery. You can edit it for a plain donor or for yourself; for another member the box is locked and says *"You cannot edit this email"*. |
| **Blood Group** | Picked from the list of eight. |
| **Student ID** | Exactly 7 digits, such as `1605011`. The first two digits are the batch, the next two are the department. If the department is genuinely unknown, use `00` for those two. |
| **Room** | Optional. |
| **Address** | Optional. |
| **Hall** | Picked from the list. Locked for volunteers and hall admins — a member's hall cannot be changed here. |
| **Public Data** | See below. |

Change what you need, then tap **Save**. If a field is greyed out and will not accept typing,
you are not allowed to edit this person — see [chapter 4](04-roles-and-permissions.md).

> **Why the phone number matters so much.** It is the one thing that must be unique. If you
> try to save a number that already belongs to somebody else, the app refuses with *"Donor
> found with duplicate phone number"*. That usually means the person is already in the app
> under another entry — search for the number before creating anything new.

### Public Data

Tick **Public Data** and this donor becomes reachable by members of **every** hall, not just
their own. Other halls can then view the record, add comments and record donations for them —
though editing the personal details stays restricted.

Use it for donors who are not really tied to one hall, or who have said they are happy to be
called by anyone. Leave it unticked and the record stays inside its hall.

The tick is not available for donors whose hall is **(Unknown)**, because those records are
already open to everybody.

## The comment box

Below the details is a free-text **Comment** box, and under it the date it was last changed —
or *Unknown* if nobody has ever written one.

This is the shared notepad about a donor. **Everyone who can see the donor can see the
comment**, so write things that help the next volunteer, and nothing you would not want that
person to read:

- *"Prefers calls after 6pm"*
- *"Currently abroad, back in March"*
- *"Asked not to be called during exams"*

Comments are saved with their own **Save Comment** button, separate from the details above.
Saving one does not save the other.

## Settings

The **Settings** section holds the actions rather than the facts. Which buttons appear depends
on your level and on whose profile you are looking at. You may see none of them.

| Button | What it does | Who sees it |
| --- | --- | --- |
| **Promote To Volunteer** | Makes this donor a volunteer, so they can be given a password | Hall admin of that hall, or super admin |
| **Demote To Donor** | Takes a volunteer back to donor level | Hall admin of that hall, or super admin |
| **Promote to Hall admin** | Makes a volunteer the admin of their hall | Super admin only |
| **Promote to Super Admin** | Makes a volunteer a super admin | Super admin only |
| **Demote to Volunteer** | Takes a super admin back to volunteer | Super admin only |
| **Password Recovery Link** | Creates a one-time link so this member can set a password | Hall admin of that hall, or super admin |
| **Delete this person** | Removes the record entirely | Hall admin of that hall, or super admin |
| **New Password / Confirm Password** | Change your own password | Only on your own profile |

More on promoting and demoting in [chapter 12](12-members-and-promotions.md).

### The password recovery link

Tap **Password Recovery Link** and a link appears in a box, with a copy button beside it.
Send that link to the member — over WhatsApp, Messenger, however you normally reach them.
Opening it lets them set a password and signs them in.

Three things to know:

- It only works for **members**, not plain donors. For a donor the button is not shown, and
  the app would refuse anyway with *"Donor is not a volunteer/admin"*.
- **Generating a new link signs that person out of every device.** Warn them first.
- It is **short-lived and one-time**. If it stops working, make another.

### Deleting a person

**Delete this person** asks you to confirm, and then the record is gone. Their donations stop
counting anywhere in the app, and no page can reach them again. There is no undo.

The app refuses to delete anyone who is still a volunteer, hall admin or super admin: *"Donor
must be demoted for deletion"*. Demote them to donor first.

You cannot delete your own record.

> Before deleting, consider **archiving** instead ([chapter 15](15-statistics-and-reports.md)).
> Archiving hides the record from normal searches but keeps the history. Deleting throws it
> away. For someone who has simply graduated, archiving is usually the right answer.

## The right-hand column

**Add Donation.** Choose Blood or Platelet, pick the date, tap **Done**.
[Chapter 8](08-recording-donations.md).

**Blood Donations.** The last donation date, then a button to show or hide the full list.
Each entry can be deleted individually.

**Platelet Donations.** The same, for platelets.

**Call History.** Every logged call to this donor, newest first, with who made it. Each can be
deleted. [Chapter 9](09-call-records.md).

**Public Contacts.** Super admins only — this is where a member is published to the emergency
contact list. [Chapter 13](13-public-contacts.md).

## If the profile will not open

If you see **"No donor found"**, one of two things happened: the record was deleted, or it
belongs to another hall and you are not allowed to see it. A super admin can tell you which.

---

[← Previous: Searching for donors](06-searching-for-donors.md) · [Contents](README.md) · [Next: Recording donations →](08-recording-donations.md)
