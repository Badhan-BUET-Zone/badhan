# 8. Recording donations

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: The donor profile](07-the-donor-profile.md) · [Contents](README.md) · [Next: Call records →](09-call-records.md)

---

Writing down a donation is the single most important thing anyone does in this app. Everything
else — who shows as available, the reports, the counts — is built from these dates. A donation
that nobody records might as well not have happened.

## Two kinds of donation

**Blood** — a whole blood donation. The donor then rests for **120 days**, about four months.

**Platelet** — a platelet donation, which takes less out of the donor. The rest period is
**12 days**.

The two are counted separately, listed separately, and reported separately. If you are not
sure which one a donor gave, ask. Recording a platelet donation as blood makes the donor look
unavailable for four months when they are not.

## Recording one

You can do it from either of two places.

**From a search result.** Tap the donor's card to expand it, pick the date under **Add a
donation date**, choose **Blood** or **Platelet**, tap **Done**.

**From the profile.** In the **Add Donation** box on the right, choose Blood or Platelet, pick
the date, tap **Done**.

Both do exactly the same thing. The app confirms with *"Donation inserted successfully"* or
*"Platelet donation inserted successfully"*, the count goes up, and the donor's availability
is recalculated on the spot.

## Picking the date

Use the **date the donor actually gave**, not today's date. If someone tells you on Friday
that they donated on Tuesday, put Tuesday.

Getting this wrong shifts the whole rest period. A date three days late makes the app hold
that donor back three days longer than necessary.

## What the app will and will not stop you doing

**It does not refuse a date inside the rest period.** If a donor gave blood last month and
you record another donation today, the app accepts it without complaint. It assumes you know
something it does not. The 120-day and 12-day periods only decide how donors are *displayed*
and *filtered* — they are not a lock.

**It does not stop you recording the same date twice.** Nothing prevents two identical
entries, so the count would be wrong by one. Glance at the existing list before adding.

**It does stop you touching donors you have no business touching.** Recording a donation for
a donor of another hall is refused with *"You are not authorized to access a donor of
different hall"* — unless that donor is marked **Public Data**, in which case any hall may
record their donations.

## Seeing the history

On the profile, the **Blood Donations** section shows the most recent date, and a button
reading something like **Show 7 donations**. Tap it for the full list, newest first. The
**Platelet Donations** section works the same way.

If a donor has never given, or nobody ever wrote it down, you will see **(Unknown)**.

## Fixing a mistake

Every entry in the list has a **delete** button. Deleting asks you to confirm, then removes
that one date and recalculates the counts and the availability.

To correct a wrong date: delete the wrong one, add the right one. There is no edit.

If the delete button reports *"Matching donation not found"*, somebody else has already
removed that entry. Reload the profile and you will see the current list.

## Where the counts come from

You never type a donation count. The app counts the dates:

- **Total donations** on a search card = blood donations + platelet donations
- **Last donation** = the most recent date in the list
- **Available / days remaining** = worked out from the last date of each kind

The one exception is when a donor is **first created**. There you may type a starting count
and a last-donation date, so that a donor's history from before the app is not lost. See
[chapter 11](11-adding-new-donors.md).

---

[← Previous: The donor profile](07-the-donor-profile.md) · [Contents](README.md) · [Next: Call records →](09-call-records.md)
