// Counterpart constants files, kept in sync by hand — there is no shared package and no
// generation from the tsoa spec. If you change a shared value here, change it there too:
//   badhan-backend/src/constants/index.ts
//   badhan-backend-test/tests/lib/utils/constants.js
// The three files are not exact mirrors: each carries only what its own project uses.
// This one has no validators, so it carries no department-code constants.

export const nullDepartment = 'NULL'
export const departments: string[] = [
  nullDepartment, 'Arch', 'Ch.E', nullDepartment,
  'CE', 'CSE', 'EEE', nullDepartment,
  'IPE', nullDepartment, 'ME', 'MME',
  'NAME', nullDepartment, nullDepartment, 'URP',
  'WRE', 'NCE', 'BME']

export const halls: string[] = ['Ahsanullah', 'Chatri', 'Nazrul', 'Rashid', 'Sher-e-Bangla', 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)']
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
export const DESIGNATIONS_INDEX = {
  DONOR: 0,
  VOLUNTEER: 1,
  HALL_ADMIN: 2,
  SUPER_ADMIN: 3
} as const

export const bloodGroups: string[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

// -1 is one value with two unrelated meanings in this project, so it gets two names.
// Sent to the search endpoints to mean "match any blood group" — the backend's
// BLOOD_GROUP_ANY, and the only one that crosses the API boundary.
export const BLOOD_GROUP_ANY = -1
// Rendered to the user as "All Negative" — a display bucket, not a wildcard.
export const BLOOD_GROUP_ALL_NEGATIVE = -1

// The three encoded rules that the raw hall comparisons express.
// The boundary is "whichever hall sits last in the list before Attached"; keeping it in
// these three definitions is what stops that fragility spreading to every call site.
export const isHallRestricted = (hall: number): boolean => hall <= HALLS_INDEX.TITUMIR
export const hasNoSpecificHall = (hall: number): boolean => hall > HALLS_INDEX.TITUMIR
export const isHallUnknown = (hall: number): boolean => hall === HALLS_INDEX.UNKNOWN

// The halls a donor can actually be assigned to, by name — everything before Attached.
// A helper rather than a slice bound, because the `7` in `halls.slice(0, 7)` is an
// exclusive index that names no hall and so no constant substitution alone can explain it.
export const restrictedHallNames = (): string[] => halls.slice(0, HALLS_INDEX.ATTACHED)

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  CONFLICT: 409
} as const
