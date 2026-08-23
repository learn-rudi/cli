# Tool Index Process Cleanup

## Scope

- Fix the live `rudi index --json` process lifecycle discovered while promoting
  the external Agent Host ownership release.
- Preserve the existing per-stack timeout and result contract.
- Do not change stack configuration, secrets, tool schemas, or Agent Host
  behavior.

## Invariants

- Every spawned index probe releases its readline and stdio handles.
- A probe still running after the normal termination signal is force-terminated
  after a bounded 250 ms grace period.
- Successful discovery, timeout errors, and nonzero process-exit errors retain
  their existing result shapes.

## Red-Green Evidence

- Red: a fixture stack that ignored `SIGTERM` kept the discovery subprocess
  alive for 3.1 seconds after a 500 ms timeout.
- Green: the same behavior test exits in about 0.85 seconds after handle cleanup
  and bounded termination escalation.
- The implementation is limited to `packages/core/src/tool-index.js` and its
  focused unit test.

## Verification

- Focused tool-index tests: 2 passed.
- Full CLI suite: 662 passed, 0 failed across 43 suites.
- `pnpm build`: passed.
- Repository changed-file debt scan: 0 findings.
- `npm pack --dry-run --json`: passed with six packaged files.
- Release version: CLI `1.10.21`.
