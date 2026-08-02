## Phase 0: Baseline And Manual Lookup

- Scope: remove confirmed ignored build/junk artifacts, locally archive stale legacy documentation, refresh the core testing guide, and correct the `rudi info` command dispatch/help mismatch.
- Files to inspect before editing: `.gitignore`, `src/index.js`, `packages/utils/src/help.js`, `src/__tests__/unit/commands.test.js`, `CLAUDE.md`, `packages/core/TESTING.md`, `packages/core/TEST-RESULTS.md`, `docs/run-group-orchestration.md`, `package.json`, and current git status.
- Relevant SWE manual sections: `10-Engineering-Operating-Manual-Index.md`; boundary discipline, backward compatibility, and Appendix C / C7A in `01-Master-Engineering-Doctrine.txt`.
- Current-state commands: `git status --short`; targeted `rg`, `sed`, `find`, `du`, and `git check-ignore` reads; `node src/index.js help`.
- Risks and invariants: preserve the in-progress Agent Host changes; do not remove callable legacy commands or compatibility modules; do not touch tracked distribution files; never expose secrets or imported session data; keep `rudi which` stack-specific and make `rudi info` generic as advertised.
- Exit criteria: the baseline, dirty-worktree overlap, ignored-artifact status, and relevant manual guidance are recorded before edits. Completed.

## Phase 1: Scope Lock

- In scope: remove `dist/rudi-serve`, `dist/serve.cjs`, and `docs/.DS_Store`; move `docs/run-group-orchestration.md` and `packages/core/TEST-RESULTS.md` into the existing ignored `_archive/`; remove the stale `CLAUDE.md` reference to the old SOP; refresh `packages/core/TESTING.md`; correct `info` dispatch and focused tests.
- Non-goals: remove `src/commands/agent/`, DB/session/import/run-group code, `packages/db`, `packages/embeddings`, daemon/sidecar routes, session schema documentation, tracked `dist` artifacts, `node_modules`, or any Agent Host work in progress.
- Expected tracked files touched: `CLAUDE.md`, `packages/core/TESTING.md`, `src/index.js`, `src/__tests__/unit/commands.test.js`, and this checklist. The two archived tracked documents will appear as deletions because `_archive/` is intentionally local-only and gitignored.
- External inputs and trust boundaries: CLI command and package arguments; local filesystem paths used for cleanup/archive operations.
- Failure behavior to define: missing package arguments must identify the correct command (`info` versus `which`); archival/removal must target only exact validated paths.
- Exit criteria: edits and filesystem operations remain inside the approved path list. Completed.

## Phase 2: Red Tests

- Observable behavior to prove: `rudi info` and `rudi pkg` route to generic package inspection, while `rudi which` remains the stack-specific inspector.
- Test files to add or edit: `src/__tests__/unit/commands.test.js`.
- Red command: `node scripts/run-tests.js src/__tests__/unit/commands.test.js`.
- Expected failure: `rudi info` currently prints `Usage: rudi which <stack-id>` because it dispatches to `cmdWhich`.
- Exit criteria: the focused test fails for that expected reason before implementation. Completed: 33 tests passed and the new dispatch test failed because `info` printed the stack-specific `which` usage.

## Phase 3: Implementation

- Implementation rules: make the smallest dispatcher change; preserve aliases other than the intentional `info` correction; use exact archive/removal targets; add no dependencies; preserve unrelated dirty changes.
- Files allowed to change: only the paths listed in Phase 1 plus the exact ignored artifact/archive targets.
- Validation and error-handling requirements: command tests verify exit status and usage output; filesystem targets are resolved explicitly before removal or movement.
- Observability requirements: help and missing-argument output identify the correct command surface.
- Exit criteria: the unchanged red test passes and archived files exist under `_archive/`. Completed: the dispatcher now routes `info` to `cmdInfo`; exact-path cleanup removed 61,611,929 bytes; both stale documents were moved into `_archive/`.

## Phase 4: Green Tests And Refactor

- Green command: `node scripts/run-tests.js src/__tests__/unit/commands.test.js`.
- Refactor constraints: no command-router restructuring or legacy-code movement.
- Regression checks: syntax checks for edited JavaScript and CLI smoke checks for `info`, `pkg`, `which`, and default help.
- Exit criteria: focused tests and smoke checks pass after the smallest implementation. Completed: the unchanged focused command passed all 34 tests; no refactor followed.

## Phase 5: Full Verification

- Targeted tests: `node scripts/run-tests.js src/__tests__/unit/commands.test.js`.
- Full suite: `npm test` if feasible; otherwise record the exact gap.
- Build/typecheck/lint: `npm run build` and syntax checks for edited JavaScript.
- JS/TS debt scan, if applicable: `node scripts/agent-debt-runner.mjs --edited src/index.js,src/__tests__/unit/commands.test.js`.
- Live smoke checks: missing-argument output for `info`, `pkg`, and `which`; default help output; exact-path and size verification after cleanup.
- Exit criteria: tests, build, debt scan, smoke checks, and filesystem verification succeed or a residual gap is recorded. Completed: the full suite passed 1,112 tests; `npm run build` passed; source and bundled CLI smoke checks passed; the JS debt scan reported zero findings; syntax, reference, archive-path, removal-path, and diff checks passed.

## Phase 6: Docs, Contracts, And Closure

- Docs or API contracts to update: `CLAUDE.md`, `packages/core/TESTING.md`, and this checklist; no sidecar/OpenAPI change.
- Final tracked files touched: `CLAUDE.md`, `packages/core/TESTING.md`, `packages/core/TEST-RESULTS.md` (removed from the tracked surface), `docs/run-group-orchestration.md` (removed from the tracked surface), `src/index.js`, `src/__tests__/unit/commands.test.js`, generated `dist/index.cjs`, and this checklist. Local ignored archive copies exist at `_archive/docs/run-group-orchestration.md` and `_archive/packages/core/TEST-RESULTS.md`.
- Commands run and results:
  - Red: `node scripts/run-tests.js src/__tests__/unit/commands.test.js` failed only the new dispatch test because `rudi info` printed `rudi which` usage; 33 tests passed.
  - Green/refactor verification: the unchanged command passed all 34 tests; no refactor followed.
  - Build: `npm run build` passed and regenerated the published CLI bundle.
  - Full suite: `npm test` passed 1,112 tests across 737 top-level subtests and 117 suites.
  - Debt scan: `node scripts/agent-debt-runner.mjs --edited src/index.js,src/__tests__/unit/commands.test.js` passed with zero findings.
  - Smoke/syntax: source and bundled `info`/`pkg`/`which` usage checks, default help, `node --check`, archive/removal checks, stale-reference scan, and `git diff --check` passed.
  - Cleanup: exact-path removal reclaimed 61,611,929 bytes from `dist/rudi-serve`, `dist/serve.cjs`, and `docs/.DS_Store`.
- Accepted debt: callable legacy runner/session surfaces remain until their consumers are migrated; the root `_archive/` remains an ignored local salvage directory; `packages/core/src/__tests__/README.md` is outside this scoped pass. The pre-existing dirty Agent Host worktree, including a concurrent `AGENTS.md` change, was preserved.
- Definition of Done: completed. Approved junk is removed, stale docs are recoverably archived, command routing matches help, focused/full verification passes, and unrelated in-progress changes remain intact.
