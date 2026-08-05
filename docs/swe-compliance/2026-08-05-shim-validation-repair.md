## Phase 0: Baseline And Manual Lookup

- Scope: correct false-positive shim validation, make automatic repair non-destructive for unmanaged wrappers, and recoverably archive the seven confirmed dead local shim files.
- Files to inspect before editing: `packages/core/src/shims.js`, `src/commands/shims.js`, existing core/CLI tests, `package.json`, `.debt-scan.json`, current `~/.rudi/bins` entries, Copilot install metadata, and current git status.
- Relevant SWE manual sections: `10-Engineering-Operating-Manual-Index.md`; Appendix C / C7A and Appendix D in `01-Master-Engineering-Doctrine.txt`.
- Current-state commands: `git status --short --branch`; `rudi shims check --json`; exact target/fallback existence checks; direct `--version` smoke checks for wrappers reported invalid.
- Risks and invariants: never execute arbitrary shim contents during validation; never delete an unmanaged wrapper merely because its shell syntax is unsupported; keep working `rudi`, agent, router, and system-fallback shims intact; preserve unrelated dirty-worktree changes and existing generated bundle work.
- Exit criteria: the 23 failures are deterministically reproduced and classified as 16 false positives plus seven dead entries. Completed.

## Phase 1: Scope Lock

- In scope: executable-file filtering, validation of RUDI's retained wrapper forms, safe handling of unverified unmanaged wrappers, focused tests, the generated CLI bundle, recoverable archival of the seven dead wrapper files, and stale Copilot metadata reconciliation.
- Non-goals: rewrite a general shell parser; execute wrapper contents during validation; rebuild all shims; change skill wrappers, router behavior, package installation behavior, or unrelated CLI commands; modify current CRM work.
- Expected tracked files touched: `packages/core/src/shims.js`, `src/commands/shims.js`, new focused core and CLI tests, `dist/index.cjs`, and this checklist.
- External inputs and trust boundaries: filenames and shell-script contents under `RUDI_HOME/bins`, filesystem permissions, symlink targets, environment `PATH`, wrapper ownership metadata, and installed-package manifests.
- Failure behavior to define: known wrappers are valid when a usable primary command or declared fallback exists; missing targets without fallbacks remain broken; unsupported/unmanaged wrappers are reported but are never automatically deleted; non-executable documentation is not treated as a shim.
- Exit criteria: implementation and test edits remain inside the listed repository paths; home-directory mutation is limited to the seven exact dead shims and Copilot metadata. Completed.

## Phase 2: Red Tests

- Observable behavior to prove: variable-based and fallback wrappers validate correctly; non-executable files are excluded; genuinely missing wrappers remain broken; repair does not delete an unmanaged wrapper.
- Test files to add or edit: `packages/core/src/__tests__/unit/shims.test.js` and `src/__tests__/unit/shims-command.test.js`.
- Red commands: `node scripts/run-tests.js packages/core/src/__tests__/unit/shims.test.js`; `node scripts/run-tests.js src/__tests__/unit/shims-command.test.js`.
- Expected failures: current validation checks literal `$TARGET`/`$NODE_BIN`, ignores fallback branches and alternate quoting, includes `README.md`, and deletes invalid unowned files in fix mode.
- Exit criteria: each new behavior-level test fails for its expected pre-fix reason before implementation. Completed: the tests reproduced literal `$TARGET` handling, ignored fallback branches, `README.md` inclusion, `/bin/sh` misclassification, unmanaged-wrapper deletion, and executable-directory acceptance. The first CLI fixture run exposed a Node 20-only test-harness incompatibility (`import.meta.dirname`); it was corrected to `fileURLToPath` before recording the product-level red result.

## Phase 3: Implementation

- Implementation rules: recognize only constrained RUDI wrapper constructs; prefer structured/static inspection over shell execution; add no dependencies; preserve the existing `validateShim(bin)` call contract.
- Files allowed to change: only the tracked files named in Phase 1.
- Validation and error-handling requirements: resolve literal and assigned command targets safely; check executable candidates; distinguish confirmed broken wrappers from unsupported/unmanaged content; treat at least one usable fallback as valid.
- Observability requirements: JSON and terminal output must report the resolved target and actionable error without claiming valid fallbacks are missing.
- Exit criteria: unchanged red tests pass with the smallest implementation and no unrelated refactor. Completed: validation now resolves constrained variable assignments, declared `command -v` fallbacks, single-quoted targets, and unquoted commands without executing shim contents; executable targets must be files; the CLI excludes non-executable support files, recognizes retained shell shebangs, and skips unmanaged failures in repair mode.

## Phase 4: Green Tests And Refactor

- Green commands: rerun both Phase 2 commands unchanged.
- Refactor constraints: consolidate only duplicated parsing needed for correctness; no command-surface or package-manager changes.
- Regression checks: existing core tests, command tests, syntax checks, and fixture-only filesystem behavior under an isolated `RUDI_HOME`.
- Exit criteria: focused tests remain green after any cleanup. Completed: both focused suites and existing command tests passed; the final full suite includes five core shim tests and three CLI shim-command tests.

## Phase 5: Full Verification

- Targeted tests: both new test files plus existing command tests.
- Full suite: `pnpm test`.
- Build/typecheck/lint: `pnpm build`, `node --check` for edited JavaScript, and `npm pack --dry-run`.
- JS/TS debt scan, if applicable: `node scripts/agent-debt-runner.mjs --edited packages/core/src/shims.js,src/commands/shims.js,packages/core/src/__tests__/unit/shims.test.js,src/__tests__/unit/shims-command.test.js --no-log`.
- Live smoke checks: source and bundled `rudi shims check --json`; direct version checks for retained working wrappers; exact archive-path and Copilot metadata checks.
- Exit criteria: tests, build, debt scan, package check, and live checks pass; checker exits zero after approved cleanup. Completed: `pnpm test` passed 633 tests across 42 suites; `pnpm build`, all four `node --check` commands, `git diff --check`, the focused debt scan, and `npm pack --dry-run` passed; the bundled CLI reports 38 valid and zero invalid shims; `rudi shims fix` is a no-op with exit zero; retained `codex`, `gemini`, `ollama`, `deno`, `jq`, `magick`, `pandoc`, `rg`, and `sqlite3` wrappers execute successfully.

## Phase 6: Docs, Contracts, And Closure

- Docs or API contracts to update: this checklist only; no command help or OpenAPI contract change was required.
- Final tracked files touched by this task: `packages/core/src/shims.js`, `src/commands/shims.js`, `packages/core/src/__tests__/unit/shims.test.js`, `src/__tests__/unit/shims-command.test.js`, generated `dist/index.cjs`, and this checklist. Existing changes in `AGENTS.md`, `README.md`, `packages/utils/src/help.js`, `src/index.js`, command/routing tests, and CRM/MCP files were preserved and not edited for this task.
- Commands run and results:
  - Red: `node scripts/run-tests.js packages/core/src/__tests__/unit/shims.test.js` failed on literal `$TARGET`, missing fallback evaluation, and executable-directory acceptance before each corresponding correction.
  - Red: `node scripts/run-tests.js src/__tests__/unit/shims-command.test.js` failed on `README.md` inclusion, `/bin/sh` type detection, and deletion of an unmanaged wrapper before each corresponding correction.
  - Green/refactor: the unchanged focused commands passed; combined focused/existing command verification passed 38 tests before the final edge case, and the full suite covered the final state.
  - Full suite: `pnpm test` passed 633 tests, 42 suites, zero failures.
  - Build/package: `pnpm build` and `npm pack --dry-run` passed.
  - Debt/syntax: the focused architecture debt scan reported zero findings; syntax checks and `git diff --check` passed.
  - Live smoke: source validation first reduced 23 failures to the seven confirmed dead entries; after cleanup both source and bundled checks report 38 valid, zero invalid, and exit zero.
  - Cleanup: seven dead shims, the 129 MB legacy Copilot package tree, its lockfile, and a pre-change registry snapshot were moved to `~/.rudi/outputs/shim-repair/2026-08-05T22-02-47Z/`; only the stale `github-copilot-cli` ownership entry was removed from the active registry.
- Accepted debt: validation intentionally supports constrained RUDI wrapper forms rather than arbitrary shell programs. An unsupported unmanaged wrapper remains visible as invalid and is never automatically deleted. The recovery bundle is intentionally retained until the user chooses to purge it.
- Definition of Done: completed. The checker accurately evaluates the observed RUDI wrapper forms, automatic repair cannot delete unverified unmanaged wrappers, the seven dead entries are recoverably archived, stale Copilot metadata is reconciled, all verification passes, and unrelated work remains intact.
