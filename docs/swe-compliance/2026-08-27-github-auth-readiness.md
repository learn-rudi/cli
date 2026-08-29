## Phase 0: Baseline And Manual Lookup

- Scope: make `rudi which github` recognize manifest-declared secrets stored in RUDI's canonical secret store.
- Current state: `which` scans account token files and `.env` only, so it falsely reports GitHub auth as not configured.
- Relevant SWE manual sections: Security F3/F6, Testing Doctrine, Agent Co-Pilot Standard, Horizontal Engineering Standard.
- Horizontal scan: `@learnrudi/secrets` already owns secret lookup. Its existing
  `hasSecret` path was found to create an absent store, so the shared presence
  probe must become non-mutating before `which` can reuse it safely.
- Initial risk tier: High because the command reports credential readiness, though the edit is narrow and read-only.
- Exit criteria: current behavior reproduced in a focused test and isolated worktree.

## Phase 1: Scope Lock

- In scope: pass installed manifest metadata into `checkAuth`, check declared
  secret names through a non-mutating `@learnrudi/secrets` presence probe,
  retain file/account auth discovery, rebuild and validate stack source during
  `rudi update`, refresh the installed stack/secret contract before indexing,
  test value redaction and absent-store behavior, bump CLI version, and
  regenerate the tracked bundle.
- Non-goals: provider API verification in generic CLI lifecycle, secret migration, token mutation, merge.
- Expected files touched: `packages/secrets/src/{index.js,__tests__/unit/secrets.test.js}`,
  `packages/core/src/{rudi-config.js,__tests__/unit/rudi-config.test.js}`,
  `src/commands/{install.js,update.js,which.js}`, their focused unit tests,
  `package.json`, `dist/index.cjs`, and this checklist. The shared-secret files
  were added after independent review proved that the existing provider mutated
  an absent store and failed on a read-only home. The update/install files were
  added after final distribution review proved that normal stack upgrades could
  retain stale compiled code and secret requirements. The dedicated
  `update-stack-snapshot.test.js` boundary was added after post-fix review found
  that a failed in-place stack upgrade could otherwise destroy the accepted
  installation.
- Failure behavior: missing optional/required secrets remain unconfigured; secret values never appear in output.
- Authorized actions: user authorized implementation, commits, feature-branch publication, and local CLI activation; merge is not authorized.
- Commit strategy: source/test/version slice after green; generated bundle slice after full build.
- Horizontal disposition: consolidate on existing `@learnrudi/secrets` contract.
- Exit criteria: interface and rollback boundary recorded.

## Phase 2: Red Tests

- Observable behavior: an installed stack declaring `GITHUB_TOKEN` reports
  configured when the presence probe succeeds, without returning that value;
  checking an absent store does not create it; unrelated `.env` values and
  incomplete optional multi-secret contracts do not produce false readiness;
  padded secret names fail closed; stack updates force a rebuild, validate the
  result, refresh persisted metadata, and do not index failed builds; quoted
  empty `.env` values do not count as credentials.
- Test files: `src/__tests__/unit/{stack-runtime-detection.test.js,update-command.test.js,install-stack-build.test.js}`,
  `packages/secrets/src/__tests__/unit/secrets.test.js`, and
  `packages/core/src/__tests__/unit/rudi-config.test.js`.
- Red commands: `pnpm test -- src/__tests__/unit/stack-runtime-detection.test.js`
  failed because `checkAuth` ignored the manifest; after independent review,
  `pnpm test -- packages/secrets/src/__tests__/unit/secrets.test.js` failed with
  `after: true` for an initially absent store. Subsequent review cases failed
  on padded names, partial optional credentials, unrelated `.env` values, stale
  compiled entries, and stale persisted required-secret metadata.
  Final review cases then failed because `runUpdate` mutated the installed
  stack before build/validation succeeded and did not restore its lockfile, and
  because the installer's external state migration survived a failed rollback.
  The last compensation review proved that copy-then-delete and reverse rename
  still exposed exact recovery data to concurrent deletion or overwrite. Three
  preservation tests were added with the fix; a separate red execution was
  skipped because the prior `unlink`, recursive removal, and overwrite-capable
  rename lines were the direct read-only failure evidence.
- Exit criteria: deterministic behavioral red.

## Phase 3: Implementation

- Reuse `@learnrudi/secrets`; make its presence-only probe non-mutating; require
  runtime-valid manifest names; dependency-inject lookup for tests; do not read
  secret values directly from `which`.
- Preserve existing account-token and declared `.env` compatibility. For an
  all-optional multi-secret contract with no explicit alternative-group schema,
  report readiness conservatively only when every declared field is present.
- Force stack builds on update even when an old entry point exists, validate
  before indexing, and re-register canonical runtime/command/secret/version
  metadata from the installed manifest.
- Snapshot the exact managed stack directory and lockfile before mutation;
  include the exact external stack-state root in that transaction; reject
  symlinked managed-path ancestors; preflight all components; verify external
  state generation before rollback; compensate in reverse order if promotion
  fails; and discard the owner-only backup only after the accepted update
  succeeds.
- On rollback-compensation failure, copy without overwrite, retain every exact
  staged source, preserve promoted accepted data in the private recovery area,
  and report both live and recovery paths rather than claiming atomic success.
- Exit criteria: red command passes unchanged.

## Phase 4: Green Tests And Refactor

- Green command: the exact focused targets passed together (57 tests), then a
  full `pnpm test` passed 690 tests across 43 suites.
- Refactor constraints: no unrelated CLI auth/lifecycle changes; install helpers
  were exported only to keep install and update build/validation semantics shared.
- Commit checkpoint: source/test/version first; bundle after reproducible build.
- Exit criteria: focused/full green and no secret output.

## Phase 5: Full Verification

- Completed: `pnpm test` (690/690), focused tests (57/57), `pnpm build`,
  reproducible tracked bundle, edited-file debt scan (261 graph files, 9 edited
  files reported, 0 findings), `git diff --check`, and
  `npm pack --dry-run` (`@learnrudi/cli@1.10.23`, 6 files).
- Live smoke: install CLI on Admin Mac and verify `rudi which github` reports configured while printing no value.
- Independent review: review findings covered the mutating `hasSecret` path,
  whitespace/malformed secret boundaries, optional multi-secret optimism,
  unrelated `.env` fallback, stale compiled stack code, and stale persisted
  secret requirements. Post-fix reviews additionally found non-transactional
  update failure and an external migrated-state rollback leak; those findings
  were reproduced red and resolved with exact stack, lockfile, and state-root
  restoration. The final scoped review then found symlink-ancestor escape,
  partial rollback, concurrent state-rewind, cleanup classification, and inline
  `.env` comment edges; those were reproduced red and resolved with canonical
  containment, full preflight/compensation, a state-generation guard, separate
  cleanup reporting, and decoded value checks. Each finding was resolved at its
  owning boundary. The final compensation review found three destructive race
  windows and one recovery-path observability gap; preservation-only copying,
  retained exact sources, explicit recovery paths, and three focused tests
  closed them. The last independent read-only review returned no findings.
- Exit criteria: no blocking findings.

## Phase 6: Docs, Contracts, And Closure

- Record commands/results, commit ledger, PR URL, Admin activation, primary-Mac update/readback, accepted debt, and proof gaps here.
- Worktree closeout: create a non-mutating closeout receipt before cleanup eligibility is considered.
- Definition of Done: source, package, installed CLI, and paired-Mac readback agree.
