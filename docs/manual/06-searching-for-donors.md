# 6. Searching for donors

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: The screen and the menu](05-the-screen-and-the-menu.md) · [Contents](README.md) · [Next: The donor profile →](07-the-donor-profile.md)

---

**Home** is the search page, and it is where most of the work happens. On the left (or at the
top, on a phone) is a box called **Filters**. Fill in what you know, tap **Search**, and the
matching donors appear on the right.

## The filters

You do not have to fill in everything. Leave a box empty and it simply is not used.

| Filter | What it does |
| --- | --- |
| **Name of Donor** | Finds donors whose name contains what you typed. Part of a name is enough. |
| **Blood Group** | Pick one of the eight: A+, A−, B+, B−, O+, O−, AB+, AB−. |
| **Batch** | Exactly **two digits**, such as `16` or `19`. Anything else is rejected with *"Batch number must be of 2 digits"*. |
| **Address / Comment** | Searches inside the address and comment written on donors. Useful for finding, say, everyone with "hostel" in their address. |
| **Public Data** *or* **Specify hall** | Choose one. **Public Data** finds donors marked as open to every hall. **Specify hall** lets you pick a hall from the list below. |
| **Select Hall** | Only usable when **Specify hall** is chosen. A volunteer or hall admin can only pick their own hall; a super admin can pick any. |
| **Available** | Include donors who are ready to give now. |
| **Not Available** | Include donors who are still resting after a recent donation. |

**At least one of Available and Not Available must be ticked**, or the app says *"Please put
tick on at least one checkbox"*. Ticking both shows everybody.

**Reset** clears the filters and starts again.

## What "available" means

A donor is counted as **available** when both of these are true:

- their last **blood** donation was more than **120 days** ago (about four months), and
- their last **platelet** donation was more than **12 days** ago.

If either is more recent than that, the donor is **not available**, and the app shows how
many days are still to go.

> **This is a display, not a barrier.** The app never refuses to record a donation just
> because the donor was shown as unavailable. If a donor tells you they gave blood last week,
> record it — the app will accept the date and recalculate from there.

## Reading the results

At the top of the results you get **"Found 23 donors"**, then the donors themselves, split
into groups by **batch** — the first two digits of the student ID. Within each batch, donors
who have given the most times come first.

Each donor is one card. The left side of the card is a coloured block:

- **Green**, reading **Available** — ready to give now.
- **Red**, reading something like **43 days (Blood)** — still resting, and how long is left.
  If both rest periods are running, it shows the longer one.

The coloured block also shows the **blood group** and the **total number of donations**. To
the right are the **name**, **phone number** and **hall**.

Two small marks may appear beside the name:

- a **bookmark icon** — somebody has bookmarked this donor ([chapter 10](10-bookmarked-donors.md))
- an orange **Archived** tag — this record has been put aside ([chapter 15](15-statistics-and-reports.md))

## Opening a card

Tap a card and it expands to show more:

- **Department**, worked out from the student ID
- **Address** and **Room**, if they were recorded
- **Last called**, and how many times this donor was called **in the last 3 days**
- **Blood Donations** and **Platelet Donations** counts
- the **Comment**, with the date it was last changed

And three things you can do without leaving the search page:

- **See profile** — opens the donor's full profile ([chapter 7](07-the-donor-profile.md))
- **Direct call** — hands the number to your phone's dialler and logs the call
  ([chapter 9](09-call-records.md))
- **Add a donation date** — pick a date, choose **Blood** or **Platelet**, tap **Done**
  ([chapter 8](08-recording-donations.md))

The "called in the last 3 days" count is the one to look at before you dial. If it already
says 2, somebody else has been calling this person today.

## Downloading and sharing results

Two small icons sit next to the "Found N donors" line:

- **Download** — saves the results as a file you can open in Excel or Google Sheets.
- **Share** — copies a link to this exact search. Whoever opens it sees the same search run
  fresh, so the results are current rather than a snapshot.

## What you will not find

**Archived donors are left out of every ordinary search.** They are old or inactive records
that have been deliberately set aside. Only a super admin can search them, by turning on
**Enable archive search** in My Profile — and even then it switches itself off again after 24
hours. When archive search is on, the results show **only** archived donors, and a banner at
the top says *"Showing archived donors"* so you cannot mistake one list for the other.

**Volunteers and hall admins cannot search other halls.** The Select Hall list will only offer
you your own. The exception is **Public Data**, which reaches donors of every hall who have
been marked as open to all.

---

[← Previous: The screen and the menu](05-the-screen-and-the-menu.md) · [Contents](README.md) · [Next: The donor profile →](07-the-donor-profile.md)
