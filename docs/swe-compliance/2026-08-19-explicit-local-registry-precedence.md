# Explicit Local Registry Cache Precedence

## Phase 0: Baseline

- Status: complete.
- GitHub CI failed twice in the same resolver test because a request for one
  temporary `RUDI_REGISTRY_ROOT` returned the previous fixture's cached index.
- `registry-client` resolved the published `@learnrudi/env@1.0.0` instead of the
  workspace's `1.0.1`, so a child process with an isolated `RUDI_HOME` still
  resolved the follower Mac's real cache path. After correcting that workspace
  dependency, the newer temporary cache still defeated the explicit root.
- The cache path comes from `RUDI_HOME` at module load, while the explicit local
  root is read per request. Mtime comparison therefore cannot prove that both
  files belong to the same Registry source.
- Invariant: a valid explicit local root is an operator-selected source and must
  not be silently replaced by cache content from another root.

## Phase 1: Scope Lock

- Touch only the Registry client's internal environment dependency, lockfile,
  index selection, one focused regression, this checklist, and the generated
  CLI bundle.
- Preserve existing cache freshness behavior for auto-discovered local roots
  and normal remote Registry use.
- Add no dependency and make no installed-host or Registry mutation.

## Phase 2: Red

- Regression runs the Registry client in a child process, creates an explicit
  local index and a different fresh cache, then sets the local file mtime older
  than the cache.
- Red command: `node scripts/run-tests.js packages/registry-client/src/__tests__/unit/explicit-local-registry.test.js`.
- First expected failure: the Registry client's environment dependency resolves
  `/Users/hoff/.rudi/cache/registry.json`, not the child process's temporary
  cache. The regression exits before fetching, so it cannot touch the real
  cache.
- After linking the current workspace environment package, the second expected
  failure is `stale-cache`, not `explicit-local`.

## Phase 3: Implementation

- Link the Registry client to the current workspace environment package so
  `RUDI_HOME` isolation is honored during development and tests.
- Return the explicit local index before cache comparison when its exact path
  exists and parses.
- Continue using mtime/cache selection for other auto-discovered local roots.
- Cache the selected explicit index for later non-local use, matching existing
  selected-local behavior.

## Phase 4: Green And Refactor

- Status: complete.
- The unchanged red command passes after the two minimal fixes.
- Registry client: 30 passed; resolver-related suites: 7 passed.
- Formerly flaky resolver suite: 100 consecutive isolated repetitions passed.
- No refactor was needed.

## Phase 5: Full Verification

- Status: complete.
- `pnpm test`: 634 passed, 0 failed.
- `pnpm build`: passed; a second build produced identical hashes for all three
  distribution artifacts.
- Focused architecture debt scan: 0 findings.
- `npm pack --dry-run --json`: 6 expected files.
- `git diff --check`: passed.
- The package-local `pnpm test` script passes a directory to the custom runner,
  which Node 25 treats as a module; the same 30 package tests were therefore run
  by enumerating their exact files. This runner compatibility issue predates and
  is outside the behavior change.

## Phase 6: Closure

- Publish an independent ready PR against `main` and link the two affected CI
  runs. Do not mix the fix into the open CLI feature stack.
