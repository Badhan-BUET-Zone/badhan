#!/usr/bin/env node
"use strict";

// Trims noise out of the OpenAPI spec tsoa just generated, in place.
//
//   node scripts/trim-openapi.js        (run by `npm run tsoa:spec`)
//
// tsoa promotes every named TypeScript type it meets into components.schemas, so the
// "Schemas" list at the bottom of /docs fills up with things that are implementation
// detail rather than API vocabulary: the I-prefixed response interfaces, the thrown
// error shapes, and TypeScript's own Record<> instantiations, whose generated names
// ("Record_number._report-any-Array--firstDonationCount-number__") are unreadable.
//
// Those are DROPPED FROM THE LIST BUT NOT FROM THE DOCUMENTATION: every reference to
// one is replaced by the schema itself first, so each endpoint still documents its
// full response body — it just shows it inline instead of behind a named link. What
// survives in the list is the hand-written vocabulary in tsoa.json (Donors, Tokens,
// Donations…), which is what the list is for.
//
// It also puts the encoding vocabulary — the blood group, hall, designation, date and student
// ID mappings — back into info.description. That prose has two readers, this spec and the MCP
// handshake, so it lives in ONE place (src/doc/apiVocabulary.ts) and is appended here rather
// than being written out a second time in tsoa.json. Requiring the COMPILED module is why
// `npm run build` runs tsc before tsoa:spec.
//
// Standard library only (bar that one compiled module of our own); runs inside the backend
// container as part of the build.

const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");

const SPEC_PATH = resolve(__dirname, "..", "dist", "tsoa", "swagger.json");
const VOCABULARY_PATH = resolve(__dirname, "..", "dist", "doc", "apiVocabulary.js");

const REF_PREFIX = "#/components/schemas/";

// A schema is dropped from the list when its NAME says it is implementation detail.
// Name-based rather than a hand-kept list: a new response interface should disappear
// on its own, without anyone remembering to add it here.
const DROP_RULES = [
  { label: "interface", test: (name) => /^I[A-Z]/.test(name) },
  { label: "error", test: (name) => /Error$/.test(name) },
  { label: "record", test: (name) => /^Record_/.test(name) }
];

function shouldDrop(name) {
  return DROP_RULES.some((rule) => rule.test(name));
}

// Resolves one dropped name to the schema that replaces its references. Recurses,
// because a dropped schema routinely refers to another (IGetMessagesResponse holds
// IMessageResponseItem holds IMessageSender). `seen` turns a cycle among dropped
// schemas into a clear failure rather than a stack overflow — inlining a schema that
// contains itself is impossible, and the honest answer is to stop and say so.
function inlined(schemas, name, seen) {
  if (seen.includes(name)) {
    throw new Error(
      `Cannot inline ${name}: it is part of a reference cycle (${seen.concat(name).join(" -> ")}). ` +
      "A self-referential schema has to stay named — exclude it from DROP_RULES."
    );
  }
  return substitute(schemas[name], schemas, seen.concat(name));
}

// Walks any node of the spec and returns a copy with every reference to a dropped
// schema replaced by that schema's contents.
function substitute(node, schemas, seen) {
  if (Array.isArray(node)) return node.map((item) => substitute(item, schemas, seen));
  if (node === null || typeof node !== "object") return node;

  const ref = node.$ref;
  if (typeof ref === "string" && ref.startsWith(REF_PREFIX)) {
    const name = ref.slice(REF_PREFIX.length);
    if (shouldDrop(name)) {
      if (!schemas[name]) throw new Error(`Spec refers to ${ref}, which does not exist.`);
      // The sibling keys of a $ref (a description, say) are kept and win over the
      // inlined schema's own, exactly as an $ref override would read.
      const { $ref, ...siblings } = node;
      return { ...inlined(schemas, name, seen), ...substitute(siblings, schemas, seen) };
    }
  }

  const copy = {};
  for (const [key, value] of Object.entries(node)) {
    copy[key] = substitute(value, schemas, seen);
  }
  return copy;
}

// tsoa.json carries only the first paragraph of info.description; the vocabulary is appended
// here so the spec and the MCP handshake cannot disagree about what a `2` means.
function withVocabulary(description) {
  const { API_VOCABULARY_MARKDOWN } = require(VOCABULARY_PATH);
  return [description, API_VOCABULARY_MARKDOWN].join("\n\n");
}

function trim(spec, schemas, dropped) {
  const trimmed = substitute(spec, schemas, []);
  for (const name of dropped) delete trimmed.components.schemas[name];

  // Inlining runs over the WHOLE spec, so a leftover reference means a dropped schema
  // was reachable by a path this script does not walk. Fail loudly: a spec with a
  // dangling $ref renders as a broken page rather than a missing one.
  const leftover = JSON.stringify(trimmed).match(
    new RegExp(`${REF_PREFIX}[^"]+`, "g")
  ) || [];
  const dangling = leftover
    .map((ref) => ref.slice(REF_PREFIX.length))
    .filter((name) => !trimmed.components.schemas[name]);
  if (dangling.length > 0) {
    throw new Error(`Dangling references left after trimming: ${[...new Set(dangling)].join(", ")}`);
  }

  return trimmed;
}

function main() {
  const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
  const schemas = (spec.components && spec.components.schemas) || {};
  const dropped = Object.keys(schemas).filter(shouldDrop);

  // Unconditional: even with nothing to trim, the description still has to be written, so this
  // script always rewrites the spec rather than returning early.
  const rewritten = dropped.length === 0 ? spec : trim(spec, schemas, dropped);
  rewritten.info.description = withVocabulary(rewritten.info.description);

  writeFileSync(SPEC_PATH, JSON.stringify(rewritten, null, 2) + "\n");
  console.log(
    dropped.length === 0
      ? "trim-openapi: nothing to trim; wrote the API vocabulary into info.description."
      : `trim-openapi: inlined and removed ${dropped.length} schemas (${dropped.join(", ")}).`
  );
}

try {
  main();
} catch (error) {
  console.error(`trim-openapi: ${error.message}`);
  process.exit(1);
}
