# Tool Index Process Cleanup

## Scope

- Fix the live `rudi index --json` process lifecycle discovered while promoting
  the external Agent Host ownership release.
- Terminate descendants created by package launchers, not only the immediate
  child process.
- Preserve the existing per-stack timeout and result contract.
- Do not change stack configuration, secrets, tool schemas, or Agent Host
  behavior.

## Invariants

- Every spawned index probe releases its readline and stdio handles.
- Each probe runs in its own POSIX process group; Windows cleanup uses
  `taskkill /t` for the equivalent tree boundary and a creation-time-bounded
  process-inventory sweep when the launcher has already exited.
- A process tree still running after the normal termination signal is
  force-terminated after a bounded 250 ms grace period.
- Successful discovery, timeout errors, and nonzero process-exit errors retain
  their existing result shapes.

## Red-Green Evidence

- Red: a fixture launcher that spawned a descendant and ignored `SIGTERM`
  left the descendant alive after the 500 ms discovery timeout.
- Green: five consecutive runs confirmed that both the launcher and descendant
  were gone after handle cleanup and bounded process-tree escalation.
- A separate nonzero-exit fixture proves descendant cleanup when the launcher
  exits with code 23, and a simulated Windows `taskkill` exit-code 7 proves the
  direct-child fallback runs when the tree-kill command fails.
- A simulated Windows nonzero-exit fixture proves the descendant sweep still
  runs after the launcher PID is no longer active.
- The implementation is limited to `packages/core/src/tool-index.js` and its
  focused unit test.

## Verification

- Focused tool-index tests: 5 passed.
- Full CLI suite: 665 passed, 0 failed across 43 suites.
- `pnpm build`: passed.
- Repository changed-file debt scan: 0 findings.
- `npm pack --dry-run --json`: passed with six packaged files.
- Release version: CLI `1.10.22`.
