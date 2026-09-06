# Skill catalog organization — execution ledger

## Phase 0: Baseline and manual lookup — complete

- Task: implement the approved 2026-09-05 catalog impact map using set-goal-and-execute.
- Map: /Users/hoff/.rudi/outputs/skill-catalog-update-map-2026-09-05/change-impact-map.md.
- Evidence home: /Users/hoff/.rudi/outputs/skill-catalog-execution-2026-09-05.
- Registry base: e0f745ea4d42079dc2e63040be0dccd64f61fa5c (refreshed accepted main).
- CLI base: 15161ff744c3010f4a34bb2d3d0cfa50b084ecaf (open PR 43; no merge performed).
- Catalog: 84 skill candidates: 80 accepted main entries plus four preserved local additions. Original checkouts remain intact.
- Baseline carries brand-assets and its binary/stack dependencies, codex-tasks, presentation-design, design-rulebook, and their existing tests/evidence. See baseline-carry.json; these are inherited work, not newly authored here.
- Dwellow local capability changes already occur in newer main; retain the newer accepted version and preserve the original dirty checkout. Plaid unrelated dirty changes remain outside task.
- Manuals: Master Engineering Doctrine, Agent Co-Pilot Operating Standard, Testing Doctrine, Horizontal Engineering and Codebase Stewardship Standard.
- Risk: HIGH for installed format migration and ownership/rollback; medium for discovery; low for catalog documentation.

## Phase 1: Scope lock — complete

- Required: seven skill categories, one same-ID folder per skill, namespaced capability/domain/provider tags, role derived from related.operatorSkill, full bundle payload/metadata, safe upgrade and discovery parity.
- Native metadata preservation reuses PR 43. Missing registry identity produces unknown role. Workflow role is distinct from package kind workflow.
- Preserve IDs, supporting files, user edits, legacy-only discovery, optional companion semantics, host ownership receipts and reload reporting.
- Excluded: typed metadata/schema overhaul, new requires.skills model, daemon/UI catalog expansion, stack implementation redesign, broad cleanup.
- Boundaries: YAML source, registry packages and relationship graph, filesystem identities/locks, CLI flags, native host receipts. Reject malformed input; preserve unverifiable or changed content; recover failed writes without silent deletion.
- Horizontal disposition: standardize catalog facet contract across registry and CLI; consolidate CLI facet derivation in registry-client and installed YAML interpretation in core. Reuse existing native lifecycle and transactional install boundaries. Do not create parallel role registries or template generators.
- Planned commit slices (UNAUTHORIZED): (1) CLI preservation/migration, (2) facet discovery, (3) registry metadata/layout/content/docs, (4) generated artifacts. Each needs green evidence. No staging, commits, pushes, PR modifications/merges, release, live install or peer activation authorized.
- Human high-risk acceptance applies before publishing or running the migration against real installations. Local implementation and temporary fixtures are authorized by explicit skill invocation.

## Phase 2: Red tests — complete

Actual red failures and unchanged green reruns are retained under the evidence home.
Commands use `node scripts/run-tests.js <file>` in CLI and `npx vitest run <file>`
in Registry; each log identifies the test and observed failure.

| Behavior | Red / green log stem |
|---|---|
| Multiline/CRLF YAML and inline lists | cli-metadata |
| Preserve full trigger description | cli-description |
| Owned flat-to-folder upgrade | cli-migration |
| Recover lock write failure; preserve edits/unowned sources | cli-migration-failure-green (failure-path characterization) |
| Concurrent replacement edit | cli-migration-race |
| Same-ID flat/folder conflict | cli-collision; cli-native-collision-red / cli-preservation-green |
| Graph role and facet filtering | cli-facets; cli-facet-commands; cli-inventory; cli-info |
| Native YAML source decoding | cli-native-yaml |
| Dry-run ownership preview | cli-dry-run |
| Preserve open old-file writer | cli-backup-writer |
| Reject historical checksum exclusions | cli-ignored-content |
| Validate staged source before replacement | cli-staged-yaml |
| Real schema-v2 preview normalization | cli-dry-run-v2 |
| Canonical folder/category/dependency rules | registry layout, policy and dependencies logs |

The initial missing SQLite binding and missing PyYAML were runner setup failures,
not claimed red proof. Bindings were rebuilt locally; PyYAML was installed only
in an evidence-directory virtual environment. No project dependency was added.
Prose refinements use direct content review rather than implementation-mirroring tests.

## Phase 3: Implementation — complete

- 84 same-ID folder entrypoints, 65 moves, 19 existing bundles; seven categories,
  capability/domain/provider tags, clearer names/descriptions and patch versions.
- Stack graph remains authoritative for primary operators; hard requirements and
  optional companions are distinct. Three text-drafting shortform workflows no
  longer require video/publishing installation.
- Public examples parameterized; stale SQLite/session assumptions removed;
  focused operator routing/verification added; Reddit writes reconciled before
  append; conditional host/review guidance moved verbatim to two references.
- CLI installed YAML and native decoding share core/package-metadata.js. Facet
  derivation/filter validation share registry-client/skill-facets.js.
- Skill replacement stages and validates the bundle, checks lock ownership and
  checksum (including formerly ignored content), rejects collisions/symlinks,
  guards cooperating installers, and restores safely after recoverable failure.
- Successful replacements retain the previous inode/tree and return backupPath.
  This intentionally preserves late writes through open file descriptors. Cleanup
  of retained backups is separate and never automatic. Crash/recovery guards
  remain explicit manual reconciliation boundaries.
- Native projections preserve complete descriptions, bundled Codex policy and
  support resources. Existing host ownership/force/reload contracts remain.
- Search/list/info expose categories, graph-derived role and facets. Offline or
  external inventory reports unknown role. Dry run normalizes real schema-v2
  registry entries before its read-only ownership/migration preview.

## Phase 4: Green tests and refactor — complete

All red behaviors rerun green. The shared YAML parser replaced the native shadow
parser after the native regression was red. Existing Design Rulebook tests moved
intact into src/design-rulebook.test.ts after a size warning; 352 registry tests
remain green. A missing-root-result edge in dependency-only installation was
corrected with optional access and independently exercised by the reviewer.
No assertions were weakened. Fixtures were completed with actual v2 metadata.

## Phase 5: Full verification — complete

- Registry: 352 tests, 33 files; validate 173 packages; indexes current; seven
  release artifact hashes verified; hygiene zero targets; build and npm pack pass.
- Registry publication-candidate validation passes using an isolated GIT_INDEX_FILE.
  The actual index is unchanged. Ordinary validation reports untracked candidate
  paths until an authorized commit; this is recorded in registry-public.log.
- Registry debt: zero errors/warnings; focused tool scope and repository runner.
- Preserved Brand Assets stack: five tests and four-tool MCP surface pass using
  its package-owned verification hook with preparation.
- CLI: 809 tests across 43 suites pass. Final full test log, build log, package dry-run and focused debt results in
  evidence home. cli-debt-final.json records the exact 22-file input including
  all untracked new modules and reports zero errors/warnings.
- Built CLI smoke: actual catalog search, install, list, info, dry-run, update,
  native sync and removal under isolated RUDI_HOME and four explicit host homes.
  Text-only workflows install zero stacks; exact Codex agents/openai.yaml survives.
- 84 projected native entrypoints pass the official local quick_validate.py.
- Fresh-context reviews: review-registry.md and review-cli.md preserve findings
  and correction evidence with independent Standards, Spec and Proof axes.

## Phase 6: Docs, contracts and closure — complete for local delivery

- Registry guide docs/skill-catalog.md and ADR 0013 define categories, naming,
  relationship graph and compatibility. README/CONTRIBUTING/SCHEMA/template and
  CLI README/help/info documentation match the candidate.
- All48 original support files remain byte-identical; two linked references added.
  No skill deleted, no stack implementation redesigned. The 267-line inherited
  design-rulebook test group is preserved in its own test module.
- Horizontal disposition: consolidate metadata parsing and facet derivation now;
  use existing registry normalization in dry-run. No third role registry, schema
  generation framework or parallel native lifecycle introduced. Registry parser
  and native projection are different authoring/delivery boundaries; keep them
  separate and verify interoperability with the 84-entry smoke validation.
- Intentional residual: prior skill backups consume disk until explicitly
  reconciled. Owner: installer maintainer/user; trigger: post-release accepted
  migration review; closing proof: account for late edits and old locks before
  any separately authorized cleanup. No universal rollback of unknown concurrent
  external writers is claimed.
- Planned commit boundaries remain uncommitted: CLI migration/metadata; CLI
  discovery; catalog layout/content/contracts; generated index/bundle artifacts.
  PR43 remains a predecessor requiring its own acceptance. No real index staging,
  commits, push, PR modifications, merges, release or live migration performed.
- Admin peer read-only state recorded in peer-final-status.log. Its dirty registry
  is preserved. Sync is deferred until exact source commits and normal Git
  reconciliation are authorized; do not overwrite either dirty peer.
- Release gate: accept compatible CLI (including PR43), assign and verify the
  actual release version, then publish it before the moved registry source.
  Reconcile and validate admin source before registry publication; run migration
  dry runs on both real installations only with that rollout authority.
- Worktree closeout: preserve both uncommitted candidates; record and read back
  Repo Steward preservation_required receipts. No cleanup authorized.
- Verdict: READY for authorized publication. Both independent reviews pass
  Standards, Spec and Proof. Both Repo Steward receipts are read back at version2,
  preservation_required, cleanup ineligible; both leases released. IDs are
  skill-catalog-organization-20260905-cli and
  skill-catalog-organization-20260905-registry. Ledger root:
  /Users/hoff/.rudi/state/repo-steward; readback evidence: closeout-receipts.json. Publication, peer activation and real installed-skill migration remain
  explicit subsequent delivery steps, not completed work.

## Publication authorization — 2026-09-05

The user explicitly requested committing, merging and updating main. Feature-branch
push and PR merge are the required repository-policy path to that endpoint. Preserve
unrelated source in local recovery history; update the primary checkouts and admin
source peer after verified integration. Package-manager releases, live skill migration,
service restart, branch deletion and worktree cleanup remain separate operations.
The preceding no-publication entries describe the implementation delivery boundary.
Current publication evidence is recorded outside source under the dated publication
evidence directory and in Git/PR history.
