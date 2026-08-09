#!/usr/bin/env node
"use strict";

// Produces the Credits page's data — src/data/contributors.json and the avatars in
// src/assets/contributors/ — which used to be fetched at runtime from a Firebase
// Realtime Database and a Firebase Storage bucket. See docs/plans/plan14.md.
//
// Two modes:
//
//   node tools/vendor-contributors.js
//       Migration mode. Pulls the whole list from the Realtime Database, downloads
//       and resizes every avatar, and rewrites contributors.json. This was run once
//       to seed the repository; it is kept because it is the only record of where
//       the data came from, and re-running it is how you would verify the committed
//       files still match the (still-live) database.
//
//   node tools/vendor-contributors.js <photo> "<full name>"
//       Add mode. Resizes one local photo into src/assets/contributors/ and prints
//       the JSON record to paste into contributors.json. This is the path for
//       adding a new contributor now that there is no admin console.
//
// Per ../../CLAUDE.md this runs inside a container, never on the host:
//   docker compose run --rm --no-deps frontend node tools/vendor-contributors.js
//
// No credentials are involved. Both the database node and every Storage object are
// publicly readable, so this is plain HTTP; do not wire a service account in here.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const RTDB_URL = "https://badhan-buet-default-rtdb.firebaseio.com/data.json";

const ROOT = path.resolve(__dirname, "..");
const IMAGE_DIR = path.join(ROOT, "src", "assets", "contributors");
const DATA_FILE = path.join(ROOT, "src", "data", "contributors.json");

// The avatar renders in a 100px v-avatar (PersonCredit.vue). 200px covers 2x
// displays; the source images run up to 1536px and 2.1 MB, which is what made
// vendoring them worth doing rather than just possible.
const SIZE = 200;
const QUALITY = 80;

// Credits.vue groups on `type`. A value outside this set does not error — the
// person silently disappears from the page — so it is asserted, not trusted.
const TYPES = ["Lead", "Developers", "Contributors of Badhan"];

// The database still carries the older three-way split. It distinguished current
// from former developers, which meant a person's group changed as they moved on
// and the page read as a ranking; one "Developers" group and an explicit lead is
// both truer and less maintenance. Kept here so re-running this script reproduces
// what is committed rather than resurrecting the old grouping.
const LEAD = "Mir Mahathir Mohammad";
const TYPE_MAP = {
  "Active Developers": "Developers",
  "Legacy Developers": "Developers",
  "Contributors of Badhan": "Contributors of Badhan"
};

function resolveType(person) {
  if (person.name === LEAD) return "Lead";
  const mapped = TYPE_MAP[person.type];
  if (!mapped) throw new Error(`${person.name}: unmapped source type ${JSON.stringify(person.type)}`);
  return mapped;
}

// Records whose imageUrl is the bucket's shared silhouette rather than a photograph.
// They get `image: null` and no committed file: the frontend already ships an
// identical placeholder at src/assets/account.png and uses it as the null case.
const PLACEHOLDER_OBJECTS = ["profilepics/avatar.jpg"];

// Records whose committed photograph is better than the one the database has, because
// someone sent a real photo after the migration. Migration mode keeps the committed
// file instead of downloading — otherwise a re-run would quietly undo the improvement,
// which would break the one property that makes re-running safe. Takes precedence over
// PLACEHOLDER_OBJECTS: that is exactly the case these entries exist to fix.
const KEEP_LOCAL_PHOTO = {
  "Nobel Dey": "nobel-dey.webp"
};

// Total budget for src/assets/contributors/. Sixteen 200px WebP avatars land near
// 150 KB; a build that blows past this means a resize silently did not happen.
const MAX_TOTAL_BYTES = 250 * 1024;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Firebase Storage download URLs carry the object path percent-encoded between
// /o/ and the query string: .../o/profilepics%2Favatar.jpg?alt=media
function storageObjectPath(url) {
  const match = url.match(/\/o\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// Square-crops to SIZE and writes WebP. `cover` rather than `contain` because the
// avatar is a circle: letterboxing would show as grey wedges inside it. Every
// source is already square or near-square, so the crop takes off a few pixels at
// most.
async function writeAvatar(buffer, slug) {
  const file = `${slug}.webp`;
  await sharp(buffer)
    .resize(SIZE, SIZE, { fit: "cover", position: "attention" })
    .webp({ quality: QUALITY })
    .toFile(path.join(IMAGE_DIR, file));
  return file;
}

// Fails loudly rather than emitting a file the bundler cannot resolve or a page
// that quietly drops someone. Runs on every regeneration, not just the first.
function verify(records, sourceCount) {
  const problems = [];

  if (records.length !== sourceCount) {
    problems.push(`wrote ${records.length} records from ${sourceCount} source records`);
  }

  // The Lead group renders as its own section at the top. Zero means the name
  // constant drifted from the data and the section is silently empty.
  const leads = records.filter((record) => record.type === "Lead");
  if (leads.length !== 1) {
    problems.push(`expected exactly 1 Lead, found ${leads.length}`);
  }

  const slugs = new Set();
  for (const record of records) {
    if (!TYPES.includes(record.type)) {
      problems.push(`${record.name}: unknown type ${JSON.stringify(record.type)}`);
    }
    if (!record.name) {
      problems.push(`a record is missing its name`);
    }
    if (record.image !== null) {
      if (!fs.existsSync(path.join(IMAGE_DIR, record.image))) {
        problems.push(`${record.name}: image ${record.image} does not exist`);
      }
      if (slugs.has(record.image)) {
        problems.push(`${record.name}: image ${record.image} collides with another record`);
      }
      slugs.add(record.image);
    }
  }

  const total = fs
    .readdirSync(IMAGE_DIR)
    .reduce((sum, f) => sum + fs.statSync(path.join(IMAGE_DIR, f)).size, 0);
  if (total > MAX_TOTAL_BYTES) {
    problems.push(`avatars total ${total} bytes, over the ${MAX_TOTAL_BYTES} budget`);
  }

  if (problems.length > 0) {
    throw new Error(`verification failed:\n  - ${problems.join("\n  - ")}`);
  }

  console.log(`verified ${records.length} records, ${slugs.size} avatars, ${total} bytes total`);
}

async function migrate() {
  console.log(`fetching ${RTDB_URL}`);
  const raw = JSON.parse((await download(RTDB_URL)).toString("utf8"));

  // The database keys are its own primary keys and carry no meaning beyond
  // insertion order. Sorting by them preserves the order the page renders today,
  // so the migration is verifiably content-identical; the array makes that order
  // explicit and editable for the first time.
  const source = Object.keys(raw)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => raw[key]);

  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

  // People added after the migration exist only in git — the database has never
  // heard of them. Rebuilding blindly from the database would delete them and their
  // avatars, so they are carried through untouched. This is what makes re-running
  // safe: it refreshes what came from the database and leaves everything else alone.
  const existing = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) : [];
  const sourceNames = new Set(source.map((person) => person.name));
  const carried = existing.filter((record) => !sourceNames.has(record.name));

  const kept = new Set([
    ...Object.values(KEEP_LOCAL_PHOTO),
    ...carried.map((record) => record.image).filter(Boolean)
  ]);
  for (const file of fs.readdirSync(IMAGE_DIR)) {
    if (!kept.has(file)) fs.unlinkSync(path.join(IMAGE_DIR, file));
  }
  for (const file of kept) {
    if (!fs.existsSync(path.join(IMAGE_DIR, file))) {
      throw new Error(`KEEP_LOCAL_PHOTO names ${file}, which is not in src/assets/contributors/`);
    }
  }

  const records = [];
  for (const person of source) {
    const objectPath = storageObjectPath(person.imageUrl);
    let image = null;

    if (KEEP_LOCAL_PHOTO[person.name]) {
      image = KEEP_LOCAL_PHOTO[person.name];
      console.log(`${person.name}: keeping the committed ${image}`);
    } else if (PLACEHOLDER_OBJECTS.includes(objectPath)) {
      console.log(`${person.name}: placeholder avatar, using the local fallback`);
    } else {
      const buffer = await download(person.imageUrl);
      image = await writeAvatar(buffer, slugify(person.name));
      console.log(`${person.name}: ${objectPath} -> ${image}`);
    }

    // `calender` (sic) is dropped: it held a "January 2020 - Present" range per
    // person, which went stale silently the moment someone stopped contributing
    // and nobody remembered to edit it. Credit does not expire, so there is
    // nothing for a date range to say here.
    records.push({
      name: person.name,
      type: resolveType(person),
      image,
      contribution: person.contribution,
      links: person.links
    });
  }

  for (const record of carried) {
    console.log(`${record.name}: not in the database, carried through from the committed file`);
  }
  records.push(...carried);

  verify(records, source.length + carried.length);
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2) + "\n");
  console.log(`wrote ${path.relative(ROOT, DATA_FILE)}`);
}

async function addOne(photoPath, name) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const image = await writeAvatar(fs.readFileSync(photoPath), slugify(name));
  const size = fs.statSync(path.join(IMAGE_DIR, image)).size;
  console.log(`wrote src/assets/contributors/${image} (${size} bytes)`);
  console.log(`\nAdd this to src/data/contributors.json, filling in the blanks:\n`);
  console.log(
    JSON.stringify(
      {
        name,
        type: `one of: ${TYPES.join(" | ")}`,
        image,
        contribution: ["…"],
        links: [{ icon: "github", color: "grey", link: "https://github.com/…" }]
      },
      null,
      2
    )
  );
}

async function main() {
  const [photoPath, name] = process.argv.slice(2);
  if (photoPath && name) {
    await addOne(photoPath, name);
  } else if (photoPath) {
    throw new Error('add mode needs both arguments: <photo> "<full name>"');
  } else {
    await migrate();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
