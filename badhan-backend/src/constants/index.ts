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
export const halls: string[] = ['Ahsanullah', 'Chatri', 'Nazrul', 'Rashid', 'Sher-e-Bangla', 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)']
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
// Attached (7) is deliberately not an allowed hall for a donor record.
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
