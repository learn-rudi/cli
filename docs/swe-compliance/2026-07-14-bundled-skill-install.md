# Bundled Skill Install SWE Checklist

## Phase 0: Baseline And Manual Lookup

- Scope: install and sync directory-based RUDI skills without dropping their scripts, references, or assets.
- Files inspected before editing: registry client download logic, core installer path logic, environment skill discovery, native Codex/Claude skill sync, and focused tests.
- Relevant doctrine: Appendix C red-green-refactor, explicit filesystem invariants, boundary validation, and preservation of existing behavior.
- Risks and invariants: preserve flat `.md` skill installation; keep bundled skills manifestless; recursively copy only the requested package tree; protect user-edited native skills unless force is explicit; preserve unrelated dirty-worktree changes.
- Exit criteria: installer, downloader, and native-sync boundaries identified.

## Phase 1: Scope Lock

- In scope: recursive remote download for a skill directory, package-aware install destinations, directory-safe uninstall, and native sync of `scripts/`, `references/`, and `assets/`.
- Non-goals: changing stack activation, related-skill prompting, agent execution, or external publishing.
- Expected files touched: `packages/registry-client/src/index.js`, `packages/core/src/installer.js`, `src/commands/skills.js`, focused tests, and this checklist.
- Boundary inputs: remote GitHub Contents responses, registry package paths, local filesystem entries. Invalid or incomplete responses must fail clearly.
- Exit criteria: implementation stays isolated from unrelated CLI changes.

## Phase 2: Red Tests

- Observable behaviors: remote directory downloads preserve nested resources; bundled skills install to `skills/<name>` while flat skills stay at `skills/<name>.md`; Codex and Claude sync retain supported resource directories.
- Red command: targeted `node --test` for the three behavior tests.
- Expected failures: current client treats all skills as a single file; installer always chooses a `.md` destination; native sync writes only `SKILL.md`.
- Exit criteria: each missing behavior fails for the expected reason before implementation.

## Phase 3: Implementation

- Add directory handling without weakening flat-skill behavior.
- Validate remote content entries and keep downloads within the requested destination.
- Copy only supported native skill resource directories and keep force semantics explicit.
- Exit criteria: targeted tests pass unchanged.

## Phase 4: Green Tests And Refactor

- Rerun the exact red command; refactor only after green; rerun affected installer and skill-sync tests.
- Exit criteria: both bundled and legacy paths remain green.

## Phase 5: Full Verification

- Run targeted tests, full CLI tests, build, a temp-`RUDI_HOME` install/sync smoke, and JS debt scan.
- Exit criteria: generated distribution builds and installed bundle contains the expected entrypoint and resources.

## Phase 6: Docs, Contracts, And Closure

- Record commands/results, files changed, known gaps, and pre-existing dirty files.
- Definition of Done: a registry skill bundle survives download, installation, and native host sync intact.

## Execution Record

- Red: the remote bundle test failed with HTTP 404 because the registry client treated the directory as a single file; the installer-path test failed because no package-aware path function existed; native sync failed because only `SKILL.md` was copied.
- Green: the unchanged focused tests passed after adding recursive bundle download, directory install paths, and supported resource copying. The Codex metadata test also verifies the display name `Design System Extractor`.
- Targeted verification: the combined registry-client, installer, and native-sync run passed all 10 tests.
- Full CLI verification: `npm run build` passed; `npm test` passed 1,021 tests with zero failures.
- End-to-end smoke: with an isolated temporary `RUDI_HOME` and the local registry, `skill:design-system-extractor` was discovered and installed to `skills/design-system-extractor`. Codex and Claude sync each created a native skill containing `SKILL.md`, extraction/build scripts, the example specification, and (for Codex) `agents/openai.yaml`.
- Debt scan: the repository policy's `pr-review` profile reported zero findings across the edited implementation and focused test files.
- Worktree safety: unrelated pre-existing CLI changes, including install-command work and generated distribution changes, were preserved. No files were staged or committed.
