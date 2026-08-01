# CLI Registry v2 Client Migration

## Phase 0: Baseline And Manual Lookup

- Scope: add a v2-capable registry boundary while retaining tested v1 compatibility during rollout.
- Files to inspect before editing: `packages/registry-client/src/index.js`, registry-client tests, `packages/core/src/resolver.js`, `packages/core/src/installer.js`, installed-manifest readers under `packages/core` and `src/commands`, and CLI build/test scripts.
- Relevant SWE manual sections: API E4/E10, Infrastructure H1/H4/H5, Master Doctrine Appendix C7A, and API phase gates.
- Current-state commands: `git status -sb`; focused registry-client/core tests; CLI build; source search for direct `manifest.json` reads.
- Risks and invariants: the CLI worktree already contains bundled-skill and home-inventory changes in overlapping files; preserve them; current v1 installs/search/update must remain functional; fallback must be explicit and temporary.
- Exit criteria: all direct consumers and dirty overlaps are mapped before edits.

## Phase 1: Scope Lock

- In scope: v1/v2 index detection, normalization into one internal model, platform resolution, checksum validation, centralized installed-manifest loading, explicit fallback diagnostics, and isolated installation tests.
- Non-goals: unrelated CLI commands, daemon/session compatibility work, UI behavior, or stack implementation changes.
- Expected files touched: focused new registry normalization/manifest modules and tests; minimal integration patches in registry-client, core resolver/installer, and direct manifest readers; docs and generated CLI bundle after source verification.
- External inputs and trust boundaries: registry responses, manifests, URLs, archive metadata, checksums, environment overrides, filesystem paths, and installed package metadata.
- Failure behavior to define: unsupported versions and invalid shapes fail before install; fallback occurs only for availability/compatibility conditions, not integrity failures; partial installs are cleaned atomically.
- Exit criteria: normalized internal package/index interfaces are defined before consumers change.

## Phase 2: Red Tests

- Observable behavior to prove: current v1 fixtures remain readable; v2 keyed indexes return the same packages; v2 manifests normalize install-critical fields; unsupported versions fail; checksum failure leaves no installed package; fallback is observable; installed v1/v2 manifests load through one boundary.
- Test files to add or edit: registry-client unit tests, core resolver/installer tests, and focused command tests only where a direct reader is replaced.
- Red command: run each focused Node test file before its implementation slice.
- Expected failure: v2 normalization and centralized manifest loading do not yet exist.
- Exit criteria: expected red failures are recorded in the registry plan execution record.

## Phase 3: Implementation

- Implementation rules: normalize at boundaries; prefer a v2-aligned internal shape; keep compatibility adapters isolated; preserve existing bundled-skill changes; do not weaken URL/path/checksum validation.
- Files allowed to change: the Phase 1 scope only.
- Validation and error-handling requirements: reject malformed IDs, paths, schema versions, URLs, platform specs, and checksums with stable error context.
- Observability requirements: expose registry schema, source, and fallback choice in debug/JSON diagnostics without secrets.
- Exit criteria: focused tests pass unchanged.

## Phase 4: Green Tests And Refactor

- Green command: rerun Phase 2 commands unchanged.
- Refactor constraints: replace duplicated readers only after normalized behavior is green.
- Regression checks: registry-client, core, affected commands, and bundled-skill tests.
- Exit criteria: v1 and v2 fixtures are behaviorally equivalent for supported packages.

## Phase 5: Full Verification

- Targeted tests: registry-client/core/command tests.
- Full suite: CLI package/full test commands where feasible.
- Build/typecheck/lint: CLI build and syntax checks.
- JS/TS debt scan, if applicable: scan edited CLI neighborhoods using repo policy or shared fallback.
- Live smoke checks: isolated v1/v2 local registry search/install/update/remove with no mutation of real user state.
- Exit criteria: all checks pass or gaps are explicitly recorded.

## Phase 6: Docs, Contracts, And Closure

- Docs or API contracts to update: CLI registry URL/schema/fallback docs and the registry migration guide.
- Final files touched: record at closure.
- Commands run and results: record in the registry master plan.
- Accepted debt: time-bounded v1 adapter until the published sunset date.
- Definition of Done: v2 is the default tested client contract, v1 fallback is bounded and observable, and direct manifest parsing no longer creates divergent behavior.

## Execution Record

- Boundary implementation: added `packages/registry-client/src/registry-contract.js` to detect v1/v2 indexes, validate canonical IDs and install metadata, normalize both formats, resolve platform overrides, and reject malformed HTTPS URLs, checksums, extract types, package specs, and system detection metadata before installation.
- Registry selection: the default remote URL is now `index.v2.json`; local registries prefer it as well. The client falls back to root `index.json` only for transport/HTTP availability failures and emits a diagnostic event. Invalid JSON or an invalid v2 contract does not silently downgrade.
- Manifest selection: canonical catalog packages prefer v2 manifests and fall back to generated v1 only on a not-found response. V2 stack installs preserve the normalized v2 installed manifest plus the source `manifest.v2.json`; legacy installs preserve v1 behavior.
- Installation integrity: generic v2 downloads use temporary files, SHA-256 verification, cleanup on failure, and explicit `raw`, `zip`, `tar.gz`, and `tar.xz` extraction. Runtime archives preserve mapped binary layout, including `bin/node` and `bin/npm`, and installer shims are created from normalized binary metadata.
- Dependency resolution: core resolver/installer now retain complete install-critical v2 package fields. Skills keep required stacks installable, and required stacks retain their own runtime/binary dependencies.
- Test isolation: the full CLI runner now uses test-file concurrency 1 because integration tests mutate process-global RUDI environment paths; this removed two order-dependent failures without weakening assertions.
- Red/green slices observed:
  - contract, fallback, v2 manifest, v2 stack, and verified-download test files first failed for missing modules/functions or legacy selection, then passed after their boundary implementations;
  - the v2 skill dependency test first failed because its stack dependency lost `install.path`, then passed after dependency packages retained full normalized metadata;
  - the runtime-layout regression first failed with `extracted binary not found: npm`, then passed after preserving configured archive paths;
  - the initial parallel full suite produced two global-environment race failures; the unchanged tests passed deterministically under the serial file runner.
- Final verification (2026-08-01):
  - `npm test`: 1,032/1,032 tests passed, zero failed/skipped.
  - `npm run build`: production CommonJS bundle and package manifest generated successfully.
  - `node dist/index.cjs --version`: `rudi v1.10.12`.
  - repo-policy JS/TS debt scan over the edited CLI/core/registry-client neighborhoods: zero findings.
  - isolated v2 smoke: search and install succeeded for `stack:otter-mcp`, system `binary:git`, flat `skill:business-communication-secretary` with `stack:google-workspace` and `stack:notion-workspace`, bundled `skill:design-system-extractor`, and downloaded `runtime:node`; all expected metadata/layout assertions were true.
  - isolated v1 boundary smoke: legacy search, resolution, source copy, installed manifest, and direct core installation succeeded. A separate deliberately fake MCP stack reached post-install indexing and failed only because the fixture was not a real MCP server.
- Final implementation files: `packages/registry-client/src/registry-contract.js`, `packages/registry-client/src/index.js`, `packages/core/src/resolver.js`, `packages/core/src/installer.js`, `scripts/run-tests.js`, focused unit tests under registry-client/core, updated `AGENTS.md`, and regenerated `dist/index.cjs`/package manifests. Existing bundled-skill and home-inventory changes in overlapping files were preserved.
- Compatibility window: v1 fallback remains intentionally available through 2026-11-01. Removing it requires the registry's supported-client review and major-release gate.
