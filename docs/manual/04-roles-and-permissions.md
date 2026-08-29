# 4. Roles and permissions

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: Signing in](03-signing-in.md) · [Contents](README.md) · [Next: The screen and the menu →](05-the-screen-and-the-menu.md)

---

This is the chapter people come back to. It answers one question: **who is allowed to do
what?**

## The four levels

Everyone in the app sits at one of four levels.

**Donor.** Everyone starts here. A donor is a person whose details are written in the app —
name, phone, blood group, hall. That is all it means.

> **A donor is not a user of the app.** A donor has no password and cannot sign in. The app
> will refuse outright to give a password to someone at donor level, with the message *"Donor
> is not a volunteer/admin"*. To let someone use the app, promote them to volunteer first.

**Volunteer.** A working member. Volunteers do the day-to-day job: search for donors, call
them, record donations, add new donors, write comments. A volunteer works **inside their own
hall** and cannot promote or demote anybody.

**Hall Admin.** One per hall unit. A hall admin does everything a volunteer does, plus:
promote donors of their hall to volunteer, demote volunteers back to donor, give volunteers a
password recovery link, and delete records in their hall.

**Super Admin.** Runs the whole zone. A super admin is not limited to one hall and can do
everything, including the reports, the backups and the appointment of hall admins.

## What each level can do

✅ means yes. ❌ means the app will refuse.

| | Donor | Volunteer | Hall Admin | Super Admin |
| --- | :---: | :---: | :---: | :---: |
| **Sign in at all** | ❌ | ✅ | ✅ | ✅ |
| Search for donors | ❌ | ✅ | ✅ | ✅ |
| Search halls other than their own | ❌ | ❌ | ❌ | ✅ |
| View a donor of their own hall | ❌ | ✅ | ✅ | ✅ |
| Edit a donor of their own hall | ❌ | ✅ | ✅ | ✅ |
| Edit a donor of another hall | ❌ | ❌ | ❌ | ✅ |
| Record or delete a donation | ❌ | ✅ | ✅ | ✅ |
| Write a comment on a donor | ❌ | ✅ | ✅ | ✅ |
| Log and delete call records | ❌ | ✅ | ✅ | ✅ |
| Bookmark donors | ❌ | ✅ | ✅ | ✅ |
| Add a new donor | ❌ | ✅ | ✅ | ✅ |
| Upload a file of many donors | ❌ | ✅ | ✅ | ✅ |
| See feedback from their own hall's donors | ❌ | ✅ | ✅ | ✅ |
| See feedback from another hall's donors | ❌ | ❌ | ❌ | ✅ |
| Discard a message they can see | ❌ | ✅ | ✅ | ✅ |
| Generate a registration QR code for their own hall | ❌ | ✅ | ✅ | ✅ |
| Generate a registration QR code for another hall | ❌ | ❌ | ❌ | ✅ |
| Generate an "All Halls" registration QR code | ❌ | ❌ | ❌ | ✅ |
| See "Newly Created Donors" | ❌ | ❌ | ✅ | ✅ |
| Promote a donor to volunteer | ❌ | ❌ | ✅ (own hall) | ✅ |
| Demote a volunteer to donor | ❌ | ❌ | ✅ (own hall) | ✅ |
| Give someone a password recovery link | ❌ | ❌ | ✅ (own hall) | ✅ |
| Delete a person's record | ❌ | ❌ | ✅ (own hall) | ✅ |
| Appoint a hall admin | ❌ | ❌ | ❌ | ✅ |
| Appoint or remove a super admin | ❌ | ❌ | ❌ | ✅ |
| Add or remove public emergency contacts | ❌ | ❌ | ❌ | ✅ |
| Statistics and reports | ❌ | ❌ | ❌ | ✅ |
| Archive donors | ❌ | ❌ | ❌ | ✅ |
| Backup, record checks, developer console | ❌ | ❌ | ❌ | ✅ |
| See every donor with a certificate enabled | ❌ | ❌ | ❌ | ✅ |
| Change their **own** password and details | ❌ | ✅ | ✅ | ✅ |

## The three rules behind the table

Almost every refusal in the app comes from one of these.

**1. You work in your own hall.** A volunteer or hall admin can only reach donors of their own
hall. Try to open one from another hall and the app says *"You are not authorized to access a
donor of different hall"*. A super admin is not restricted this way.

**2. You cannot touch someone above you.** You may edit people at or below your own level,
and yourself. You cannot edit someone at a higher level — the app says *"You cannot modify the
details of a Badhan member with higher designation"*. A volunteer cannot edit a hall admin,
and a hall admin cannot edit a super admin. Two members of the *same* level are not above each
other, so within one hall a volunteer may edit a fellow volunteer, and a super admin may edit
another super admin — which is how a member's father's and mother's names get filled in
without demoting them first. Deleting a donor and sending a password-reset link are stricter:
those need a level above the person you are acting on.

**3. Some records belong to everybody.** A donor can be marked **Public Data**. Those donors
can be viewed, commented on and have donations recorded by members of *any* hall. This is how
donors who are not tied to one hall — attached students, for example — stay reachable. See
[chapter 7](07-the-donor-profile.md).

## The two halls that are not halls

Besides the seven hall units, a donor's hall can be one of two special values:

**Attached** — for students not attached to any of the seven halls. These records are open to
members of every hall.

**(Unknown)** — the hall was never recorded. **New donors can no longer be given it.** The
creation form, the CSV import and the public registration page all require one of the seven
halls. Donors added before that rule keep it.

Those older records are open to members of every hall, and **anyone can edit them**, precisely
so that whoever finds out the real hall can fill it in. Two things they cannot do until
somebody does: their **comment cannot be changed**, and they **cannot be made a volunteer**.
If you meet a donor whose hall is (Unknown), setting it correctly is the favour that unlocks
the rest of their record.

## Before you delete anybody

A person must be **at donor level** before their record can be deleted. If you try to delete a
volunteer, hall admin or super admin, the app refuses with *"Donor must be demoted for
deletion"*. Demote them first, then delete.

You also cannot delete your own record.

---

[← Previous: Signing in](03-signing-in.md) · [Contents](README.md) · [Next: The screen and the menu →](05-the-screen-and-the-menu.md)
