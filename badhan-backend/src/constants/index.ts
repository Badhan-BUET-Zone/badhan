// Counterpart constants files, kept in sync by hand — there is no shared package and no
// generation from the tsoa spec. If you change a shared value here, change it there too:
//   badhan-frontend/src/mixins/constants.ts
//   badhan-backend-test/tests/lib/utils/constants.js
// The three files are not exact mirrors: each carries only what its own project uses.

export const departments: string[] = [
  'NULL', 'Arch (01)', 'Ch.E (02)', 'NULL',
  'CE (04)', 'CSE (05)', 'EEE (06)', 'NULL',
  'IPE (08)', 'NULL', 'ME (10)', 'MME (11)',
  'NAME (12)', 'NULL', 'NULL', 'URP (15)',
  'WRE (16)', 'NCE (17)', 'BME (18)']
export const halls: string[] = ['Ahsan Ullah', 'Sabekun Nahar Sony', 'Kazi Nazrul Islam', 'Dr. M. A. Rashid', 'Sher-E-Bangla', 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)']
// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back to number)
export const HALLS_INDEX = {
  AHSANULLAH: 0,
  CHATRI: 1,
  NAZRUL: 2,
  RASHID: 3,
  SHEREBANGLA: 4,
  SUHRAWARDY: 5,
  TITUMIR: 6,
  ATTACHED: 7,
  UNKNOWN: 8
} as const

export const designations: string[] = ['Donor', 'Volunteer', 'Hall Admin', 'Super Admin']
// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back to number)
export const DESIGNATIONS_INDEX = {
  DONOR: 0,
  VOLUNTEER: 1,
  HALL_ADMIN: 2,
  SUPER_ADMIN: 3
} as const

export const bloodGroups: string[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back to number)
export const BLOOD_GROUPS_INDEX = {
  A_POS: 0,
  A_NEG: 1,
  B_POS: 2,
  B_NEG: 3,
  O_POS: 4,
  O_NEG: 5,
  AB_POS: 6,
  AB_NEG: 7
} as const

// Sentinel accepted by the search endpoints to mean "match any blood group".
export const BLOOD_GROUP_ANY: number = -1

// Sentinel accepted by the report drill-down endpoints to mean "match any hall".
export const HALL_ANY: number = -1

// Derived sets — the single source of truth for the validators.
// Module-local: it exists only to feed HALL_INDICES_ALLOWED_FOR_DONOR.
const HALL_INDICES_ALL: number[] = Object.values(HALLS_INDEX)
// The halls a donor record may HOLD. Attached (7) is deliberately not one of them. (Unknown) IS
// one of them and must stay one: records created before plan11 carry it, and search, the report
// drill-down, the feedback model and feedback visibility are all keyed on this set.
// For what a NEW record may carry, use HALL_INDICES_ALLOWED_FOR_DONOR_CREATION below.
export const HALL_INDICES_ALLOWED_FOR_DONOR: number[] =
  HALL_INDICES_ALL.filter((hall: number): boolean => hall !== HALLS_INDEX.ATTACHED)
export const BLOOD_GROUP_INDICES: number[] = Object.values(BLOOD_GROUPS_INDEX)
export const DESIGNATION_INDICES: number[] = Object.values(DESIGNATIONS_INDEX)

// The public-contact rule: Rh-positive groups only. Listed by name, NOT derived from
// index parity — "even index means Rh-positive" is a coincidence of the ordering, and
// deriving from it would encode a rule nobody wrote down.
export const BLOOD_GROUP_INDICES_POSITIVE: number[] = [
  BLOOD_GROUPS_INDEX.A_POS, BLOOD_GROUPS_INDEX.B_POS,
  BLOOD_GROUPS_INDEX.O_POS, BLOOD_GROUPS_INDEX.AB_POS]

// Departments that actually exist: the non-NULL positions of `departments`.
// NOT for validation — see DEPARTMENT_CODES_FOR_VALIDATION below.
export const DEPARTMENT_CODES_WITH_NAMES: number[] =
  departments.flatMap((name: string, index: number): number[] => name === 'NULL' ? [] : [index])

// >>> The list every studentId validator uses. <<<
// Deliberately wider than DEPARTMENT_CODES_WITH_NAMES: code 0 has no department name
// (departments[0] is 'NULL') but is accepted today, so it is preserved rather than
// silently dropped. Narrowing this to DEPARTMENT_CODES_WITH_NAMES would start rejecting
// student IDs with department code 00 — a behaviour change, not a refactor.
export const DEPARTMENT_CODES_FOR_VALIDATION: number[] = [0, ...DEPARTMENT_CODES_WITH_NAMES]

// The three encoded rules that the raw hall comparisons express.
// The boundary is "whichever hall sits last in the list before Attached"; keeping it in
// these three definitions is what stops that fragility spreading to every call site.
export const isHallRestricted = (hall: number): boolean => hall <= HALLS_INDEX.TITUMIR
export const hasNoSpecificHall = (hall: number): boolean => hall > HALLS_INDEX.TITUMIR
export const isHallUnknown = (hall: number): boolean => hall === HALLS_INDEX.UNKNOWN

// The halls a registration QR code may be aimed at: the seven real ones and nothing else.
// Narrower than HALL_INDICES_ALLOWED_FOR_DONOR, which also admits (Unknown) — a donor RECORD
// may have no recorded hall, but a CODE is made for a place with people in it, and there is
// no room full of students from (Unknown) waiting to scan one.
// Equal in value to HALL_INDICES_ALLOWED_FOR_DONOR_CREATION below since plan11, by coincidence
// of two separate rules rather than by a shared definition. Keep them apart.
export const HALL_INDICES_ALLOWED_FOR_QR: number[] = HALL_INDICES_ALL.filter(isHallRestricted)

// The halls a donor record may be CREATED with. (Unknown) is out: plan11 stopped new records
// being born without a hall.
//
// This is NOT the set a record may HOLD. That is HALL_INDICES_ALLOWED_FOR_DONOR above, which
// keeps (Unknown) so the donors created before plan11 stay searchable, editable and archivable —
// the database was deliberately not migrated.
//
// Equal in value to HALL_INDICES_ALLOWED_FOR_QR today and deliberately not defined as it: a QR
// code excludes (Unknown) because a code is aimed at a room of people, this excludes it because
// a new record must name a hall. Two rules that happen to agree, and either may move alone.
export const HALL_INDICES_ALLOWED_FOR_DONOR_CREATION: number[] = HALL_INDICES_ALL.filter(isHallRestricted)

// tslint:disable-next-line:typedef  (`as const` supplies the type; an explicit one would widen it back to number)
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const

export const year2000TimeStamp: number = new Date('2000-01-01T00:00:00Z').getTime()
