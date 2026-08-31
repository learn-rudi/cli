# Versioned Runtime Inspection Repair

Status: implementation active

## Phase 0: Baseline And Manual Lookup

- Scope: make `rudi check` and `rudi info` truthfully inspect an installed
  versioned runtime whose package ID differs from its executable name, without
  changing installation layout or generic shims.
- Triggering live evidence: `runtime:node-20-20-2` installed successfully at
  `/Users/admin/.rudi/runtimes/node-20-20-2`; `rudi list runtimes` sees it, but
  `rudi check runtime:node-20-20-2 --json` reports `installed:false` because it
  probes `bin/node-20-20-2`. `rudi info` reports shared Node 20.10.0 shim targets
  under the versioned package without distinguishing that they belong to the
  preserved shared runtime.
- Files inspected: global/CLI `AGENTS.md`, `src/commands/check.js`,
  `src/commands/info.js`, environment package-path mapping, installer manifests,
  shim validation/ownership helpers, existing command tests, and live installed
  runtime/shim state.
- Relevant SWE standards: Engineering Quick Reference, Agent Co-Pilot Operating
  Standard, Infrastructure And Deployment Engineering Standard, Testing
  Doctrine, and Horizontal Engineering And Codebase Stewardship Standard.
- Baseline: clean isolated worktree
  `/Users/admin/RUDI/worktrees/cli/versioned-runtime-inspection-20260831` on
  `fix/versioned-runtime-inspection-20260831`, based on `origin/main`
  `6c6bb1dbda35bc257120113119aad6c7b79575cf`.
- Release-lineage constraint: the installed CLI is version `1.10.23` with
  bundle SHA-256
  `8d6a3f55f92712490f38abf3ea995d8f2f93b91414bc2857a794faa1b1b87f2b`,
  matching the preserved GitHub-readiness worktree rather than `origin/main`.
  The already-verified reconciliation commit
  `9629087d278f9265006c5625240de5bfac67e355` combines that readiness lineage
  with suite-aware main at version `1.10.24`; the release branch must preserve
  it before publishing this fix and must use a version greater than `1.10.24`.
- Horizontal scan: package-path derivation already supports arbitrary runtime
  IDs. The defect is duplicated runtime-binary inference in command adapters:
  `check` assumes executable name equals package name, while `info` treats any
  same-name global shim as package-owned. Disposition: standardize inspection
  around the installed manifest/root; do not change installer or shim ownership.
- Risks/invariants: explicit runtime IDs never fall back to an unrelated global
  executable; malformed/missing manifests fail closed; ordinary `runtime:node`,
  `runtime:python`, and `runtime:node24` remain compatible; generic shims remain
  untouched; command output never implies a foreign shim belongs to the package.
- Risk tier: Medium. This changes operational readiness reporting but not
  package installation, runtime bytes, shims, credentials, or services.
- Exit criteria: deterministic reproduction, exact scope, tests, rollback, and
  publication/install path recorded.

## Phase 1: Scope Lock

- In scope: add focused command-level tests; select installed runtime binaries
  from the exact root's manifest; distinguish installed binaries from shared or
  foreign shim targets in `rudi info`; build/publish/install the verified CLI;
  read back the live versioned runtime and shared shim invariants.
- Non-goals: change Registry/installer layout, create versioned shims, replace
  generic Node shims, alter runtime contents, edit Compute, rebuild applications,
  change credentials, remove old CLI/runtime files, or clean unrelated worktrees.
- Expected files: `src/commands/check.js`, `src/commands/info.js`, shared
  `src/runtime-inspection.js`, one focused test file, package-version metadata,
  generated `dist/index.cjs`, and this compliance record. The verified
  reconciliation commit is included as an explicit merge parent rather than
  copied or reimplemented.
- Trust boundaries: installed manifest contents, filesystem type/permissions,
  executable invocation, shim target/ownership metadata, GitHub checks, package
  artifact, and post-install readback.
- Failure behavior: absent/malformed manifest binaries, paths outside the exact
  install root, non-files/non-executables, version probe failure, foreign shims,
  failing tests/build/debt/review/CI, or live mismatch stop the E2E chain.
- Authorized actions: the user's 2026-08-31 lead-engineer E2E clearance covers
  this necessary source/commit/PR/merge/build/install remediation. Direct-main
  pushes, shim replacement, destructive cleanup, and retained-state overwrite
  remain excluded.
- Commit strategy: one green source/test/compliance slice; a dedicated generated
  build slice only if repository convention requires tracked `dist`; stage and
  inspect task-owned paths only.
- Review gates: two red-green slices, targeted/full tests, build reproducibility,
  focused and repository debt scans, fresh independent review, GitHub CI/merge,
  package/install provenance, and live readback.
- Exit criteria: no unresolved scope or ownership ambiguity.

## Phase 2: Red Tests

- Behavior 1: `rudi check runtime:node-20-20-2 --json` reads the exact installed
  manifest/root and reports `bin/node`, version 20.20.2, installed and ready.
- Behavior 2: `rudi info runtime:node-20-20-2` reports its exact installed
  binaries and labels generic Node shims as preserved for another package.
- Test file: `src/__tests__/unit/versioned-runtime-inspection.test.js`.
- Red commands: run each named test with `node --test --test-name-pattern`.
- Expected failures: Behavior 1 reports absent; Behavior 2 presents the shared
  target as the versioned package's valid shim and omits the installed path.
- Results: Behavior 1 failed with exit status 1 and `installed:false` because
  the command probed `bin/node-20-20-2`. Behavior 2 failed because the output
  omitted the exact installed path and printed the preserved shared Node shim
  as a valid shim for the versioned package. Both failures matched the locked
  expectations.
- Exit criteria: each red fails for its exact behavior after test setup passes.

## Phase 3: Implementation

- Rules: derive the runtime root with `getPackagePath`; parse only its manifest;
  accept declared bin names/paths only when they resolve inside the runtime root;
  preserve legacy fallback for unmanifested runtimes; never create/change shims.
- Files allowed: only Phase 1 paths.
- Validation: regular/executable runtime binary, inside-root containment, bounded
  manifest shapes, deterministic preferred executable, truthful foreign-shim
  labeling, and visible version-probe failure.
- Observability: JSON check returns exact path/version/ready; info prints exact
  installed binary and separately describes shim disposition.
- Exit criteria: both unchanged red commands pass.

## Phase 4: Green Tests And Refactor

- Green commands: the exact Phase 2 commands.
- Refactor: share only the minimum manifest/bin normalization required to prevent
  the two command adapters from drifting; do not widen into installer changes.
- Regression: existing agent/check, shim, binary/runtime, package info, and
  environment tests; `git diff --check`.
- Results: both unchanged red commands pass. Two additional boundary tests also
  pass: a manifest binary that escapes the package root fails closed, and the
  ordinary shared `runtime:node` continues to report its exact owned shim.
- Focused/adjacent command: `node --test --test-concurrency=1` over the new test,
  binary/runtime, legacy-runtime, shim, external-agent, and environment suites;
  result: 88 passed, 0 failed. `git diff --check` passed.
- Exit criteria: focused and adjacent tests pass without assertion weakening.

## Phase 5: Full Verification

- Targeted tests: focused runtime inspection plus adjacent command/runtime suites.
- Full suite: `pnpm test`.
- Build: `pnpm build`; verify tracked bundle reproduction and package contents.
- Debt: changed-file runner and RUDI focused debt scan.
- Live smoke: install the exact reviewed CLI artifact, run check/info against the
  versioned runtime, and rehash both versioned/shared binaries and generic shims.
- Independent review: fresh read-only diff and evidence review before publication.
- Results: pending.
- Exit criteria: no blocking finding or provenance gap.

## Phase 6: Docs, Contracts, And Closure

- Docs/contracts: this compliance record and truthful command output contracts.
- Final paths/results/review/commits/publication: pending.
- Horizontal obligation: close the command-adapter inference drift with exact
  tests; no installer/shim consolidation obligation expected.
- Verdict: active.
- Accepted debt: none.
- Proof gaps: implementation through live readback and closeout are pending.
- Definition of Done: merged reviewed source, verified artifact installed through
  an accepted release mechanism, live `check`/`info` truthfully bind the exact
  versioned runtime, shared shims/runtime remain unchanged, and E2E resumes.
