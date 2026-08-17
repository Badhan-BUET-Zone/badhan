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

export const halls: string[] = ['Ahsan Ullah', 'Sabekun Nahar Sony', 'Kazi Nazrul Islam', 'Rashid', 'Sher-E-Bangla', 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)']
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

// The placeholder timestamp (2000-01-01T00:00:00Z) a comment carries when it has never
// been updated. Rendered as "Never Updated" rather than a date.
export const COMMENT_NEVER_UPDATED_TIME = 946684800000

// -1 is one value with two unrelated meanings in this project, so it gets two names.
// Sent to the search endpoints to mean "match any blood group" — the backend's
// BLOOD_GROUP_ANY, and the only one that crosses the API boundary.
export const BLOOD_GROUP_ANY = -1
// Rendered to the user as "All Negative" — a display bucket, not a wildcard.
export const BLOOD_GROUP_ALL_NEGATIVE = -1

// Sent to the donation report drill-down endpoints to mean "match any hall" — the
// backend's HALL_ANY. Corresponds to the report's 'All Halls' view.
export const HALL_ANY = -1

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

// The most donors the search-results footer will sweep in one go. The sweep is two
// requests per donor, so 200 is already 400 sequential round trips — past that the failure
// mode is not regret but a laptop closed mid-run, leaving the donors already patched
// patched. Over the cap the button refuses rather than chunking.
export const ARCHIVE_BATCH_LIMIT = 200

// The query keys every generated search link carries with an always-non-empty value, so a
// shared link can be told apart from an arbitrary query string. `name`, `batch` and
// `address` are excluded because they serialize to `?name=` when empty, and `archiveFlag`
// is excluded so links generated before it existed still auto-search. A presence check on
// these beats counting keys, which would have to move every time a filter is added.
export const SHARE_LINK_MARKER_KEYS = ['hall', 'radios', 'bloodGroup', 'availability', 'notAvailability']

// The one Badhan in the Play Store. There is no test listing — test copies are websites only
// (docs/manual/02-getting-the-app.md), so this URL is environment-independent on purpose.
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.mmmbadhan'

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409
} as const
