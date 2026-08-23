# External Agent CLI Ownership Compliance Plan

## Phase 0: Baseline And Manual Lookup

- Scope: retire RUDI-managed installation and runtime discovery for external
  Agent Host CLIs while preserving RUDI-managed Node and Python runtimes for
  the CLI, router, tools, and MCP stacks.
- Repositories: `learnrudi/cli` and `learnrudi/registry`.
- Relevant standards: Engineering Quick Reference, Testing Doctrine,
  Infrastructure and Deployment Standard, and Agent Co-Pilot Operating
  Standard.
- Initial risk tier: medium. This changes package and executable-discovery
  contracts but does not deploy, mutate data, remove installed files, or alter
  secrets.
- Baseline: both repositories are clean on `main`; the Admin Mac uses vendor
  Codex and Claude entrypoints under `~/.local/bin`; RUDI's Node runtime remains
  installed and is declared by installed MCP stacks.

## Phase 1: Scope Lock

- In scope:
  - make every registry `agent:*` entry system/external and detection-only;
  - remove the unsupported legacy `agent:copilot` record so the catalog matches
    the implemented native Agent Host fleet;
  - reject `rudi install agent:*` without creating RUDI manifests or shims;
  - resolve Agent Hosts only from vendor/system locations;
  - remove installation guidance that routes agents through RUDI's Node runtime;
  - return actionable vendor-install guidance when an Agent Host is absent;
  - update generated registry and CLI package manifests.
- Non-goals:
  - do not retire or alter RUDI's Node/Python runtime packages;
  - do not delete legacy `~/.rudi/agents` state or `~/.rudi/bins` wrappers;
  - do not change provider authentication, model selection, prompts, or output
    validation;
  - do not commit, push, deploy, restart services, or synchronize the primary
    RUDI Mac.
- Invariants:
  - stack execution continues to prefer RUDI-owned language runtimes;
  - provider CLIs remain authoritative for model execution and authentication;
  - a missing provider is visible and fail-closed; no fallback installation or
    provider substitution occurs.
  - machine-readable host inventory uses the canonical Antigravity ID; `google`
    remains only an accepted input alias.

## Phase 2: Red Tests

- Registry policy must reject npm-installed agents and require system delivery,
  explicit detection, and vendor installation guidance.
- CLI installer must reject all `agent:*` packages without writing a manifest
  or shim.
- Provider configs must contain no `~/.rudi` executable candidates and must
  prioritize vendor user-local entrypoints.
- Missing-host errors must direct users to the vendor rather than
  `rudi install agent:*`.

## Phase 3: Implementation

- Change only registry agent catalogs/policy/tests/indexes and CLI provider
  configs, installer/status/check behavior, focused tests, generated manifests,
  architecture documentation, and user-facing help.
- Validate executable candidates at the Agent Host boundary.
- Preserve removal support for legacy RUDI-managed agent artifacts; do not
  create new ones.

## Phase 4: Green Tests And Refactor

- Run focused registry resolver/catalog/schema tests.
- Run focused CLI provider, launch, installer, manifest, status, and check tests.
- Refactor only after the focused red tests pass, then rerun them unchanged.

## Phase 5: Full Verification

- CLI: `pnpm test`, `pnpm build`, changed-file debt scan, `npm pack --dry-run`.
- Registry: `npm test`, `npm run validate`, `npm run indexes:sync`,
  `npm run indexes:check`, `npm run catalog:clean:check`, `npm run build`, and
  `npm pack --dry-run --json`.
- Smoke: under a restricted environment, verify `rudi agent hosts --json`
  discovers vendor Codex/Claude while the RUDI Node runtime remains available.
- Require a fresh-context, read-only review of the final diff and evidence.

## Phase 6: Docs, Contracts, And Closure

- Record the external Agent Host ownership ADR and update installation docs.
- Report exact commands/results, independent-review findings, accepted debt,
  proof gaps, and a final readiness verdict.
- Source-ready does not mean deployed: installed CLI/registry artifacts and the
  primary RUDI Mac remain unchanged until separately authorized promotion.

## Execution Record

### Authorized Release Continuation

- A subsequent user-authorized closeout promotes the source-ready change
  through feature branches, pull requests, Admin runtime verification, narrow
  recoverable legacy cleanup, and Git-based primary-Mac synchronization.
- Release versions are CLI `1.10.20`, Registry `2.0.1`, and Agent Hosts stack
  `0.1.2`. The stack receives a new patch because an installed `0.1.1` and the
  newer source had the same version but different content.

### Red-Green Evidence

- Red tests captured the old npm-agent policy, RUDI-path executable discovery,
  installer state creation, non-canonical Google identity, stale shim repair,
  and unsupported provider-version behavior before their implementations were
  changed.
- Interpreter-boundary red tests failed because the CLI environment injected
  `path.dirname(process.execPath)` and the stack runner's inherited `PATH`
  retained RUDI-owned runtime directories. Both Agent Host child boundaries
  now remove lexical and canonical RUDI-home entries while preserving the
  provider executable directory and external/system paths.
- The legacy shim-only cleanup test failed before
  `removeBrokenLegacyAgentShims` existed and passed 5/5 after the removal-only
  implementation. No Agent Host installer is invoked by shim repair.
- Failure-path reds proved that unsuccessful legacy npm removal erased retry
  metadata and successful shim repair still exited 1. The final behavior
  preserves metadata and reports failure on npm-removal errors, while complete
  shim cleanup exits 0 and counts orphan-removal failures.

### Final Verification

- `pnpm test`: 661 passed, 0 failed across 43 suites.
- `pnpm build`: passed; source and distribution package manifests are
  byte-identical.
- Repository debt runner and `stack:swe-engineering` changed-file scan: 0
  errors, 0 warnings, 0 informational findings.
- `npm pack --dry-run --json`: passed for `@learnrudi/cli@1.10.20` with 6
  packaged files.
- Shim cleanup now preserves unowned regular files it cannot parse, recognizes
  static literal and variable-based shell wrappers, and removes only explicitly
  identified legacy Agent Host shims. The red regression first demonstrated
  that the former fix path deleted an unparsed wrapper.
- Fresh review additionally proved that an Agent Host basename was not enough
  ownership evidence and that relative inherited `PATH` entries bypassed the
  runtime boundary. Cleanup now requires recorded ownership or an exact
  RUDI-owned legacy payload target, and Agent Host child paths accept absolute
  entries only.
- Restricted-environment built-CLI smoke discovered authenticated Claude
  2.1.241 at `~/.local/bin/claude` and authenticated Codex 0.147.0 at
  `~/.local/bin/codex`; Antigravity and Gemini reported unavailable without
  fallback.
- Isolated `rudi install agent:codex --json` exited 1 and did not create the
  configured `RUDI_HOME`.
- RUDI infrastructure runtimes remain independently present: Node 20.20.2 and
  Python 3.12.12.

### Review And Readiness

- Fresh-context review findings were resolved for stale RUDI-path fallback,
  external-path validation, early install rejection, legacy removal and shim
  cleanup, version capability guards, canonical IDs, status wording, generated
  manifests, unsupported Copilot inventory, and Agent Host interpreter-path
  isolation, plus failure-safe legacy npm removal and accurate shim-fix exit
  status. The detected-agent JSON response keeps `installedAgents` as a
  deprecated compatibility alias beside the truthful `configuredAgents` key.
- Accepted debt: none in the configured changed-file scan. Promotion, cleanup,
  and cross-Mac evidence are recorded by the authorized release continuation,
  not asserted by this source-only record.
- Verdict: source-ready for the authorized release continuation.
