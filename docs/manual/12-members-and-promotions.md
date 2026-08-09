# 12. Members and promotions

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: Adding new donors](11-adding-new-donors.md) · [Contents](README.md) · [Next: Public contacts →](13-public-contacts.md)

---

## The Members page

Open **Members** from the menu. It has two lists.

**Volunteers of your hall.** Name, batch and department for every volunteer in your hall,
**sorted by how active they have been** — the busiest first. The top three have a gold star
beside their name. Tap any row to open that person's profile.

**Hall admins of all halls.** One row per hall, showing who runs it. Useful when you need to
reach the admin of a hall that is not yours.

Everyone from volunteer upwards can see this page. It is read-only; the promoting happens on
the person's profile.

## How promotion works

Everything happens in the **Settings** section of a person's profile
([chapter 7](07-the-donor-profile.md)). Which buttons appear depends on your level.

### Making a donor into a volunteer

*Hall admins (own hall) and super admins.*

Open the donor's profile, open **Settings**, tap **Promote To Volunteer**.

That person is now a member. They still cannot sign in — being a volunteer only makes them
*eligible* for a password. The second step is to tap **Password Recovery Link** and send them
the link, which is where they choose a password ([chapter 3](03-signing-in.md)).

Two steps, in that order. Promote, then send the link.

### Taking a volunteer back to donor

*Hall admins (own hall) and super admins.*

**Demote To Donor**. They stop being a member. Their record stays exactly as it was — the
person is still in the book as a donor, with all their donations.

Do this when someone leaves Badhan or graduates. If you also want their record out of the way
of everyday searches, ask a super admin to archive it
([chapter 15](15-statistics-and-reports.md)).

### Appointing a hall admin

*Super admins only.*

**Promote to Hall admin**, on the profile of a volunteer.

> **There is only one hall admin per hall.** Appointing a new one automatically takes the
> previous hall admin of that hall back down to volunteer. This happens silently, with no
> warning and no confirmation. Tell the outgoing admin yourself.

### Appointing or removing a super admin

*Super admins only.*

**Promote to Super Admin** on a volunteer's profile. **Demote to Volunteer** on a super
admin's profile.

## The ladder

Levels are climbed one rung at a time. The app allows exactly these moves and refuses
everything else with *"Invalid designation transition"*:

```
     Donor  ⇄  Volunteer  →  Hall Admin
                  ⇅
             Super Admin
```

- Donor ⇄ Volunteer — both directions
- Volunteer → Hall Admin
- Volunteer ⇄ Super Admin — both directions
- **Hall Admin has no way down of its own.** A hall admin stops being one only when somebody
  else is appointed to that hall.

You cannot jump. To make a plain donor a hall admin, promote them to volunteer first, then to
hall admin.

## Refusals you may run into

| Message | What it means |
| --- | --- |
| *"Only a volunteer can be promoted to hall admin"* | The person is a donor or a super admin. Get them to volunteer level first. |
| *"Only a volunteer can be promoted to super admin"* | Same thing. |
| *"Only super admins can change hall admin or super admin designations"* | You are a hall admin trying to appoint hall admins or super admins. |
| *"Only hall admins or above can access this route"* | You are a volunteer. Volunteers cannot promote or demote anybody. |
| *"Donor does not have a valid hall"* | The person's hall is **Attached** or **(Unknown)**. Members must belong to one of the seven halls — set their real hall on their profile first. The same message appears if you try to change the comment on such a record. |
| *"You cannot modify the details of a Badhan member with higher designation"* | The person is above you. |
| *"You are not authorized to access a donor of different hall"* | They are not in your hall, and you are not a super admin. |

## What changes the moment someone is promoted

- **Donor → Volunteer**: they can now be given a password and sign in. They can search their
  hall, record donations, add donors, write comments.
- **Volunteer → Hall Admin**: they can now promote and demote within the hall, hand out
  recovery links, delete records, and see Newly Created Donors.
- **Hall Admin → Super Admin**: not a single step — they must pass through volunteer. Once
  there, no hall limits, plus reports, archiving, backups and public contacts.
- **Any → Donor**: they are no longer a member, and the app refuses the things members do.
  Their record and their donation history stay untouched.

---

[← Previous: Adding new donors](11-adding-new-donors.md) · [Contents](README.md) · [Next: Public contacts →](13-public-contacts.md)
