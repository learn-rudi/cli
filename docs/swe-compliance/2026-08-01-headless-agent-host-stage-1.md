## Phase 0: Baseline And Manual Lookup

- Scope: implement Stage 1 of the headless Agent Host architecture: reusable core, safe workspace resolution, minimal launch projection storage, foreground launch/resume, and the first supported `rudi agent` inspection commands.
- Files inspected before editing: `src/index.js`, `src/commands/agent/routes/start.js`, `src/commands/agent/worktree.js`, `src/commands/agent/spawn-process.js`, `src/commands/agent/process-io.js`, provider contracts and normalizers, argument parsing/help, relevant tests, repository instructions, and existing uncommitted provider work.
- Relevant SWE manual sections: Master Doctrine Appendix C, Backend G2/G3/G7/G8, Security F13, and Build Order phases 2 and 5.
- Current-state commands: `git status -sb`, `git rev-parse --show-toplevel`, focused source/test discovery with `rg`, and targeted manual reads through `10-Engineering-Operating-Manual-Index.md`.
- Risks and invariants: never fall back to `$HOME`; never initialize Git; never degrade a failed isolated write launch into shared write access; record origin, project, execution workspace, and output destination separately; provider transcripts remain provider-owned; prompts and transcript events are not stored in the launch database; preserve all pre-existing worktree changes.
- Exit criteria: current execution paths, provider contracts, tests, manual requirements, and dirty-worktree boundaries are understood before editing. Completed.

## Phase 1: Scope Lock

- In scope: `rudi agent hosts`, `models`, `launch`, `resume`, `list`, and `status`; foreground execution only; Git worktrees for writable Git launches; isolated copies for writable non-Git launches; direct project access for read-only launches; minimal SQLite launch projections under `~/.rudi/state/agent-hosts.db`; launch artifacts/workspaces under `~/.rudi/artifacts/agent-launches/`; validated provider/model/permission/raw-argv inputs; JSONL and human terminal output.
- Non-goals for this stage: detached/background execution, attach/stop, diff/promote/discard, launch groups, Lite API/client migration, and converting legacy routes into compatibility wrappers. Those are the subsequent lifecycle, provider-completion, and migration stages.
- Expected files touched: new modules under `src/agent-host/`, `src/commands/agent-host.js`, `src/index.js`, `packages/utils/src/args.js`, `packages/utils/src/help.js`, focused tests, README/agent-host documentation, and this compliance record.
- External inputs and trust boundaries: CLI argv, passthrough vendor argv, prompt files/stdin, workspace/output paths, provider JSONL, provider process exits, native session IDs, and persisted launch IDs.
- Failure behavior: missing/invalid paths and prompts fail before launch; unknown providers/models/modes fail before spawn; worktree/copy failure is terminal and never falls back to shared writes; missing native session IDs prevent resume; nonzero provider exits persist a failed launch; process timeouts terminate the child and persist failure.
- Exit criteria: interfaces, state transitions, defaults, and later-stage boundaries are explicit before tests. Completed.

## Phase 2: Red Tests

- Observable behavior to prove: passthrough argv survives `--`; workspace resolution follows the four-mode safety table; failed worktree creation is terminal; launch storage excludes prompts/transcripts and enforces transitions; provider adapters preserve native differences; foreground execution records native session pointers and terminal status; CLI prompt sources are mutually exclusive and bounded.
- Test files to add or edit: `packages/utils/src/__tests__/unit/args.test.js` and focused `src/__tests__/unit/agent-host-*.test.js` files.
- Red commands: each focused Node test file was run before its corresponding implementation. The failures were the expected missing module/export or missing behavior, including passthrough parsing, workspace isolation, launch persistence, provider invocation, event normalization, launch orchestration, and CLI dispatch.
- Exit criteria: each behavior-level test failed for the expected reason before implementation. Completed.

## Phase 3: Implementation

- Implementation rules: no new dependency; use argv arrays rather than shell strings; use provider-native session storage; keep launch records minimal; validate identifiers, strings, paths, modes, and numeric bounds; keep provider differences inside adapters.
- Files allowed to change: the Phase 1 file list only.
- Validation and error-handling requirements: explicit allowlists for providers/modes/states; NUL and size checks for text/argv; exact path validation; bounded subprocess timeout and shutdown grace; structured persistence on failure.
- Observability requirements: every launch has a stable launch ID, timestamps, status, PID/exit code, native session ID when observed, workspace metadata, and JSONL events when requested; no prompt or full transcript persistence.
- Delivered modules: artifact allocation, workspace resolution, minimal launch store, host preflight, provider adapters, normalized event streaming, foreground launch/resume orchestration, and `rudi agent` command dispatch/help.
- Provider-specific behavior remains in adapters for Claude, Codex, Antigravity (`google` alias), and Gemini. Resume preserves the provider-native session ID while creating a new RUDI launch projection linked by `parent_launch_id`.
- Workspace behavior: read-only Git and non-Git projects execute directly; writable Git projects receive an external worktree and branch; writable non-Git projects receive an isolated copy; failed isolation never falls back to shared writes; external symlinks and pre-existing output destinations are rejected.
- Storage behavior: `~/.rudi/state/agent-hosts.db` stores launch pointers and lifecycle metadata, never prompts or transcripts; launch artifacts use `~/.rudi/artifacts/agent-launches/`; state directories and the database receive restrictive permissions.
- Exit criteria: unchanged red commands pass with the smallest coherent implementation. Completed.

## Phase 4: Green Tests And Refactor

- Green command: rerun each focused red command unchanged, followed by the combined Agent Host/argument tests.
- Refactor constraints: only remove duplication inside the new core; do not refactor legacy run-group/session code during Stage 1.
- Regression checks: existing provider-model, normalizer, command-export, help, and argument tests.
- Green evidence: all focused Agent Host, provider, command, help, and argument tests passed after implementation and cleanup. The final workspace-focused run passed 8/8 tests, including all four workspace-table branches.
- Refactor verification: provider argument construction, event normalization, input validation, signal propagation, owned-store closure, and cleanup of unstarted workspaces remained covered after consolidation.
- Exit criteria: focused tests remain green after cleanup. Completed.

## Phase 5: Full Verification

- Targeted tests: all new Agent Host tests plus provider/model/normalizer/command/help/args tests.
- Full suite: `npm test`.
- Build/typecheck/lint: `npm run build`, package dry run, syntax covered by build/test, and `git diff --check`.
- JS/TS debt scan: `node scripts/agent-debt-runner.mjs --edited <edited-js-files>`.
- Automated verification:
  - `npm test`: 1,072 tests passed, 0 failed.
  - `npm run build`: passed; `dist/index.cjs` rebuilt.
  - `npm pack --dry-run`: passed with the expected 11 package files.
  - `git diff --check`: passed.
  - `node scripts/agent-debt-runner.mjs --edited <Stage-1-JS-files>`: passed with 0 errors, 0 warnings, and 0 informational findings.
- Live host/preflight evidence: Claude 2.1.220, Codex 0.146.0, and Google/Antigravity 1.1.9 reported installed and authenticated with router/skills ready. Gemini 0.53.1 reported installed with router/skills ready and authentication `unknown`, because its installed CLI does not expose an observable authentication check.
- Live execution evidence:
  - Codex read-only launch `launch_c5c5bc95be7949e5989bcf93704d3bd5` completed and emitted `RUDI_AGENT_HOST_OK`.
  - Codex resume `launch_54c2507d915d47acb4144f31e241bef9` reused native session `019fbfe6-5734-7da0-93e4-1dc1be25ef96` and emitted `RUDI_AGENT_RESUME_OK`.
  - Claude read-only launch `launch_19edcd9aaca8455a8892a3b835e99fe4` completed and emitted `RUDI_CLAUDE_HOST_OK`.
  - Google/Antigravity read-only launch `launch_bb07b54167124bf59b34fa956bc3d9fa` and resume `launch_970a38df718a4df29a17b0deee6db085` completed while preserving native session `d259dc3c-97c1-471a-a378-67556fa9dace`.
  - Codex writable-Git launch `launch_670c600d1aac43b3b2e9da4459c402e2` completed in an external worktree on branch `rudi/agent/launch_670c600d1aac43b3b2e9da4459c402e2` and emitted `RUDI_WRITABLE_WORKTREE_OK`.
- Residual verification gap: Gemini's adapter and installed-bundle event contract are covered by focused tests, but no live Gemini launch was attempted while authentication remained unobservable.
- Exit criteria: all automated checks pass; the one live-provider limitation is explicit. Completed.

## Phase 6: Docs, Contracts, And Closure

- Docs/contracts updated: public CLI help, README command inventory and examples, `docs/frontier-agent-hosts.md`, argument parser passthrough contract, and this compliance record.
- Final implementation surface: `src/agent-host/**`, `src/commands/agent-host.js`, `src/index.js`, `packages/utils/src/args.js`, `packages/utils/src/help.js`, focused unit tests, README, and Agent Host documentation. Pre-existing unrelated worktree changes were preserved.
- Accepted debt: detached lifecycle/service API, attach/stop, diff/promote/discard, launch groups, Lite migration, and legacy-route adapters remain explicitly staged rather than partially stubbed.
- Definition of Done: users can inspect hosts/models, safely launch or resume all declared adapters in the foreground from Git or non-Git projects without Lite or the daemon, receive terminal or JSONL output, and inspect a minimal persisted launch pointer. Live execution is proven for every locally observable authenticated host; all automated gates pass. Completed.
