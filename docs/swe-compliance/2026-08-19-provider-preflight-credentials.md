# Provider Credential Preflight

## Phase 0: Baseline

- Agent Host launch plans build the provider-declared environment, including
  allowed credentials from RUDI secret storage.
- Agent Host version and authentication probes currently build only executable
  `PATH`, so a valid managed credential can be invisible to readiness checks.
- Invariant: preflight and launch use the same provider environment contract,
  and unrelated stored secrets are never forwarded.

## Phase 1: Scope Lock

- Touch one preflight implementation, one focused test, this checklist, and the
  generated CLI bundle.
- Reuse the existing provider environment builder; do not alter provider
  contracts, secret storage, or the dirty primary checkout.
- Stack on the green explicit Registry cache PR so full-suite verification is
  not exposed to the already-proven cache race.

## Phase 2: Red

- Create an isolated temporary RUDI home with one declared Claude credential and
  one unrelated secret.
- Run `node scripts/run-tests.js src/__tests__/unit/agent-host-preflight.test.js`.
- Expected failure: the authentication probe does not receive the declared
  credential.

## Phase 3: Implementation

- Build the provider environment once per inspection from injected dependencies.
- Pass that environment through executable environment construction for both
  version and authentication probes.

## Phase 4: Green And Refactor

- Status: complete.
- The unchanged focused test passes: 2 passed, 0 failed.
- Provider, environment, private automation, model, and preflight suites pass:
  40 passed, 0 failed.
- No refactor was needed.

## Phase 5: Full Verification

- Status: complete.
- `pnpm test`: 635 passed, 0 failed.
- `pnpm build`: passed; a second build produced identical hashes for all three
  distribution artifacts.
- Focused architecture debt scan: 0 findings.
- `npm pack --dry-run --json`: 6 expected files.
- `git diff --check`: passed.
- No live provider or secret-storage calls were made; the regression uses only a
  temporary fake secret file and injected process stubs.

## Phase 6: Closure

- Publish a ready stacked PR linked to CLI issue #23.
