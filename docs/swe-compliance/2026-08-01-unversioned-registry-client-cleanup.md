# Unversioned Registry Client Cleanup

## Phase 0: Baseline And Manual Lookup

- Scope: consume the registry's single unversioned v2 index/manifest layout while retaining compatibility with already-installed local manifests.
- Files to inspect before editing: registry-client contract/index code and tests, core resolver/installer, installed-manifest readers, build/test scripts, and old released registry-client behavior.
- Relevant SWE manual sections: API E2, E4, E9, E10; Master Doctrine Appendix C.
- Current-state commands: focused registry-client/core tests, full CLI test suite, build/version smoke, and direct source-path trace of the previous client.
- Risks and invariants: preserve unrelated dirty changes; current v2 package resolution/install behavior must not change; existing installed manifest files must remain readable.
- Exit criteria: remote registry compatibility and local installed-state compatibility are treated as separate boundaries.

## Phase 1: Scope Lock

- In scope: default root `index.json`; schema-v2-only remote index validation; canonical stack `manifest.json`; removal of remote v1 fallback and `manifest.v2.json` selection; focused test/doc updates.
- Non-goals: installed-state migration, stack behavior, unrelated commands, or package dependency changes.
- Expected files touched: `packages/registry-client/src/index.js`, contract code only if required, focused tests, `AGENTS.md`, generated bundle/package manifests, and this record.
- External inputs and trust boundaries: remote/local registry index, manifest JSON, downloaded source, checksums, archives, and existing installed manifests.
- Failure behavior to define: remote schema v1/unknown fails with clear contract error; malformed v2 never falls back; existing installed manifests remain accepted by installed-state readers.
- Exit criteria: root-v2 and canonical-manifest interfaces are fixed before implementation.

## Phase 2: Red Tests

- Observable behavior to prove: root `index.json` is the only registry default; v1 remote indexes fail; `getManifest` reads canonical `manifest.json`; stack download ignores/rejects version-suffixed metadata; installed legacy manifest tests remain green.
- Test files to add or edit: focused registry-client fallback/manifest/stack-download/contract tests and existing core installed-manifest tests.
- Red command: run one focused Node test file per behavior before implementation.
- Expected failure: current code still fetches `index.v2.json`, falls back to v1, and prefers `manifest.v2.json`.
- Exit criteria: expected red failures are recorded.

## Phase 3: Implementation

- Implementation rules: remove only the remote compatibility layer; preserve normalized v2 package shape and installed-state readers.
- Files allowed to change: Phase 1 files only.
- Validation and error-handling requirements: require schema v2 remotely, keep ID/path/checksum/extraction validation, and provide stable unsupported-schema errors.
- Observability requirements: no fallback event remains; errors identify source/schema.
- Exit criteria: focused tests pass unchanged.

## Phase 4: Green Tests And Refactor

- Green command: rerun Phase 2 commands unchanged.
- Refactor constraints: remove dead fallback helpers/tests only after green.
- Regression checks: registry-client/core/command tests.
- Exit criteria: clean remote layout works and local installed compatibility remains green.

## Phase 5: Full Verification

- Targeted tests: registry-client, resolver, installer, installed-manifest readers.
- Full suite: `npm test`.
- Build/typecheck/lint: `npm run build` and built CLI version smoke.
- JS/TS debt scan: repo-policy scan over edited neighborhoods.
- Live smoke checks: isolated local-registry installs against clean root/index/manifest paths.
- Exit criteria: all checks pass or gaps are recorded.

## Phase 6: Docs, Contracts, And Closure

- Docs or API contracts to update: CLI registry instructions and both cleanup records.
- Final files touched: record at closure.
- Commands run and results: record tests, build, smoke, and debt scan.
- Accepted debt: local installed legacy manifest readability only.
- Definition of Done: current CLI uses one v2 registry URL/layout with no remote fallback and no `manifest.v2.json` awareness.

## Execution Record

- Status: complete on 2026-08-01.
- Red/green record:
  - Focused registry-client tests initially failed because the default URL used
    `index.v2.json`, legacy indexes were accepted, and stack reads preferred
    `manifest.v2.json`.
  - The focused registry-client suite passed 7/7 after implementation; broader
    registry/resolver/install coverage passed 32/32.
  - The first full suite found five obsolete sectioned-index test fixtures.
    Converting only those fixtures to the canonical keyed contract made their
    focused 7/7 tests and the full suite pass.
- Implementation:
  - The default and local registry path are root `index.json`; there is no
    fallback URL or fallback diagnostic.
  - Remote indexes require schema version 2 with a keyed package map and
    canonical key/id/kind validation.
  - Local and remote stack acquisition use only canonical `manifest.json` and
    normalize it for installed runtime behavior.
  - Existing installed legacy manifests remain readable through installed-state
    normalization; this does not reintroduce remote registry fallback.
  - Registry-client tests were renamed around behavior rather than migration
    version labels, and CLI registry documentation now matches the contract.
- Verification:
  - `npm test`: 1,032 passed, 0 failed, 0 skipped.
  - `npm run build`: passed; built smoke reports `rudi v1.10.12`.
  - CLI repo-policy debt scan over edited registry-client/core neighborhoods:
    0 findings.
  - Isolated local-registry smoke resolved a stack, runtime, binary, flat skill,
    and bundled skill from the 99-package root index; it installed the stack and
    both skill shapes and produced no version-suffixed manifest.
- Compatibility note: released clients that require the removed remote v1 or
  version-suffixed layout must upgrade. Already-installed local packages remain
  readable.
- Known gaps: the smoke test used a local checkout and temporary RUDI home; no
  live GitHub download or mutation of real installed state was performed.
