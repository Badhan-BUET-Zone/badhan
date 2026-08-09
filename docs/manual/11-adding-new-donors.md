# 11. Adding new donors

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: Bookmarked donors](10-bookmarked-donors.md) · [Contents](README.md) · [Next: Members and promotions →](12-members-and-promotions.md)

---

There are three ways to put new people into the app: one at a time by filling a form, many at
once from a file, or from a registration a student sent in themselves. Use the form for the
person standing in front of you; use the file after a donation camp, when you have a hundred
names on a list.

The first two are under **Donor Creation** in the menu. The third starts on the **Feedback**
page: a student scans a QR code, answers a few questions on their own phone, and their answers
arrive as a card with a **Create donor** button that opens this same form already filled in.
**A registration does not create a donor by itself** — a volunteer still reviews every field and
presses Save. See [chapter 20](20-donor-feedback.md).

---

## Part 1 — Adding one donor

Open **Single Donor Creation**. Fill in the form:

| Field | What to put |
| --- | --- |
| **Name** | Required. Any text, but not blank. |
| **Phone** | Required. 11 digits. This must not already belong to another donor. |
| **Student ID** | Required. Exactly 7 digits, e.g. `1605011`. First two digits are the batch, next two the department. If the department is unknown, put `00` there. |
| **Blood Group** | Required. Pick from the list. |
| **Select Hall** | Required. Your own hall, normally. |
| **Room** | Optional. |
| **Address** | Optional. |
| **Comment** | Optional. Anything the next volunteer should know. |
| **Donation count** | How many times they have given **before** — a whole number, 0 or more. Put 0 if they have never given or you do not know. |
| **Pick Last Donation Date** | Required **only if** the donation count is more than 0. |
| **Public Data** | Tick to make this donor reachable by every hall. See [chapter 7](07-the-donor-profile.md). |

**Why the count and last date?** For someone who has been donating for years before the app
existed, this is how their history is carried over. From now on you will not type counts — you
will just record dates ([chapter 8](08-recording-donations.md)).

**The hall must be one of the seven.** "Unknown" is no longer offered — a new record has to say
where the donor lives. If what you actually wanted was a donor every hall can reach, pick their
real hall and tick **Public Data**; that is the setting "Unknown" used to switch on for you.

### The duplicate check

As soon as you finish typing a phone number, the app quietly checks whether anybody already
has it. This happens while you are still filling the form, before you save anything.

If someone does, you get a **See Duplicate** button. Tap it and that donor's profile opens in
a new window so you can compare.

Almost always the right answer is: **this is the same person, do not create a second record**.
Close the form and update the existing donor instead. A duplicate record splits one person's
donation history in two and makes both halves wrong.

If you save anyway with a number already in use, the app refuses: *"Donor found with duplicate
phone number"*.

---

## Part 2 — Uploading many donors from a file

Open **Upload CSV of Donors**. A CSV is a simple table file — Excel and Google Sheets both
save one with **File → Save as / Download → CSV**.

### Getting the format right

Tap **Download demo CSV** to get a correctly formed example file. Open it, replace the example
rows with your own, keep the first row of column names exactly as it is, and save.

The columns, in the app's own words:

| Column | Required? | What is accepted — nothing else |
| --- | --- | --- |
| `name` | yes | text, not blank |
| `phone` | yes | 11 digits, `01XXXXXXXXX` |
| `studentId` | yes | 7 digits, e.g. `1605011` |
| `bloodGroup` | yes | `A+ A- B+ B- O+ O- AB+ AB-` |
| `hall` | yes | Ahsanullah, Chatri, Nazrul, Rashid, Sher-e-Bangla, Suhrawardy, Titumir |
| `roomNumber` | no | text; leave blank and it becomes (Unknown) |
| `address` | no | text; leave blank and it becomes (Unknown) |
| `comment` | no | text; leave blank and it becomes (Unknown) |
| `donationCount` | yes | whole number 0–99 (blood donations so far) |
| `lastDonation` | only if the count is above 0 | `23/7/26` — that is day/month/year |
| `plateletDonationCount` | yes | whole number 0–99 |
| `lastPlateletDonation` | only if that count is above 0 | `23/7/26` |
| `availableToAll` | yes | `yes` or `no` |

> **Dates are day/month/year.** `7/8/26` means the 7th of August 2026, not the 8th of July.
> Spreadsheets love to reformat dates on their own — check the file after saving.

### Checking before uploading

Choose your file. **Nothing is uploaded yet.** The app reads the file, checks every row, and
sorts them into three lists:

**"N of M donors to be created."** These rows are good and nobody in the app has these phone
numbers. These are the ones that will be uploaded.

**"N of M donors already exist."** Somebody already has this phone number. These are skipped.
Each row gets a **See Donor** button so you can check the existing record — unless that donor
belongs to another hall, in which case it says *"Exists in another hall — you do not have
permission to view this donor."*

**"N of M rows have errors and were not uploaded."** Something in the row does not match the
format. The offending cells are highlighted so you can see which. There is a **Download failed
rows as CSV** button: it gives you just the broken rows, so you can fix them and upload that
smaller file rather than hunting through the original.

Read these three numbers before going further. If 90 of your 100 rows already exist, you are
probably about to re-upload a file somebody uploaded last week.

### Uploading

Tap **Upload All**. A progress bar shows how far along it is — `34 / 87`. Each row's status
updates as it goes.

**Cancel** stops the run partway. Already-uploaded donors stay; the rest are not created. The
app then tells you: *"Run cancelled — select the file again to upload the rest."* Choosing the
same file again is safe, because everyone already created will now land in the "already
exists" list.

**Stay on the page while it uploads.** Leaving partway through stops the run.

---

## Part 3 — Newly Created Donors

*Hall admins and super admins only.*

This page answers "who was added to the app recently, and by whom?"

Pick a **Start Date** and an **End Date**, then tap **Fetch Newly Created Donors**. You get
donor cards for everyone created in that window, the same cards as a search result, so you can
open any of them and check the details.

Use it to review a volunteer's first uploads, to check a camp's entries went in properly, or to
find the record somebody created yesterday and cannot now find.

---

[← Previous: Bookmarked donors](10-bookmarked-donors.md) · [Contents](README.md) · [Next: Members and promotions →](12-members-and-promotions.md)
