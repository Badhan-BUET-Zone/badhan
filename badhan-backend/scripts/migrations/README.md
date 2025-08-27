# Database Migrations Orchestrator

This folder contains the TypeScript migration orchestrator (`index.ts`) and individual migration files under `files/`.

## Key Files
- `index.ts` – Orchestrator: discovers and runs migration files.
- `_bootstrap.ts` – Loads environment, connects to MongoDB, registers models.
- `template.ts` – Starter template for creating a new migration.
- `files/` – Place each actual migration file here (one file per migration).

## Naming Convention
Use: `YYYYMMDD_<short-description>.ts`
Example: `20250826_remove-extra-fields.ts`

Sorting is purely alphabetical; the orchestrator runs selected files in that order. Using a date prefix keeps order predictable.

## How Orchestrator Selects Migrations
1. Lists all `.ts` files in `files/` (no recursion) and sorts them.
2. If you pass specific names as CLI args (without the `.ts` extension), only those are loaded.
3. There is **no state tracking** of applied migrations; every selected migration is always treated as pending and executed.

## Running Migrations
From `badhan-backend/` root:

List detected migrations (after filtering):
```bash
npm run migrate:list
```

Run **all** migration files (alphabetical order):
```bash
npm run migrate
```

Run only specific migrations:
```bash
npx ts-node --transpile-only scripts/migrations/index.ts 20250826_remove-extra-fields 20250901_new-field
```
(Provide names without `.ts`).

Dry-run (your migration logic must honor `DRY_RUN` flag):
```bash
DRY_RUN=1 npm run migrate
# or
DRY_RUN=true npx ts-node --transpile-only scripts/migrations/index.ts
```

Specify environment (falls back to `local` if not set):
```bash
NODE_ENV=local npm run migrate
NODE_ENV=development npm run migrate
```

Combine flags:
```bash
DRY_RUN=1 NODE_ENV=local npm run migrate:list
```

## Adding a New Migration
1. Copy the template:
   ```bash
   cp scripts/migrations/template.ts scripts/migrations/files/20250901_new-feature.ts
   ```
2. Edit the new file:
   - Update the log line description at the top inside the `run()` function.
   - Implement your logic inside the exported default async function.
3. Use existing Mongoose models via:
   ```ts
   const { User } = mongoose.connection.models; // example
   ```
4. Make it idempotent when feasible (safe if re-run) and respect `DRY_RUN`:
   ```ts
   if (DRY_RUN) { detail(`[DRY_RUN] Would update ${doc._id}`); return; }
   ```
5. Test locally first with dry run:
   ```bash
   DRY_RUN=1 npx ts-node --transpile-only scripts/migrations/index.ts 20250901_new-feature
   ```
6. Execute (real run):
   ```bash
   npx ts-node --transpile-only scripts/migrations/index.ts 20250901_new-feature
   ```
7. Commit the new file.

## Writing Migration Logic
Recommended patterns:
- Use a cursor for large collections: `Model.find(query).lean().cursor();`
- Batch async operations and limit concurrency (see `CONCURRENCY` in template).
- Log high-level progress (`log`) and optional detailed per-document actions in dry runs (`detail`).
- Keep heavy computations outside tight loops when possible.

## Rollbacks
There is no automatic rollback framework. If a migration needs reversal, author a new migration file that undoes the changes.

## Common Pitfalls
- Forgetting to respect `DRY_RUN` → unintended writes during testing.
- Loading entire collection into memory instead of streaming with a cursor.
- Non-idempotent operations that produce duplicates when re-run.
- Depending on execution order without using date‑based prefixes.

## Example One-Off Execution
```bash
# Only run two specific migrations in local env with detailed dry-run output
DRY_RUN=1 NODE_ENV=local npx ts-node --transpile-only scripts/migrations/index.ts 20250826_remove-extra-fields 20250901_new-feature
```

## Environment Loading
`_bootstrap.ts` sets `NODE_ENV` to `local` if you didn't provide one, then loads the first existing of:

1. `.env.<NODE_ENV>`
2. `.env`

It then reuses the central Mongoose connection logic in `src/db/mongoose.ts`.

