#!/usr/bin/env node
"use strict";

// De-identify the mongodump snapshot into CSVs for donor-suggestion ML.
// See docs/plan5.md. Host-only tooling: plain CommonJS, zero dependencies, no
// database connection — it reads the .bson dump files directly.
//
// WARNING: donors.csv retains the free-text address / room_number / comment
// columns, so it is sensitive personal data, not an anonymized extract. OUT_DIR
// is gitignored; keep it that way.

const fs = require("fs");
const path = require("path");

const SNAPSHOT_DIR = path.join(__dirname, "../badhan-backend/backup/1784737620663/Badhan");
const OUT_DIR = path.join(__dirname, "anonymized");

// Substitution cipher over HALL_INDICES_ALLOWED_FOR_DONOR (badhan-backend
// src/constants/index.ts) — the 8 halls a donor may hold, i.e. every hall except
// Attached (7). Hard-coded, not generated, so a re-run or a run against a later
// snapshot yields the same mapping and joins to earlier work. It is a
// derangement (no hall maps to itself), which is asserted at startup.
const HALL_PERMUTATION = { 0: 4, 1: 6, 2: 8, 3: 5, 4: 2, 5: 1, 6: 0, 8: 3 };

// ---------------------------------------------------------------------------
// BSON reader
// ---------------------------------------------------------------------------

// A mongodump .bson file is just concatenated BSON documents, each prefixed with
// its own int32 length. A generator rather than an array so logs.bson (6 MB,
// 35896 docs) streams instead of materialising all at once.
function* readBson(file) {
  const buf = fs.readFileSync(file);
  let cursor = 0;
  while (cursor < buf.length) {
    const len = buf.readInt32LE(cursor);
    if (len <= 0 || cursor + len > buf.length) {
      throw new Error(`${path.basename(file)}: bad document length ${len} at offset ${cursor}`);
    }
    yield parseDoc(buf, cursor, cursor + len);
    cursor += len;
  }
}

// Only the element types actually present in this snapshot are implemented;
// anything else throws, so a newly-added field can never be silently skipped
// (which for a de-identification script would mean leaking it or dropping it
// without anyone noticing).
function parseDoc(buf, start, end) {
  const doc = {};
  let p = start + 4;
  while (p < end - 1) {
    const type = buf[p];
    p += 1;
    const nameEnd = buf.indexOf(0, p);
    const name = buf.toString("utf8", p, nameEnd);
    p = nameEnd + 1;

    switch (type) {
      case 0x01: // double
        doc[name] = buf.readDoubleLE(p);
        p += 8;
        break;
      case 0x02: {
        // string: int32 byte length including the trailing NUL
        const len = buf.readInt32LE(p);
        p += 4;
        doc[name] = buf.toString("utf8", p, p + len - 1);
        p += len;
        break;
      }
      case 0x03: {
        // Embedded document: skipped by its length prefix, never decoded. Only
        // logs.details is one, and it is a PII-heavy untyped blob that must not
        // even be materialised in memory.
        const len = buf.readInt32LE(p);
        p += len;
        break;
      }
      case 0x07: // ObjectId: 12 raw bytes, first 4 are a big-endian unix time
        doc[name] = buf.toString("hex", p, p + 12);
        p += 12;
        break;
      case 0x08: // boolean
        doc[name] = buf[p] === 1;
        p += 1;
        break;
      case 0x09: // UTC datetime, ms since epoch
        doc[name] = Number(buf.readBigInt64LE(p));
        p += 8;
        break;
      case 0x0a: // null
        doc[name] = null;
        break;
      case 0x10: // int32
        doc[name] = buf.readInt32LE(p);
        p += 4;
        break;
      case 0x12: // int64 — ms timestamps and phone numbers, all under 2^53
        doc[name] = Number(buf.readBigInt64LE(p));
        p += 8;
        break;
      default:
        throw new Error(`unsupported BSON type 0x${type.toString(16)} for field "${name}"`);
    }
  }
  return doc;
}

// ObjectIds embed their creation time — useful as a signal, not identifying.
function objectIdTime(hex) {
  return parseInt(hex.slice(0, 8), 16) * 1000;
}

// ---------------------------------------------------------------------------
// CSV writer
// ---------------------------------------------------------------------------

// RFC 4180 quoting is load-bearing here, not cosmetic: address / room_number /
// comment are free text and do contain commas and quotes.
function csvCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function writeCsv(name, header, rows) {
  const lines = [header.join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  fs.writeFileSync(path.join(OUT_DIR, name), `${lines.join("\n")}\n`);
  return rows.length;
}

// Collapse embedded newlines to a space. pandas handles multi-line quoted
// fields fine, but `wc -l` and every shell check in the verification list do
// not, and a file that disagrees with its own row count invites bad fixes.
function freeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[\r\n]+/g, " ");
}

// ---------------------------------------------------------------------------
// Surrogate keys
// ---------------------------------------------------------------------------

const counters = {
  unresolvedDonorRefs: 0,
  missingDesignation: 0,
  outOfDomainHall: 0,
  malformedStudentId: 0,
  nonNumericBloodGroup: 0,
};

// The hex -> key map is the re-identification key. It is never written to disk;
// it lives only for the duration of the run.
function makeKeyer(prefix) {
  const map = new Map();
  return {
    // Allocate in the order documents appear in the BSON file.
    assign(hex) {
      let key = map.get(hex);
      if (key === undefined) {
        key = `${prefix}${map.size + 1}`;
        map.set(hex, key);
      }
      return key;
    },
    // Foreign keys never allocate: a ref to a donor that no longer exists
    // resolves to an empty cell and bumps a counter, so the notebook can decide
    // what to do with the row instead of the export deciding for it.
    resolve(hex) {
      if (hex === null || hex === undefined) return "";
      const key = map.get(hex);
      if (key === undefined) {
        counters.unresolvedDonorRefs += 1;
        return "";
      }
      return key;
    },
    get size() {
      return map.size;
    },
  };
}

// ---------------------------------------------------------------------------
// Hall cipher
// ---------------------------------------------------------------------------

function validateHallPermutation() {
  const domain = Object.keys(HALL_PERMUTATION).map(Number);
  const image = Object.values(HALL_PERMUTATION);
  const sorted = (xs) => [...xs].sort((a, b) => a - b).join(",");
  if (sorted(domain) !== sorted(image)) {
    throw new Error("HALL_PERMUTATION is not a permutation of its own domain");
  }
  if (new Set(image).size !== image.length) {
    throw new Error("HALL_PERMUTATION is not injective");
  }
  const fixed = domain.filter((hall) => HALL_PERMUTATION[hall] === hall);
  if (fixed.length > 0) {
    throw new Error(`HALL_PERMUTATION is not a derangement: ${fixed.join(",")} map to themselves`);
  }
}

function maskHall(hall) {
  const masked = HALL_PERMUTATION[hall];
  if (masked === undefined) {
    counters.outOfDomainHall += 1;
    return "";
  }
  return masked;
}

// One donor in this snapshot carries bloodGroup as the empty string rather than
// an index. Emit an empty cell and count it rather than coercing it to a group.
function bloodGroup(value) {
  if (typeof value !== "number") {
    counters.nonNumericBloodGroup += 1;
    return "";
  }
  return value;
}

// BUET IDs are 7 chars: YY DD RRR. The roll is the identifying part, so it is
// discarded; batch and department are low-cardinality group attributes.
function splitStudentId(studentId) {
  const str = String(studentId === null || studentId === undefined ? "" : studentId);
  if (!/^\d{4}/.test(str)) {
    counters.malformedStudentId += 1;
    return { batchYear: "", departmentId: "" };
  }
  return {
    batchYear: 2000 + parseInt(str.slice(0, 2), 10),
    departmentId: parseInt(str.slice(2, 4), 10),
  };
}

// ---------------------------------------------------------------------------
// Per-collection passes
// ---------------------------------------------------------------------------

const donorKeys = makeKeyer("d");

function exportDonors() {
  const rows = [];
  for (const doc of readBson(path.join(SNAPSHOT_DIR, "donors.bson"))) {
    const { batchYear, departmentId } = splitStudentId(doc.studentId);
    if (doc.designation === undefined || doc.designation === null) counters.missingDesignation += 1;
    rows.push([
      donorKeys.assign(doc._id),
      objectIdTime(doc._id),
      batchYear,
      departmentId,
      bloodGroup(doc.bloodGroup),
      maskHall(doc.hall),
      doc.designation === undefined || doc.designation === null ? 0 : doc.designation,
      doc.availableToAll,
      Boolean(doc.password),
      Boolean(doc.email),
      freeText(doc.address),
      freeText(doc.roomNumber),
      freeText(doc.comment),
      doc.commentTime,
    ]);
  }
  return writeCsv(
    "donors.csv",
    [
      "donor_key",
      "created_at",
      "batch_year",
      "department_id",
      "blood_group",
      "hall_code",
      "designation",
      "available_to_all",
      "has_account",
      "has_email",
      "address",
      "room_number",
      "comment",
      "comment_time",
    ],
    rows,
  );
}

// donations and plateletdonations have the same shape. The denormalised `phone`
// on both is dropped — donorId already joins.
function exportDonations(bsonFile, csvFile, prefix, keyColumn) {
  const keys = makeKeyer(prefix);
  const rows = [];
  for (const doc of readBson(path.join(SNAPSHOT_DIR, bsonFile))) {
    rows.push([keys.assign(doc._id), donorKeys.resolve(doc.donorId), doc.date, objectIdTime(doc._id)]);
  }
  return writeCsv(csvFile, [keyColumn, "donor_key", "date", "created_at"], rows);
}

function exportCallRecords() {
  const keys = makeKeyer("cr");
  const rows = [];
  for (const doc of readBson(path.join(SNAPSHOT_DIR, "callrecords.bson"))) {
    rows.push([
      keys.assign(doc._id),
      donorKeys.resolve(doc.callerId),
      donorKeys.resolve(doc.calleeId),
      doc.date,
      objectIdTime(doc._id),
    ]);
  }
  return writeCsv("call_records.csv", ["call_key", "caller_key", "callee_key", "date", "created_at"], rows);
}

// `details` is never read — parseDoc skips embedded documents by their length
// prefix, so the whole-donor-records-and-password-hashes blob inside it is not
// decoded at all.
function exportLogs() {
  const keys = makeKeyer("lg");
  const rows = [];
  for (const doc of readBson(path.join(SNAPSHOT_DIR, "logs.bson"))) {
    rows.push([keys.assign(doc._id), donorKeys.resolve(doc.donorId), doc.operation, doc.date]);
  }
  return writeCsv("logs.csv", ["log_key", "donor_key", "operation", "date"], rows);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  validateHallPermutation();
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    throw new Error(`snapshot directory not found: ${SNAPSHOT_DIR}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Donors first: it allocates the donor keys every other file resolves against.
  const written = {
    "donors.csv": exportDonors(),
    "donations.csv": exportDonations("donations.bson", "donations.csv", "dn", "donation_key"),
    "platelet_donations.csv": exportDonations(
      "plateletdonations.bson",
      "platelet_donations.csv",
      "pd",
      "donation_key",
    ),
    "call_records.csv": exportCallRecords(),
    "logs.csv": exportLogs(),
  };

  console.log(`Wrote ${OUT_DIR}`);
  for (const [file, count] of Object.entries(written)) {
    console.log(`  ${file.padEnd(24)} ${count} rows`);
  }
  console.log("Edge cases:");
  console.log(`  unresolved donor refs    ${counters.unresolvedDonorRefs}`);
  console.log(`  missing designation      ${counters.missingDesignation}`);
  console.log(`  out-of-domain hall       ${counters.outOfDomainHall}`);
  console.log(`  malformed studentId      ${counters.malformedStudentId}`);
  console.log(`  non-numeric bloodGroup   ${counters.nonNumericBloodGroup}`);
  console.log("donors.csv retains free-text address/room_number/comment — sensitive, keep it local.");
}

main();
