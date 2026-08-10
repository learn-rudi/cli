# Codex Standalone Ownership And RUDI Migration

## Phase 0: Baseline And Manual Lookup

- Status: complete.
- Scope: move Codex CLI installation/update ownership from RUDI's Node runtime
  to OpenAI's standalone installer, retain RUDI's integration and Agent Host
  responsibilities, and migrate `admin-mac` without losing Codex state.
- Repositories:
  - `/Users/hoff/RUDI/apps/platform/cli`
  - `/Users/hoff/RUDI/apps/platform/registry`
- Files to inspect before editing:
  - Registry `catalog/agents/codex.json`, generated `index.json`, schema and
    index-generation tests.
  - CLI resolver, installer, status, doctor, Codex provider configuration,
    generated package manifest, and focused tests.
  - Existing `admin-mac` Codex paths, versions, package metadata, PATH order,
    authentication status, and RUDI integration state.
- Relevant standards:
  - SWE Doctrine Appendix C7A: one observable red-green-refactor step at a time.
  - SWE Doctrine Appendix D: reproduce, define the delta, and localize before
    changing behavior.
  - Infrastructure H1, H5, H9, and H10: one traceable artifact owner, safe
    rollback, observable deployment, and explicit operational authorization.
  - OpenAI Docs: macOS/Linux standalone installer is the supported install and
    update path.
- Baseline invariants:
  - Preserve all unrelated dirty work in both repositories.
  - Preserve `~/.codex` configuration, auth, sessions, plugins, and skills.
  - Do not remove a working legacy executable until the standalone executable
    passes an absolute-path version check.
  - RUDI may detect and integrate Codex but must not own its executable/runtime.
  - Generated files may be refreshed only after their baseline generators are
    proven consistent.
- Exit criteria: current source/runtime state and generator baselines are
  recorded with no secret values captured.
- Evidence:
  - Focused CLI baseline: 46 tests passed, 0 failed across installer state,
    Agent Host preflight, Codex integration, manifest generation, and command
    parsing.
  - Registry generated-index baseline: `npm run indexes:check` passed before
    catalog edits.
  - `admin-mac`: active Codex is the legacy RUDI runtime at `0.147.0`; no
    standalone or `/usr/local` copy exists; login status succeeds; config and
    auth files exist; 115 session files and 88 skill directories were counted
    without reading secret values.
  - Official installer defaults verified: executable `~/.local/bin/codex`,
    package storage below `~/.codex/packages/standalone`.

## Phase 1: Scope Lock

- Status: complete.
- In scope:
  - Declare Codex as a system/provider-owned agent in the Registry.
  - Resolve OpenAI's standalone executable before PATH fallback and reject
    RUDI-owned candidates for external Codex detection.
  - Surface legacy/duplicate Codex installs and provide an explicit, idempotent
    `doctor --fix` migration after standalone verification.
  - Preserve `rudi integrate codex`, managed instructions, native skill sync,
    and Agent Host launch behavior.
  - Migrate and smoke-test `admin-mac` after source verification.
- Non-goals:
  - No redesign of other provider installation models.
  - No changes to Codex auth/config/session formats.
  - No automatic execution of a remote installer from `rudi integrate`.
  - No unrelated package, shim, daemon, or stack cleanup.
- Expected source files:
  - Registry: `catalog/agents/codex.json`, focused contract test, generated
    `index.json`.
  - CLI: `packages/core/src/installer.js`,
    `src/agent-host/providers/config/codex.json`, provider resolution,
    Codex installation inspection/migration, `src/commands/status.js`,
    `src/commands/check.js`, `src/commands/doctor.js`, focused tests, and the
    generated package manifest.
- External inputs and boundaries:
  - PATH entries, symlinks, registry metadata, installer output, package
    manifests, and remote-host filesystem state are untrusted until validated.
  - Cleanup targets must resolve to exact known Codex paths below the target
    user's home or `/usr/local`; no broad recursive target is allowed.
- Failure behavior:
  - Missing/invalid standalone Codex leaves every legacy copy untouched and
    reports the official install command.
  - Cleanup failure reports the exact failed step and retains the last working
    executable.
  - Repository generation/test failure stops deployment and host migration.
- Exit criteria: interfaces, mutation targets, rollback units, and proof
  commands are fixed before the first behavior-bearing edit.
- Interface and mutation lock:
  - Registry contract: Codex uses `version: system`, `delivery: system`,
    `install.source: system`, and an official manual install hint.
  - Resolution contract: `~/.local/bin/codex` is the preferred explicit
    executable; path fallback cannot accept a candidate whose path or realpath
    is below RUDI home.
  - Migration contract: inspection is read-only; fix requires a successful
    absolute-path version probe, then removes only enumerated legacy Codex
    package/shim targets. Repeated fixes succeed without further mutation.
  - Authorized host mutations are limited to the official standalone install,
    exact legacy Codex npm uninstall/shim cleanup, integration refresh, and
    related daemon smoke verification on `admin-mac`.

## Phase 2: Red Tests

- Status: complete.
- Observable behavior:
  - System Codex resolves from `~/.local/bin` even under a restricted service
    PATH.
  - A RUDI-owned Codex path cannot satisfy external/system detection.
  - Migration is blocked without a verified standalone binary and preserves
    the legacy installation.
  - With standalone verified, cleanup removes only known legacy Codex package
    and shim paths and is idempotent.
  - Generated manifests represent Codex as system-owned, not `npm-global`.
- Red commands: focused `node scripts/run-tests.js <test-file>` commands in the
  CLI and focused `npm test -- <test-file>`/index contract commands in the
  Registry.
- Expected failures: current code prioritizes RUDI runtime paths, current
  registry declares npm delivery, and current doctor has no Codex migration.
- Exit criteria: each next behavior fails deterministically for its expected
  reason before implementation.
- Red evidence:
  - Registry ownership test failed on `latest`/`remote`/`npm` versus the
    required `system` contract.
  - Provider resolution test failed because Codex listed only RUDI runtime
    paths; the follow-up failed because RUDI PATH fallback was not rejected.
  - Core installer test failed because a RUDI-owned Codex satisfied system
    detection and mutated legacy metadata.
  - Migration tests first failed because no migration boundary existed, then
    exposed a dangling RUDI shim that `existsSync` alone could not detect.
  - Status and check contract tests failed because legacy RUDI Codex remained
    the preferred reported installation.

## Phase 3: Implementation

- Status: complete.
- Rules: smallest compatible changes, no new dependency, explicit path
  validation, no shell-interpreted untrusted input, and no secret logging.
- Registry changes define provider ownership and a manual official installer
  hint; RUDI does not execute the installer as part of integration.
- CLI changes share one Codex installation inspection result across status,
  doctor, and migration behavior where practical.
- Exit criteria: unchanged focused test commands pass without weakening tests.
- Implemented contracts:
  - Registry and generated CLI manifest now describe Codex as system-owned.
  - Agent Host prefers `~/.local/bin/codex` and rejects candidates whose path
    or realpath is inside RUDI home.
  - Core installation refuses an internal executable for a system-owned agent
    and reports Registry's official manual hint without removing prior state.
  - Shared inspection distinguishes verified standalone, legacy RUDI paths,
    safe system-registration metadata, and known external duplicates.
  - Migration verifies standalone first, uses RUDI's npm for the exact legacy
    package, removes only enumerated RUDI paths, catches dangling shims, and is
    idempotent.
  - Status, check, and doctor use the ownership contract; Codex integration and
    configuration remain separate.

## Phase 4: Green Tests And Refactor

- Status: complete.
- Green command: rerun every Phase 2 command unchanged.
- Refactor constraints: only deduplicate logic proven by green tests.
- Regression checks: installer system-agent tests, provider preflight tests,
  status/doctor commands, `integrate-codex`, and generated-manifest contracts.
- Exit criteria: focused and adjacent tests pass after any refactor.
- Focused green evidence: all focused tests passed across installer state,
  ownership migration, provider resolution, status/check/doctor, manifest
  generation, command exports, daemon integration, and Codex integration.
- Refactor verification added a rollout guard: even if a cached/older Registry
  index still advertises Codex as npm-delivered, the CLI normalizes it to the
  provider-owned system contract and cannot reinstall it into RUDI's runtime.
- Deployment rehearsal exposed a second Registry-outage boundary: install and
  update refreshed the Registry before entering the resolver. Two focused red
  tests reproduced that failure. The final implementation bypasses that refresh
  only for provider-owned Codex and uses built-in system metadata; the unchanged
  focused command then passed on `admin-mac` while the Registry returned 404.

## Phase 5: Full Verification

- Status: complete.
- CLI: `pnpm test`, `pnpm build`, `npm pack --dry-run`, focused debt scan, and
  `git diff --check`.
- Registry: `npm test`, `npm run validate`, `npm run indexes:sync`,
  `npm run indexes:check`, `npm run catalog:clean:check`, `npm run build`,
  `npm pack --dry-run --json`, debt scan, and `git diff --check`.
- Generated artifact rule: inspect task-path diffs separately from pre-existing
  unrelated changes and do not claim ownership of unrelated deltas.
- Exit criteria: no blocking test/build/debt/generation finding remains.
- Verification evidence:
  - CLI: 650 tests passed, 0 failed; build passed; package dry-run passed;
    task-scoped debt scan reported zero findings; `git diff --check` passed.
    The daemon smoke required an unsandboxed rerun because sandboxed localhost
    bind returned `EPERM`.
  - Publication rebase: after applying the task to the latest `origin/main`,
    the current upstream CLI suite passed 647 tests across 43 suites. One new
    upstream private-automation assertion was updated to require standalone
    Codex while retaining the RUDI-managed Claude authentication wrapper.
  - Registry: 168 tests passed, 0 failed; validation passed for all 152
    packages; index sync/check passed; build and package dry-run passed;
    task-scoped debt scan and task-scoped `git diff --check` passed.
  - Generated CLI and Registry manifests both contain the system-owned Codex
    contract.
- Preserved pre-existing non-task findings:
  - Registry catalog hygiene reports existing generated `dist` and
    `node_modules` under the Google Workspace stack. They were not created or
    removed by this task. The clean publication worktree reports zero catalog
    hygiene targets.
  - Repository-wide Registry `git diff --check` reports existing blank EOF
    lines in two dirty RUDI CRM migrations; all task paths pass.

## Phase 6: Docs, Contracts, Deployment, And Closure

- Status: complete.
- Deploy/migrate `admin-mac` only after Phase 5:
  - install standalone Codex while preserving the legacy executable
  - verify `~/.local/bin/codex --version`
  - remove only legacy Codex npm packages/shims
  - run `rudi integrate codex` and verify auth/config preservation
  - verify one active Codex path, Agent Host preflight, and update idempotency
- Rollback: before cleanup, retain the working legacy package; after cleanup,
  reinstall the captured legacy version/prefix only if standalone verification
  or Agent Host smoke fails and cannot be corrected forward.
- Accepted debt: the two preserved pre-existing non-task findings recorded in
  Phase 5; no task-introduced debt finding.
- Deployment evidence:
  - Installed OpenAI's standalone Codex `0.147.0` at
    `/Users/admin/.local/bin/codex`; its absolute version and login probes pass.
  - `rudi doctor --fix` removed only the enumerated RUDI Codex npm package,
    executable shims, and legacy agent payload after standalone verification;
    a repeated fix reported all checks passed with no further mutation.
  - `rudi install agent:codex` and `rudi update agent:codex` both pass without a
    Registry response and record `installType: system`, `managed: false`, with
    the standalone source path.
  - Final `rudi check` reports installed/authenticated/ready, no legacy paths,
    and no external duplicates. Agent Host reports the standalone path with
    router configuration and skill synchronization healthy.
  - Fresh shell resolution shows only `/Users/admin/.local/bin/codex`. Codex
    auth and config files remain present; session files increased from 115 to
    123 during work and all 88 native skill directories remain present.
- Definition of Done:
  - [x] Registry and generated manifests declare Codex system-owned.
  - [x] RUDI never resolves an internal Codex as the external provider binary.
  - [x] Migration is safe, explicit, and idempotent.
  - [x] Targeted/full tests, builds, packages, and debt scans pass.
  - [x] `admin-mac` has exactly one standalone Codex executable.
  - [x] Codex auth, configuration, sessions, instructions, skills, and RUDI MCP
        integration remain healthy.
