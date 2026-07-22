// Counterpart constants files, kept in sync by hand — there is no shared package and no
// generation from the tsoa spec. If you change a shared value here, change it there too:
//   badhan-backend/src/constants/index.ts
//   badhan-frontend/src/mixins/constants.ts
// The three files are not exact mirrors: each carries only what its own project uses.
// This project's tests only reference hall indices and HTTP status codes, so it carries
// only those two maps — no DESIGNATIONS_INDEX, which has no call site here.

const HALLS_INDEX = {
  AHSANULLAH: 0,
  CHATRI: 1,
  NAZRUL: 2,
  RASHID: 3,
  SHEREBANGLA: 4,
  SUHRAWARDY: 5,
  TITUMIR: 6,
  ATTACHED: 7,
  UNKNOWN: 8,
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

module.exports = {
  HALLS_INDEX,
  HTTP_STATUS,
};
