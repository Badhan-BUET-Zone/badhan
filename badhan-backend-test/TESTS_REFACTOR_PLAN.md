### Badhan Backend Tests — Refactor Plan

Below are the refactors organized as large, numbered items. Each item explains the change and the exact actions to take.

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

### 8) Enforce consistency (lint + naming)
- What: Make the test codebase consistent and easy to navigate.
- Why: Consistent formatting and naming reduce review friction and onboarding time.
- Do:
  - Add ESLint + Prettier configs suitable for Node + Jest.
  - Naming rules: operations = verbs; schemas = nouns; specs end with `.test.js`.
- Definition of Done:
  - `npm run lint` passes; Prettier formats apply without large diffs.
  - New files follow naming conventions.

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