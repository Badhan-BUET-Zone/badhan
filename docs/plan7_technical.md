# প্ল্যান ৭: ডোনার অ্যাকাউন্ট ও PendingDonation

## উদ্দেশ্য

আজ পর্যন্ত Badhan-এ লগইন করতে পারে কেবল ভলান্টিয়ার বা তার উপরের র‍্যাঙ্কের সদস্যরা। এই প্ল্যান
সাধারণ ডোনারকে — যিনি ভলান্টিয়ার নন — নিজের অ্যাকাউন্ট দেয়। এর দুটো অংশ:

1. **ডোনার অ্যাকাউন্ট** — `designation = 0` (`DESIGNATIONS_INDEX.DONOR`) ধারী একজন ডোনার
   পাসওয়ার্ড দিয়ে লগইন করে **কেবল নিজের** তথ্য সম্পাদনা করতে পারবেন। অন্য কারও ডোনার রেকর্ড
   তিনি দেখতেও পারবেন না, সম্পাদনাও করতে পারবেন না।
2. **PendingDonation** — ডোনার নিজে তাঁর রক্তদানের তারিখ জমা দিতে পারবেন। এটি সরাসরি
   `donations` কালেকশনে যাবে না; আলাদা `pendingdonations` কালেকশনে জমা থাকবে, এবং একজন
   ভলান্টিয়ার বা তার উপরের কেউ **অনুমোদন** (→ আসল `Donation` হয়ে যাবে) বা **বাতিল**
   (→ সম্পূর্ণ মুছে যাবে) করবেন।

সারফেসগুলো:

| সারফেস | কে দেখবে | কী |
| --- | --- | --- |
| ডোনার নিজস্ব প্রোফাইল পেজ (`/myDonorProfile`) | designation 0 | নিজের [PersonDetails.vue](../badhan-frontend/src/components/PersonDetails.vue), সম্পাদনাযোগ্য |
| Members / Public Contacts / Credits / About | designation 0 সহ সবাই | অপরিবর্তিত, শুধু গার্ডের designation থ্রেশহোল্ড নামানো |
| ডোনার প্রোফাইলে "অপেক্ষমাণ রক্তদান" সেকশন | ডোনার নিজে + যে র‍্যাঙ্কধারী ঐ ডোনারকে দেখতে পান | তালিকা; ডোনারের জন্য "যোগ করুন"/"প্রত্যাহার", র‍্যাঙ্কধারীর জন্য "অনুমোদন"/"বাতিল" |
| নতুন সাইডবার পেজ **Pending Donations** (`/pendingDonations`) | designation ≥ 1 | নিজের পারমিশন-স্কোপের সব অপেক্ষমাণ রক্তদানের সারি, প্রতিটিতে অনুমোদন/বাতিল বোতাম |

**কোনো নতুন designation যোগ হচ্ছে না।** `designations[0] === 'Donor'` আগে থেকেই আছে
([constants/index.ts](../badhan-backend/src/constants/index.ts)), প্রতিটি ডোনার রেকর্ডের
ডিফল্ট `designation` আগে থেকেই `0`। নতুন যেটা, সেটা হলো এমন একটি রেকর্ডে `password` বসতে
পারে এবং সেই রেকর্ড দিয়ে লগইন করা যাবে।

---

## ১. সিদ্ধান্তসমূহ

অনুরোধটির যে পাঠ এই প্ল্যান বাস্তবায়ন করছে, তার প্রতিটি সিদ্ধান্ত এখানে লেখা — পরে কোনো
অনুচ্ছেদে নিঃশব্দে ধরে নেওয়া হয়নি।

**S1 — অ্যাকাউন্ট থাকা মানে `password` সেট থাকা, আর কিছু নয়।**
ডেটাবেসে আজ হাজার হাজার `designation: 0` ডোনার আছেন যাঁদের `password` নেই। তাঁদের জন্য
কিছুই বদলাচ্ছে না — `POST /users/signin` আগে থেকেই `bcrypt.compare` ব্যর্থ হলে ৪০১ দেয়।
`IDonor.password` অপশনাল, তাই স্কিমা মাইগ্রেশনও লাগছে না। "ডোনার অ্যাকাউন্ট" একটি
**অবস্থা**, আলাদা কোনো ডকুমেন্ট বা কালেকশন নয়।

**S2 — পাবলিক রেজিস্ট্রেশন এই প্ল্যানে নেই।**
ডোনার পাসওয়ার্ড পাবেন বিদ্যমান পথেই: একজন ভলান্টিয়ার `POST /donors/password` দিয়ে রিকভারি
লিংক বানিয়ে দেবেন, ডোনার [PasswordReset.vue](../badhan-frontend/src/views/PasswordReset.vue)
পেজে পাসওয়ার্ড বসাবেন। নিজে থেকে সাইন-আপ করার কোনো রুট যোগ হচ্ছে না। এতে "কে ডোনার
অ্যাকাউন্ট পাবেন" সিদ্ধান্তটা মানুষের হাতেই থাকে।

**S3 — ব্যাকএন্ড আজই ডোনারকে লগইন করতে দেয়; আটকায় ফ্রন্টএন্ড।**
[router/index.ts](../badhan-frontend/src/router/index.ts)-এ প্রায় প্রতিটি রুটের
`meta.designation` হয় `1`। গার্ড বলে: `meta.designation > getDesignation` হলে `/home`-এ
পাঠাও — কিন্তু `/home` নিজেই `designation: 1`। ফলে designation 0 ব্যবহারকারী **রিডাইরেক্ট
লুপে** পড়েন। তাই গার্ডকে designation-সচেতন ল্যান্ডিং পাথ দিতে হবে (§৭.১)। এটা এই ফিচারের
সবচেয়ে সহজে চোখ এড়ানো বাগ।

**S4 — ডোনারের সম্পাদনার অনুমতি "শুধু নিজের রেকর্ড" — ফিল্ড-লেভেল ফিল্টার নয়।**
অনুরোধে তালিকাভুক্ত সম্পাদনাযোগ্য ফিল্ডগুলো (`phone`, `password`, `studentId`,
`bloodGroup`, `hall`, `address`, `roomNumber`, `name`, `comment`, `availableToAll`,
`archiveFlag`, `email`) ইতিমধ্যেই ঠিক তিনটি রুটের বডির সমষ্টি:

| ফিল্ড | রুট |
| --- | --- |
| `name`, `phone`, `studentId`, `bloodGroup`, `hall`, `roomNumber`, `address`, `availableToAll`, `archiveFlag`, `email` | `PATCH /donors/v2` |
| `comment` | `PATCH /donors/comment` |
| `password` | `PATCH /users/password` |

`PATCH /donors/v2`-এর বডিতে `designation` নেই, `donorId` ছাড়া অন্য কারও দিকে ইশারা করার
উপায় নেই। তাই designation 0-এর জন্য **একটিমাত্র গেট** — "`donorId` তোমার নিজের `_id` কি?"
— পুরো নিয়মটা প্রয়োগ করে ফেলে। আলাদা করে ফিল্ড হোয়াইটলিস্ট লেখার দরকার নেই, এবং লিখলে
বরং ভবিষ্যতে বডি বদলালে দুই জায়গায় ড্রিফট হবে।

`PATCH /users/password` আজই কেবল `res.locals.middlewareResponse.donor`-এর উপর কাজ করে —
অর্থাৎ স্বভাবতই self-only। ওখানে কিছু বদলাচ্ছে না।

**S5 — `PATCH /donors/comment`-এও একই self-only গেট বসছে।**
আজ ঐ রুটে শুধু hall-পারমিশন আছে; designation 0 ব্যবহারকারী `availableToAll: true` অন্য
যেকোনো ডোনারের কমেন্ট বদলে দিতে পারতেন। নতুন গেট ছাড়া ডোনার অ্যাকাউন্ট চালু করা মানেই
এই ছিদ্র খুলে দেওয়া।

**S6 — ডোনার নিজের `hall`, `bloodGroup`, `phone`, `studentId` বদলাতে পারবেন।**
অনুরোধে এগুলো স্পষ্ট করে অনুমোদিত তালিকায় আছে, তাই এখানে অতিরিক্ত সীমা বসানো হচ্ছে না।
পরিণতিটা লিখে রাখা দরকার: একজন ডোনার নিজের হল বদলে ফেললে তিনি অন্য হল-অ্যাডমিনের স্কোপে
চলে যান, এবং আগের হলের ভলান্টিয়ার তাঁকে আর দেখেন না। এটা স্বীকৃত আচরণ, বাগ নয় — তবে
`PATCH DONORS` লগ এন্ট্রি (আগে থেকেই পুরো `target` ডকুমেন্ট রাখে) দিয়ে ট্রেস করা যাবে।

**S7 — নিজেকে আর্কাইভ করলে অ্যাকাউন্ট বন্ধ হয় না।**
`archiveFlag` সার্চ-স্পেসের পার্টিশন ([plan6.md](plan6.md) দ্রষ্টব্য), অ্যাকাউন্ট ডিজেবল করার
সুইচ নয়। আর্কাইভড ডোনার লগইন করতে পারবেন, নিজের প্রোফাইল দেখবেন, PendingDonation জমাও দিতে
পারবেন। `PATCH /donors/v2`-এর আর্কাইভ-ডিমোশন ব্লকটি designation 0-এর জন্য এমনিতেই no-op।

**S8 — PendingDonation আলাদা কালেকশন, কোনো `status` ফিল্ড নেই।**
`pendingdonations`-এ থাকা মানেই "অপেক্ষমাণ"। অনুমোদিত হলে সারিটি `donations`-এ যায় এবং
এখান থেকে **মুছে** যায়; বাতিল হলে শুধু মুছে যায়। ফলে কিউয়ের সাইজ = কালেকশনের সাইজ, কোনো
`$match: {status: 'PENDING'}` লাগে না, আর `Donation` কালেকশনে কখনো অনুমোদনহীন সারি ঢোকে না।
"বাতিল হলে সম্পূর্ণ মুছে যাবে" — অনুরোধ অনুযায়ী কোনো টম্বস্টোন রাখা হচ্ছে না; ইতিহাস থাকে
কেবল `Log`-এ (§৯)।

**S9 — শুধু whole blood, তাই কোনো `type` ফিল্ড নেই।**
প্লেটলেট দানের জন্য PendingDonation নেই। ভবিষ্যতে দরকার হলে
[PlateletDonation.ts](../badhan-backend/src/db/models/PlateletDonation.ts)-এর মতো আরেকটি
সিবলিং কালেকশন হবে — আজকের মডেলে `type` এনাম বসিয়ে রাখা হচ্ছে না, কারণ সেটা এমন একটা
ভবিষ্যৎ ধরে নেওয়া যা এখনো চাওয়া হয়নি।

**S10 — জমা দিতে পারেন কেবল designation 0।**
ভলান্টিয়ার ও তার উপরের কারও জন্য `POST /pending-donations` ৪০৩ দেবে — তাঁদের জন্য
`POST /donations` আগে থেকেই আছে, এবং তাঁদের নিজের রক্তদান নিজেরাই অনুমোদন করতে পারা মানে
রিভিউ ধাপটার কোনো মানে থাকে না।

**S11 — ডোনার যত খুশি PendingDonation জমা দিতে পারবেন, তবে হুবহু ডুপ্লিকেট নয়।**
সংখ্যার কোনো সিলিং নেই (অনুরোধ অনুযায়ী)। তবে `(donorId, date)` জোড়ায় ইউনিক ইনডেক্স
থাকবে — একই তারিখ দ্বিতীয়বার দিলে ৪০৯। বারবার বোতাম চাপা ছাড়া এতে কোনো বৈধ ব্যবহার
আটকায় না, আর রিভিউ কিউ একই সারির পুনরাবৃত্তিতে ভরে যায় না। এর সঙ্গে
`pendingDonationLimiter` (১২/মিনিট, বিদ্যমান `commonLimiter`-এর অনুরূপ) থাকবে।

**S12 — কে অনুমোদন করতে পারবেন, তা ডোনার-দৃশ্যমানতার প্রেডিকেটেই নির্ধারিত।**
অনুরোধের ভাষা: "If a ranked member can see and edit the donor, he/she can definitely see the
donor's pending donations." অর্থাৎ নতুন কোনো পারমিশন ধারণা নেই — বিদ্যমান প্রেডিকেটটাই
পুনর্ব্যবহার:

```
targetDonor.availableToAll
  || !isHallRestricted(targetDonor.hall)
  || user.hall === targetDonor.hall
  || user.designation === DESIGNATIONS_INDEX.SUPER_ADMIN
```

এই শর্তটি আজ [DonorsController.ts](../badhan-backend/src/tsoaControllers/DonorsController.ts),
[DonationsController.ts](../badhan-backend/src/tsoaControllers/DonationsController.ts),
[PlateletDonationsController.ts](../badhan-backend/src/tsoaControllers/PlateletDonationsController.ts),
[CallRecordsController.ts](../badhan-backend/src/tsoaControllers/CallRecordsController.ts) —
সব জায়গায় হাতে-কপি করা। এই প্ল্যানে সেটা একবার
`utils/permissions.ts → canAccessDonor(user, targetDonor): boolean` হিসেবে বের করে আনা হবে
এবং নতুন কন্ট্রোলার সেটাই ডাকবে (§৪.১)। পুরোনো কল-সাইটগুলো একই হেল্পারে বদলানো হবে
আলাদা, আচরণ-নিরপেক্ষ কমিটে (Phase 0)।

**S13 — অনুমোদন অ্যাটমিক নয়, এবং সেটা ইচ্ছাকৃত: আগে insert, পরে delete।**
`Donation` ঢোকানোর পর PendingDonation মোছা হবে। মাঝপথে ক্র্যাশ করলে সবচেয়ে খারাপ যা হয় —
একটি সারি কিউয়ে থেকে যায় ও দ্বিতীয়বার রিভিউ হয় (তখন `(donorId, date)` মিলে যাওয়ায়
দ্বিতীয় `Donation`-টি ডুপ্লিকেট হবে, §৩.২-এর গার্ড সেটাও ধরবে)। উল্টো ক্রমে করলে খারাপটা
হতো — রক্তদানের রেকর্ড হারিয়ে যেত। docker-compose-এর mongo একক নোড, রেপ্লিকা সেট নয়, তাই
মাল্টি-ডকুমেন্ট ট্রানজ্যাকশন এখানে ব্যবহারযোগ্য নয়; এই ক্রম-নির্ভর নকশাই তার জায়গা নিচ্ছে।

**S14 — ডোনার নিজের অপেক্ষমাণ অনুরোধ প্রত্যাহার করতে পারবেন।**
অনুরোধে সরাসরি বলা নেই, তাই সিদ্ধান্ত হিসেবে লিখে রাখা হলো: এটি এখনো অনুমোদিত নয় এমন
নিজের জমা দেওয়া অনুরোধ, ভুল তারিখ দিলে ফেরানোর পথ থাকা উচিত। বাস্তবায়ন — `DELETE
/pending-donations/{id}` মালিক (designation 0, নিজের সারি) অথবা রিভিউয়ার (designation ≥ 1,
স্কোপের ভেতর) দুজনকেই অনুমতি দেবে; লগে দুটো আলাদা অ্যাকশন নাম বসবে। এই আচরণ বাদ দিতে
চাইলে শুধু মালিকের শাখাটি সরালেই হবে।

**S15 — ডোনার প্রোফাইলের অপেক্ষমাণ তালিকা `GET /donors`-এর অ্যাগ্রিগেশনে ঢুকবে, আলাদা কল নয়।**
[DonorsController.ts](../badhan-backend/src/tsoaControllers/DonorsController.ts)-এর
`getDonor` ইতিমধ্যেই `donations`, `plateletdonations`, `callrecords`, `publiccontacts`,
`activedonors` — পাঁচটি `$lookup` করে। ষষ্ঠ একটি `pendingdonations` লুকআপ যোগ করলে ডিটেইল
পেজ কোনো বাড়তি রাউন্ড-ট্রিপ ছাড়াই তালিকাটা পায়, এবং দৃশ্যমানতার গেট এমনিতেই ঐ রুটে বসানো।

**S16 — Pending Donations পেজ ডোনার দেখবেন না।**
রুটের `meta.designation = 1` এবং [AppBar.vue](../badhan-frontend/src/components/AppShell/AppBar.vue)
এন্ট্রির `designation: 1` — দুই স্তরেই। সার্ভার-সাইডে `GET /pending-donations` designation 0-কে
৪০৩ দেবে, অর্থাৎ ইউআই লুকানো একমাত্র প্রতিরক্ষা নয়।

---

## ২. যা বদলাচ্ছে না

সীমা স্পষ্ট করা দরকার, কারণ ডোনার অ্যাকাউন্ট প্রায় প্রতিটি রুটকে ছুঁতে পারত:

- `GET /search/v3` — designation 0 অ্যাক্সেস পাবে না (§৭.২-এর গার্ড ও নিচের সার্ভার-সাইড চেক)।
- `GET /donors?donorId=...` — অন্য কারও `donorId` দিলে designation 0 ৪০৩ পাবে (§৪.৩)।
- `POST /donors`, `DELETE /donors`, `PATCH /donors/designation`, ActiveDonors, CallRecords,
  Logs, Statistics, Backup — সবগুলোতে designation 0-এর জন্য ৪০৩।
- `GET /donors/designation` (Members পেজের ব্যাকিং রুট) আজই কেবল `handleAuthentication`
  চায়, তাই designation 0-এর জন্য ইতিমধ্যেই কাজ করে — কিছু বদলাচ্ছে না।
- `GET /publicContacts`, Credits, About — অপরিবর্তিত।

---

## ৩. ডেটা মডেল

### ৩.১ নতুন মডেল: `PendingDonation`

নতুন ফাইল `badhan-backend/src/db/models/PendingDonation.ts`,
[Donation.ts](../badhan-backend/src/db/models/Donation.ts)-এর হুবহু আকৃতি অনুসরণ করে, শুধু
একটি বাড়তি ফিল্ড:

```ts
export interface IPendingDonation extends Document {
  phone: number,
  donorId: Types.ObjectId,
  date: number,        // ডোনার যে তারিখে রক্ত দিয়েছেন বলে দাবি করছেন
  requestedAt: number  // সার্ভার-টাইমস্ট্যাম্প: কিউ এই ক্রমে সাজানো হয়
}
```

- `phone`, `donorId`, `date` — `Donation`-এর ভ্যালিডেটরসহ হুবহু অনুলিপি
  (`checkNumber('date')`, `checkTimeStamp('date')`)।
- `requestedAt` — `default: () => Date.now()`, `required: true`। ডোনার এটা পাঠাতে পারবেন না;
  কন্ট্রোলার সার্ভার-ঘড়ি থেকে বসাবে।
- মডেল নাম `'PendingDonations'` (বিদ্যমান `'Donations'` / `'PlateletDonations'`-এর সঙ্গে
  সঙ্গতিপূর্ণ), কালেকশন `pendingdonations`।

ইনডেক্স:

```ts
pendingDonationSchema.index({ donorId: 1, date: 1 }, { unique: true })  // S11
pendingDonationSchema.index({ requestedAt: 1 })                         // কিউ সর্ট
```

[syncIndexes.ts](../badhan-backend/src/db/syncIndexes.ts) `models/` ডিরেক্টরি রিকার্সিভলি
পড়ে, তাই নতুন ফাইলটি রেজিস্টার করতে আলাদা কোনো তালিকা সম্পাদনা লাগবে না — বুটেই ইনডেক্স
তৈরি হয়ে যাবে। **কোনো ডেটা মাইগ্রেশন লাগছে না** (নতুন কালেকশন খালি শুরু হয়);
`scripts/migrations/files/` এ নতুন ফাইল যোগ হচ্ছে না।

### ৩.২ ডোনার মুছলে ক্যাসকেড

[Donor.ts](../badhan-backend/src/db/models/Donor.ts)-এর `post('findOneAndDelete')` হুকে
এক লাইন যোগ:

```ts
await PendingDonationModel.deleteMany({ donorId: donor._id })
```

এটা বাদ পড়লে ডোনার মুছে যাওয়ার পরও কিউয়ে অনাথ সারি থেকে যাবে এবং Pending Donations পেজের
`$lookup` খালি ডোনার নিয়ে ক্র্যাশ/ফাঁকা সারি দেখাবে। একই কারণে
[reportInconsistencies.ts](../badhan-backend/src/db/test/reportInconsistencies.ts)-এ
অনাথ `pendingdonations` সারির জন্য একটি চেক যোগ হবে।

### ৩.৩ অনুমোদনের ডুপ্লিকেট গার্ড

অনুমোদনের সময় `donations`-এ একই `(donorId, date)` আগে থেকেই আছে কি না দেখা হবে। থাকলে
নতুন `Donation` ঢোকানো হবে না, PendingDonation-টি শুধু মুছে যাবে, এবং রেসপন্সে
`alreadyRecorded: true` ফিরবে — দুইজন ভলান্টিয়ার একই সারি প্রায় একসঙ্গে অনুমোদন করলে
ডোনারের প্রোফাইলে ডুপ্লিকেট রক্তদান বসে যাওয়া ঠেকাতে।

---

## ৪. ব্যাকএন্ড: পারমিশন

### ৪.১ শেয়ার্ড হেল্পার (Phase 0, আচরণ-নিরপেক্ষ)

নতুন ফাইল `badhan-backend/src/utils/permissions.ts`:

```ts
export const canAccessDonor = (user: IDonor, target: IDonor): boolean =>
  target.availableToAll ||
  !isHallRestricted(target.hall) ||
  user.hall === target.hall ||
  user.designation === DESIGNATIONS_INDEX.SUPER_ADMIN

export const isSelf = (user: IDonor, target: IDonor): boolean =>
  user._id.equals(target._id)
```

`middlewares/authenticate.ts`-এর `handleHallPermissionOrCheckAvailableToAll`ও এই হেল্পার
ডাকবে, যাতে মিডলওয়্যার-পথ আর কন্ট্রোলার-পথ কখনো আলাদা উত্তর না দেয়।

### ৪.২ `PATCH /donors/v2` — নতুন গেট

[DonorsController.ts:584](../badhan-backend/src/tsoaControllers/DonorsController.ts#L584),
`target` লোড করার **ঠিক পরে**, hall-পারমিশন চেকের আগে:

```ts
// designation 0 = ডোনার অ্যাকাউন্ট। তিনি কেবল নিজের রেকর্ড সম্পাদনা করতে পারেন।
// বডিতে designation নেই, তাই self-only গেটই সম্পূর্ণ নিয়ম — আলাদা ফিল্ড হোয়াইটলিস্ট লাগে না।
if (user.designation === DESIGNATIONS_INDEX.DONOR && !isSelf(user, target)) {
  this.setStatus(HTTP_STATUS.FORBIDDEN)
  return { status: 'ERROR', statusCode: HTTP_STATUS.FORBIDDEN,
           message: 'You can only edit your own information' }
}
```

গেটটি **প্রথমে** বসছে ইচ্ছাকৃতভাবে: এর নিচের `user.designation < target.designation` চেকটি
designation 0 বনাম designation 0-এর ক্ষেত্রে পাস করে যায়, তাই সেটাকে এই কাজের জন্য ভরসা করা
যায় না।

### ৪.৩ একই গেট যেসব রুটে বসছে

| রুট | গেট |
| --- | --- |
| `PATCH /donors/comment` | designation 0 হলে self-only (**S5**) |
| `GET /donors` | designation 0 হলে self-only — নিজের প্রোফাইল ছাড়া কিছু দেখা যাবে না |
| `GET /donors/me` | অপরিবর্তিত (স্বভাবতই self) |
| `PATCH /users/password` | অপরিবর্তিত (স্বভাবতই self) |
| উপরের বাইরে সব অথেনটিকেটেড রুট | designation 0 হলে ৪০৩ |

শেষ সারিটা ছড়িয়ে-ছিটিয়ে না লিখে **একটি নতুন মিডলওয়্যার** দিয়ে হবে:

```ts
const handleVolunteerCheck = async (req, res, next) => {
  if (res.locals.middlewareResponse.donor.designation < DESIGNATIONS_INDEX.VOLUNTEER) {
    return res.status(HTTP_STATUS.FORBIDDEN)
      .send(new ForbiddenError403('Only volunteers or above can access this route', {}))
  }
  next()
}
```

`authenticate.ts`-এ `handleHallAdminCheck`/`handleSuperAdminCheck`-এর পাশে যোগ হবে, এবং
`handleAuthentication` ব্যবহারকারী **প্রতিটি** রুটের `@Middlewares([...])` তালিকায় বসবে —
শুধু §৪.৩-এর টেবিলে ছাড় পাওয়া রুটগুলো এবং `POST /pending-donations` (যা উল্টো, শুধু
designation 0-এর জন্য) ছাড়া। এই "ডিফল্টে বন্ধ" পদ্ধতিতে কোনো রুট ভুলে গেলে ফল হয় অতিরিক্ত
কড়াকড়ি, ফাঁস নয়।

> **রিভিউ চেকলিস্ট:** `grep -n "handleAuthentication" src/tsoaControllers/*.ts` চালিয়ে
> প্রতিটি হিট ধরে ধরে মেলানো — এটি একটি নিরাপত্তা-সংবেদনশীল সম্পূর্ণতা যাচাই, চোখের আন্দাজে
> করা যাবে না।

---

## ৫. ব্যাকএন্ড: নতুন কন্ট্রোলার `PendingDonationsController`

নতুন ফাইল `badhan-backend/src/tsoaControllers/PendingDonationsController.ts`,
`@Route('pending-donations')`, `@Tags('PendingDonations')` —
[PlateletDonationsController.ts](../badhan-backend/src/tsoaControllers/PlateletDonationsController.ts)-এর
কাঠামো অনুসরণ করে। সঙ্গে `db/interfaces/pendingDonationInterface.ts` ও
`validations/pendingDonations.ts`।

### ৫.১ `POST /pending-donations` — ডোনার জমা দেন

| | |
| --- | --- |
| বডি | `{ date: number }` — **`donorId` নেওয়া হয় না**, টোকেন থেকে আসে |
| মিডলওয়্যার | `validatePOSTPendingDonations`, `rateLimiter.pendingDonationLimiter`, `handleAuthentication` |
| গেট | `user.designation !== DESIGNATIONS_INDEX.DONOR` → ৪০৩ (**S10**) |
| ভ্যালিডেশন | `validateBODYDate` (বিদ্যমান); `date > Date.now()` হলে ৪০০ |
| ডুপ্লিকেট | `(donorId, date)` ইউনিক ইনডেক্স ভায়োলেশন → ৪০৯ `'This donation date is already pending review'` |
| সফল | ২০১, `{ newPendingDonation }` |
| লগ | `POST PENDING DONATIONS` |

বডিতে `donorId` না নেওয়াটা এখানে মূল নিরাপত্তা সিদ্ধান্ত — তাহলে "অন্যের হয়ে জমা দেওয়া"
নামের কোনো আক্রমণ-পৃষ্ঠই তৈরি হয় না।

### ৫.২ `GET /pending-donations` — রিভিউ কিউ

| | |
| --- | --- |
| মিডলওয়্যার | `rateLimiter.commonLimiter`, `handleAuthentication`, `handleVolunteerCheck` |
| রেসপন্স | `{ pendingDonations: [{ _id, date, requestedAt, donor: { _id, name, phone, hall, bloodGroup, studentId, availableToAll } }], truncated }` |
| সর্ট | `requestedAt` আরোহী — সবচেয়ে পুরোনো অনুরোধ আগে |

অ্যাগ্রিগেশন: `pendingdonations` → `$lookup donors` → `$unwind` → **`$match` দিয়ে
স্কোপিং**। স্কোপটা `canAccessDonor`-এর অ্যাগ্রিগেশন-রূপ:

- super admin → কোনো `$match` নেই;
- অন্য সবাই → `{ $or: [ {'donor.availableToAll': true}, {'donor.hall': {$nin: HALL_INDICES_RESTRICTED}}, {'donor.hall': user.hall} ] }`।

ফিল্টারিং **সার্ভারে**, ক্লায়েন্টে নয় — নইলে অন্য হলের ডোনারের নাম ও ফোন নেটওয়ার্কে চলে
যায় যদিও ইউআই তা লুকায়।

সিলিং: `$limit 500`, এবং কেটে গেলে `truncated: true` ফিরবে যাতে ইউআই স্পষ্ট করে বলতে পারে
তালিকা অসম্পূর্ণ। নিঃশব্দে কেটে ফেললে "কিউ খালি হয়ে গেছে" ভুল বার্তা যায়।

### ৫.৩ `POST /pending-donations/{pendingDonationId}/approve`

| | |
| --- | --- |
| মিডলওয়্যার | `commonLimiter`, `handleAuthentication`, `handleVolunteerCheck` |
| ধাপ | ১) PendingDonation লোড, না পেলে ৪০৪ (অন্য কেউ ইতিমধ্যে রিভিউ করেছেন) |
| | ২) তার `donorId` ধরে ডোনার লোড, না পেলে ৪০৪ |
| | ৩) `canAccessDonor(user, donor)` মিথ্যা হলে ৪০৩ (**S12**) |
| | ৪) `donations`-এ `(donorId, date)` আছে কি না দেখা (**§৩.৩**); না থাকলে `donationInterface.insertDonation(donor.phone, donor._id, pending.date)` |
| | ৫) PendingDonation ডিলিট (**S13** — ক্রমটি বদলানো যাবে না) |
| সফল | ২০০, `{ newDonation, alreadyRecorded }` |
| লগ | `POST PENDING DONATIONS APPROVE`, পে-লোডে ডোনারের নাম, তারিখ ও রিভিউয়ার |

লক্ষণীয়: `Donation`-এর `phone` ডোনারের **বর্তমান** ফোন থেকে নেওয়া হবে, PendingDonation-এ
সংরক্ষিত পুরোনো ফোন থেকে নয় — মাঝখানে ডোনার ফোন বদলে ফেললে (**S6**) নতুনটাই সঠিক।

### ৫.৪ `DELETE /pending-donations/{pendingDonationId}` — বাতিল বা প্রত্যাহার

| | |
| --- | --- |
| মিডলওয়্যার | `commonLimiter`, `handleAuthentication` (এখানে `handleVolunteerCheck` **নেই**) |
| গেট | designation ≥ 1 হলে `canAccessDonor`; designation 0 হলে `isSelf` (**S14**) |
| ফল | সারিটি `findOneAndDelete` — কোনো টম্বস্টোন নেই (**S8**) |
| লগ | রিভিউয়ার হলে `DELETE PENDING DONATIONS REJECT`, মালিক হলে `DELETE PENDING DONATIONS WITHDRAW` — পুরো মুছে যাওয়া ডকুমেন্টসহ |

লগে সম্পূর্ণ ডকুমেন্ট রাখা হচ্ছে বলেই টম্বস্টোন ছাড়া "সম্পূর্ণ মুছে ফেলা" গ্রহণযোগ্য:
কে কী বাতিল করেছেন তার হিসাব থাকে, কিন্তু কিউ বা ডোনার প্রোফাইল পরিষ্কার থাকে।

### ৫.৫ `GET /donors` অ্যাগ্রিগেশনে যোগ (S15)

[DonorsController.ts](../badhan-backend/src/tsoaControllers/DonorsController.ts)-এর
`getDonor` পাইপলাইনে ষষ্ঠ লুকআপ:

```ts
{ $lookup: { from: 'pendingdonations', localField: '_id',
             foreignField: 'donorId', as: 'pendingDonations' } }
```

সঙ্গে `$sort` নয় — অ্যারেটা ফ্রন্টএন্ডে `date` অনুসারে সাজানো হবে, যেমনটা `donations`-এর
ক্ষেত্রে আজ হয়।

### ৫.৬ tsoa রুট পুনর্জেনারেশন

নতুন কন্ট্রোলার যোগ করার পর **অবশ্যই**:

```
docker compose exec backend npm run tsoa:routes
docker compose exec backend npx tsc --noEmit
```

`src/tsoaRoutes/routes.ts` জেনারেটেড ফাইল, হাতে সম্পাদনা করা যাবে না।

---

## ৬. ব্যাকএন্ড: টেস্ট ও সিড

- [populate.ts](../badhan-backend/src/db/test/populate.ts) — কিছু ডোনারের জন্য এলোমেলো
  PendingDonation বসাবে, যাতে ডেভ-ডেটাবেসে কিউ পেজটা খালি না দেখায়।
- [clearDatabase.ts](../badhan-backend/src/db/test/clearDatabase.ts) — `dropDatabase()`
  করে, তাই কোনো বদল লাগছে না।
- ডেভ সিডে অন্তত একজন **পাসওয়ার্ডধারী designation 0** ডোনার থাকবে (যেমন
  `8801500000001` / `badhandev`), নইলে ডোনার-ভিউ হাতে পরখ করা যায় না।

---

## ৭. ফ্রন্টএন্ড

### ৭.১ রাউটার গার্ড — রিডাইরেক্ট লুপ (S3)

[router/index.ts](../badhan-frontend/src/router/index.ts):

```ts
const landingPathFor = (designation: number): string =>
  designation >= 1 ? '/home' : '/myDonorProfile'
```

গার্ডের দুটো `next('/home')` কল `next(landingPathFor(store.getters.getDesignation))`
হয়ে যাবে। এটা না করলে designation 0-এ লগইন করলে ট্যাব ঝুলে যায় — ফিচারটার সবচেয়ে
দৃশ্যমান ব্যর্থতা।

### ৭.২ রুট পরিবর্তন

| রুট | আগে | পরে |
| --- | --- | --- |
| `/myDonorProfile` (নতুন, `DonorSelfProfile`) | — | `requiresAuth: true`, `designation: 0` |
| `/members` | `designation: 1` | `designation: 0` |
| `/contacts`, `/credits`, `/about` | `designation: 0` | অপরিবর্তিত |
| `/pendingDonations` (নতুন, `PendingDonationsPage`) | — | `requiresAuth: true`, `designation: 1` |
| বাকি সব | `designation: 1`+ | অপরিবর্তিত |

নতুন ভিউ `views/DonorSelfProfile.vue` — [PageTitle.vue](../badhan-frontend/src/components/PageTitle.vue)
ও `PersonDetails` মাউন্ট করে, `donorId` আসে `GET /donors/me`-এর `_id` থেকে (স্টোরে
ক্যাশড থাকলে সেখান থেকেই)। এটি [Details.vue](../badhan-frontend/src/views/Home/Details.vue)-এর
মতো ওভারলে নয় — ওটা Home-এর উপর বসা মোডাল, আর এটি ডোনারের একমাত্র পূর্ণ পেজ।

### ৭.৩ সাইডবার ([AppBar.vue](../badhan-frontend/src/components/AppShell/AppBar.vue))

`menusForAll`-এ পরিবর্তন:

| এন্ট্রি | designation |
| --- | --- |
| **My Donor Profile** (নতুন, `mdi-account-heart`, `/myDonorProfile`, id `donorSelfProfileNavigationId`) | `0`, তবে designation ≥ 1 হলে **লুকানো** |
| Members | `1` → `0` |
| Public Contacts | `1` → `0` |
| Credits | `1` → `0` |
| About | `1` → `0` |
| **Pending Donations** (নতুন, `mdi-clock-alert-outline`, `/pendingDonations`, id `pendingDonationsNavigationId`) | `1` |
| Home, Bookmarked Donors, Donor Creation, My Profile, Super Admin | অপরিবর্তিত (`1`/`2`/`3`) |

আজকের টেমপ্লেট শর্ত `getDesignation >= menu.designation` — অর্থাৎ "শুধু ডোনারের জন্য"
এন্ট্রি প্রকাশ করা যায় না। তাই একটি অপশনাল `maxDesignation` ফিল্ড যোগ হবে এবং শর্তটি হবে:

```
getDesignation >= menu.designation &&
  (menu.maxDesignation === undefined || getDesignation <= menu.maxDesignation)
```

**My Donor Profile** পাবে `designation: 0, maxDesignation: 0`। ভলান্টিয়ারদের জন্য আগে
থেকেই **My Profile** আছে, তাই দুটো একসঙ্গে দেখানোর দরকার নেই।

### ৭.৪ `PersonDetails.vue` — অপেক্ষমাণ রক্তদান সেকশন

[PersonDetails.vue](../badhan-frontend/src/components/PersonDetails.vue)-এ "Blood Donations"
সেকশনের ঠিক পরে একটি নতুন সেকশন, একই `DonationCard`-ধাঁচের সারি নিয়ে:

| দর্শক | যা দেখেন |
| --- | --- |
| ডোনার নিজে (designation 0) | নিজের অপেক্ষমাণ তারিখগুলো + "রক্তদানের তারিখ যোগ করুন" ফর্ম (ডেট পিকার) + প্রতিটি সারিতে "প্রত্যাহার" |
| ভলান্টিয়ার ও তার উপরে | ডোনারের অপেক্ষমাণ তারিখগুলো + প্রতিটি সারিতে "অনুমোদন" / "বাতিল"; যোগ করার ফর্ম নেই (**S10**) |

বিদ্যমান "Add Donation" ফর্মটি (`newDonationType` রেডিও: blood / platelet) designation 0-এর
জন্য **লুকানো** থাকবে — ডোনারের একমাত্র পথ PendingDonation।

দুটো কাজ শেষ হওয়ার পর কম্পোনেন্ট ডোনার-ডিটেইল আবার ফেচ করবে, যাতে অনুমোদিত তারিখটি
অপেক্ষমাণ তালিকা থেকে সরে গিয়ে "Blood Donations"-এ ঢুকে যাওয়াটা এক নজরেই বোঝা যায়।
প্রতিটি ধ্বংসাত্মক ক্রিয়ার আগে বিদ্যমান
[ConfirmationBox.vue](../badhan-frontend/src/components/AppShell/ConfirmationBox.vue) দিয়ে
নিশ্চিতকরণ চাইতে হবে — "বাতিল" মানে সারিটি চিরতরে চলে যাওয়া (**S8**)।

### ৭.৫ নতুন পেজ `views/PendingDonations.vue`

- হেডার: PageTitle "Pending Donations"।
- টেবিল/কার্ড কলাম: ডোনারের নাম (ক্লিক করলে তাঁর ডিটেইল ওভারলে), হল, রক্তের গ্রুপ,
  স্টুডেন্ট আইডি, রক্তদানের তারিখ, অনুরোধের সময়, দুটি বোতাম।
- খালি অবস্থা: "কোনো অপেক্ষমাণ রক্তদান নেই"।
- `truncated: true` হলে উপরে একটি সতর্কবার্তা: "প্রথম ৫০০টি দেখানো হচ্ছে"।
- অনুমোদন/বাতিলের পর সারিটি স্থানীয়ভাবে সরিয়ে দেওয়া হবে, পুরো তালিকা রিফেচ ছাড়াই;
  ৪০৪ এলে (অন্য কেউ আগে রিভিউ করেছেন) বার্তা দিয়ে রিফেচ।

### ৭.৬ `api/index.ts`

[api/index.ts](../badhan-frontend/src/api/index.ts)-এ চারটি নতুন হ্যান্ডলার, বিদ্যমান
নামকরণ ও `POSTDonationsPayloadInterface`-ধাঁচ অনুসরণ করে:

```
handlePOSTPendingDonations({ date })
handleGETPendingDonations()
handlePOSTPendingDonationsApprove({ pendingDonationId })
handleDELETEPendingDonations({ pendingDonationId })
```

চারটিই ফাইলের নিচের `export default {...}` তালিকায় যোগ হবে।

### ৭.৭ অন্যান্য ফ্রন্টএন্ড ছোঁয়া

- [mixins/constants.ts](../badhan-frontend/src/mixins/constants.ts) — ব্যাকএন্ড
  `constants/index.ts`-এর হাতে-রক্ষিত প্রতিরূপ; `DESIGNATIONS_INDEX` সেখানে না থাকলে যোগ
  করতে হবে, যাতে গার্ড ও AppBar-এ `0`/`1` ম্যাজিক নম্বর না থাকে।
- [PersonCardNew.vue](../badhan-frontend/src/components/PersonCardNew.vue) — সার্চ ফলাফলের
  কার্ড; অপেক্ষমাণ সংখ্যা দেখানো হচ্ছে **না** (সার্চ রেসপন্সে এই লুকআপ নেই, এবং যোগ করা
  মানে `GET /search/v3`-এ বাড়তি জয়েন — plan6-এর অপ্টিমাইজেশনের বিপরীত)।

---

## ৮. ভ্যালিডেশন

`badhan-backend/src/validations/pendingDonations.ts`, বিদ্যমান
[donations.ts](../badhan-backend/src/validations/donations.ts)-এর গঠন অনুসরণে:

```ts
validatePOSTPendingDonations   = validate([ validateBODYDate ])
validatePOSTPendingDonationsApprove = validate([ validatePARAMPendingDonationId ])
validateDELETEPendingDonations = validate([ validatePARAMPendingDonationId ])
```

`validatePARAMPendingDonationId` নতুন — `validateRequest/` এ বিদ্যমান
`validateBODYDonorId`-এর মতো ObjectId-আকৃতি যাচাই করবে (`@Path` প্যারামের জন্য একটি নতুন
`validateParams.ts`, অথবা বিদ্যমান ফাইলে একটি প্যারাম-ভ্যারিয়েন্ট)।

---

## ৯. লগিং

নতুন `logInterface.addLog` অ্যাকশন নাম:

| অ্যাকশন | কে | পে-লোড |
| --- | --- | --- |
| `POST PENDING DONATIONS` | ডোনার | তারিখ |
| `POST PENDING DONATIONS APPROVE` | রিভিউয়ার | ডোনারের নাম, তারিখ, `alreadyRecorded` |
| `DELETE PENDING DONATIONS REJECT` | রিভিউয়ার | সম্পূর্ণ মুছে যাওয়া ডকুমেন্ট + ডোনারের নাম |
| `DELETE PENDING DONATIONS WITHDRAW` | ডোনার | সম্পূর্ণ মুছে যাওয়া ডকুমেন্ট |

[LogsController.ts](../badhan-backend/src/tsoaControllers/LogsController.ts) যদি অ্যাকশন
নামের কোনো নির্দিষ্ট তালিকা রাখে, সেখানেও চারটি যোগ করতে হবে।

---

## ১০. টেস্ট

### ১০.১ ব্যাকএন্ড API টেস্ট (`badhan-backend-test`)

চালানো: `docker compose run --rm backend-test <cmd>`

পারমিশন:
1. designation 0 নিজের `PATCH /donors/v2` → ২০০।
2. designation 0 অন্যের `donorId` দিয়ে `PATCH /donors/v2` → ৪০৩, এমনকি টার্গেট
   `availableToAll: true` হলেও (আজকের hall-চেক এটা পাস করিয়ে দিত — এই টেস্টটাই মূল রিগ্রেশন গার্ড)।
3. designation 0 অন্যের `PATCH /donors/comment` → ৪০৩।
4. designation 0 → `GET /search/v3`, `POST /donors`, `GET /pending-donations`,
   `GET /statistics/*` — সবগুলোতে ৪০৩।
5. designation 0 নিজের `PATCH /users/password` → ২০১ (অপরিবর্তিত আচরণ)।
6. designation 0 নিজের `GET /donors?donorId=self` → ২০০; অন্যের → ৪০৩।

PendingDonation:
7. designation 0 `POST /pending-donations` → ২০১; একই তারিখ দ্বিতীয়বার → ৪০৯।
8. designation 1 `POST /pending-donations` → ৪০৩ (**S10**)।
9. ভিন্ন হলের, `availableToAll: false` ডোনারের সারি ভলান্টিয়ারের `GET /pending-donations`
   ফলাফলে **নেই**; সুপার অ্যাডমিনের ফলাফলে **আছে**।
10. ঐ সারিতে সরাসরি `approve` কল করলে ভলান্টিয়ার ৪০৩ পান (তালিকা লুকানোই একমাত্র প্রতিরক্ষা নয়)।
11. অনুমোদনের পর: `donations`-এ ঠিক একটি নতুন সারি, `pendingdonations` খালি,
    ডোনারের `lastDonation` হালনাগাদ।
12. একই সারি দ্বিতীয়বার অনুমোদন → ৪০৪।
13. `donations`-এ ঐ `(donorId, date)` আগে থেকেই থাকলে অনুমোদন → ২০০ ও `alreadyRecorded: true`,
    ডুপ্লিকেট `Donation` তৈরি হয় না (**§৩.৩**)।
14. বাতিলের পর সারিটি নেই এবং `donations`-এ কিছু ঢোকেনি।
15. ডোনার নিজের সারি প্রত্যাহার → ২০০; অন্য ডোনারের সারি প্রত্যাহার → ৪০৩।
16. `DELETE /donors` করলে তাঁর সব PendingDonation মুছে যায় (**§৩.২**)।

### ১০.২ Cypress (`badhan-frontend-test`)

চালানো: `docker compose run --rm frontend-test <cmd>`

17. designation 0 লগইন → `/myDonorProfile`-এ পৌঁছায়, **রিডাইরেক্ট লুপ নেই** (S3)।
18. designation 0-এর সাইডবারে ঠিক পাঁচটি এন্ট্রি: My Donor Profile, Members,
    Public Contacts, Credits, About। Home / Bookmarked Donors / Pending Donations নেই।
19. designation 0 ঠিকানা-বারে `/home` লিখলে `/myDonorProfile`-এ ফিরে আসে।
20. designation 0 নিজের নাম ও রক্তের গ্রুপ সম্পাদনা করে সেভ করতে পারেন।
21. designation 0 তারিখ যোগ করলে অপেক্ষমাণ তালিকায় দেখা যায়; "Add Donation" ফর্মটি নেই।
22. ভলান্টিয়ার Pending Donations পেজ খুলে অনুমোদন করলে সারিটি চলে যায় এবং ঐ ডোনারের
    প্রোফাইলে রক্তদান হিসেবে দেখা যায়।

---

## ১১. ফেজ বিভাজন

প্রতিটি ফেজ আলাদা কমিট, প্রতিটির শেষে
`docker compose exec backend npx tsc --noEmit` ও `docker compose exec frontend npm run build`
সবুজ থাকতে হবে।

| ফেজ | কাজ | ঝুঁকি |
| --- | --- | --- |
| **0** | `utils/permissions.ts` বের করা, পুরোনো কল-সাইট প্রতিস্থাপন, `handleVolunteerCheck` যোগ (এখনো কোথাও ব্যবহার নয়) — বিশুদ্ধ রিফ্যাক্টর, আচরণ অপরিবর্তিত | নিম্ন |
| **1** | `PendingDonation` মডেল, ইনডেক্স, ক্যাসকেড, `pendingDonationInterface`, ভ্যালিডেশন | নিম্ন |
| **2** | `PendingDonationsController` (৪টি রুট), tsoa রিজেনারেশন, `GET /donors`-এ ষষ্ঠ লুকআপ | মাঝারি |
| **3** | পারমিশন লকডাউন: §৪.২, §৪.৩ — `handleVolunteerCheck` সব রুটে বসানো ও চেকলিস্ট যাচাই | **উচ্চ** — নিরাপত্তা-সংবেদনশীল, এখানেই বেশিরভাগ রিভিউ সময় যাবে |
| **4** | রাউটার গার্ড, `/myDonorProfile`, AppBar-এর `maxDesignation` | মাঝারি (S3) |
| **5** | `PersonDetails.vue`-এ অপেক্ষমাণ সেকশন (দুই ভূমিকার দুই রূপ) | মাঝারি |
| **6** | `views/PendingDonations.vue` + api হ্যান্ডলার | নিম্ন |
| **7** | টেস্ট (§১০) ও ডেভ-সিড ডোনার অ্যাকাউন্ট | নিম্ন |

ফেজ 3 ইচ্ছাকৃতভাবে ফেজ 4-এর **আগে**: ব্যাকএন্ড লকডাউন আগে না বসালে ফেজ 4-এর পর কিছুক্ষণের
জন্য এমন একটি বিল্ড থাকে যেখানে ডোনার লগইন করতে পারেন কিন্তু সার্ভার এখনো তাঁকে ভলান্টিয়ারের
সমান বিশ্বাস করে।

---

## ১২. খোলা প্রশ্ন

কোডে নামা শুরু করার আগে এই দুটোর উত্তর দরকার — বাকি সবকিছু উপরে সিদ্ধান্ত হিসেবে স্থির:

1. **ডোনারকে কি জানানো হবে তাঁর অনুরোধ অনুমোদিত/বাতিল হয়েছে?** এই প্ল্যানে কোনো
   নোটিফিকেশন নেই; ডোনার পরের বার প্রোফাইল খুললে পার্থক্যটা দেখবেন। ইমেইল/পুশ চাইলে সেটা
   আলাদা কাজ।
2. **`GET /pending-donations`-এ কি নিজের হলের বাইরে কিছুই দেখা যাবে না, নাকি দেখা যাবে
   কিন্তু বোতাম নিষ্ক্রিয় থাকবে?** এই প্ল্যান প্রথমটি ধরেছে (**S12**) — দেখা না গেলে
   ফোন নম্বর ফাঁসের প্রশ্নই ওঠে না।
