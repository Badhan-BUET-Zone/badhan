Badhan Backend Tests

Structure
- tests/runtime/: environment and axios setup
- tests/lib/: shared helpers
  - http.js: authed/guest helpers and schema validation
  - utils/: helpers.js (sleep, uniquePhone), builders.js (buildDonor, buildDonation, formatDate)
  - flows/: index.js common composed flows
  - operations/: placeholder for future domain split
- tests/specs/: reserved for migrated spec files by domain

Usage
- Import network helpers from tests/lib/http
- Import flows from tests/lib/flows
- Use utils/builders for test data

Environment flags
- API_BASE_URL: override backend base URL
- BACKUP_RESET_URL: override reset URL (default http://localhost:4000/reset-local-db)
- NO_RESET=1: skip DB reset hooks
- JEST_MAX_WORKERS: forward to Jest via start script args

Isolation policy
- Each test runs with a clean DB (global/setup-after-env reset). Avoid cross-spec state.
- Use uniquePhone() to avoid collisions.


