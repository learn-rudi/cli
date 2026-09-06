# Stack catalog facet discovery

The approved stack catalog health execution extends category and facet
discovery from skills to stacks. Registry owns authored classification;
registry-client owns normalization, facet extraction and matching. Native skill
roles remain derived only for skills from operator relationships.

## Scope and invariants

- Base: `89b215068ac0cba607b584b67ee347a8195d5415`; initially clean.
- Risk: medium, shared search/list/info behavior.
- Preserve package IDs, source identities, installed-reader compatibility,
  skill-role semantics, ordinary tags, and missing/invalid-input behavior.
- No new CLI command, stack installation, daemon change or native activation.
- Standardize the existing facet implementation; do not add a second parser.
- Local implementation and tests are authorized. Commit, push, PR, merge and
  release are separate gates. Planned slices: behavior/tests/docs, then the
  regenerated tracked CLI bundle.

## Execution and proof

1. Record a failing behavioral test for stack provider/capability/category
   matching and verify its expected failure.
2. Extend the current facet owner; keep skill role assignment skill-only.
3. Verify real search/list/info consumers and legacy behavior.
4. Run focused and full CLI tests, build, focused debt and package checks.
5. Review independently against Standards, Spec and Proof; resolve findings.
6. Keep the generated bundle current, preserve the candidate, and record a
   closeout receipt or owned receipt gap before delivery.

The companion registry checklist records the complete 51-stack outcome.
Machine-local proof is retained under
`~/.rudi/outputs/stack-catalog-execution-2026-09-06/`.

## Completion evidence

- Shared `describePackage` extracts category/facets for stacks and skills;
  the `describeSkill` export remains compatible. Stack descriptions return
  before skill-role derivation. Search, installed list and info use that owner.
- Failing search and installed-list/info tests were recorded before the changes
  (`cli-facets-red.log`, `cli-installed-facets-red.log`), followed by four
  passing facet tests. Final `pnpm test` passes 811 tests with the verified
  Node 20.20.2 override; the default installed 20.10 fallback has two unrelated
  existing router-test failures. Test assertions were not weakened.
- Frozen-lockfile preparation, build, focused debt, repository debt runner and
  package checks pass. Independent review identified stale dependencies in the
  first local build; refreshing from the unchanged lockfile corrected it.
  Final bundle SHA-256 is
  `d27a5240cf3377b1c9c4d9c0e2e16b90c5fd6445b72baaa0503f44b358dded6f`,
  independently matching the admin Mac's fresh frozen-lockfile build.
- The independent reviewer ran 52 source/bundle boundary checks, including
  legacy metadata, all facets, role filtering, malformed input and network
  traps for installed reads. Final Standards, Spec and Proof verdicts pass;
  the original bundle finding is closed in `review-cli.md`.
- The admin Mac's isolated candidate passes all 811 tests, build, debt and
  package checks. Source changes and build are retained locally in the original
  CLI checkout on `codex/stack-catalog-health-20260906`. Main, publishing,
  live installs and native host projections are outside this scope.

Status: implementation and independent review complete; retain the candidate
for separately authorized publication. Final source/checksum and closeout
evidence is recorded in the execution report.
