# 20. Donor feedback and new donor registration

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: Glossary](19-glossary.md) · [Contents](README.md)

---

## The problem this solves

Most of the donors in the database have **no account**. They cannot sign in, so the only way
they have ever been able to tell Badhan anything — that they donated last month, that their
number changed, that they moved hall — is to find a volunteer and say it out loud.

And a student who is **not in the database at all** has had no way in except through a
volunteer sitting at a laptop.

Both of those are now handled by the same thing: a public page that anyone can open, and a
**Feedback** page inside the app where whatever they sent waits for a volunteer to deal with
it by hand.

## The public page

There is one page, at one address, for the whole of Badhan:

```
https://badhan-buet.web.app/#/donor
```

A donor **needs no account and no password**. They open the page, type their **phone number**
and their **student ID**, and if the two together match one donor record, they see a small
read-only summary of their own record: name, phone, student ID, blood group, hall, how many
times they have donated blood and platelets, and the two last-donation dates.

Then they type a message and send it. That is the whole page.

**They cannot change anything from it.** There is no edit button, no save, nothing. The page
can *tell* Badhan something; it cannot *do* anything. A donor who writes "please change my
phone number" has changed nothing — they have asked a volunteer to do it.

If the phone number and student ID do not match a record, the page says one thing:
*"Information does not match. Please contact a volunteer."* It says exactly that whichever
part was wrong, on purpose, so that the page cannot be used to work out whose phone numbers
are in the database.

Both public pages are **in English**, so if you are helping a student at a desk you will
know what you are looking at.

## The Feedback page

Everything sent from the public pages lands on **Feedback** in the menu. Everyone from
volunteer upwards has it.

**Nothing tells you there is anything there.** No badge, no number beside the menu entry, no
notification, no email. This is deliberate — the app has never sent notifications — but it
means the page only works if opening it becomes a habit. **Check it at least once a day.** If
nobody checks it, donors write messages that nobody reads, and they stop writing.

The list is **oldest first**, so the message that has waited longest is at the top.

**There is no reload button.** The queue is fetched when you open the page, and again the moment
you send a message of your own from here. Anything that arrived while you were sitting on the page
shows up the next time you open it — or when you refresh the browser.

### What a row looks like

Every row in the queue — a message or a new donor submission — starts **closed**, and shows only
four things: the **name**, the **phone number**, and two buttons.

**Tap the row to open it.** A message opens to show what was written and when it was sent. A new
donor submission opens to show everything the student typed. Tap it again to close it.

The buttons are on the closed row, so you never have to open one to deal with it:

| Row | Buttons |
| --- | --- |
| A message from a donor we can find | **See profile** and **Discard** |
| A message we cannot match to a donor | **Discard** only — there is no profile to open |
| A new donor submission | **Create donor** and **Discard** |

**See profile** opens that donor's profile over the list, which is where step 2 below happens. Come
back and you are still in the same place in the queue.

If you have been using this page since it launched: the big donor card that used to fill each row is
gone, and with it the call button and the donation date box that were on it. Record the donation on
the donor's **profile** instead — **See profile** is one tap away, and it was always the right place
to do it.

### The three steps

For every card, in this order:

1. **Read it** — tap the row to open it.
2. **Do the work** — on the donor's own profile, the normal way. If they say they donated on
   12 March, open their profile and record the donation ([chapter 8](08-recording-donations.md)).
   If their number changed, change it there.
3. **Discard the message.**

### Discard does nothing by itself

**Discard deletes the message. That is all it does.** It does not add a donation. It does not
change a phone number. It does not archive anybody. It does not tell the donor anything.

Say it to yourself again, because it is the single most common misunderstanding: **discarding
a message is not the same as acting on it.** If you discard a message without doing step 2,
the donor's request is simply gone.

Discard asks you to confirm first, and then it is **permanent — it cannot be undone**. There is no
undo button, and no screen anywhere in the app shows a discarded message again. The full text is kept
in the activity log behind the scenes, so it is not gone forever — but getting it back means asking
whoever maintains the app to look in the database. Treat discard as final.

### If two people discard the same message

Nothing bad happens. The first one wins, the second is told the message has already been
resolved, and the card disappears from both screens. Two volunteers working through the queue
at the same time is fine.

### The donor gets no reply

There is no way to write back. A donor's confirmation is scanning the code again a few days
later and seeing their record updated. That is why step 2 matters.

## Sending a message about yourself

At the top of the Feedback page, beside **Print a QR poster for donors**, there is a second
collapsible panel: **Send a message about yourself**. Open it, type a message, and press **Send**.

It files the message on **your own** donor record — the one attached to the account you are signed in
with. You do not type a phone number or a student ID; they are taken from your profile.

What arrives is an ordinary message. It appears in the queue below like any other, under your own
name and number, and **somebody still has to act on it and discard it** — probably you. Sending one does
not record a donation, does not change your record, and does not notify anybody.

Two things it is genuinely useful for:

- **Checking the feature works** without printing anything or asking a donor to scan a code — for
  example after a change, or before you tell a hall the poster is live.
- **Leaving yourself a note that belongs in the queue**, so it is worked through with everything else
  rather than forgotten in a chat thread.

If the panel says your phone number and student ID could not be read from your profile, sign out and
in again. That is the only thing it needs.

## Which messages you see

The same rule as everywhere else in the app: **you see the feedback of the donors you could
already find in search.** There is no new permission to learn.

| Your role | What you see |
| --- | --- |
| Volunteer | Messages from donors of your own hall, from donors with no specific hall, and from donors marked as available to all halls |
| Hall admin | The same |
| Super admin | Everything |

Another hall's messages are not greyed out or hidden — they never reach your screen at all.

## New donor submissions

A volunteer can generate a **registration QR code** ([below](#the-registration-qr-code)).
A student scans it and answers a short set of questions on their own phone. What they send
arrives on the Feedback page as a **New donor submission** row. Closed, it shows the name and the
phone number the student typed. **Tap it to open it** and you get everything else they sent —
student ID, blood group, room, address, comment, and the donation history they reported — laid out
for reading.

That row has two buttons, on it whether it is open or closed: **Create donor** and **Discard**.

**Create donor** opens the ordinary Single Donor Creation form ([chapter
11](11-adding-new-donors.md)) **already filled in** with what the student typed.

- **Check every field before saving.** The student typed all of it and nothing has been
  verified by anybody.
- **Saving does not discard the submission.** Go back to the Feedback page afterwards and
  discard it yourself. It will sit there looking unhandled otherwise.

### What the student was and was not asked

- They answer **one question at a time on their phone**, and **nothing reaches Badhan until
  they finish**. So a student who says they filled it in, but whose card never appeared, most
  likely stopped partway through. Ask them to scan and start again.
- **The hall is a field on their phone**, and what it does depends on the code they scanned:
  - **An ordinary code** shows them the hall it was made for, **greyed out** — they can see where
    their submission is going but cannot change it. A student who scanned another hall's code
    appears in *that* hall's list. If they actually live somewhere else they may have said so in
    the comment; either way, pick the right hall yourself when you create the donor.
  - **An All Halls code** asks them to choose, and **their answer decides whose list it lands in**.
    Still check it before saving — it is the student's own claim, like everything else on the card.
- They **are** asked how many times they have donated and when. **Every number on that card is
  the student's own claim**, not a Badhan record. Treat it exactly as you would if they had
  told you at a desk: check it before saving.
- They are **not** asked for their father's and mother's names, so those two boxes arrive blank
  and the form will not save until you fill them in. There is nothing on the card to copy them
  from — ask the student, or put what you know. They are printed on the donor's certificate
  ([chapter 7](07-the-donor-profile.md)).

## Two things that will look wrong but are not

### One list, both kinds

Messages and new donor submissions **share one list**, oldest first. There is no way to filter
or separate them. After an intake event the new-donor cards will be most of what you see for a
while — the messages are further down the list, not missing.

### The list never empties itself

**Nothing ever leaves the list on its own.** A message waits until somebody discards it,
however old it is. A long list does not mean something is broken — it means the queue is not
being worked.

## A message is not proof of who sent it

The phone number and student ID on a card are **whatever the sender typed**. For a message, the
app checks that they match a real donor — but it cannot check that the person typing them *is*
that donor. Anyone who knows somebody's phone number and student ID could write a message that
appears under their name.

So: treat a message as a **claim**, not an instruction. If it matters — a donation date, a
changed number — confirm it with the donor before you change the record. This is already what
step 2 tells you to do; this is *why* it tells you to do it.

## The printed poster

This is the sheet that goes on a notice board so donors can find the public page at all.

**There is no menu entry for it.** Open the **Feedback** page and look at the top: there is a line
that says **Print a QR poster for donors**. Tap it to open it, then tap **Download PDF**. Both QR
codes live here — the poster in this panel, the registration code in one further down — because
neither is made often enough to earn a place in the menu.

Then print it and pin it up — at eye level, where somebody can hold a phone up to it.

A few things worth knowing:

- **One sheet serves everybody.** It is the same for every hall — there is no per-hall version — so
  one person can download it once and print copies for the whole zone.
- **The link on it is safe to share.** Putting it in a Facebook group or a hall WhatsApp group is a
  good thing, not a leak: the page shows nothing until somebody proves who they are with a phone
  number and a student ID.
- **Print it from the real app.** If you download it from a test copy of the app, the code points at
  the test copy, and paper on a wall cannot be recalled. If you are not sure, ask before printing a
  hundred of them.

Underneath the poster there is also the plain web address the code points at, as a link. Click it to
open the donor page in a new tab — useful for checking it works before you print anything, and for
sending the address to a hall group without printing at all. The address is the same for everyone and
is safe to share.

## The registration QR code

This is the other code — the one students scan to enter themselves into the database.

**There is no menu entry for it either.** It is the third panel on the **Feedback** page, below the
poster and below **Send a message about yourself**: a line that says **Generate a registration QR
for students**. Tap it to open it.

1. **Super admins only:** choose **which hall the code is for** from the dropdown. Everybody else
   makes codes for their own hall, and the page says so instead of offering a choice.
2. Choose **how long it should work** — one, two, four, eight or twenty-four hours.
3. Tap **Generate**.
4. The code appears, and above it a line saying in plain words when it stops working:
   *"This code stops working at 6:30 pm — valid for 4 hours."*

The sheet and the screen both say **which hall the code is for**, in words under the caption, so a
code left on a desk or found in a downloads folder can be identified without scanning it.

**Whose hall a code is for.** A volunteer or hall admin can only make one for their own hall. A
super admin can make one for **any** hall — so a hall that wants a code no longer has to find
somebody with a record there; they can ask a super admin.

**Only the seven halls are offered.** Neither **Attached** nor **(Unknown)** appears in the
dropdown, and a code cannot be made for either. Those two describe a *record* — a donor whose hall
was never written down — not a place with students in it to scan a code.

The same seven are the only choices the **student** gets under an All Halls code. Registering
creates a donor, and a new donor must name a hall, so **(Unknown)** is not an answer they can
give.

**Making a code is recorded.** Who made it, for which hall, and for how long — a super admin can
look it up afterwards if a question ever comes up about where a batch of submissions came from.

### The "All Halls" option

The dropdown has one option that is not a hall: **All Halls**. It is for events where students from
several halls are in one room — a joint orientation, a campus-wide drive — and only a super admin
can make one.

Under an ordinary code, the student is **shown** their hall and cannot change it. Under an All Halls
code, the student is **asked** which hall they are in, and **their answer decides whose list the
submission lands in**.

Two things follow from that:

- **A student who picks the wrong hall lands in the wrong list.** That is not a disaster — whoever
  creates the donor picks the hall on the creation form anyway, exactly as they would correct a
  misspelled name. But it is a reason to prefer a hall's own code when the event belongs to one hall.
- **Use the named code by default.** All Halls exists for the rooms where a single hall's code would
  be wrong; it is not the better version of the same thing.

**It cannot be cancelled.** Once generated, it works until it expires — there is no button to switch
it off, and no list of active codes. So pick a duration that matches the event: four hours for an
afternoon at a desk, not twenty-four because it is the largest number.

Once a code is generated, the page also shows its web address as a link. Click it to open the
registration page yourself and check it works before an event starts.

**Be careful with that address.** Unlike the poster's link, this one has the code built into it —
anybody you send it to can register donors into the code's hall until it expires, exactly as if you
had shown them the QR. Send it only where you would be willing to hold the code up.

### At a new-intake event

This is the case the whole feature exists for, and it is worth setting up properly.

Put the code **on a slide** at orientation and let the whole room scan it at once. That is the
difference between one volunteer typing a hundred names into a laptop and a hundred students
entering themselves in ten minutes.

- Use the **Full screen** button. It fills the screen with just the code on white — no menu, no
  form, nothing competing for the projector's pixels.
- Pick a duration that covers the whole session, with a little to spare.
- The room will be lit, and a projector washes out contrast, so give the code the biggest slide you
  can and check from the back row before the students arrive.

There is also a **Download PDF** button for events where a printed copy is easier. Remember that
**a printed registration code still expires** — the duration you chose is baked into it, so a sheet
printed for a four-hour event is waste paper the next morning.

### If you are standing at the desk

A student will be looking at their phone for a while, because the form asks **one question per
screen** and they can go back and change an answer. "It is still asking me things" means it is
working, not stuck. Nothing reaches Badhan until they get to the end and press Submit.

## Cards with no donor attached

Sometimes a row is named **Unknown donor**. Open it and it says **no donor record matches this phone
number and student ID**. That happens when the donor was deleted after writing, or when the details
never matched anybody in the first place. Such a row has no **See profile** button, because there is
no profile.

There is nothing to act on. Read it, and discard it.

---

[← Previous: Glossary](19-glossary.md) · [Contents](README.md)
