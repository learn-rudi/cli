# Installed Applications Home Inventory

## Phase 0: Baseline And Manual Lookup

- Status: complete.
- Scope: make `~/.rudi/apps` a canonical RUDI home path and expose it through
  `rudi home` without adding a new registry package kind or application
  installer.
- Files inspected before editing:
  - `AGENTS.md`
  - `packages/env/src/index.js`
  - `packages/env/src/__tests__/unit/env.test.js`
  - `src/commands/home.js`
  - `src/__tests__/unit/home-command.test.js`
- Relevant SWE manual sections:
  - Appendix H1, packaging and artifact discipline.
  - Appendix H4, deployment strategy.
  - Appendix H5, rollback and recovery.
  - Appendix H9-H10, deployment observability and operational safety.
  - Appendix C7A, agent-assisted red-green-refactor.
- Current-state commands:
  - `rudi home --json`
  - `git status -sb`
  - focused source and test inspection with `rg` and `sed`.
- Risks and invariants:
  - Existing stack, skill, workflow, runtime, binary, and agent package
    behavior must remain unchanged.
  - `apps` is an installed-application root, not a new registry package kind.
  - `rudi home` must not expose secret values.
  - Pre-existing unrelated CLI worktree changes must not be modified.
- Exit criteria: current omission is reproduced and scope is locked.

## Phase 1: Scope Lock

- Status: complete.
- In scope:
  - Add `PATHS.apps`.
  - Ensure the directory is created with other canonical RUDI directories.
  - Inventory `apps/` in JSON and human `rudi home` output.
  - Document the directory in the CLI architecture map.
- Non-goals:
  - No `app` registry package kind.
  - No generic `rudi app install`, update, rollback, or removal command.
  - No modification of the live Service Desk installation.
- Expected files touched:
  - `packages/env/src/index.js`
  - `packages/env/src/__tests__/unit/env.test.js`
  - `src/commands/home.js`
  - `src/__tests__/unit/home-command.test.js`
  - `AGENTS.md`
  - this ledger
- External inputs and trust boundaries:
  - `RUDI_HOME` remains an environment-controlled filesystem boundary.
  - Filesystem metadata is reported without reading installed application
    content.
- Failure behavior to define:
  - Missing `apps/` is reported as absent/empty, consistent with other home
    entries.
- Exit criteria: interfaces and non-goals are explicit.

## Phase 2: Red Tests

- Status: complete.
- Observable behavior to prove:
  - `PATHS.apps` resolves to `<RUDI_HOME>/apps`.
  - `rudi home --json` reports `entries.apps` as installed application code.
- Test files:
  - `packages/env/src/__tests__/unit/env.test.js`
  - `src/__tests__/unit/home-command.test.js`
- Red commands:
  - `node --test packages/env/src/__tests__/unit/env.test.js`
  - focused CLI home unit test command selected from the repository runner.
- Expected failure: `PATHS.apps` and `entries.apps` are absent.
- Evidence:
  - Environment test failed with `PATHS should have apps`.
  - Home test failed because `entries.apps` was undefined.
- Exit criteria: complete; both failures were observed for the expected reason.

## Phase 3: Implementation

- Status: complete.
- Implementation rules: make the smallest path and inventory additions; add
  no dependency and no package lifecycle behavior.
- Files allowed to change: only the expected files in Phase 1.
- Validation and error handling: preserve the current symlink-safe,
  unreadable-directory-tolerant home inspection behavior.
- Observability: JSON and human output identify the application lifecycle and
  cleanup owner.
- Exit criteria: complete; unchanged red tests pass.

## Phase 4: Green Tests And Refactor

- Status: complete.
- Green commands: rerun the exact Phase 2 commands.
- Refactor constraints: no unrelated home-command or environment refactor.
- Regression checks: existing home secret-redaction and symlink-size
  assertions remain green.
- Evidence:
  - Environment unit test: 39 passed.
  - Home-command unit test: 1 passed.
- Exit criteria: complete; focused tests are green after the minimal
  implementation.

## Phase 5: Full Verification

- Status: complete.
- Targeted tests: environment and home-command unit tests.
- Full suite: `npm test`.
- Build: `npm run build`.
- JS debt scan:
  - `node scripts/agent-debt-runner.mjs --edited <edited-js-files>`
- Live smoke:
  - isolated temporary `RUDI_HOME` JSON output.
  - read-only `rudi home --json` check on the always-on Mac.
- Results:
  - Full CLI suite: 1,021 passed, 0 failed.
  - `npm run build`: passed.
  - Architecture-aware debt scan: zero findings.
  - Isolated `RUDI_HOME` initialization created `apps/`.
  - Isolated and local linked `rudi home --json` output reported the
    `installed-application` entry.
  - `git diff --check`: passed.
- Exit criteria: complete; tests, build, debt scan, and smoke checks passed
  without modifying installed applications.

## Phase 6: Docs, Contracts, And Closure

- Status: complete.
- Docs: update the CLI architecture map to list `apps/`.
- Final files touched:
  - `AGENTS.md`
  - `packages/env/src/index.js`
  - `packages/env/src/__tests__/unit/env.test.js`
  - `src/commands/home.js`
  - `src/__tests__/unit/home-command.test.js`
  - this ledger
- Commands and results: focused red/green tests, full suite, build, isolated
  initialization/home smoke, debt scan, and diff check all produced the
  expected results recorded above.
- Accepted debt:
  - Generic RUDI application install/update/rollback/remove lifecycle remains a
    separate future design; this change does not pretend such a command exists.
- Definition of Done:
  - [x] `~/.rudi/apps` is canonical and visible.
  - [x] Existing package kinds behave unchanged.
  - [x] Verification evidence is recorded.
