# 15. Statistics and reports

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: My profile and devices](14-my-profile-and-devices.md) · [Contents](README.md) · [Next: Super admin tools →](16-super-admin-tools.md)

---

*Everything in this chapter is for super admins only. If you are a volunteer or hall admin,
none of these entries appear in your menu.*

Four entries under **Super Admin** in the menu: **Donation Report**, **All Donors**,
**Archived Donors** and **App Activity**. They used to be four tabs of a single Statistics
page; they are four ordinary pages now, each reached straight from the menu.

---

## Donation Report

Three parts.

### Activity Summary

Five running totals for the whole zone, from the beginning:

- registered donor count
- whole blood donations recorded
- whole blood donations recorded **through the app**
- platelet donations recorded
- volunteer count

The difference between "recorded" and "recorded through the app" is worth understanding: the
first includes historical counts typed in when donors were first created, the second counts
only the donations that were entered as they happened. The second number is the honest
measure of how much the app is actually being used.

### The monthly chart

A bar per month of donations recorded. This same chart appears on the sign-in screen, so it is
the first thing anyone sees.

### A report between two dates

Pick a **Start Date** and an **End Date**, tap **Generate Report**. You get, for that window:

- **Total Donations by Hall** — a bar chart, one bar per hall
- **Total Donations by Blood Group** — a bar chart, one bar per group
- a **hall picker**, and then two tables for the hall you chose:
  - **Whole Blood Donations** — a row per month, a column per blood group, plus a total
  - **Platelet Donations** — the same, for platelets
- **Count of Donors who Donated for the First Time** in that window

**The numbers in the tables are clickable.** Tap any count that is not zero and a small panel
lists the actual donors behind it, with their blood group and the date they gave. Tap a name
to open that donor's profile.

That is the feature to reach for when a number looks wrong. Instead of wondering why March
shows 14 B+ donations, tap the 14 and read the fourteen names.

---

## App Activity

Every action anybody has taken in the app, grouped by day.

At the top is a small line chart of how busy each day was. Below it, one card per date
showing:

- **Activity count** — how many actions were taken that day
- **Active user count** — how many different people took them

Tap **Details** on a date and it breaks down per person: who did what, that day.

Use it to see whether a hall has gone quiet, to check who has been active before promoting
someone, or to work out what happened to a record that changed unexpectedly.

> **Everything is logged, by everybody, including you.** Every sign-in, search, edit, donation
> and deletion is recorded with the name of the person who did it. This is not surveillance so
> much as bookkeeping — but it does mean nothing in this app is anonymous.

---

## All Donors and Archived Donors

Two menu entries, the same table, opposite halves of the record book.

**All Donors** lists every donor who is not archived. **Archived Donors** lists the archived
ones. Columns: name, hall, student ID, level, and an activity count. Tap a row to open that
donor's profile.

If either list is empty you get *"No donors"* or *"No archived donors"*.

---

## Archiving

Archiving is how the app forgets someone without losing them. An archived donor:

- is **left out of every ordinary search**
- keeps their entire record and donation history
- can still be reached from Bookmarked Donors, from a direct link, and from the Archived
  Donors page
- is clearly marked with an orange **Archived** tag wherever they do appear

Use it for donors who have graduated, moved away, or asked not to be contacted. It is almost
always the right choice where deleting feels tempting — deleting throws the history away, and
that history is the organisation's record of blood actually given.

### Archiving one donor

Open their profile. In **Person Details** there is an **Archived** switch, visible only to
super admins. Turn it on and **Save**.

> **If the person is a volunteer or a hall admin, archiving them also demotes them to plain
> donor when you save.** The hint under the switch warns you. It happens without a separate
> confirmation.

### Archiving many at once

Run a search on the Home page. Below the results, super admins get a button reading **Archive
these donors?** — it archives **everyone in the current result list**.

Three things to be careful about:

- **It acts on the whole result list, not on a selection.** There are no tick boxes. Whatever
  the search returned is what gets archived. Check the "Found N donors" count first.
- **Above 200 donors the button is disabled**, with the hint *"Narrow your search to 200
  donors or fewer to archive in bulk"*.
- Progress is shown as it runs — *"Archiving 34 / 87…"*. Stay on the page.

### Unarchiving

Turn on **Enable archive search** in My Profile, run a search — you now get archived donors
only, with a banner saying so — and the same button now reads **Unarchive these donors?**. Or
turn the switch off on a single profile.

**Archive search turns itself off after 24 hours.** That is deliberate: leaving it on would
mean your ordinary searches silently stop returning live donors. If your searches suddenly
return nothing familiar, check whether this switch is on.

---

[← Previous: My profile and devices](14-my-profile-and-devices.md) · [Contents](README.md) · [Next: Super admin tools →](16-super-admin-tools.md)
