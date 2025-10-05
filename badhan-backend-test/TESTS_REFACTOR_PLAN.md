### Badhan Backend Tests — Refactor Plan

This plan proposes actionable steps to improve maintainability, consistency, and speed of the backend test suite in `badhan-backend-test`.

### Goals
- **Consistency**: Unify helpers, flows, and schema validation patterns.
- **Maintainability**: Reduce duplication; make tests self-explanatory.
- **Observability**: Keep useful logs while simplifying runner/reporter.
- **Speed**: Enable focused runs and parallelization when safe.

### Proposed Architecture
- **tests/runtime/**
  - `env.ts|js`: Centralize environment loading/validation (currently `config/index.js`).
  - `axios.ts|js`: Create axios instances and base-URL toggles (migrate from `api/index.js`).
  - `jest.setup.ts|js`: Common Jest hooks, custom matchers, and global utilities (merge `setup-after-env.js`).
  - `global-setup.ts|js` and `global-teardown.ts|js`: Keep, but implement reset hooks behind flags.

- **tests/lib/**
  - `schemas/…`: Keep JSON schema files grouped by domain; add index files to avoid deep import paths.
  - `operations/…`: Keep HTTP primitives and typed helpers (current `operations.js`) split by domain: `donors.ts`, `donations.ts`, `users.ts`, `logs.ts`, `search.ts`, `activeDonors.ts`, `plateletDonations.ts`, `publicContacts.ts`, plus `http.ts` for generic `authedGet/Post/Patch/Delete` and error helpers.
  - `flows/…`: Composite flows (current `flows.js`) organized per use-case; avoid embedding assertions beyond schema validations.
  - `utils/…`: `helpers.ts|js` (e.g., `sleep`, `uniquePhone`), data builders/factories, date helpers.

- **tests/specs/**
  - Feature folders map to API domains (already mostly aligned). Each spec should:
    - Use data builders from `lib/utils`.
    - Use `lib/operations` and `lib/flows` exclusively for network calls.
    - Keep assertions focused on business expectations; schema checks happen in operations.

### Concrete Refactors
1) **Unify HTTP helpers and schema validation**
   - Extract `authedGet/Post/Patch/Delete` and `expect*Error` into `lib/http.ts|js`.
   - Move all schema validations inside operations to avoid repetition inside specs.
   - Add `validateSchema(data, schema)` as a single export used internally.

2) **Split `operations.js` by domain**
   - donors: create, fetch, search, designation, comments, duplicate-check, new donors.
   - donations: create/delete donation, reports.
   - plateletDonations: CRUD/report.
   - users: sign-in/out, logins, password.
   - logs: fetch/delete logs, statistics.
   - publicContacts: CRUD.
   - activeDonors: mark active.
   - Each file imports shared `http` and domain schemas via `lib/schemas/<domain>`.

3) **Introduce test data builders**
   - `lib/utils/builders.ts|js` with pure functions: `buildDonor(overrides)`, `buildDonation(overrides)`, token holders, date helpers.
   - Replace scattered inline donor objects in specs with builders for clarity and reuse.

4) **Normalize configuration and base URL switching**
   - Promote `api/index.js` into `runtime/axios.ts|js`.
   - Use env vars with safe defaults: `API_BASE_URL`, `API_GUEST_PREFIX_ENABLED`.
   - Provide `enableGuestAPI()` as a no-op wrapper reading from config to avoid accidental state leaks across tests; ensure per-test isolation.

5) **Stabilize global setup/teardown**
   - Implement `global-setup.js` to optionally reset external state:
     - Respect `NO_RESET` and `BACKUP_RESET_URL` envs (already scaffolded).
     - Add retries with backoff and a clear console summary.
   - `global-teardown.js`: currently adequate; ensure idempotency.

6) **Improve custom reporter and logs**
   - Keep per-test log files; add JSON summary for tooling (`logs/summary.json`).
   - Include request path and status in failure logs when available.
   - Add env guard to disable file I/O with `NO_FILE_LOGS=1` for CI speed.

7) **Consistency rules (lint + naming)**
   - Add ESLint + Prettier config aligned with Node Jest tests.
   - Enforce naming: files in `lib/` are verbs for operations, nouns for schemas; specs end with `.test.js`.

8) **Iisolation**
   - Ensure each spec uses unique resources (e.g., `uniquePhone()`), avoid cross-test coupling.

9) **Documentation**
   - Add `tests/README.md` describing folder layout, how to add a new spec, and common utilities.
   - Document environment variables and flags: `API_BASE_URL`, `NO_RESET`, `BACKUP_RESET_URL`, `NO_FILE_LOGS`, `JEST_MAX_WORKERS`.

### Step-by-Step Migration Guide
1. Create `tests/lib/{http,utils,flows,operations,schemas}` and `tests/runtime` directories.
2. Move `helpers.js` to `lib/utils/helpers.ts|js`; export `sleep`, `uniquePhone`.
3. Move axios creation from `api/index.js` to `runtime/axios.ts|js` and re-export from `lib/http`.
4. Split `operations.js` into domain files; keep public API identical at first via an index barrel.
5. Update imports in `flows.js` and specs to use new `lib` paths.
6. Implement `global-setup.js` reset logic with retries; keep gated by env flags.
7. Add ESLint/Prettier; run autofix; resolve remaining issues.
8. Remove unused helpers; consolidate duplicated schema imports with domain barrels.
9. Update `README.md` with new structure and usage examples.

### Check whether refactor is working
- Run the backend test script as follows and make sure that **all 115 tests pass**
- Run `cd /Users/mirmahathirmohammad/Documents/badhan/badhan-backend-test && node start`
- The result should be:

```
(base) Mirs-MacBook-Pro:badhan-backend-test mirmahathirmohammad$ node start
[start] Badhan Backend Test Runner
[start] ===========================
[start] Jest configuration validated
[start] Setting up log directories: /Users/mirmahathirmohammad/Documents/badhan/badhan-backend-test/logs
[start] Starting test execution...
[start] Running all tests
Determining test suites to run...Tests are running...
Test Summary =>
Total: 115
Passed: 115
Failed: 0
Duration(ms): 34703
[start] All tests completed successfully
[start] Test execution completed with success: true
```