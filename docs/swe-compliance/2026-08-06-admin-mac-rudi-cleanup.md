# Admin Mac RUDI Cleanup And Index Lifecycle Repair

## Phase 0: Baseline And Manual Lookup

- Status: complete.
- Scope: execute the 2026-08-07 Admin Mac audit as an archive-first cleanup,
  repair the `rudi index --force` process leak, and prove the active Service
  Desk ingestion system is unchanged.
- Files to inspect before editing:
  - `AGENTS.md`
  - `packages/core/src/tool-index.js`
  - `packages/core/src/__tests__/unit/tool-index.test.js`
  - `src/commands/index-tools.js`
  - existing command tests for the index lifecycle
  - `packages/env/src/index.js`, `src/commands/home.js`, and their tests only
    if the baseline confirms an active migration or inventory defect
  - Compute, Registry, and Service Desk instructions and version files before
    any release or installed-code change
- Relevant SWE manual sections:
  - Appendix C7A, agent-assisted red-green-refactor.
  - Appendix D, reproduce/localize/hypothesis/minimal correction.
  - Appendix F3 and F9, user-only sensitive storage and least privilege.
  - Appendix H4-H6, controlled deployment, rollback units, and complete
    runtime lifecycle termination.
  - Appendix H9-H10, post-change observability and operational safety.
- Current-state evidence to capture:
  - local and Admin Mac git status, exact commits, installed CLI version, and
    installed package provenance
  - process tree for all stale index wrappers and descendant MCP servers
  - `rudi daemon status --json`, `rudi doctor --json`, `rudi home --json`, and
    LaunchAgent state
  - canonical and legacy path sizes, ownership, modes, checksums, and mounts
  - Service Desk checkpoint, database integrity/counts, artifact count,
    ingestion timestamps, and current logs
- Risks and invariants:
  - Never expose or copy secret values into logs or the manifest.
  - Preserve every canonical path listed in the audit.
  - Preserve the Compute external layout and MLB product state.
  - Preserve unrelated dirty work in the local CLI checkout.
  - Treat `rudi.db`, `rudi.db-wal`, and `rudi.db-shm` as one recovery unit.
  - No live path is removed before a coherent archive is created and verified.
  - A failed archive, health check, or ownership check stops the affected
    cleanup step without continuing to deletion.
- Baseline evidence:
  - Source checkouts are clean at CLI `b4dd2c68`, Compute `c55948da`, Service
    Desk `cf53adfc`, and Registry `f73276b6`; the local CLI and Compute source
    commits match the Admin Mac, while unrelated local CLI edits remain dirty.
  - Installed CLI reports `1.10.14`, but its wrapper/package carries no source
    commit provenance. Compute source is `c55948da` while the running release
    path identifies `0.3.1-c6b020e`.
  - Three stale index process groups remain: PGID 6904 (49 processes), PGID
    10271 (38), and PGID 10515 (36), for 123 processes total. Each group was
    verified by ancestry and contains an old index command plus only its
    wrapper, pipe, and spawned stack descendants.
  - Daemon is ready on PID 46492 with 397 tools, but runs system Node 25.9.0;
    managed Node is 20.10.0.
  - Service Desk worker is running on PID 30490. Organization SQLite
    `quick_check` is `ok` in WAL mode; baseline counts include 802
    conversations, 1,327 interactions, 3,957 email artifacts, 1,512 source
    receipts, one email source checkpoint, and 3,957 artifact files.
  - The redundant business intake and four editorial jobs are loaded, not
    running, and repeatedly exit 1. The two kept MLB jobs were not selected.
  - Canonical Service Desk/organization directories are already mode 700 and
    database files mode 600. The RUDI root, runtimes, stacks, singular output,
    legacy registry/automation roots, retired database files, and Compute
    directories are broader than user-only and require scoped hardening.
- Exit criteria: complete; no secret values were captured, canonical state is
  identified, and the exact process/file/service delta is recorded.

## Phase 1: Scope Lock

- Status: complete.
- In scope:
  - terminate the three stale index command process trees
  - fix and test complete stack-server process-tree cleanup and bounded index
    command completion
  - unload and archive only the five explicitly retired LaunchAgents
  - archive and retire only the legacy paths approved in the audit
  - consolidate recovery data under a documented retention policy
  - reconcile exact Compute and CLI source/install versions where the source
    state is clean and safely promotable
  - pin the daemon to the managed Node runtime and harden sensitive directory
    modes to user-only access
  - rebuild the index once and verify it leaves no descendants
- Non-goals:
  - no deletion or relocation of canonical Service Desk, organization,
    registry, cache, router, bin, runtime, stack, or secret paths
  - no modification of MLB state or healthy `com.hoff.mlb.*` jobs
  - no manual deletion of installed stacks; capability-profile stack removal
    remains a separate user decision
  - no speculative shared dependency-store redesign
  - no removal of the final Service Desk rollback unit during this run
- Expected files touched:
  - `packages/core/src/tool-index.js`
  - `packages/core/src/__tests__/unit/tool-index.test.js`
  - `src/commands/index-tools.js` and a focused command test only if a
    command-level bound is needed after core cleanup is fixed
  - this checklist
  - generated `dist/` only after protecting unrelated local changes or in an
    isolated clean build tree
- External inputs and trust boundaries:
  - launch configurations and child PIDs are untrusted runtime inputs
  - filesystem targets must be explicit absolute paths below `/Users/admin`
  - process selection must be derived from verified command ancestry, never a
    broad name-only kill
- Failure behavior to define:
  - timeout closes stdin/readline, terminates the complete process group,
    escalates after a bounded grace period, awaits exit, rejects pending RPCs,
    and resolves exactly once
  - archive verification failure preserves all source paths
  - failed post-change health checks trigger rollback of the affected service
    or filesystem unit
- Exit criteria: complete; exact mutation targets, rollback units, test
  interfaces, and deferrals are recorded before the first destructive action.

## Phase 2: Red Tests

- Status: complete.
- Observable behavior to prove:
  - successful discovery and timeout both return only after the spawned stack
    process tree has exited
  - timeout cannot leave wrapper or descendant processes running
  - cleanup is idempotent across process error/exit/timeout races
  - the whole index command has a bounded completion path if per-stack
    cleanup alone cannot guarantee it
- Test files to add or edit:
  - `packages/core/src/__tests__/unit/tool-index.test.js`
  - a focused `src/__tests__/unit` index-command test only if required
- Red command:
  - `node scripts/run-tests.js packages/core/src/__tests__/unit/tool-index.test.js`
- Expected failure: the current implementation resolves while the wrapper or
  descendant remains alive because it signals only the direct child and does
  not await complete termination.
- Evidence: the new process-tree test failed with `true !== false` because both
  the uncooperative stack wrapper and its descendant remained alive after
  discovery returned.
- Exit criteria: complete; one deterministic behavior-level test failed for
  the expected reason.

## Phase 3: Implementation

- Status: complete.
- Implementation rules: make the smallest lifecycle correction; add no
  dependency; follow existing plain-JavaScript patterns.
- Files allowed to change: only the scope-locked source and test files.
- Validation and error handling requirements:
  - validate positive finite timeout/grace values
  - guard invalid/missing PIDs and already-exited children
  - make signal escalation bounded and race-safe
  - avoid signaling the caller's process group
- Observability requirements: timeout and termination failures must produce
  actionable stack-specific error context without logging secrets.
- Implementation: POSIX stack servers now start in dedicated process groups.
  Every success, error, and timeout path converges on one race-safe cleanup
  routine that closes RPC resources, signals the whole group, waits, escalates
  to SIGKILL after a bounded grace period, waits again, and only then resolves.
  Invalid duration values fall back to finite defaults.
- Exit criteria: complete; the unchanged red command passes.

## Phase 4: Green Tests And Refactor

- Status: complete.
- Green command: rerun the exact Phase 2 command.
- Refactor constraints: refactor only lifecycle code exercised by the test.
- Regression checks: run existing tool-index, daemon operation, update, and
  index-command tests.
- Evidence:
  - unchanged focused command: 3/3 tests passed after adding the timeout
    process-tree scenario
  - adjacent tool-index, stack lifecycle, daemon operation, and update suites:
    34/34 passed
  - full clean Admin Mac CLI suite: 617 passed, 0 failed
- Exit criteria: complete; focused and adjacent tests pass after the helper
  refactor and timeout coverage.

## Phase 5: Full Verification

- Status: complete.
- Targeted tests: core tool-index and index command/daemon operation suites.
- Full suite: `pnpm test` in a state that does not mix unrelated dirty work.
- Build/typecheck/lint: `pnpm build`, `npm pack --dry-run`, and
  `git diff --check`; protect the pre-existing dirty `dist/index.cjs` by
  building in an isolated tree if necessary.
- JS/TS debt scan:
  - `node scripts/agent-debt-runner.mjs --edited <edited-js-files>`
- Live smoke checks:
  - install/promote one traceable CLI build only after source verification
  - run exactly one forced index rebuild with an outer watchdog
  - verify command exit, cache validity, and zero surviving descendants
  - verify daemon/Compute/Service Desk/LaunchAgent health and user-only modes
- Exit criteria: complete; tests/build/package/debt checks pass and the Admin
  Mac live smoke leaves no orphaned child processes.
- Evidence:
  - full clean Admin Mac suite: 617 passed, 0 failed
  - architecture-aware edited-file debt scan: zero findings
  - source/install mismatch localized: clean source declared `1.10.12`, the
    installed package declared uncommitted `1.10.14`; the repaired release is
    therefore versioned `1.10.15` for exact-commit traceability
  - `pnpm build`, bundled `rudi --version`, `npm pack --dry-run`, and
    `git diff --check` passed; source commit `1e0b9aa7` and dedicated bundle
    commit `3721facc` are retained on
    `codex/admin-mac-index-lifecycle-20260807`
  - installed CLI and clean source both report `1.10.15`; the prior installed
    package, wrapper, and new tarball are checksummed in the rollback archive
  - the forced all-stack rebuild completed at `2026-08-07T03:56:35Z`; after
    supported stack updates and targeted repair checks, the final cache is
    healthy with 30 stacks, 405 tools, and zero failures
  - the forced rebuild and every targeted index returned with no surviving
    process group; a fourth pre-fix index tree launched concurrently was
    independently ancestry-validated and terminated, bringing total retired
    stale processes to 161 across four process groups

## Phase 6: Docs, Contracts, And Closure

- Status: complete.
- Docs or API contracts to update: only lifecycle/operational documentation
  whose verified behavior changed; preserve Service Desk's ingestion-only
  boundary.
- Final source files touched:
  - `package.json`
  - `packages/core/src/tool-index.js`
  - `packages/core/src/__tests__/unit/tool-index.test.js`
  - `dist/index.cjs`
  - this checklist
- Operational closure:
  - checksummed private archive root:
    `/Users/admin/.rudi/archive/admin-mac-cleanup/20260807T034751Z`
    (310,224 KB)
  - archived/unloaded five retired LaunchAgents; preserved the three required
    RUDI LaunchAgents and both healthy MLB jobs
  - archived and removed the approved legacy Service Desk/runtime/output,
    automation, workspace, registry, incoming-transfer, and retired-DB paths
  - verified both the original three-file retired DB archive and the standalone
    rollback database; both pass SQLite integrity checks
  - compressed six older Service Desk recoveries; retained the required final
    `cf53adfc` rollback unit; reduced Google Workspace recovery to its state
    snapshot by removing only reinstallable dependencies
  - removed the unowned 258,572 KB video cache and empty legacy roots
  - pinned daemon and CLI wrappers to managed Node 20.10.0; daemon is ready
  - hardened RUDI, organization, state, log, archive, output, recovery, and
    Compute state/config/log roots to mode 700; secret files remain mode 600
  - updated Notion, Audio Tools, and Google Workspace through the installed
    Registry lifecycle; rebuilt Google Workspace's omitted generated `dist/`
  - synchronized only the verified canonical output-path literals in the
    installed Video Editor and Web Export copies when their normal lifecycle
    path was blocked; backups and exact diffs are archived
- Final Service Desk proof:
  - organization SQLite `quick_check` is `ok`
  - checkpoint version advanced to 5 with updated time
    `2026-08-07T04:06:46.568Z`
  - 802 conversations, 1,327 interactions, 1,512 source receipts
  - 3,958 artifact rows exactly match 3,958 artifact files
  - ingestion PID 30490 remains running; stdout advanced during the run and
    stderr remains empty
  - canonical organization, runtime, stack, Registry, router, bin, config,
    secret, Compute, and MLB paths are present; every approved retired path is
    absent
- Space result: live `~/.rudi` decreased from 6,656,188 KB to 6,063,708 KB
  while retaining verified rollback archives, a reduction of 592,480 KB.
- Accepted debt and explicit deferrals:
  - the 2.3 GB MLB Chrome profile remains product-owned and preserved
  - the installed stack set remains unchanged pending an Admin Mac capability
    profile; no stack was manually uninstalled
  - the 97 MB historical Service Desk archive and final 54.7 MB rollback unit
    remain until their rollback windows close
  - Compute remains at exact code release `0.3.1-c6b020e`; the three later
    `c55948da` source commits are documentation-only, so no risk-bearing
    redeploy was performed
  - the public Registry URL returned 404 and needs publication repair; this
    run used the audited immutable local Registry release
  - stack update packaging must build required generated output (Google
    Workspace omitted `dist/`), Video Editor dependency detection must not
    block same-version source refreshes, and Web Export's canonical Registry
    source still needs the plural output default
  - Video Editor still needs its mutable media root moved out of installed
    package code; this run removed only the verified unowned cache
  - `rudi home`/`doctor` still need canonical organization/Registry/recovery,
    unclassified-root, and orphan-process visibility
- Definition of Done:
  - [x] stale index trees are gone
  - [x] lifecycle regression test proves cleanup before resolution
  - [x] relevant source verification passes
  - [x] retired LaunchAgents are unloaded and archived
  - [x] approved legacy paths are archived, verified, and absent from live root
  - [x] canonical, Compute, and MLB state is preserved
  - [x] installed releases are traceable to exact commits or the unresolved
        release is explicitly blocked with evidence
  - [x] permissions are user-only at sensitive boundaries
  - [x] one index rebuild exits cleanly without descendants
  - [x] Service Desk checkpoint, counts, artifacts, Gmail polling, and health
        match the baseline

## Rollback Units

1. Source repair: revert only the lifecycle commit/build and reinstall the
   previously captured CLI package.
2. LaunchAgents: restore the archived plist to its original path and bootstrap
   it only if the corresponding retired workflow is intentionally re-enabled.
3. Legacy filesystem: restore the verified archive to its original absolute
   path while affected services are stopped.
4. Retired database: restore `rudi.db`, `rudi.db-wal`, and `rudi.db-shm`
   together from the same archive; never restore one member independently.
5. Permissions: restore only the recorded pre-change modes if a verified
   consumer cannot operate under user-only access.
