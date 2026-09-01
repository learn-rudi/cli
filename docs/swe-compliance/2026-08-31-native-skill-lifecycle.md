## Phase 0: Baseline And Manual Lookup

- Scope: replace best-effort native skill copying with one ownership-aware, digest-bound, transactional lifecycle used by install, update, explicit sync, check, host status, and remove.
- Files inspected before editing: `AGENTS.md`, `src/commands/{skills,install,update,remove,check}.js`, `src/agent-host/preflight.js`, `packages/{core,env,mcp,utils}`, focused lifecycle tests, `README.md`, `docs/frontier-agent-hosts.md`, and recent history for the same command paths.
- Relevant SWE manual sections: Master Engineering Doctrine (correctness, invariants, boundaries, designed failure, observability, simplicity); Testing Doctrine (behavior and failure-path evidence, unchanged red/green assertions); Appendix F (trust boundaries and integrity); Appendix G (state transitions, side effects, transactions, idempotency, observability); Appendix H sections H1 and H5 (artifact identity and tested rollback).
- Current-state commands: `git status -sb`; `git remote -v`; `git worktree list --porcelain`; `git fetch origin`; `git rev-parse origin/main`; targeted `rg`, `sed`, and `git log` inspection.
- Horizontal-pattern scan: native projection is duplicated between Codex and portable-host paths in `src/commands/skills.js`; stack-related install has a separate Codex/Claude-only coordinator in `src/commands/install.js`; host preflight infers synchronization from any directory. Disposition: standardize and consolidate these three representations in this change because the accepted contract explicitly requires one cross-host lifecycle.
- Risks and invariants: canonical packages are never edited; source/target/receipt symlinks fail closed; unmanaged or drifted targets are preserved unless an exact scoped force is present; a managed target and receipt advance together or the prior pair is restored; complete replacement prunes stale files; dry-run writes nowhere; active host sessions are never described as hot-reloaded.
- Initial risk tier and rationale: high, because the change mutates persistent host-native directories and ownership receipts on two workstations and must remain recoverable under partial failure.
- Exit criteria: exact `origin/main` base and isolated worktree recorded; existing behavior and duplication mapped; scope/non-goals/authority recorded before production edits.

## Phase 1: Scope Lock

- In scope: complete-tree rendering and digesting; atomic target/receipt replacement; ownership reconciliation/adoption/force policy; exact skill install/update/remove/check integration; one coordinator for Codex, Claude, Gemini, and Antigravity; accurate host status; help/docs/dist; local and admin-mac accepted installation and 15-skill verification.
- Non-goals: changing canonical package formats or Registry contents; host execution/session behavior; authentication repair; blanket inventory force; release publication, push, PR, merge, branch/worktree cleanup, or workspace mirroring.
- Expected files touched: a new `src/native-skills/` lifecycle module and focused tests; the five command adapters; host preflight; help/docs/AGENTS/compliance record; tracked `dist/index.cjs` (plus build metadata only if repository build requires it).
- External inputs and trust boundaries: installed package metadata and files, environment-derived roots, existing wrapper trees, receipts, CLI host/skill selections, and remote workstation paths. Validate exact skill IDs, supported hosts, path containment, real-file/directory types, receipt schema, and every recursive entry.
- Failure behavior to define: unsafe trees, malformed receipts, staged render/validation failure, target promotion failure, receipt commit failure, concurrent filesystem changes, drift/unmanaged conflicts, orphaned removal conflicts, unavailable hosts, and partial remote synchronization all fail closed with observable per-host results.
- Authorized external actions: fetch `learnrudi/cli`; create the isolated branch/worktree; build/install the accepted CLI locally and on `admin-mac`; reconcile the exact 15 authorized suite skills on Codex and Claude; read remote state and transfer one immutable accepted CLI artifact narrowly. No publication actions are authorized.
- Commit strategy and authorization: coherent slices are lifecycle+tests, command integration+tests, docs/compliance, and generated dist. A local accepted commit may be created only if required to identify/transfer the accepted artifact and preserve work; no push/PR/merge is authorized. If left uncommitted, the same slices remain explicit in the final ledger.
- Horizontal-obligation disposition: resolve in this change; decision is consolidate implementation and standardize the host/receipt contract. Closing proof is one lifecycle coordinator used by all four hosts and no command-local tree-copy implementation.
- Review and approval gates: all required repository gates, temporary-home E2E, independent `rudi-code-review` Standards/Spec/Proof pass, focused confirmation after fixes, local parity, remote parity, then non-mutating worktree closeout.
- Exit criteria: only listed behavior and files are admitted; no dependency addition or unrelated refactor; rollback and preservation policies are testable before implementation.

## Phase 2: Red Tests

- Observable behavior to prove: exact install selection; managed update without blanket force; stale pruning; drift/unmanaged preservation; exact adoption; scoped force; rollback; idempotency; ownership-safe remove; accurate check/host state; zero-write dry-run; host normalization/resources.
- Test files to add or edit: `src/__tests__/unit/native-skill-lifecycle.test.js` first, followed by the smallest command-level tests for install/update/remove/check/host selection.
- Initial red commands and expected failures:
  - `node --test src/__tests__/unit/native-skill-lifecycle.test.js` failed with `ERR_MODULE_NOT_FOUND` before the lifecycle module existed.
  - The receipt rollback test failed because receipt writes were not yet injectable; the unchanged test passed after the transaction seam was added.
  - Focused command tests failed in sequence for missing direct-install reconciliation, managed-host update reconciliation, removal cleanup, skill status, receipt-backed host status, and boolean `--no-sync-skills` parsing before each adapter was implemented.
  - Independent-review regression command: `node --test src/__tests__/unit/native-skill-lifecycle.test.js packages/registry-client/src/__tests__/unit/registry-index.test.js src/__tests__/unit/update-command.test.js` produced 31 passes and 6 expected failures for package-digest receipts, symlink ancestry, removal concurrency, receipt binding, stack-force scope, and non-persisting Registry dry-run.
- Expected failure: absence of the reusable lifecycle/receipt module or the next required command integration, never a syntax/setup failure.
- Exit criteria: each production behavior begins with one expected behavioral failure.

## Phase 3: Implementation

- Implementation rules: render into a sibling staging directory; validate and digest the complete tree; compare actual/expected/receipt digests; atomically rename with a sibling backup; atomically write receipts; restore target and preserve the prior receipt on failure; return per-host state and `restartRequired` explicitly.
- Files allowed to change: only the Phase 1 expected files, unless a repository-prescribed generated artifact is discovered and recorded here first.
- Validation and error-handling requirements: reject symlinks and non-file/non-directory entries, escaping names/paths, unsupported hosts, invalid skill IDs, malformed receipts, and unsafe target roots; never recursively delete a user tree that was not first proven owned or explicitly exact-force selected.
- Observability requirements: every operation returns host, skill ID/name, prior state, action, target, receipt path, source/render digests where safe, reason/error, and restart requirement; CLI summaries must not claim hot reload.
- Exit criteria: all Phase 2 behaviors are green through the reusable boundary and command adapters contain no alternate projection implementation.

## Phase 4: Green Tests And Refactor

- Green command: each recorded red command was rerun unchanged. After independent-review fixes, the combined focused command
  `node --test src/__tests__/unit/native-skill-lifecycle.test.js packages/registry-client/src/__tests__/unit/registry-index.test.js src/__tests__/unit/update-command.test.js src/__tests__/unit/install-related-skills.test.js src/__tests__/unit/native-skill-check.test.js src/__tests__/unit/skills-sync.test.js src/__tests__/unit/remove-command.test.js src/__tests__/unit/agent-host-preflight.test.js`
  passed 83/83 after adding the final source-identity transition regression (source A to source B must report and receipt B).
- Refactor constraints: only deduplicate after the behavior test is green; preserve exact-ID/`--all` safeguards and package transaction boundaries.
- Regression checks: existing skills-sync, related-skill install, update, remove, check, agent-host preflight/command, help, and command-surface tests.
- Commit checkpoint: inspect the scoped diff and generated/source relationship; no publication.
- Exit criteria: focused suites pass after final refactor with no weakened assertions.

## Phase 5: Full Verification

- Targeted tests: the final focused lifecycle and modified-adapter command passed 83/83.
- Full suite: final `pnpm test` passed 768/768 with zero failures.
- Build/typecheck/lint: final `pnpm build` passed; a second build produced the same accepted tracked artifacts. SHA-256: `dist/index.cjs` = `cf1afd4badfcb785070b02ddfe0a4fd278d5596917e2d67bf206067da728c38c`; `dist/router-mcp.js` = `3c5f0d94fb4d44a8220c0331ba3b68f2918a56dfbebf0122fbdcdbdc2a6881f6`; `dist/packages-manifest.json` = `607aaf582c29aa92627e51823525fe43f38fa1db54a2874db457122771dbadc6`.
- JS/TS debt scan: `node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log` and the installed SWE `swe_debt_scan` both completed with zero findings after the final correction.
- Package proof: `npm pack --dry-run` passed for 6 files at package version 1.10.25. Accepted artifact `/tmp/rudi-native-skill-artifact.4qCoTf/learnrudi-cli-1.10.25.tgz` has SHA-256 `3df4835f5a4fca9bd5e710e79bc7715d3cf32564c3c9c9d6d4017b0ee47922bd`.
- Live smoke checks: isolated HOME/RUDI_HOME `/tmp/rudi-native-skill-final-e2e.tAzfvS` passed Codex/Claude creation, schema-v2 receipt validation, current-state checks, zero-write sync and update dry-runs (including absent Registry cache), drift preservation, exact scoped force repair, and ownership-safe removal.
- Independent review: one fresh-context `rudi-code-review` returned `revise`; all findings were fixed with regressions, and its focused confirmation returned Standards pass, Spec pass, Proof pass, overall pass with no findings or blockers.
- Risk-tier approval: user already authorized local/admin installation and exact suite reconciliation; destructive publication/cleanup remains unauthorized.
- Exit criteria: met. Focused/full/build/repro/debt/pack/smoke/review all pass and the accepted artifact digest is stable.

## Phase 6: Docs, Contracts, And Closure

- Docs or API contracts to update: CLI help, `AGENTS.md`, `README.md`, `docs/frontier-agent-hosts.md`, and this record.
- Final files touched: lifecycle module/tests; install/update/remove/check/skills and host-preflight adapters/tests; Registry client's non-persisting index read/test; argument/help text; README, AGENTS, frontier-host docs, generated dist, and this record.
- Final repository proof: `git diff --check`, Node syntax checks, full test/build, both debt scanners, package dry-run, temporary-home E2E, and independent review all passed after the last source correction.
- Local installation: accepted runtime installed as RUDI CLI v1.10.25 with all three accepted dist hashes verified. Recoverable prior-runtime backup: `/Users/hoff/.rudi/backups/rudi-cli-native-skill-20260831.ZszpIh`.
- Local suite proof: all 15 canonical packages byte-match Registry commit `cbb96535c715707513051d6914fd8d885112b121`; 15 Codex and 15 Claude trees were adopted without rewrites; all 30 schema-v2 receipts are current; both host summaries report current 15, drifted/missing/failed 0, total managed 15, synchronized true. Adoption did not require a restart.
- Admin installation: the same accepted tarball was transferred with SHA-256 preserved and installed as RUDI CLI v1.10.25; all three accepted dist hashes match local. Recoverable prior-runtime backup: `/Users/admin/.rudi/backups/rudi-cli-native-skill-20260831.Oq1B5E`.
- Admin Registry and canonical package proof: detached worktree `/Users/admin/RUDI/worktrees/registry/rudi-engineering-skills-20260831` is clean at exact commit `cbb96535c715707513051d6914fd8d885112b121`; all 15 installed canonical packages byte-match that worktree. Prior exact package material is preserved at `/Users/admin/.rudi/backups/rudi-native-skill-suite-20260831.gPjPtM`.
- Admin projection proof: seven absent trees per host were created normally; eight exact stale unmanaged suite trees per host were first backed up at `/Users/admin/.rudi/backups/rudi-native-skill-projections-20260831.y7zm4V`, then replaced only with exact-ID scoped force. All 30 schema-v2 receipts are current and internally digest-bound; both host summaries report current 15, drifted/missing/failed 0, total managed 15, synchronized true. Because trees changed, running Codex and Claude processes must reload before relying on the new skills.
- Cross-machine parity: all 15 rows match exactly for package version, source identity, source digest, complete package digest, Codex rendered-tree digest, and Claude rendered-tree digest (`cross_machine_digest_parity=15/15`; local and admin current projections each 30/30). Evidence root: `/tmp/rudi-native-skill-cross-parity.ykE5xU`; admin evidence root: `/tmp/rudi-native-skill-artifact.IuMGP6`.
- Independent-review result: initial verdict `revise` with four P1 and two P2 findings. All were corrected with regressions; the focused confirmation returned overall pass with no findings or blockers.
- Commit ledger and publication status: no commit, push, PR, merge, or release was created because publication was not authorized. The task diff remains isolated in `codex/native-skill-lifecycle-20260831` for review/preservation.
- Horizontal obligations opened, closed, or accepted: the duplicate projection paths are closed by the shared lifecycle coordinator used by all four supported hosts; no additional horizontal obligation was opened.
- Repo Steward closeout: receipt `native-skill-lifecycle-20260831-closeout` for repository `rudi-workspace--worktrees--cli--native-skill-lifecycle-20260831` advanced through observed, classified, and preservation-required to final state `retained` at version 4. Cleanup is ineligible; the lease was released after recording.
- Final verdict: PASS.
- Accepted debt: none.
- Proof gaps: none for implementation, artifact identity, local installation, admin installation, package parity, host projection parity, or administrative closeout.
- Definition of Done: met. Retain the uncommitted worktree and report that admin Codex/Claude processes require reload because projection files changed.

## Publication Addendum — 2026-09-01

- Authorization boundary: the user subsequently authorized public GitHub issue,
  branch, pull-request, required-CI, and merge steps for both Registry and CLI
  default branches. This does not independently authorize an npm release,
  unrelated cleanup, dependency upgrades, credential changes, or remote-branch
  deletion.
- Durable ledger: `learnrudi/cli#37`; this checklist remains the detailed proof
  authority linked from the issue.
- Publication base: `origin/main` at
  `2f917edd1d100ea68e6ec6f3d27eb94e34a87c13`, with the accepted working diff
  moved intact to `chore/37-native-skill-lifecycle`.
- Accepted implementation proof remains exact: focused tests 83/83, full suite
  768/768, reproducible build, both configured debt scans with zero findings,
  six-file package dry-run, isolated temporary-home E2E, and independent
  Standards/Spec/Proof/Overall pass.
- Installed-state proof remains exact for the accepted artifact: CLI v1.10.25
  and all 15 canonical packages plus 30 Codex/Claude projections matched across
  local and admin Macs. Registry `main` has since advanced through PR #59; its
  review-driven Decision Frontier updates will be reconciled after this CLI
  branch is merged and the published Registry state is consumed.
- Commit plan: source, tests, and command integration first; generated
  `dist/index.cjs` in its own build commit; documentation and this compliance
  addendum as a final ledger commit. PR CI must pass before merge.
- Commit ledger: source, tests, and command integration are commit `e402348`;
  the reproducible tracked bundle is the dedicated build commit `cd390db`.
  Documentation and the initial publication ledger are commit `41d234a`.
- Final publication review: a fresh review of `origin/main...41d234a` returned
  revise with four findings: per-host receipt-directory symlinks were not
  rejected before ownership reads/removal; `packageDigest` omitted unprojected
  canonical package files; explicit `rudi skills sync` did not exit nonzero for
  projection failures; and orphan-receipt cleanup could unlink ownership during
  concurrent reconciliation.
- Review red command:
  `node --test --test-name-pattern='complete canonical|symlink anywhere|symlinked per-host|orphan receipt cleanup|cmdSkills exits nonzero' src/__tests__/unit/native-skill-lifecycle.test.js src/__tests__/unit/skills-sync.test.js`
  failed 0/6 for the expected behavioral reasons on the reviewed tree. The
  unchanged command passed 6/6 after the corrections.
- Review corrections: every receipt-path component is validated before reads or
  deletion; `packageDigest` now validates and hashes the entire canonical skill
  tree independently of host-specific projection selection; human and JSON sync
  failures exit nonzero; and orphan cleanup atomically isolates the prior
  receipt, rechecks target and receipt state, and restores or preserves the
  isolated receipt on conflict.
- Review-fix commit ledger: source and hostile regressions are commit `0a64e62`;
  the dedicated regenerated bundle is commit `4ecfbb1` with SHA-256
  `32733e510d83b50f707a13e0ecb4bbe3d8c3a320cb8ac8d04f453ed652eff02b`.
  `dist/router-mcp.js` and `dist/packages-manifest.json` retain their accepted
  hashes.
- Post-correction proof: focused tests 89/89, full tests 774/774, reproducible
  build, changed-file debt scan with zero findings, whitespace validation, and
  the six-file package dry run all passed. The dry-run reported 324,462 packed
  bytes and 1,563,056 unpacked bytes. Focused independent confirmation of the
  four findings remains required before push.
- Installed-state consequence: the complete-package digest correction changes
  receipt identity for bundled skills even when rendered projections are
  unchanged. After merge, the accepted CLI artifact and Registry-main package
  state must be reconciled on both Macs before final parity is claimed.
- Publication state at evidence refresh: issue #37 and six scoped commits exist
  locally; focused confirmation, final ledger commit, push, PR, CI, merge, and
  cross-machine reconciliation are authorized and pending.
