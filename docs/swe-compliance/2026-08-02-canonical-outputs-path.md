# Canonical RUDI Outputs Path

## Phase 0: Baseline And Manual Lookup — Complete

- Scope: converge durable generated artifacts on `~/.rudi/outputs`, migrate the current local data without overwrite, and—after explicit follow-up confirmation—remove the temporary `~/.rudi/output` compatibility name.
- Files inspected before editing: CLI path/home contracts and tests; registry stack writers; Service Desk runtime configuration and tests; current `~/.rudi/output` and `~/.rudi/outputs` contents.
- Relevant SWE manual sections: core invariants and boundary discipline; Appendix A4 safe/reversible migrations; Appendix C behavior-first tests and agent-assisted red-green-refactor.
- Current-state commands: targeted `rg` writer trace, `git status --short` in each source repository, and read-only filesystem inventory.
- Risks and invariants:
  - `~/.rudi/outputs` is the sole canonical durable-output directory.
  - Migration never overwrites an existing destination entry.
  - Conflicts leave the legacy entry in place and are reported.
  - The final filesystem exposes only `~/.rudi/outputs`; initialization must not recreate `~/.rudi/output`.
  - Existing user changes in dirty worktrees remain untouched except for the exact output-path lines in scope.
- Exit criteria: all writers identified, target files confirmed non-overlapping or safely patchable, and rollback defined.

## Phase 1: Scope Lock — Complete

- In scope:
  - Add `PATHS.outputs` and `PATHS.legacyOutput` to `@learnrudi/env`.
  - Add an idempotent, collision-safe legacy-output migration invoked by directory initialization.
  - Represent only the canonical output path in `rudi home` after migration.
  - Replace singular output defaults in canonical Registry stack sources and Service Desk configuration.
  - Update active user-facing path documentation.
  - Migrate this machine's current singular-output contents and synchronize affected installed stack sources/builds.
- Non-goals: delete archived data, change output schemas, alter per-stack state roots, deploy Service Desk, or refactor unrelated stack behavior.
- Expected CLI files: `packages/env/src/index.js`, focused env tests, `src/commands/home.js`, `src/__tests__/unit/home-command.test.js`, managed instruction/docs where necessary, and this checklist.
- Expected Registry files: singular-output stack source constants, one catalog contract test, and active docs that still teach the singular path.
- Expected Service Desk files: one runtime default, its focused test expectation, and README references.
- External inputs and trust boundaries: existing filesystem entries, symlinks, path collisions, permissions, and platform symlink behavior.
- Failure behavior: preserve every conflicting source entry; emit a warning/result instead of overwriting; remove only an empty legacy directory or a verified link to the canonical directory.
- Exit criteria: interface and migration result shape documented in tests before implementation.

## Phase 2: Red Tests — Complete

- Observable behavior to prove:
  - Legacy contents move to plural output storage and the old path remains compatible.
  - Destination collisions are preserved and reported.
  - CLI home reports canonical output lifecycle without following/double-counting the compatibility link.
  - Registry source has no remaining hard-coded singular output default.
  - Service Desk defaults to `~/.rudi/outputs/service-desk`.
- Test files: focused CLI env/home tests, Registry catalog output-path contract test, and Service Desk runtime configuration test.
- Red commands:
  - `node --test packages/env/src/__tests__/unit/output-migration.test.js`
  - `node --test src/__tests__/unit/home-command.test.js`
  - `npx vitest run src/output-path-contract.test.ts` from Registry
  - `node --test --import tsx test/unit/runtime-configuration.test.ts` from Service Desk
- Expected failure: missing canonical path/migration behavior or remaining singular path defaults.
- Observed failures:
  - CLI migration import failed because `migrateLegacyOutputDirectory` did not exist.
  - CLI home assertions failed because canonical and compatibility output entries did not exist.
  - Registry contract reported exactly nine singular stack writers.
  - Service Desk expected plural while runtime configuration still returned singular.
  - Follow-up compatibility removal expected the old path to be absent, while migration still created a link and `rudi home` still listed it.
- Exit criteria: each new behavior fails for the expected reason before its implementation change.

## Phase 3: Implementation — Complete

- Implementation rules: smallest explicit change; no new dependencies; no data overwrite; idempotent re-entry; verified removal of the legacy path; exact one-line stack default replacements.
- Files allowed to change: only the files listed in Phase 1 plus generated Registry/stack build artifacts required by repository policy.
- Validation and error handling: reject/retain non-directory legacy paths, preserve collisions, catch per-entry move/link errors, and report warnings without making the canonical path unusable.
- Observability: migration returns status, moved/conflict/failure lists, and emits concise warnings for unresolved entries.
- Exit criteria: all red tests pass unchanged.

## Phase 4: Green Tests And Refactor — Complete

- Green commands: rerun every Phase 2 command unchanged.
- Results: CLI focused suite passed 43/43; Registry output contract passed 1/1; Service Desk runtime configuration passed 9/9.
- Refactor constraints: extract only logic necessary for deterministic testing; do not reorganize surrounding path/package code.
- Regression checks: existing env and home unit tests, affected stack builds/tests, and Service Desk focused test.
- Exit criteria: targeted tests remain green after any cleanup.

## Phase 5: Full Verification — Complete

- Targeted tests: CLI env/home; Registry output contract and affected stack tests; Service Desk runtime configuration.
- Full suite: CLI `npm test`; Registry `npm test`; Service Desk full suite when feasible given the pre-existing dirty worktree.
- Build/typecheck/lint: CLI `npm run build`; Registry required verification gates; builds for affected stacks; Service Desk build/typecheck.
- JS/TS debt scan: run each repository's nearest configured scanner against edited JS/TS files.
- Live smoke checks: preflight collision check, run the migration against current `~/.rudi`, verify `output` resolves to `outputs`, verify every original file exists under the canonical root, and run affected installed stack checks/builds.
- Exit criteria: no unexplained blocking failure and no lost user file.

### Verification Results

- CLI: `npm test` passed 1,111/1,111 tests; `npm run build` passed.
- Registry: `npm test` passed 124 tests with one intentional skip; catalog validation passed 100/100 packages; index sync/check, cleanup check, build, and package dry-run passed.
- Service Desk: exact Node 20.10.0 run passed 162/162 tests; typecheck, lint-equivalent no-emit check, build, architecture, documentation, source-policy, and runtime-contract checks passed.
- Studio: focused ESLint completed with zero errors and 12 pre-existing warnings; TypeScript no-emit check passed.
- Debt scans: CLI and Service Desk policy scans passed with zero findings; Registry and Studio structural fallback scans passed with explicit entrypoints and zero findings.
- Live migration: moved `hcai-capacity-accelerator-one-pager.png`, `pdf/`, and `service-desk/`; verified SHA-256 for all 17 files; recorded zero conflicts, failures, or mismatches. The initially created compatibility link was subsequently removed after explicit user confirmation.
- Live CLI smoke: installed `rudi home --json` reports `outputs/` as `durable-output`, exposes no legacy output entry, and directory initialization does not recreate `output/`.
- Installed stack synchronization: patched only the singular-path literals in seven installed stack copies, preserving their other local differences; terminated 65 affected MCP processes with `SIGTERM`; rebuilt all seven installed stacks; and passed available stack tests after correcting two stale Audio Tools expectations.
- Individual Registry stack-local `tsc` commands were unavailable because the source catalog does not carry each stack's installed dependencies. Their attempted ignored `dist/` artifacts were removed with the Registry's own cleanup command; canonical Registry validation and packaging gates passed afterward.

## Phase 6: Docs, Contracts, And Closure — Complete

- Docs/contracts: CLI home/instruction contract, active Registry stack docs, Service Desk README, and this executed checklist.
- Final files touched: record after implementation.
- Commands run and results: record red, green, build, debt, and live smoke evidence.
- Accepted debt: historical compliance documents may retain old paths as history. The source Registry checkout does not install every individual stack dependency, so canonical stack-local builds remain unavailable there; installed copies and Registry-wide validation/package gates passed.
- Definition of Done: canonical plural path is enforced in source and installed writers, current data is migrated without collision or loss, the singular filesystem path is absent and not recreated, affected builds/tests pass, and rollback is documented.

### Final Scope

- CLI: environment path/migration contract and tests; `rudi home` lifecycle and symlink accounting; managed instructions; CLI agent architecture documentation; generated CLI build artifacts; this checklist.
- Registry: nine stack defaults, Audio Tools active documentation, and the catalog output-path contract test.
- Service Desk: runtime default, focused expectation, and two README references.
- Studio: one user-facing RUDI home path reference.
- No archive candidate or output artifact was deleted.

### Follow-Up Compatibility Removal

- Confirmation: user explicitly approved removal after being shown that the target was a seven-byte symlink and that 65 MCP processes required restart.
- Red: four focused CLI tests failed because migration still linked the old path and `rudi home` still exposed it; the expanded Registry contract then found one stale Audio Tools test file.
- Green: focused CLI tests passed 4/4; full CLI passed 1,112/1,112; Registry contract passed; Audio Tools passed 7/7; Content Extractor passed 36/36; Video Editor passed 24/24; other affected installed stack builds passed.
- Cleanup result: removed only `/Users/hoff/.rudi/output`; reclaimed seven bytes; retained every artifact under `/Users/hoff/.rudi/outputs`.

## Rollback

1. Stop writers using the output directory.
2. Revert the source defaults and rebuild affected packages only if singular-path compatibility is intentionally restored.
3. Create `output -> outputs` only as a temporary compatibility link; do not copy canonical artifacts into a second directory.
4. If an independent `output/` directory appears, stop and merge it with the collision-safe migration before restoring any link.
