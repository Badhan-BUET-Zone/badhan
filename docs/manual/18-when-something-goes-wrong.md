# 18. When something goes wrong

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: Rules the app enforces](17-rules-the-app-enforces.md) · [Contents](README.md) · [Next: Glossary →](19-glossary.md)

---

Find your problem below. Most of these are not faults at all — they are the app doing what it
was told.

---

## Signing in

**"Incorrect phone / password."**
One of the two is wrong; the app will not say which. Check the phone number is the one Badhan
has for you, all 11 digits. If you are sure of the number, treat the password as forgotten —
ask a hall admin or super admin for a recovery link.

**"Please try again after 5 minutes."**
Three failed attempts in a row. Wait five minutes. Nothing is locked permanently.

**I have no account at all.**
There is no sign-up. Ask your hall admin: they must promote you to volunteer and then send you
a recovery link. Two steps, in that order.

**My recovery link does not work.**
They are one-time and short-lived. Ask for another. If a new one also fails, tell the person
who generated it — they may be sending you an old message.

**I was signed out on every device at once.**
Somebody generated a password recovery link for your account; that signs out everything.
Check with your hall admin. If nobody did, tell a super admin — that is worth looking into.

---

## Finding people

**My search returns nothing.**

Work down this list:

1. Are **Available** and **Not Available** both unticked? At least one must be ticked.
2. Did you type a **batch** that is not exactly two digits?
3. Are you searching a hall that is not yours? You cannot; pick your own, or use **Public
   Data**.
4. *Super admins:* is **Enable archive search** switched on? If so you are searching only
   archived donors. Turn it off in My Profile.
5. Is the donor **archived**? Archived donors never appear in normal searches.

**I know this donor exists but cannot open them.**
They belong to another hall and are not marked Public Data. Ask that hall's admin, or a super
admin.

**"No donor found" when opening a profile.**
Either the record was deleted, or it belongs to a hall you cannot reach.

**The details on screen are out of date.**
Nothing about donors is stored on your phone, so this is not a stale copy — someone has
changed the record since you loaded the page. Pull down or reload the page.

---

## Editing

**The boxes are grey and I cannot type.**
You are not allowed to edit this person: wrong hall, or they are at a higher level than you.
[Chapter 4](04-roles-and-permissions.md) explains who can edit whom.

**"You are not authorized to access a donor of different hall."**
Exactly that. Only a super admin, or a **Public Data** marking, gets past it.

**"You cannot modify the details of a Badhan member with higher designation."**
The person is above you. Ask someone at their level or above.

**"Donor found with duplicate phone number."**
Another donor already has that number. Search for the number — you have almost certainly found
a duplicate record of the same person.

**I saved the details but the comment did not change** *(or the other way round)*.
They are two separate **Save** buttons. Tap **Save Comment** for the comment, **Save** for
everything else.

---

## Donations

**I added a donation to the wrong donor.**
Open that donor's profile, find the date in the list, delete it. Then add it to the right
person.

**The date is wrong.**
There is no edit. Delete the wrong date, add the right one.

**"Matching donation not found" when deleting.**
Somebody already deleted it. Reload the page.

**The count looks too high.**
Look for the same date twice — the app does not prevent that. Delete the duplicate.

**The donor shows as unavailable but says they can give.**
The rest period is a guideline the app displays, not a rule it enforces. If they have given,
record the date; if they are ready to give, call them. Trust the person over the badge.

---

## Uploading a file of donors

**"N of M rows have errors and were not uploaded."**
The highlighted cells do not match the required format. Use **Download failed rows as CSV**,
fix those rows, upload the small file.

**Everything landed in "already exist".**
These donors are already in the app — most likely somebody uploaded this list before.

**The dates came out wrong.**
Dates are **day/month/year**: `7/8/26` is 7 August 2026. Spreadsheets reformat dates on their
own; check the file after saving.

**The upload stopped halfway.**
You either tapped Cancel or left the page. Whatever was uploaded is saved. Select the same
file again — everyone already created will now show as "already exists", so the rest go up
cleanly.

---

## Messages and refusals

**"Service unavailable" / "Please try again after 5 minutes."**
You did the same thing too many times in a short window. Wait a minute. Nothing was lost.

**"Please update your app."**
Update from the Play Store, or close every Badhan tab and reopen the website.

**"This feature is currently under maintenance."**
Switched off deliberately while something is fixed. It will return.

**"Account deletion is still under construction."**
That button does not work yet. Ask a hall admin or super admin to delete the record.

---

## The app itself

**A page will not load, or looks broken.**
Close it completely and open it again. The app checks for a new version each time it starts.

**A coloured badge names a version in the corner.**
You are on a test copy, not the real app. Nothing you do there is real. Go to
https://badhan-buet.web.app or open the Play Store app.

**Nothing loads at all.**
Check your connection. The app itself opens from your phone, but every piece of donor
information needs a live connection.

---

## Reporting a problem

If none of the above fits, report it — and make the report useful:

1. **What you were trying to do**, in one sentence.
2. **What you tapped**, step by step.
3. **What the app said**, word for word. A screenshot is best.
4. **Which version you are on** — open **About** and read the three rows at the bottom.
5. If a developer asks, open **Dev Console** (super admins), do the thing again, and send a
   screenshot of what appears.

The developers are listed on the **Credits** page in the menu. That page is built into the app, so
it opens even when nothing else will — useful when the problem you are reporting is that you cannot
reach the server.

---

[← Previous: Rules the app enforces](17-rules-the-app-enforces.md) · [Contents](README.md) · [Next: Glossary →](19-glossary.md)
