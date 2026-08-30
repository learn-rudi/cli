# Public GitHub Tree Stack Installation

## Task Contract

Implement `rudi install <public-github-tree-url>` for a RUDI-compatible stack
directory. The source must be public GitHub over HTTPS, validated as a RUDI
stack, resolved to an immutable commit, installed with its explicitly declared
operator skill, projected to detected native hosts, and recorded with durable
source provenance. Existing registry and `npm:` installs must remain compatible.

Private repositories, non-GitHub hosts, arbitrary non-RUDI repositories,
registry publication, releases, installation on user machines, and deployment
are excluded. On 2026-08-29 the user authorized the GitHub issue/branch/commit/
push/pull-request/CI/merge loop for public issue #34; cleanup remains a separate
authorization boundary.

## Phase 0: Baseline And Manual Lookup

- [x] Scope: source resolution, download, install, lock provenance, update
  behavior, help/docs, tests, bundle, and isolated-home smoke proof.
- [x] Files inspected: install/update commands; core resolver, installer, and
  lockfile; registry client and contract; related tests; instructions; Git
  state; and worktree inventory.
- [x] Manual: Operating Manual Index; Testing Doctrine; Security F1, F5, F7,
  and F12; Agent Co-Pilot Standard; Horizontal Engineering Standard.
- [x] Current state: clean `origin/main` at
  `664265cdcc0a1d407d31ee1648956d717bfd7c04` in an isolated worktree.
- [x] Horizontal scan: official registry download already traverses GitHub
  Contents. Generalize that responsibility once; keep the registry adapter.
- [x] Risks and invariants:
  - URL/API data, filenames, manifests, skills, and content are untrusted.
  - Accept exact HTTPS `github.com` tree URLs only. Reject credentials, query,
    fragment, traversal, symlinks, submodules, and foreign content URLs.
  - Resolve mutable refs to a full commit SHA before downloading.
  - Require a valid stack manifest and explicit repository-relative operator
    skill path containing `SKILL.md`.
  - Derive destinations from validated package IDs, not URL path text.
  - Suppress external Node lifecycle scripts unless `--allow-scripts` is explicit;
    dependency failure aborts and partial installs are removed.
  - Lock requested source, resolved commit, path, and installed-content hash.
  - Preserve existing registry and dynamic npm behavior.
- [x] Risk tier: **High**, because this adds a software supply-chain boundary.
- [x] Exit: baseline, standards, risks, and isolated worktree are recorded.

## Phase 1: Scope Lock

- [x] In scope: URL parsing; ref resolution; bounded recursive download;
  manifest/operator-skill validation; source propagation; safe dependencies;
  lock provenance; pinned update behavior; CLI help/docs.
- [x] Non-goals: authentication, non-GitHub hosts, repository-root shorthand,
  arbitrary source, external companion discovery, registry publication.
- [x] Expected paths: new GitHub source module/tests; registry client
  exports/tests; core resolver/installer/lockfile/tests; install/update
  commands/tests; help, README, this checklist, and `dist/index.cjs`.
- [x] Trust flow: CLI URL -> parser -> GitHub API -> manifest/skill validation
  -> package directories -> dependency tools -> MCP/native skill projection.
- [x] Failure behavior: reject before mutation when possible; remove partial
  installs; never fall back to another ref, host, kind, or registry package.
- [x] External actions: read public GitHub, run one bounded smoke install, and
  execute issue #34 through task-owned commits, push, PR, CI, and merge. Release,
  deployment, user-machine installation, and cleanup are not authorized.
- [x] Commit plan: (1) source, tests, README, and help; (2) generated bundle;
  (3) this compliance ledger. The user authorized these task-owned commits and
  their issue #34 publication loop on 2026-08-29.
- [x] Horizontal disposition: resolve in this change by consolidating safe
  recursive GitHub traversal behind one implementation.
- [x] Gates: security negatives, full tests/build/debt/package proof, isolated
  smoke, and fresh-context read-only review.
- [x] Exit: interfaces and invariants are locked before behavior edits.

## Phase 2: Red Tests

- [x] Prove parser/ref resolution, safe recursion, external stack/operator
  resolution, installer provenance/script policy, CLI bypass, and updates.
- [x] Add or edit tests adjacent to each boundary.
- [ ] Record every unchanged focused red command and expected behavior failure.
- [ ] Exit: every observable behavior has a witnessed red run.

Process gap: initial boundary behaviors had witnessed red checkpoints, but some
independent-review remediation tests were added after manual reproduction rather
than preserving an unchanged automated red command. No claim is made that the
entire change followed a perfect red-green sequence.

## Phase 3: Implementation

- [x] Make the smallest green change for each behavior; add no dependency.
- [x] Change only scope-locked paths unless correctness requires an addition.
- [x] Fail closed and preserve pre-existing installs until validation succeeds.
- [x] Emit source-resolution/download progress and display the pinned commit.
- [x] Exit: every behavior is wired and green.

## Phase 4: Green Tests And Refactor

- [ ] Rerun every red command unchanged; see the Phase 2 process gap.
- [x] Deduplicate only GitHub traversal required for correctness.
- [x] Run related-skill, download, command-execution, and update regressions.
- [x] Preserve planned commit slices uncommitted.
- [x] Exit: targeted and regression tests remain green.

## Phase 5: Full Verification

- [x] Targeted tests: final install-policy suite 19/19 and earlier complete
  feature suite 33/33.
- [x] `pnpm test`: 716 tests, 43 suites, 0 failures.
- [x] `pnpm build`: both bundles generated successfully.
- [x] Canonical `swe_debt_scan`: zero findings for every edited JS source file
  and zero findings for the edited core, registry-client, and utils scopes.
- [x] `npm pack --dry-run`: six files, 311.8 kB package, 1.5 MB unpacked.
- [x] Temporary `RUDI_HOME` pinned-source stack/operator integration: 1/1.
- [x] Live public rejection smoke: a real learnrudi registry tree failed closed
  before mutation because it lacks the new `related.operatorSkillPath` contract.
- [ ] Live public success smoke: no already-public compatible fixture exists,
  and publishing one is outside this task's authority.
- [x] Fresh-context independent review and corrections: final verdict had no
  blocking findings; the last narrow-index advisory was also applied.
- [x] `git diff --check` and generated-bundle string verification passed.
- [x] Exit: all authorized proof gates pass and the live-fixture gap is explicit.

## Phase 6: Docs, Contracts, And Closure

- [x] Update help and README security/update semantics.
- [x] Record final files and exact command results in this checklist and tests.
- [x] Record smoke and independent-review results.
- [x] Record pre-publication state: implementation began on branch
  `codex/github-tree-install-20260829` at base
  `664265cdcc0a1d407d31ee1648956d717bfd7c04`; 18 paths were dirty and the
  preliminary closeout required preservation. The issue loop renamed the exact
  worktree branch to `chore/34-public-github-tree-install` after confirming
  current `origin/main` and created public issue #34.
- [x] Record horizontal obligations and worktree closeout receipt: Repo Steward
  receipt `github-tree-install-20260829`, version 2, state
  `preservation_required`, classification `active`, cleanup ineligible.
- [x] Final implementation verdict: ready for the issue #34 publication loop;
  merge remains gated on CI and GitHub acceptance evidence.
- [x] Accepted debt: none in scope. A broad `src` scan also reported seven
  pre-existing orphan warnings outside the edited files; the focused edited-file
  scan is clean.
- [x] Proof gaps: no live-success public fixture currently implements
  `related.operatorSkillPath`; the bounded isolated integration covers the
  successful install contract without publishing new public content.
- [x] Definition of Done for implementation: code, tests, bundle, package proof,
  documentation, and independent review are complete. Delivery-loop completion
  additionally requires task-owned commits, PR/CI/merge evidence, and a new
  final worktree-closeout receipt before any separately approved cleanup.

## Issue And Publication Ledger

- Issue: [#34 — Install compatible RUDI stacks from public GitHub tree URLs](https://github.com/learnrudi/cli/issues/34)
- Branch: `chore/34-public-github-tree-install`
- Base: `origin/main` at `664265cdcc0a1d407d31ee1648956d717bfd7c04`
- Commit `77dc203`: `feat: install stacks from public GitHub trees (#34)` —
  source, tests, README, and help
- Commit `e9f94b2`: `build: regenerate CLI bundle for GitHub tree install (#34)`
- Commit `73812ad`: `docs: record GitHub tree install compliance (#34)`
- Push: branch published to `origin/chore/34-public-github-tree-install`
- Pull request: [#35 — Install compatible RUDI stacks from public GitHub tree URLs](https://github.com/learnrudi/cli/pull/35)
- CI/review/merge: pending
- Release/deployment/install: not authorized
- Final closeout and cleanup: final receipt pending; cleanup not authorized

## Final Changed Paths

- `README.md`, `packages/utils/src/help.js`, and `dist/index.cjs`
- `packages/registry-client/src/index.js`, new `github-source.js`, and its tests
- `packages/core/src/installer.js`, `lockfile.js`, `resolver.js`, and their tests
- `src/commands/install.js`, `src/commands/update.js`, and their tests
- This compliance record

The change pins the selected GitHub tree to a full commit, validates and
downloads the complete bounded subtree, preserves executable modes, installs
the required operator from the same snapshot transactionally, records lock
provenance and content modes, gates downloaded code execution, invalidates
stale MCP indexes, and requires explicit URL plus `--force` for replacement.
