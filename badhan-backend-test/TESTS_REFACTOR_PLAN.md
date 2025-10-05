### Badhan Backend Tests — Refactor Plan

Below are the refactors organized as large, numbered items. Each item explains the change and the exact actions to take.

### 1) Establish a clear folder architecture
- What: Introduce a predictable layout to separate runtime wiring, reusable libraries, and specs.
- Why: Improves discoverability, reduces import depth, and clarifies boundaries between primitives (http), domain operations, flows, and specs.
- Do:
  - Create directories:
    - `tests/runtime/` → env loading, axios instances, Jest setup, global hooks.
    - `tests/lib/` → schemas, operations (by domain), generic http helpers, flows, utils.
    - `tests/specs/` → actual test files organized by API domain (existing feature folders can be moved here gradually).
  - Keep `jest.config.js` roots as `tests/` (already configured) so existing and migrated specs both run.
- Definition of Done:
  - Directories exist and are referenced in imports.
  - At least one spec runs from `tests/specs/` with green results.

### 2) Centralize configuration and Axios setup
- What: Keep a single source of truth for base URLs, guest mode, and axios instances.
- Why: Prevents base URL drift and cross-test state leaks; enables env-driven toggles for CI/local.
- Do:
  - Move `api/index.js` → `tests/runtime/axios.js` and export `badhanAxios`, `firebaseAxios`.
  - Support env vars: `API_BASE_URL`, fallback to `http://localhost:3000` and Docker detection.
  - Add `enableGuestAPI()` and `resetBaseURL()` in a way that is safe per-test (no global shared mutations across specs).
  - Recommend calling `resetBaseURL()` in `beforeEach` of specs that toggle guest mode.
- Definition of Done:
  - All axios consumers import from `tests/runtime/axios.js`.
  - Guest-enabled specs do not impact subsequent specs (no leaked `/guest` prefix).

### 3) Unify HTTP helpers and schema validation
- What: Avoid repeating request boilerplate and validation logic in specs.
- Why: Eliminates duplicated axios calls and error handling; centralizes JSON schema validation.
- Do:
  - Create `tests/lib/http.js` with `authedGet/Post/Patch/Delete`, `guestGet/Post/Patch/Delete`, and `expect*Error` helpers.
  - Keep `validateSchema(data, schema)` as a single internal helper used by operations.
  - Ensure all network calls inside operations validate against the correct schema.
- Definition of Done:
  - Specs no longer call axios directly; they go through operations/flows (which use `lib/http`).
  - Error-path assertions consistently use `expect*Error` helpers.

### 4) Split `operations.js` by domain (thin helpers)
- What: Make operations discoverable and maintainable by grouping per API area.
- Why: Smaller, focused modules simplify navigation, code ownership, and reviewing changes.
- Do:
  - Create domain files in `tests/lib/operations/`: `donors`, `donations`, `plateletDonations`, `users`, `logs`, `publicContacts`, `activeDonors`, `search`.
  - Each domain uses `lib/http` and imports schemas from `lib/schemas/<domain>`.
  - Add an index barrel to re-export domain operations with a stable public surface.
- Definition of Done:
  - `tests/operations.js` is retired or reduced to a thin compatibility layer.
  - All specs import domain operations via `tests/lib/operations`.

### 5) Introduce test data builders and utils
- What: Standardize how we create inputs and dates; reduce inline objects.
- Why: Consistent, minimal, and intention-revealing test data reduces noise and maintenance.
- Do:
  - Move `tests/helpers.js` → `tests/lib/utils/helpers.js` (keep `sleep`, `uniquePhone`).
  - Add `tests/lib/utils/builders.js` with `buildDonor(overrides)`, `buildDonation(overrides)`, date helpers.
  - Replace ad-hoc test data in specs with builders for clarity and reuse.
- Definition of Done:
  - At least one domain’s specs use builders instead of inline literal objects.
  - `uniquePhone()` is the standard for generating phone numbers.

### 6) Compose higher-level flows from operations
- What: Reuse typical flows across specs while keeping assertions minimal here.
- Why: Reduces duplication across permission tests and multi-step scenarios (create → promote → act).
- Do:
  - Keep `tests/flows.js` logic but move to `tests/lib/flows/` and export flows like `createVolunteerWithToken`, `assertForbiddenForVolunteerAndHallAdmin`.
  - Ensure flows call domain operations; do not embed business assertions beyond schema validations.
- Definition of Done:
  - Repeated permission checks in specs use a shared flow.
  - Flows return values (ids, tokens) that specs can assert on.

### 7) Stabilize global setup/teardown
- What: Make external state resets predictable and optional.
- Why: Prevents inter-run flakiness and allows quick local iteration when resets are disabled.
- Do:
  - Implement `tests/runtime/global-setup.js` to reset the DB only when not disabled.
  - Respect env/CLI flags: `NO_RESET`, `BACKUP_RESET_URL` (already scaffolded), with retries and backoff.
  - Ensure `global-teardown` remains idempotent and fast.
- Definition of Done:
  - Running the suite with and without `NO_RESET=1` consistently passes.
  - Reset failures produce clear, actionable logs and do not hang.

### 8) Enforce consistency (lint + naming)
- What: Make the test codebase consistent and easy to navigate.
- Why: Consistent formatting and naming reduce review friction and onboarding time.
- Do:
  - Add ESLint + Prettier configs suitable for Node + Jest.
  - Naming rules: operations = verbs; schemas = nouns; specs end with `.test.js`.
- Definition of Done:
  - `npm run lint` passes; Prettier formats apply without large diffs.
  - New files follow naming conventions.

### 9) Isolation of specs
- What: Prevent cross-test interference and flakiness.
- Why: Ensures stability under repeated runs; avoids ordering dependencies.
- Do:
  - Use `uniquePhone()` and builders to ensure unique resources per spec.
  - Avoid relying on state created by other tests; clean up when necessary.
- Definition of Done:
  - Re-running the same spec multiple times yields the same result.
  - Specs do not require a specific execution order.

### 10) Documentation for contributors
- What: Lower onboarding cost and reduce inconsistencies.
- Why: Self-serve docs reduce PR churn and clarify preferred patterns.
- Do:
  - Add `tests/README.md` covering layout, common helpers, how to add specs, and conventions.
  - Document env flags: `API_BASE_URL`, `NO_RESET`, `BACKUP_RESET_URL`, `NO_FILE_LOGS`, `JEST_MAX_WORKERS`.
- Definition of Done:
  - README includes structure diagrams, code samples for `http`, `operations`, and `flows` usage.
  - New contributors can author a spec by following the document alone.

### 11) Step-by-step migration
- What: Incrementally move to the new structure without breaking green runs.
- Why: Minimizes risk by shipping small, verifiable changes while keeping CI green.
- Do:
  1. Create `tests/lib/{http,utils,flows,operations,schemas}` and `tests/runtime` directories.
  2. Move `helpers.js` → `lib/utils/helpers.js`; export `sleep`, `uniquePhone`.
  3. Move axios creation from `api/index.js` → `runtime/axios.js`; re-export needed items from `lib/http`.
  4. Split `operations.js` into domain files; add a barrel to maintain the same public API initially.
  5. Update imports in `flows.js` and specs to use new `lib` paths.
  6. Implement `global-setup.js` reset logic with retries; guard by env flags.
  7. Add ESLint/Prettier; run autofix; resolve remaining issues.
  8. Remove unused helpers; consolidate duplicated schema imports with domain barrels.
  9. Update `README.md` with the new structure and usage examples.
- Definition of Done:
  - CI remains green after each step; no large, all-at-once refactor PRs.
  - `tests/` contains the new layout with minimal legacy artifacts.

### Verify the refactor works end-to-end
- What: Ensure behavior and results remain unchanged.
- Do:
  - Run the backend test script and confirm that all 115 tests pass.
  - Command: `cd /Users/mirmahathirmohammad/Documents/badhan/badhan-backend-test && node start`
  - Expected output:

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