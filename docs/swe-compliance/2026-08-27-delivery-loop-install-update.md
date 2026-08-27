# RUDI Delivery Loop Install And Update — Gate 1 Compliance Checklist

This checklist governs the approved CLI Source-Edit Gate 1 for targeted native-skill projection and suite-aware package updates. The work is isolated from the canonical checkout and stops with an uncommitted, locally verified diff.

## Phase 0: Baseline And Authority

- [x] Risk tier: **medium**. The change affects install/update orchestration and native-host file projection, but verification is confined to temporary homes and this gate does not install the modified CLI.
- [x] Fresh worktree: `/Users/admin/RUDI/worktrees/cli/cli-suite-aware-skill-update-20260827`.
- [x] Branch: `codex/cli-suite-aware-skill-update-20260827`.
- [x] Base: then-current `origin/main` at `16f4c1fe12d96cc339dadd258ff6dae799e4144d`.
- [x] Canonical CLI checkout was clean before the worktree was created.
- [x] Applicable `/Users/admin/RUDI/AGENTS.md` and repository `AGENTS.md` read; no nested `AGENTS.md` applies.
- [x] Manual sources read: operating-manual index, engineering quick reference, testing doctrine, and agent co-pilot standard.
- [x] Baseline focused tests passed before behavior edits: 56/56.

## Phase 1: Scope Lock

### In scope

- [x] Allow `rudi skills sync <host> <skill-id>...` to project only named installed RUDI skills.
- [x] Reject unknown, ambiguous, or non-skill projection targets at the CLI boundary; safely deduplicate repeated exact IDs.
- [x] Preserve non-destructive create-missing behavior for inventory-wide sync, but require explicit `--all` before an inventory-wide `--force` overwrite.
- [x] Require explicit `--all` for whole-inventory `rudi update`.
- [x] Expand `rudi update <stack> --with-related-skills` through the Registry resolver's existing `related.skills` relationship, without converting related skills into dependencies.
- [x] Update only selected installed packages, index only affected stacks, and project only affected skill IDs to explicitly selected native hosts.
- [x] Make update dry-run free of install, index, or native-projection mutations while returning the exact planned actions.
- [x] Make update and skills JSON modes emit one truthful structured document on stdout.
- [x] Align command-specific help and install help with supported flags and observed behavior.
- [x] Add focused tests and user documentation.
- [x] Regenerate tracked `dist/` output with the repository build command.

### Explicit non-goals and stop conditions

- [x] No Registry schema or Registry source changes.
- [x] No new automatic provenance or edited-wrapper detection.
- [x] No dependency additions.
- [x] No commit, push, PR, merge, release, or global/local installation of the modified CLI.
- [x] No force-sync of unrelated installed skills.
- [x] No primary-Mac synchronization.
- [x] No worktree cleanup/archive and no sports/NFL access or changes.

### Expected source and proof paths

- `src/commands/skills.js`
- `src/commands/update.js`
- `src/commands/related-skills.js`
- `src/commands/install.js` only for truthful related-wrapper reporting and output/help alignment needed by this gate
- `packages/utils/src/help.js`
- `src/index.js`
- focused tests under `src/__tests__/unit/`
- `README.md`
- `dist/index.cjs` and any other tracked outputs changed by `pnpm build`
- this checklist

## Phase 2: Behavior Contracts And Red-Green Record

### Invariants

- [x] Exact skill IDs are normalized once, validated against installed RUDI skills, deduplicated without widening scope, and passed to the existing host projector as an explicit array.
- [x] `--force` never widens from explicit targets to the full skill inventory.
- [x] Whole-inventory destructive behavior requires `--all`; missing consent fails before registry refresh, install, index, or projection.
- [x] Related-skill expansion uses Registry `related.skills`; operator/companion semantics remain optional suite metadata, not dependency edges.
- [x] A dry run reports resolved targets and downstream actions but performs no package, tool-index, or native-wrapper mutation.
- [x] JSON mode writes exactly one parseable JSON value to stdout; diagnostics go to stderr and match exit status.
- [x] Help text names every supported safety flag and does not advertise unsupported output behavior.
- [x] Existing callers using explicit package IDs and non-force inventory skill sync retain their behavior.

### Red-green sequence

- [x] Targeted native-skill projection red/green recorded: the initial focused test observed an inventory scan; the minimal implementation passed 10/10 targeted skill tests.
- [x] Whole-inventory skill-force safeguard red/green recorded: the initial command accepted broad `--force`; the guarded implementation passed 11/11 skill tests.
- [x] Explicit update `--all` safeguard red/green recorded: the initial bare update did not reject; the guarded implementation passed its focused update tests.
- [x] Suite-aware update planning and execution red/green recorded: the initial plan updated only the stack; the implementation selected the stack plus installed Registry-related skills and passed focused tests.
- [x] Update dry-run and JSON red/green recorded: initial dry-run mutated dependencies and JSON emitted no document; the implementation returned the exact plan without mutations and emitted one document.
- [x] Help/install truthfulness red/green recorded: initial command help routed globally and install advertised unsupported JSON; both command-surface contracts now pass.
- [x] Bundled-skill wrapper regression red/green recorded: isolated smoke exposed an `EISDIR` projection failure; wrapper sync now selects `<installed-skill>/SKILL.md`, and the regression test plus corrected smoke pass.
- [x] Refactor verification recorded after each relevant green; final focused suite passes 73/73.

## Phase 3: Verification

- [x] Focused command tests pass: 73/73.
- [x] `pnpm test` passes: 682/682, 0 failed.
- [x] `pnpm build` passes and tracked bundle is regenerated; repeated build SHA-256 is `cb0c8bbe31a9772394c9d6f467c57dc0b5913028af6111e81a87369c137c1dc4`.
- [x] `node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log` passes with 0 findings.
- [x] `npm pack --dry-run --json` passes and contains only six intended publish files: license, readme, three tracked `dist/` artifacts, and `package.json`.
- [x] `git diff --check` passes.
- [x] Isolated `RUDI_HOME`/native-host smoke proves targeted projection, suite-aware dry-run, JSON parseability, and no unrelated wrapper mutation.
- [x] Changed-source hygiene scan found no secrets, absolute personal paths, placeholder stubs, or unrelated changes.

## Phase 4: Review And Gate Close

- [x] Bounded horizontal pattern scan completed for update/install/skills/help surfaces; broad force examples now use explicit `--all`, while exact-ID examples remain narrow.
- [x] Independent read-only review is recorded as a proof gap: the active delegation policy did not authorize spawning a fresh reviewer, so only the primary-agent bounded scan was performed.
- [x] Final file list, commands, observed results, known gaps, and next gate are recorded below.
- [x] Git status confirms the result remains uncommitted.
- [x] Worktree closeout receipt is deferred because writing the durable external ledger is a non-source mutation beyond this approved gate.

## Final Evidence Record

Changed source and documentation:

- `src/commands/update.js`, `src/commands/skills.js`, `src/commands/install.js`, and new `src/commands/related-skills.js`
- `src/index.js` and `packages/utils/src/help.js`
- focused unit/contract tests in `src/__tests__/unit/`
- `README.md` and `docs/frontier-agent-hosts.md`
- generated `dist/index.cjs`
- this compliance checklist

Proof commands and results:

- Baseline focused suite before behavior edits: 56/56 passed.
- Final focused suite: `pnpm test -- src/__tests__/unit/update-command.test.js src/__tests__/unit/skills-sync.test.js src/__tests__/unit/install-related-skills.test.js src/__tests__/unit/command-surface-contract.test.js src/__tests__/unit/commands.test.js` — 73/73 passed.
- Full suite: `pnpm test` — 682/682 passed, 0 failed.
- Bundle: `pnpm build` — passed; consecutive builds produced the same SHA-256 recorded above.
- Debt: `node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log` — status `ok`, 0 findings.
- Package boundary: `npm pack --dry-run --json` — passed, six publish entries.
- Whitespace: `git diff --check` — passed.

Isolated smoke used the accepted Registry worktree at `87e523ecd67b93a8cdd149b5ba09f42817afa8fa` and temporary RUDI/native-host homes. The corrected run installed the stack and six related skills only into the temporary home, then proved:

- suite dry-run planned one stack, six installed related skills, one affected stack index, and six Codex wrapper actions without changing package/index/wrapper state;
- actual suite update reported seven package updates, one affected stack index, and exactly six updated Codex wrappers;
- the unrelated `skill:design-system-extractor` wrapper checksum remained unchanged;
- bare `update --json` and broad `skills sync ... --force --json` without `--all` failed with one structured JSON error and no state change.

The first smoke home (`/private/tmp/rudi-cli-gate1.x58ZCv`) is retained as failure evidence. The corrected proof home (`/private/tmp/rudi-cli-gate1-fixed.WBVKLD`) is also retained. Neither was cleaned because cleanup is outside this gate.

Known proof gaps and gate boundary:

- No independent fresh-context reviewer was run under the active no-delegation boundary.
- No durable worktree-closeout ledger receipt was written because it would mutate state outside the CLI source worktree.
- The modified CLI was not installed, committed, pushed, published, synchronized, or run against the user's real RUDI/native-host homes.

Next approval phrase:

`Approve CLI Commit Gate 2 only: review the uncommitted Gate 1 diff in /Users/admin/RUDI/worktrees/cli/cli-suite-aware-skill-update-20260827 and create one local commit; do not push, open a PR, merge, release, install or synchronize the CLI, clean/archive worktrees, or modify sports/NFL.`

## Definition Of Done

Gate 1 is complete only when the approved behavior exists in the isolated worktree, focused and repository-prescribed verification passes, the tracked bundle is regenerated, proof is recorded truthfully, and the task stops before commit, installation, publication, synchronization, or cleanup.
