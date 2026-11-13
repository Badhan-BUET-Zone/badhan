# 22. Badhan Agent

> **Written for readers with no coding experience.** This manual assumes no programming or
> technical knowledge of any kind — only that you use the Badhan app.

[← Previous: Member chat](21-member-chat.md) · [Contents](README.md)

---

## What it is

**Badhan Agent** is a chat with an **AI assistant** that works inside Badhan for you. You type
what you want in plain English — *"find B+ donors in Suhrawardy hall who can donate now"* — and it
looks the records up, or makes the change you asked for, and answers in the chat.

It is in the menu as **Badhan Agent**, just under **Home**, for every member: volunteers,
hall admins and super admins. The assistant itself comes from **OpenAI**, the company behind
ChatGPT. Badhan looks after the connection to it, so there is no key to enter and nothing to set
up.

## Chatting

Type in the box at the bottom and press **Enter** to send (**Shift+Enter** starts a new line).

While the assistant works, three dots pulse at the end of the chat. Its answer then **appears
all at once**, not word by word, so a long answer can take a little while.

## Cards: what the assistant did

Everything the assistant does in Badhan shows up in the chat as a **card**. Each card names, in
plain words, what the assistant is doing — for example *"Search for donors filtered by
criteria"* — with a small label on the right saying how it went:

- **200 · 140 ms** (or another number) — Badhan answered. A **green** edge on the left means it
  answered normally; a **red** one means it refused or something went wrong.
- **needs approval** — waiting for you (see below).
- **declined** — you said no, so nothing was sent.
- **not sent** or **cancelled** — it never reached Badhan, or it was stopped.

**Tap a card** to open it and see exactly what was asked of Badhan and what came back. Tap it
again to fold it away.

## Changes wait for you

**Looking things up happens on its own.** Anything that would **add, change or delete** a record
stops and waits, with **Approve** and **Decline** under its card. Nothing is changed until you
press **Approve**. This is always the case, for every member and on every copy of the app.

The card only names what the change is, such as *"Update donor details"* — not which donor, and
not what will be written. **Tap the card first** to see exactly what it will send, then decide.

If you press **Decline**, nothing is sent, and the assistant is told you said no.

## Calling a donor from the chat

When the assistant finds donors you may want to ring — B+ donors for a request, say — it puts a
small **Call** button with the donor's name, such as **Call Rahim Uddin**, right after that
donor in its answer.

**Tap it to call.** It works exactly like **Direct call** on a donor's card
([chapter 9](09-call-records.md)): your phone's dialler opens with the number, and a call record
is written in your name, so everyone else can see the donor was just called. You will see
*"Added call record"* at the bottom of the screen. Tapping **Call** needs no **Approve**: you
pressing it is the decision.

The number always comes from Badhan's own records — from what the assistant looked up in that
chat — never from something the assistant typed. Hold the mouse over the button on a computer to
see the number first.

Sometimes there is a **See profile** button instead. That means the number could not be found in
what the assistant looked up in that chat. It opens the donor's profile, which has its own
**Direct call**; if the donor does not exist or is not yours to see, the profile says so.

The assistant gives the button rather than writing the phone number out. If you want the number
itself, ask for it.

## One message allows at most 20 steps

The assistant may need several steps to answer one message: look something up, look up something
else, then answer. **One message allows at most 20 of them.** After that the assistant stops, and
a note in the chat says so. Send another message to let it carry on.

## Stopping, and when something goes wrong

**Stop** (the square button where Send usually is) ends what the assistant is doing. Leaving the
page stops it too.

If something goes wrong — Badhan cannot reach the assistant, say — a red note appears in the chat
with **Retry**. Press it to try again from where the chat stands.

*"This chat is busy in another tab or window"* means the same chat is running in another tab or
on another device. Let that one finish, then press **Retry**.

## Your chats

Your chats are **kept by Badhan**, so they follow you: sign in on another phone or computer and
they are there. **Signing out does not delete them.**

They are listed on the left — on a phone, behind the menu button at the top left of the chat —
newest first.

- **New chat** starts another. A new chat is not saved until you send its first message, and it
  takes its title from that message.
- To **rename** a chat, edit its title at the top.
- The **bin icon** deletes a chat: it goes from your list, on every device.

## Who the assistant works as

The assistant works **as you**, with the sign-in you already have. It can do exactly what you can
do in the app, and no more: a volunteer's assistant cannot reach another hall's donors any more
than the volunteer can (see [chapter 17](17-rules-the-app-enforces.md)). There is nothing else to
sign in to, and it adds nothing to the device list on your My Profile page.

A few things are deliberately out of its reach: it cannot sign you in or out, change your
password, or make a sign-in code. Do those yourself.

## When it is not set up

*"The agent is not set up on this server yet. Ask a super admin."* means this copy of Badhan has
not been connected to OpenAI. You cannot send anything until it is. Tell a super admin.

## Read this before you use it

- **The assistant is you.** The App Activity page shows its changes as yours, and every rule in
  [chapter 17](17-rules-the-app-enforces.md) still applies.
- **What you type, and what Badhan sends back, goes to OpenAI** — including donors' names and
  phone numbers. Ask only for what you need.
- **Open the card before you press Approve**, especially on the real app.

---

[← Previous: Member chat](21-member-chat.md) · [Contents](README.md)
