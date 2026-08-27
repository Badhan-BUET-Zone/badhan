import Papa from 'papaparse'
import { bloodGroups, departments } from '@/mixins/constants'
import type { POSTDonorsPayloadInterface } from '@/api'

// Pure parse + normalize + validate core for the CSV bulk donor uploader.
// No UI, no network. Each row comes back as { line, raw, normalized, errors, status };
// the view routes by `status` and renders `errors` inline. See plans/phases.md Phase 2.

// Canonical header row. Column order in the file does not matter — columns are matched
// by header name (case-insensitive, trimmed) back onto these canonical names.
export const CANONICAL_HEADERS: string[] = [
  'name', 'fatherName', 'motherName', 'phone', 'studentId', 'bloodGroup', 'hall', 'roomNumber', 'address',
  'comment', 'donationCount', 'lastDonation', 'plateletDonationCount',
  'lastPlateletDonation', 'availableToAll'
]

const CANONICAL_SET = new Set(CANONICAL_HEADERS)
const CANONICAL_BY_LOWER: Record<string, string> = CANONICAL_HEADERS.reduce(
  (acc, h) => { acc[h.toLowerCase()] = h; return acc },
  {} as Record<string, string>
)

// CSV hall label -> backend hall index. The seven residential halls and nothing else: neither
// `Attached` nor `Unknown` is accepted. `Unknown` used to be, mapping to the app's internal
// `(Unknown)` (index 8); an import is a creation, and a creation must name a hall. A row still
// naming it is reported broken by the same "not a recognised hall" message as any other typo.
const CSV_HALL_TO_INDEX: Record<string, number> = {
  'Ahsan Ullah': 0,
  'Sabekun Nahar Sony': 1,
  'Kazi Nazrul Islam': 2,
  'Dr. M. A. Rashid': 3,
  'Sher-E-Bangla': 4,
  Suhrawardy: 5,
  Titumir: 6
}

// Dates are `DD/MM/YY` — day, month and 2-digit year separated by `/`, e.g. `23/7/26`.
// The 2-digit year is interpreted as 20YY.
const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/

export interface DonorCsvFieldError {
  field: string
  message: string
}

export type DonorCsvRowStatus = 'valid' | 'broken'

export interface DonorCsvRow {
  /** 1-based CSV line number (header is line 1, first donor row is line 2). */
  line: number
  /** Original raw cell values keyed by canonical header — used for the failed-rows export. */
  raw: Record<string, string>
  /** API-ready payload; null unless the row is fully valid. */
  normalized: POSTDonorsPayloadInterface | null
  errors: DonorCsvFieldError[]
  status: DonorCsvRowStatus
}

export interface DonorCsvFileFailure {
  /** A single whole-file failure message. When present, `rows` is absent. */
  fileError: string
}

export interface DonorCsvParseSuccess {
  rows: DonorCsvRow[]
}

export type DonorCsvParseResult = DonorCsvFileFailure | DonorCsvParseSuccess

// Strict `DD/MM/YY` -> UTC-midnight epoch ms. Same conversion single-donor
// creation makes (new Date('YYYY-MM-DD').getTime()), so stored timestamps match exactly.
function parseStrictDate (value: string): { epoch: number } | { error: string } {
  const m = DATE_RE.exec(value)
  if (!m) {
    return { error: `\`${value}\` is not a valid date (expected \`DD/MM/YY\`, e.g. \`23/7/26\`)` }
  }
  const day = parseInt(m[1], 10)
  const monthIndex = parseInt(m[2], 10) - 1
  const year = 2000 + parseInt(m[3], 10)
  if (monthIndex < 0 || monthIndex > 11) {
    return { error: `\`${value}\` is not a real date` }
  }
  // Day 0 of the next month = last day of this month, leap years included.
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  if (day < 1 || day > daysInMonth) {
    return { error: `\`${value}\` is not a real date` }
  }
  const iso = `${String(year).padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return { epoch: new Date(iso).getTime() }
}

function validateRow (raw: Record<string, string>): { errors: DonorCsvFieldError[]; normalized: POSTDonorsPayloadInterface | null } {
  const errors: DonorCsvFieldError[] = []
  const push = (field: string, message: string) => errors.push({ field, message })

  // name — client checks non-blank only; the 3–100-char rule is left to the server.
  const name = (raw.name ?? '').trim()
  if (name === '') push('name', 'name is required')

  // phone — exactly 11 digits, 01XXXXXXXXX, nothing else. Sent to the API as the
  // 13-digit 8801XXXXXXXXX form (leading `0` replaced with `880`).
  const phoneRaw = (raw.phone ?? '').trim()
  let phone = NaN
  if (!/^01\d{9}$/.test(phoneRaw)) {
    push('phone', `\`${raw.phone ?? ''}\` is not a valid Bangladeshi number (expected 11 digits starting \`0\`)`)
  } else {
    phone = Number('880' + phoneRaw.slice(1))
  }

  // studentId — the single-donor client checks only: 7 numeric digits and dept code
  // substr(2,2) <= departments.length. No batch-year / backend dept-list check.
  const sidRaw = (raw.studentId ?? '').trim()
  let studentId = NaN
  if (!/^\d{7}$/.test(sidRaw)) {
    push('studentId', `\`${raw.studentId ?? ''}\` must be exactly 7 digits`)
  } else if (parseInt(sidRaw.slice(2, 4), 10) > departments.length) {
    push('studentId', `\`${sidRaw}\` has an invalid department code (\`${sidRaw.slice(2, 4)}\`)`)
  } else {
    studentId = Number(sidRaw)
  }

  // bloodGroup — labels only, exact case.
  const bgRaw = (raw.bloodGroup ?? '').trim()
  const bloodGroup = bloodGroups.indexOf(bgRaw)
  if (bloodGroup === -1) push('bloodGroup', `\`${raw.bloodGroup ?? ''}\` is not a recognised blood group`)

  // hall — hall names only, exact case; numeric codes and `Attached` rejected.
  const hallRaw = (raw.hall ?? '').trim()
  const hasHall = Object.prototype.hasOwnProperty.call(CSV_HALL_TO_INDEX, hallRaw)
  const hall = hasHall ? CSV_HALL_TO_INDEX[hallRaw] : -1
  if (!hasHall) push('hall', `\`${raw.hall ?? ''}\` is not a recognised hall`)

  // free-text — trimmed; comment newlines collapsed; blank auto-filled with `(Unknown)`.
  const roomNumber = (raw.roomNumber ?? '').trim() || '(Unknown)'
  const address = (raw.address ?? '').trim() || '(Unknown)'
  const comment = (raw.comment ?? '').replace(/[\r\n]+/g, ' ').trim() || '(Unknown)'
  const fatherName = (raw.fatherName ?? '').trim() || '(Unknown)'
  const motherName = (raw.motherName ?? '').trim() || '(Unknown)'

  // donationCount — required, integer 0–99. Blank rejected.
  const dcRaw = (raw.donationCount ?? '').trim()
  let donationCount = NaN
  if (dcRaw === '') push('donationCount', 'donationCount is required (use `0` if none)')
  else if (!/^\d{1,2}$/.test(dcRaw)) push('donationCount', `\`${raw.donationCount ?? ''}\` must be an integer between 0 and 99`)
  else donationCount = parseInt(dcRaw, 10)

  // lastDonation — blank => 0; otherwise strict date.
  const ldRaw = (raw.lastDonation ?? '').trim()
  let lastDonation = 0
  if (ldRaw !== '') {
    const d = parseStrictDate(ldRaw)
    if ('error' in d) push('lastDonation', d.error)
    else lastDonation = d.epoch
  }

  // Bidirectional: date present iff count > 0.
  if (!isNaN(donationCount)) {
    if (donationCount > 0 && ldRaw === '') push('lastDonation', 'lastDonation must be given when donationCount is non-zero')
    if (donationCount === 0 && ldRaw !== '') push('donationCount', 'donationCount must be non-zero when lastDonation is given')
  }

  // plateletDonationCount — required, integer 0–99. Blank rejected.
  const pcRaw = (raw.plateletDonationCount ?? '').trim()
  let plateletDonationCount = NaN
  if (pcRaw === '') push('plateletDonationCount', 'plateletDonationCount is required (use `0` if none)')
  else if (!/^\d{1,2}$/.test(pcRaw)) push('plateletDonationCount', `\`${raw.plateletDonationCount ?? ''}\` must be an integer between 0 and 99`)
  else plateletDonationCount = parseInt(pcRaw, 10)

  // lastPlateletDonation — same rule/form as lastDonation, against plateletDonationCount.
  const lpRaw = (raw.lastPlateletDonation ?? '').trim()
  let lastPlateletDonation = 0
  if (lpRaw !== '') {
    const d = parseStrictDate(lpRaw)
    if ('error' in d) push('lastPlateletDonation', d.error)
    else lastPlateletDonation = d.epoch
  }
  if (!isNaN(plateletDonationCount)) {
    if (plateletDonationCount > 0 && lpRaw === '') push('lastPlateletDonation', 'lastPlateletDonation must be given when plateletDonationCount is non-zero')
    if (plateletDonationCount === 0 && lpRaw !== '') push('plateletDonationCount', 'plateletDonationCount must be non-zero when lastPlateletDonation is given')
  }

  // availableToAll — `yes`/`no` only.
  const attRaw = (raw.availableToAll ?? '').trim()
  let availableToAll: boolean | null = null
  if (attRaw === 'yes') availableToAll = true
  else if (attRaw === 'no') availableToAll = false
  else push('availableToAll', `\`${raw.availableToAll ?? ''}\` must be \`yes\` or \`no\``)

  // No hall/availableToAll pairing rule: `Unknown` is no longer an accepted hall, so there is no
  // longer a hall that forces `yes`. Removed rather than left in place — `CSV_HALL_TO_INDEX.Unknown`
  // is now `undefined`, and the comparison against it would hold for every unrecognised hall.

  if (errors.length > 0) return { errors, normalized: null }

  // CSV counts are totals; the API's extra*Count is total minus the one implied by the date.
  const normalized: POSTDonorsPayloadInterface = {
    name,
    fatherName,
    motherName,
    phone,
    bloodGroup,
    hall,
    studentId,
    address,
    roomNumber,
    comment,
    lastDonation,
    extraDonationCount: donationCount === 0 ? 0 : donationCount - 1,
    availableToAll: availableToAll as boolean,
    lastPlateletDonation,
    extraPlateletDonationCount: plateletDonationCount === 0 ? 0 : plateletDonationCount - 1
  }
  return { errors, normalized }
}

/**
 * Parse a UTF-8 CSV string of donors. Returns either a single whole-file failure
 * ({ fileError }) or a list of per-row results ({ rows }). File-level failures come
 * first, then structural (column) failures, then per-row validation / ragged-row errors.
 */
export function parseDonorCsv (text: string): DonorCsvParseResult {
  // 1. File-level: empty (BOM-only counts as empty).
  if (text.replace(/^\uFEFF/, '').trim() === '') {
    return { fileError: 'The file is empty.' }
  }

  // Drop a single trailing line terminator so the file's final newline isn't parsed as an
  // extra blank row (skipEmptyLines:false would otherwise phantom one in). Genuine interior
  // blank rows \u2014 and multiple trailing blank lines \u2014 are still preserved and surfaced.
  const body = text.replace(/\r?\n$/, '')

  const results = Papa.parse<Record<string, string>>(body, {
    header: true,
    skipEmptyLines: false,
    delimiter: ',', // comma forced, never auto-detected
    transformHeader: (h: string) => {
      const key = h.trim().toLowerCase()
      return CANONICAL_BY_LOWER[key] ?? h.trim()
    }
  })

  // 1b. Fatal parse errors (bad quoting / delimiter) fail the whole file.
  const fatal = results.errors.find(e => e.type === 'Quotes' || e.type === 'Delimiter')
  if (fatal) {
    const what = fatal.type === 'Quotes'
      ? (fatal.code === 'MissingQuotes' ? 'unclosed quote' : 'invalid quotes')
      : 'could not determine the delimiter'
    const where = typeof fatal.row === 'number' ? ` on line ${fatal.row + 2}` : ''
    return { fileError: `Could not parse CSV: ${what}${where}.` }
  }

  const fields = results.meta.fields ?? []

  // 1c. Empty / header-only files are hard errors.
  if (results.data.length === 0) {
    return { fileError: 'The file has no donor rows — it needs a header row followed by at least one row.' }
  }

  // 2. Structural (column) failures, aggregated into one alert.
  const structural: string[] = []
  const missing = CANONICAL_HEADERS.filter(h => !fields.includes(h))
  if (missing.length) structural.push(...missing.map(h => `Missing required column \`${h}\`.`))
  const unknown = fields.filter(f => !CANONICAL_SET.has(f))
  if (unknown.length) {
    structural.push(`Unknown column${unknown.length > 1 ? 's' : ''} ${unknown.map(u => `\`${u}\``).join(', ')}; expected: ${CANONICAL_HEADERS.join(', ')}.`)
  }
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const f of fields) {
    if (seen.has(f)) dups.add(f)
    else seen.add(f)
  }
  if (dups.size) structural.push(...[...dups].map(d => `Duplicate column \`${d}\`.`))
  if (structural.length) return { fileError: structural.join(' ') }

  // 3. Per-row. Ragged rows (cell count != column count) are per-row errors, caught on
  //    the cell count directly before any field validation.
  const mismatch = new Map<number, string>()
  for (const e of results.errors) {
    if (e.type === 'FieldMismatch' && typeof e.row === 'number') mismatch.set(e.row, e.code)
  }

  const rows: DonorCsvRow[] = results.data.map((dataRow, i) => {
    const line = i + 2
    const raw: Record<string, string> = {}
    for (const h of CANONICAL_HEADERS) raw[h] = dataRow[h] != null ? String(dataRow[h]) : ''

    const parsedExtra = (dataRow as Record<string, unknown>).__parsed_extra
    const hasExtra = Array.isArray(parsedExtra) && parsedExtra.length > 0
    if (mismatch.get(i) === 'TooManyFields' || hasExtra) {
      return {
        line,
        raw,
        normalized: null,
        status: 'broken',
        errors: [{ field: 'row', message: 'row has more values than columns — check for an unescaped comma; wrap the field in double quotes.' }]
      }
    }
    if (mismatch.get(i) === 'TooFewFields') {
      return {
        line,
        raw,
        normalized: null,
        status: 'broken',
        errors: [{ field: 'row', message: 'row has fewer values than columns — a value is missing or a field was left off.' }]
      }
    }

    const { errors, normalized } = validateRow(raw)
    return { line, raw, normalized, errors, status: errors.length === 0 ? 'valid' : 'broken' }
  })

  return { rows }
}

// Sample CSV for the "Download demo CSV" button (plans/phases.md Phase 6.2). Three valid
// rows exercising every column — one fully-populated, one availableToAll, one plain — each
// already in the single accepted form and canonical case, so copying from it can never
// produce a case/format rejection. The comments mark the rows as throwaway data.
// The second row used to demonstrate hall=Unknown; that hall is no longer accepted, and what
// it was really being used for — a donor every hall can contact — is availableToAll=yes.
export const DEMO_CSV: string = [
  CANONICAL_HEADERS.join(','),
  'Demo Donor One,Demo Father One,Demo Mother One,01712345678,1605011,A+,Sher-E-Bangla,304,"Dhanmondi, Dhaka",Sample row - delete before uploading,3,20/11/24,1,14/2/25,no',
  'Demo Donor Two,Demo Father Two,Demo Mother Two,01898765432,1805062,O-,Ahsan Ullah,N/A,Chattogram,Contactable by every hall - availableToAll is yes,0,,0,,yes',
  'Demo Donor Three,Demo Father Three,Demo Mother Three,01911223344,2000011,B+,Titumir,112,Mirpur,No donation history,0,,0,,no'
].join('\n') + '\n'

/**
 * Serialize raw donor rows back to a CSV string under the canonical header — no error
 * column, no added fields — byte-compatible with the uploader so the result is directly
 * re-uploadable. Used by the "Download failed rows as CSV" export (Phase 6.3).
 */
export function toDonorCsv (rawRows: Array<Record<string, string>>): string {
  return Papa.unparse({ fields: CANONICAL_HEADERS, data: rawRows }, { newline: '\n' }) + '\n'
}
