# 7. The donor profile

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

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
| **Father's Name** | Cannot be left empty. Printed on the donor's certificate. |
| **Mother's Name** | Cannot be left empty. Printed on the donor's certificate. |
| **Phone** | Exactly 11 digits, numbers only. **No two donors may share a phone number** — this is how the app tells people apart. |
| **Email** | Optional. Used only for password recovery. You can edit it for a plain donor or for yourself; for another member the box is locked and says *"You cannot edit this email"*. |
| **Blood Group** | Picked from the list of eight. |
| **Student ID** | Exactly 7 digits, such as `1605011`. The first two digits are the batch, the next two are the department. If the department is genuinely unknown, use `00` for those two. |
| **Room** | Optional. |
| **Address** | Optional. |
| **Hall** | Picked from the list. Locked for volunteers and hall admins — a member's hall cannot be changed here. |
| **Public Data** | See below. |
| **Enable certificate** | Off until someone ticks it. Until then this donor has no certificate at all — see [The certificate](#the-certificate). |

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

**On a donor whose hall is (Unknown), the comment box is switched off** and reads *"Set this
donor's hall before adding a comment."* Pick one of the seven halls in the details above and it
comes back to life straight away — you do not have to save first. Only records added before
(Unknown) was withdrawn can be in this state ([chapter 4](04-roles-and-permissions.md)).

## Settings

The **Settings** section holds the actions rather than the facts. Which buttons appear depends
on your level and on whose profile you are looking at. Often the only one you will see is
**Certificate**.

| Button | What it does | Who sees it |
| --- | --- | --- |
| **Promote To Volunteer** | Makes this donor a volunteer, so they can be given a password | Hall admin of that hall, or super admin |
| **Demote To Donor** | Takes a volunteer back to donor level | Hall admin of that hall, or super admin |
| **Promote to Hall admin** | Makes a volunteer the admin of their hall | Super admin only |
| **Promote to Super Admin** | Makes a volunteer a super admin | Super admin only |
| **Demote to Volunteer** | Takes a super admin back to volunteer | Super admin only |
| **Password Recovery Link** | Creates a one-time link so this member can set a password | Hall admin of that hall, or super admin |
| **Certificate** | Opens this donor's printable certificate in a new tab — once it has been enabled for them | Everyone |
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

### The certificate

**Turn it on first.** A certificate does not exist for anyone until someone switches it on for
that donor. Open **Person Details** on their profile, tick **Enable certificate**, and tap **Save**.
Until you do, the certificate page says *"This donor's certificate has not been enabled yet."* — to you and to
anyone scanning a printed code alike. Every donor starts this way, including everyone who was
already in the app before certificates existed, so expect to tick this box the first time you
prepare a certificate for someone. Untick it and save, and the certificate stops opening again
straight away, on paper already printed as well as on screen.

Once it is on, tap **Certificate** and the certificate opens in a new tab: the donor's name,
their father's and mother's names, their department, their hall, and a **QR code**, on Badhan's
printed certificate design. Below it is a **Download PDF** button. The page is A4, sideways, and
ready to print — the button itself does not appear on the paper.

Print it, and hand it to the donor.

**The signature lines are at the bottom.** Every certificate has the three ruled signature lines —
Directorate of Students' Welfare, your unit, and BUET Zone — ready to be signed by hand once you
have printed it. Anyone who opens the certificate sees the same page, whether they are signed in or
scanning the QR code off paper.

**What the QR code is for.** Later, anyone holding that piece of paper — an employer, a
university, anyone at all — can point a phone camera at the QR code. The same certificate opens
on their screen, straight from Badhan's own website. If the names on the paper match the names on
the screen, the paper is genuine. That is the whole point of the certificate, so the QR code
matters more than anything else on it.

**Certificates printed before 16 August 2026 need reprinting.** Their QR codes were built with a
wrong address: scanning one opens Badhan's website but lands on the app's ordinary front page
instead of the certificate, so the paper cannot be verified. Nothing on those certificates is
wrong except the code. Open the donor's profile again, download the certificate fresh, print it,
and swap the paper — the new code scans correctly. Certificates downloaded from this date onward
are fine.

**If you send the certificate as a file instead of on paper, it can be clicked.** Under the QR
code is a small line reading *Click to Verify*. Whoever opens the PDF on a computer or phone can
click either that line or the QR code itself and the verification page opens — no second device
and no camera needed, which is what a code on a screen would otherwise require. On paper the line
is just a note; the code is what gets scanned.

**Check the names before you print.** The certificate reads them from the app every time it is
opened, but paper cannot be updated. If you print first and correct a spelling afterwards, the
paper and the screen will no longer match, and the certificate can no longer be verified. There
is no way to fix a certificate once it has been handed over — only to print a new one.

**The certificate is in English, so the names must be too.** If a name is written in Bangla on the
profile, it comes out blank on the certificate — on the screen and on the paper. The app does not
warn you about this. Write the names in English on the profile first, then open the certificate.

**Anyone with the link can open it, and no sign-in is needed.** That is deliberate: the person
checking the certificate has no Badhan account and no reason to get one. It is also why the
certificate shows only the names, the department and the hall — never the phone number, the blood
group, the room number, or the donation history.

**The certificate is made by Badhan's server, not by your browser.** You are shown a finished
document, the same one that downloads. Nothing about the design — the artwork, the lettering, the
layout — is ever sent to a browser, so there is nothing for anyone to copy off the page and no way
to produce a convincing forgery from what the site hands out. It also means the certificate looks
identical everywhere: the same on an old phone as on a new laptop, and the same on paper.

**Archived donors keep working.** Someone who has graduated can still have their certificate
scanned. In fact that is when it matters most.

### Deleting a person

**Delete this person** asks you to confirm, and then the record is gone. Their donations stop
counting anywhere in the app, and no page can reach them again. There is no undo.

Deleting also **permanently breaks every certificate already printed for that donor**. Scanning
the QR code on their paper will show *"This certificate was not found."* and there is no way to
restore it. Bear that in mind before deleting someone who has been given a certificate.

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
