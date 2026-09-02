# CLI npm Release 1.10.26 Compliance Checklist

## Phase 0: Baseline And Manual Lookup

- Status: complete.
- Scope: promote current `origin/main` as a traceable npm release after the
  published `latest` tag stalled at `1.10.12` while source and the verified
  workstation install advanced to `1.10.25`.
- Files inspected before editing: `AGENTS.md`, `package.json`,
  `.github/workflows/quality.yml`, `README.md`, the tracked `dist/index.cjs`,
  existing release/compliance records, installed package metadata, and npm
  registry metadata.
- Relevant SWE manual sections: Engineering Operating Manual Index,
  Infrastructure and Deployment Standard H1/H4/H5, Agent Co-Pilot Operating
  Standard, Engineering Quick Reference, and Horizontal Engineering and
  Codebase Stewardship Standard.
- Current-state commands: `rudi --version` reported `1.10.25`;
  `npm view @learnrudi/cli version dist-tags --json` reported npm `latest` as
  `1.10.12`; `git show origin/main:package.json` reported `1.10.25`; SHA-256
  comparison proved the installed `dist/index.cjs` exactly matched
  `origin/main` before this release branch.
- Horizontal-pattern scan: package publishing is not duplicated in repository
  automation; `.github/workflows/quality.yml` verifies packages but does not
  publish them. The approved expansion adds the repository's single owned npm
  publication mechanism rather than duplicating an existing path.
- Risks and invariants: npm versions are immutable; the published artifact must
  correspond to one reviewed Git commit; `latest` must not move until all
  package gates pass; no secrets may enter logs or artifacts; the installed
  CLI must continue to resolve through the supported npm/Homebrew prefix.
- Initial risk tier and rationale: high, because npm publication and the new
  OIDC release workflow are externally visible software-supply-chain changes.
- Exit criteria: clean release worktree at current `origin/main`, exact stale
  registry state reproduced, release boundary and rollback documented.

## Phase 1: Scope Lock

- Status: complete, including the user-approved security/provenance expansion
  on 2026-09-01.
- In scope: bump `@learnrudi/cli` from `1.10.25` to `1.10.26`; remediate the
  production/bundled dependency advisories discovered during release review;
  add one GitHub Actions OIDC trusted-publishing workflow with automatic npm
  provenance; rebuild the tracked distribution; run repository-prescribed
  quality gates; independently review the final diff and proof; publish through
  a protected-branch pull request; publish the accepted `main` commit to npm;
  verify `latest` and provenance; and reconcile the paired admin Mac if it is
  safely reachable and clean enough.
- Non-goals: product features, Registry package updates, stack updates, daemon
  changes, unrelated dependency modernization, or token-based npm automation.
- Expected files touched: `package.json`, `packages/core/package.json`,
  `packages/db/package.json`, `packages/manifest/package.json`,
  `pnpm-lock.yaml`, `dist/index.cjs`, `.debt-scan.json`,
  `scripts/validate-publish-runtime.mjs`,
  `src/__tests__/unit/quality-workflow-contract.test.js`,
  `.github/workflows/publish-npm.yml`, and this checklist.
- External inputs and trust boundaries: npm registry metadata, npm auth state,
  GitHub auth/PR state, remote CI results, and admin-Mac repository/runtime
  state are untrusted until explicitly checked.
- Failure behavior to define: stop before publication on dirty or unexpected
  diffs, failed tests/build/debt/package checks, npm version collision, missing
  authentication, PR/CI rejection, or peer conflict. After npm publication,
  never overwrite the immutable version; correct a bad `latest` tag, deprecate
  the bad version, and issue a new patch release.
- Authorized external actions: the user approved the expanded dependency,
  workflow, commit, push, PR, merge, npm configuration/publication, and
  machine-update sequence on 2026-09-01. Direct pushes to protected `main`
  remain prohibited; use a feature branch and PR.
- Commit strategy and authorization: one atomic release commit containing the
  version, matching tracked bundle, and evidence checklist; push the release
  branch and open a PR after local gates; merge only after required review and
  CI; publish npm only from the accepted merged commit.
- Horizontal-obligation disposition: resolve in this change. Standardize npm
  publication on `.github/workflows/publish-npm.yml`; no second release
  implementation exists, and local token-based publication is not retained as
  a shadow path.
- Review and approval gates: local full verification, fresh-context independent
  Standards/Spec/Proof review, GitHub PR checks, protected-branch acceptance,
  npm preflight, exact tarball inspection, and post-publish smoke verification.
- Exit criteria: only the named files are changed and all authority, rollback,
  and promotion boundaries are explicit.

## Phase 2: Red Tests

- Status: complete.
- Observable behavior to prove: the packaged CLI reports `1.10.26`; the locked
  production graph contains no known moderate-or-higher advisories; the release
  workflow verifies the exact version, repeats the complete gate set, and
  publishes only from `main` through OIDC without an npm token.
- Test file edited:
  `src/__tests__/unit/quality-workflow-contract.test.js`.
- Red command 1: `pnpm audit --prod --audit-level=low --json` found five high
  and three moderate advisories in `ajv@8.17.1`, `fast-uri@3.1.0`,
  `yaml@2.8.2`, and `uuid@11.1.0`.
- Red command 2: `pnpm test --
  src/__tests__/unit/quality-workflow-contract.test.js` passed 3/5 and failed
  because `.github/workflows/publish-npm.yml` did not exist and the dependency
  floors were still vulnerable. A follow-up red assertion proved the
  `fast-uri@3.1.6` override was absent while the stale lock resolution remained.
- Expected failure: missing workflow contract and vulnerable dependency floors
  or lock resolutions must block release.
- Exit criteria: met; both red failures were behavioral and deterministic.

## Phase 3: Implementation

- Status: complete. The CLI version is `1.10.26`; secure minimum floors are
  declared for Ajv, YAML, and UUID; `fast-uri@3.1.6` is enforced with a root
  pnpm override because an ordinary Ajv update retained the vulnerable lock
  entry; and the OIDC workflow is present and contract-tested. `pnpm build`
  regenerated `dist/index.cjs` from these accepted sources.
- Implementation rules: make only release, dependency-remediation, and
  provenance changes; use the repository build command; do not hand-edit
  generated bundle contents; do not add or expose an npm token.
- Files allowed to change: the Phase 1 expected-file list only.
- Validation and error-handling requirements: reject any unexpected generated
  diff or package contents; do not publish if `1.10.26` already exists.
- Observability requirements: preserve command results, artifact contents,
  checksums, commit identity, PR/CI state, npm registry response, and smoke
  versions in this checklist.
- Exit criteria: met. Source version and generated bundle agree on `1.10.26`;
  resolved versions are `ajv@8.20.0`, `fast-uri@3.1.6`, `yaml@2.9.0`, and
  `uuid@11.1.1`; workflow YAML parses successfully; no unrelated change exists.

## Phase 4: Green Tests And Refactor

- Status: complete for the expanded diff.
- Green command: `pnpm test --
  src/__tests__/unit/quality-workflow-contract.test.js` passed 6/6; `pnpm audit
  --prod --audit-level=moderate` reported no known vulnerabilities.
- Refactor constraints: none; no refactor is authorized or required.
- Regression checks: compare generated output scope, run `git diff --check`,
  and confirm the built CLI reports `1.10.26`.
- Commit checkpoint: create the single verified release commit only after Phase
  5 local gates pass.
- Results: `node dist/index.cjs --version` reported `rudi v1.10.26`; a 5,000
  level YAML nesting payload now fails as bounded `YAMLParseError`, not
  `RangeError`; the generated bundle is reproducible across repeated builds.
- Exit criteria: met. Release metadata, dependency graph, workflow contract,
  and bundle are consistent and focused checks pass unchanged.

## Phase 5: Full Verification

- Status: complete locally; local gates are green and focused independent
  confirmation passed before the commit boundary.
- Targeted tests: built CLI `--version`, version-related unit tests, and package
  allowlist/content inspection.
- Full suite: `pnpm test` passed 777/777 tests across 43 suites after the
  expanded change.
- Build/typecheck/lint: `pnpm build`, reproducibility check against the tracked
  bundle, `git diff --check`, and `npm pack --dry-run --json`.
- JS/TS debt scan: repository-prescribed debt runner and the installed
  `stack:swe-engineering` debt scan against task-owned changes.
- Live smoke checks: install the exact packed artifact into an isolated
  temporary prefix with lifecycle scripts disabled, run its CLI version/help,
  then after publication install `@learnrudi/cli@1.10.26` and verify version and
  basic read-only health commands.
- Independent review: fresh-context `rudi-code-review` verdicts for Standards,
  Spec, and Proof, with all blocking findings resolved before promotion.
- Risk-tier approval: user authorization is recorded; protected-branch review,
  CI, and npm trusted-publisher configuration all passed before publication.
- Results: `pnpm build` passed twice and the before/after SHA-256 manifests for
  all three generated files were identical; `git diff --check` passed; both
  `node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log` and
  `stack:swe-engineering` `swe_debt_scan` reported zero findings. The latter
  explicitly scanned the new runtime validator, workflow-contract test, and
  bundle; adding the validator to the `pr-review` entrypoints resolved its only
  initial orphan warning.
- Package proof: the secure candidate at
  `/Users/hoff/.rudi/outputs/cli-releases/1.10.26-candidate-2/learnrudi-cli-1.10.26.tgz`
  has SHA-256
  `d9162f44b6657df4e2fd47019bfd8da9a441585dc5adb5764e98c827d04d0159`
  and exactly six allowlisted files (`LICENSE`, `README.md`, `dist/index.cjs`,
  `dist/packages-manifest.json`, `dist/router-mcp.js`, `package.json`). Its
  isolated `npm install --ignore-scripts` reports `rudi v1.10.26`, renders help,
  and audits with zero vulnerabilities. The earlier
  `/Users/hoff/.rudi/outputs/cli-releases/1.10.26/` candidate is obsolete and
  must never be published.
- Vulnerability proof: `pnpm audit --prod --audit-level=moderate` reports no
  known vulnerabilities across 101 production dependencies.
- Publication-path proof: the workflow packs one exact tarball into
  `$RUNNER_TEMP`, verifies its six-file inventory and version, and publishes
  that exact file with `npm publish ... --ignore-scripts`, preventing
  `prepublishOnly` from rebuilding after verification. A local dry-run of this
  exact path succeeded and left the verified `dist/index.cjs` hash unchanged.
- Independent review: the initial release-only review returned Standards
  `revise`, Spec `pass`, Proof `revise`, Overall `revise`. Its provenance,
  vulnerability, and evidence findings have been addressed in the expanded
  implementation. A second fresh-context review found three promotion blockers:
  npm `11.5.0` was incorrectly accepted, publication could rebuild after the
  last verification, and the `main`-only guard lacked contract coverage. The
  validator now rejects `11.5.0` and accepts `11.5.1`, publication uses the
  verified tarball with lifecycle scripts disabled, and the guard is covered;
  focused confirmation returned Standards `pass`, Spec `pass`, Proof `pass`,
  Overall `pass`, with no remaining P0-P3 findings.
- Exit criteria: met. PR quality run `33575519929` passed against release commit
  `0888fc1d06efa5d0525c7b2227c37ba9ff8d00b1` before merge.

## Phase 6: Docs, Contracts, And Closure

- Status: complete for source acceptance, publication, provenance, and paired
  workstation reconciliation. Repo Steward records the final non-mutating
  worktree disposition after this evidence-only update is accepted.
- Docs or API contracts to update: this compliance/evidence record only; user
  docs do not change because the install command and CLI behavior are unchanged.
- Final files touched before the release commit: `.debt-scan.json`,
  `.github/workflows/publish-npm.yml`, `dist/index.cjs`, `package.json`,
  `packages/core/package.json`, `packages/db/package.json`,
  `packages/manifest/package.json`, `pnpm-lock.yaml`,
  `scripts/validate-publish-runtime.mjs`,
  `src/__tests__/unit/quality-workflow-contract.test.js`, and this checklist.
- Commands run and results: local version/build, focused tests, full tests,
  reproducibility, diff checks, two debt scans, package dry-run/pack, isolated
  package smoke, registry availability/auth preflight, and dependency audit are
  recorded above. PR quality and publication workflows passed; registry
  metadata, signatures, provenance, exact-byte installation, and both-machine
  health checks also passed.
- Evidence artifacts: release commit
  `0888fc1d06efa5d0525c7b2227c37ba9ff8d00b1`; merged PR
  `https://github.com/learnrudi/cli/pull/39`; accepted merge commit
  `a7c5b4d4953bd9db654b646bd1c7d1d594aeb2fd`; quality run `33575519929`;
  OIDC publication run `33576564594`; and the package checksum recorded above.
- Independent-review result: the two `revise` review rounds are recorded above;
  focused confirmation closed every finding and returned Overall `pass`.
- Commit ledger and publication status: PR 39 merged through the repository's
  normal merge-commit policy. The `Publish npm` workflow ran only from accepted
  `main` at `a7c5b4d4953bd9db654b646bd1c7d1d594aeb2fd` and completed successfully.
  npm `latest` is `1.10.26`; registry integrity is
  `sha512-3yRAicntaJEX1G/NlqZToeyBLF8vPY8E1JT6bk8Jj8P2u8bCLCVsK8AoMsvsUmNPAlbW3egDSEWDqixEUl+j8Q==`;
  registry shasum is `21cb679805b32f9cdcad8e8cf203d8a6df80fbfc`;
  and npm exposes SLSA provenance through its attestation endpoint.
- Horizontal obligations opened, closed, or accepted: provenance-preserving
  npm release automation is resolved in this change by one owned workflow;
  closing proof is successful OIDC publication from accepted `main` with npm
  provenance visible and no token configured in the repository.
- Workstation reconciliation: the primary Mac's active npm install and the
  admin Mac's `/usr/local` install both report `rudi v1.10.26`. Both installed
  `dist/index.cjs` files match the accepted source SHA-256
  `59195aa6a225afcef98f72b4960f131880a59ec84fe20bf46dbba67e93e63d86`.
  Both daemons remained healthy and reachable. The admin Mac's pre-existing 13
  tool-index failures were unchanged by the release.
- Final verdict: pass. The accepted source, immutable npm artifact, provenance,
  registry tags, and paired installations agree.
- Accepted debt: none approved. The existing transitive `prebuild-install`
  deprecation warning is non-blocking but must remain visible.
- Proof gaps: none for the release. Worktree disposition is stored separately
  in the non-mutating Repo Steward closeout ledger after this evidence update.
- Definition of Done: exact accepted Git commit is published as
  `@learnrudi/cli@1.10.26`, npm `latest` resolves to it, local and paired-peer
  smoke checks pass or a peer-specific blocker is recorded, and the release
  worktree has a durable closeout receipt.
