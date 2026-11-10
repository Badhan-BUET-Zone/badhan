#!/usr/bin/env node
"use strict";

// Renders the OpenAPI spec as compact Markdown for AI assistants, served at /llms.txt.
//
//   node scripts/openapi-to-llms.js     (run by `npm run tsoa:spec`, after trim-openapi.js)
//
// Why a second rendering of the same spec: /openapi.json is about 200 KB, most of it JSON Schema
// punctuation and the response bodies trim-openapi.js deliberately inlines for Swagger UI. An
// assistant's fetch tool truncates or summarises a file that size, and the first thing it loses
// is the encoding vocabulary the setup file tells it to read. The same routes and shapes, written
// as TypeScript-style types, come to a fraction of that.
//
// GENERATED, NEVER HAND-EDITED: every route, parameter, type and example comes out of the spec, so
// this file cannot drift from /openapi.json. The one thing it leaves out on purpose is the
// status/statusCode/message envelope every response repeats — the header states it once instead.
//
// It fails the build rather than drop information: a schema keyword it does not know how to
// render is an error, not something to skip, because a field that silently vanishes here is a
// field an assistant will guess at.
//
// Standard library only; runs inside the backend container as part of the build.

const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");

const SPEC_PATH = resolve(__dirname, "..", "dist", "tsoa", "swagger.json");
const OUTPUT_PATH = resolve(__dirname, "..", "dist", "tsoa", "llms.txt");

const REF_PREFIX = "#/components/schemas/";
const METHOD_ORDER = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

// Every response body carries these three, with these types. A response schema that holds exactly
// them has nothing worth printing beyond its description and message.
const ENVELOPE = { status: "string", statusCode: "number", message: "string" };

// The schema keywords this script renders. Anything else throws — see the header.
const KNOWN_KEYWORDS = new Set([
  "type", "format", "properties", "required", "items", "additionalProperties", "$ref",
  "allOf", "anyOf", "oneOf", "enum", "nullable", "description", "example", "default",
  "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
  "minLength", "maxLength", "minItems", "maxItems", "uniqueItems", "deprecated",
  "readOnly", "writeOnly",
  // Carried by tsoa but adds nothing an assistant needs: the name is already the heading.
  "title"
]);

// `format: double` is how tsoa says "a TypeScript number"; the others are noise of the same kind.
const SILENT_FORMATS = new Set(["double", "float", "int32", "int64"]);

const json = (value) => JSON.stringify(value);

function checkKeywords(schema, where) {
  for (const key of Object.keys(schema)) {
    if (!KNOWN_KEYWORDS.has(key)) {
      throw new Error(
        `${where} uses the schema keyword "${key}", which openapi-to-llms.js does not render. ` +
        "Teach it to (add it to KNOWN_KEYWORDS and to typeOf or notesOf) rather than drop it."
      );
    }
  }
}

// The short facts about a value that do not fit in its type: what it means, its constraints, an
// example. Rendered as a trailing `// comment`.
// Doc comments tsoa copies out of TypeScript's own lib.d.ts when it meets a utility type. They
// describe the TypeScript type, not the API value, so they are dropped.
const TYPESCRIPT_LIB_DESCRIPTIONS = new Set([
  "Construct a type with a set of properties K of type T"
]);

function notesOf(schema) {
  const raw = schema.description ? schema.description.replace(/\s*\n\s*/g, " ").trim() : "";
  const description = TYPESCRIPT_LIB_DESCRIPTIONS.has(raw) ? "" : raw;
  const notes = [];
  if (schema.format && !SILENT_FORMATS.has(schema.format)) notes.push(`format ${schema.format}`);
  if (schema.pattern) notes.push(`pattern ${schema.pattern}`);
  const bounds = [
    ["minimum", ">="], ["exclusiveMinimum", ">"], ["maximum", "<="], ["exclusiveMaximum", "<"],
    ["minLength", "length >="], ["maxLength", "length <="], ["minItems", "items >="],
    ["maxItems", "items <="], ["multipleOf", "multiple of"]
  ];
  for (const [key, label] of bounds) {
    // exclusiveMinimum/Maximum are booleans in OpenAPI 3.0, numbers in 3.1.
    if (typeof schema[key] === "number") notes.push(`${label} ${schema[key]}`);
  }
  if (schema.uniqueItems) notes.push("unique items");
  if (schema.readOnly) notes.push("read-only");
  if (schema.writeOnly) notes.push("write-only");
  if (schema.deprecated) notes.push("DEPRECATED");
  if (schema.default !== undefined) notes.push(`default ${json(schema.default)}`);
  if (schema.example !== undefined) notes.push(`e.g. ${json(schema.example)}`);
  if (!description) return notes.join("; ");
  return notes.length ? `${description} (${notes.join("; ")})` : description;
}

const indent = (depth) => "  ".repeat(depth);

// Whether the item's type is a top-level union or intersection, which needs brackets before `[]`
// is appended so that `(A | B)[]` does not read as `A | B[]`. Decided from the schema, not the
// rendered string, because an object type has `|` inside it that does not count.
const isCompound = (schema) =>
  !!schema && schema !== true && !schema.$ref &&
  (schema.nullable || (schema.enum && schema.enum.length > 1) || !!(schema.allOf || schema.anyOf || schema.oneOf));

// One schema as a TypeScript-style type. Named schemas stay named (they are listed under Types),
// so a reference never expands and a cycle can never recurse.
function typeOf(schema, depth, where) {
  if (schema === true || schema === undefined) return "any";
  if (schema === false) return "never";
  checkKeywords(schema, where);

  let type;
  if (schema.$ref) {
    if (!schema.$ref.startsWith(REF_PREFIX)) throw new Error(`${where}: cannot render $ref ${schema.$ref}`);
    type = schema.$ref.slice(REF_PREFIX.length);
  } else if (schema.enum) {
    type = schema.enum.map(json).join(" | ");
  } else if (schema.allOf) {
    type = schema.allOf.map((part, i) => typeOf(part, depth, `${where}.allOf[${i}]`)).join(" & ");
  } else if (schema.anyOf || schema.oneOf) {
    const keyword = schema.anyOf ? "anyOf" : "oneOf";
    type = schema[keyword].map((part, i) => typeOf(part, depth, `${where}.${keyword}[${i}]`)).join(" | ");
  } else if (schema.type === "array") {
    const item = typeOf(schema.items, depth, `${where}.items`);
    type = (isCompound(schema.items) ? `(${item})` : item) + "[]";
  } else if (schema.type === "object" || schema.properties || schema.additionalProperties) {
    type = objectOf(schema, depth, where);
  } else if (schema.type) {
    type = schema.type;
  } else {
    // `{}`: tsoa's rendering of `any`. The response example, where there is one, shows the shape.
    type = "any";
  }

  return schema.nullable ? `${type} | null` : type;
}

function objectOf(schema, depth, where) {
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);
  const extra = schema.additionalProperties;
  // `Record<string, T>` sits where the object itself would, so T renders at this depth; an index
  // signature is one of the object's own lines, so it renders a level deeper.
  const extraType = (atDepth) => extra === undefined || extra === false
    ? null
    : typeOf(extra === true ? {} : extra, atDepth, `${where}.additionalProperties`);

  if (Object.keys(properties).length === 0) {
    return extraType(depth) ? `Record<string, ${extraType(depth)}>` : "object";
  }

  const lines = ["{"];
  for (const [name, property] of Object.entries(properties)) {
    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : json(name);
    const type = typeOf(property, depth + 1, `${where}.${name}`);
    const notes = property === true ? "" : notesOf(property);
    const line = `${indent(depth + 1)}${key}${required.has(name) ? "" : "?"}: ${type}`;
    // A multi-line type would push a trailing comment far from its name; put it above instead.
    if (notes && type.includes("\n")) lines.push(`${indent(depth + 1)}// ${notes}`, line);
    else lines.push(notes ? `${line}  // ${notes}` : line);
  }
  if (extraType(depth + 1)) lines.push(`${indent(depth + 1)}[key: string]: ${extraType(depth + 1)}`);
  lines.push(`${indent(depth)}}`);
  return lines.join("\n");
}

const codeBlock = (language, body) => ["```" + language, body, "```"].join("\n");

// The envelope fields, removed when they are exactly the envelope, so each response shows only its
// payload. Returns null when nothing but the envelope is left.
function withoutEnvelope(schema) {
  if (!schema || !schema.properties || schema.$ref) return schema;
  const isEnvelope = ([name, property]) =>
    ENVELOPE[name] !== undefined && property && property.type === ENVELOPE[name] && !property.enum;
  const entries = Object.entries(schema.properties);
  if (!Object.keys(ENVELOPE).every((name) => entries.some((entry) => entry[0] === name && isEnvelope(entry)))) {
    return schema;
  }
  const payload = entries.filter((entry) => !isEnvelope(entry));
  if (payload.length === 0 && !schema.additionalProperties) return null;
  return {
    ...schema,
    properties: Object.fromEntries(payload),
    required: (schema.required || []).filter((name) => ENVELOPE[name] === undefined)
  };
}

// The examples a response or body carries, in either OpenAPI form.
function examplesOf(media) {
  if (media.example !== undefined) return [media.example];
  return Object.values(media.examples || {}).map((example) => example.value).filter((v) => v !== undefined);
}

function renderParameters(operation, where) {
  const lines = [];
  for (const parameter of operation.parameters || []) {
    if (parameter.$ref) throw new Error(`${where}: cannot render parameter $ref ${parameter.$ref}`);
    const schema = parameter.schema || {};
    const type = typeOf(schema, 0, `${where} parameter ${parameter.name}`);
    const notes = [parameter.description, notesOf(schema)].filter(Boolean).join("; ");
    const required = parameter.required ? "required" : "optional";
    lines.push(`- \`${parameter.name}\` (${parameter.in}, ${required}): ${type}${notes ? ` — ${notes}` : ""}`);
  }
  return lines.length ? ["Parameters:", ...lines].join("\n") : null;
}

function renderBody(operation, where) {
  const body = operation.requestBody;
  if (!body) return null;
  if (body.$ref) throw new Error(`${where}: cannot render requestBody $ref ${body.$ref}`);
  const parts = [];
  for (const [contentType, media] of Object.entries(body.content || {})) {
    parts.push(`Body (${contentType}, ${body.required ? "required" : "optional"}):`);
    if (body.description) parts.push(body.description);
    if (media.schema) parts.push(codeBlock("ts", typeOf(media.schema, 0, `${where} body`)));
    for (const example of examplesOf(media)) parts.push("Example: `" + json(example) + "`");
  }
  return parts.join("\n");
}

function renderResponses(operation, where) {
  const parts = ["Responses:"];
  for (const [code, response] of Object.entries(operation.responses || {})) {
    if (response.$ref) throw new Error(`${where}: cannot render response $ref ${response.$ref}`);
    const content = Object.entries(response.content || {});
    const success = /^2/.test(code);

    if (content.length === 0) {
      parts.push(`- **${code}** ${response.description || ""}`.trimEnd());
      continue;
    }

    for (const [contentType, media] of content) {
      const isJSON = /json/.test(contentType);
      const payload = isJSON ? withoutEnvelope(media.schema) : media.schema;
      const examples = examplesOf(media);
      const label = `- **${code}** ${response.description || ""}`.trimEnd() + (isJSON ? "" : ` (${contentType})`);

      // An error with nothing but the envelope: its message is the one thing worth printing,
      // since the setup file tells the assistant to report it verbatim.
      if (!payload && !success) {
        const messages = examples.map((example) => example && example.message).filter(Boolean);
        parts.push(messages.length ? `${label} — ${messages.map((m) => `"${m}"`).join(", ")}` : label);
        continue;
      }

      parts.push(label);
      const type = payload && isJSON ? typeOf(payload, 0, `${where} ${code}`) : null;
      if (type) parts.push(codeBlock("ts", type));
      // An example only where the type leaves something undescribed: beside a fully typed shape
      // it repeats what the type already says, and the examples alone are a fifth of the file.
      if (!type || /\bany\b/.test(type)) {
        for (const example of examples) parts.push("Example: `" + json(example) + "`");
      }
    }
  }
  return parts.join("\n");
}

function operationsOf(spec) {
  const operations = [];
  for (const [path, item] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (!METHOD_ORDER.includes(method)) continue;
      const tag = (operation.tags && operation.tags[0]) || "Other";
      operations.push({ path, method, operation, tag });
    }
  }
  return operations.sort((a, b) =>
    a.tag.localeCompare(b.tag) ||
    a.path.localeCompare(b.path) ||
    METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method)
  );
}

const summaryOf = (operation) =>
  (operation.summary || operation.description || "").split("\n")[0].trim();

function renderAuthentication(spec) {
  const schemes = (spec.components && spec.components.securitySchemes) || {};
  const lines = [];
  for (const scheme of Object.values(schemes)) {
    if (scheme.type === "apiKey") {
      lines.push(`Send the token in the \`${scheme.name}\` ${scheme.in}. It is not an \`Authorization: Bearer\` header.`);
    } else {
      lines.push(`- ${json(scheme)}`);
    }
  }
  return lines.length ? ["## Authentication", "", ...lines].join("\n") : null;
}

function render(spec) {
  const info = spec.info || {};
  const operations = operationsOf(spec);
  const schemas = (spec.components && spec.components.schemas) || {};
  const out = [];

  out.push(
    `# ${info.title || "API"}${info.version ? ` (v${info.version})` : ""}`,
    "",
    "> Generated from /openapi.json on every build, for AI assistants: every route, parameter,",
    "> request body and response shape, written as TypeScript-style types. /openapi.json says the",
    "> same in JSON Schema, at many times the size.",
    "",
    "How to read it: `?` marks an optional field; `// comments` carry the meaning, the allowed",
    "values and an example; a named type such as `Donors` is defined under **Types**; `any` means",
    "the spec does not describe that value, so read the example beside it. Every response body also",
    "carries `status` (`\"OK\"` or `\"ERROR\"`), `statusCode` and `message`; the shapes below leave",
    "those three out, and each error lists the `message` it answers with.",
    "",
    (info.description || "").trim()
  );

  if (spec.servers && spec.servers.length) {
    out.push("", "## Servers", "");
    for (const server of spec.servers) {
      out.push(`- ${server.url}${server.description ? ` — ${server.description}` : ""}`);
    }
  }

  const authentication = renderAuthentication(spec);
  if (authentication) out.push("", authentication);

  out.push("", "## Endpoint index", "");
  for (const { method, path, operation } of operations) {
    out.push(`- \`${method.toUpperCase()} ${path}\` — ${summaryOf(operation)}`);
  }

  if (Object.keys(schemas).length) {
    const types = Object.entries(schemas).map(([name, schema]) => {
      const notes = notesOf(schema);
      return `${notes ? `// ${notes}\n` : ""}type ${name} = ${typeOf(schema, 0, name)}`;
    });
    out.push("", "## Types", "", codeBlock("ts", types.join("\n\n")));
  }

  let currentTag = null;
  for (const { method, path, operation, tag } of operations) {
    const where = `${method.toUpperCase()} ${path}`;
    if (tag !== currentTag) {
      out.push("", `## ${tag}`);
      currentTag = tag;
    }
    out.push("", `### ${where}`, "");
    if (operation.deprecated) out.push("**Deprecated.**", "");
    if (operation.summary) out.push(operation.summary, "");
    if (operation.description) out.push(operation.description.trim(), "");
    for (const section of [renderParameters(operation, where), renderBody(operation, where), renderResponses(operation, where)]) {
      if (section) out.push(section, "");
    }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function main() {
  const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
  const markdown = render(spec);
  writeFileSync(OUTPUT_PATH, markdown);
  const operations = operationsOf(spec).length;
  console.log(
    `openapi-to-llms: wrote ${operations} operations to llms.txt ` +
    `(${Math.round(Buffer.byteLength(markdown) / 1024)} KB, from a ` +
    `${Math.round(Buffer.byteLength(JSON.stringify(spec, null, 2)) / 1024)} KB spec).`
  );
}

try {
  main();
} catch (error) {
  console.error(`openapi-to-llms: ${error.message}`);
  process.exit(1);
}
