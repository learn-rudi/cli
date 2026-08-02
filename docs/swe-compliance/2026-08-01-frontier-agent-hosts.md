## Phase 0: Baseline And Current Vendor Contracts

- Scope: make the native Anthropic, OpenAI, and Google headless agent hosts current and fully discoverable through RUDI without turning RUDI into the model runner.
- Files to inspect before editing: agent provider contracts, MCP integration targets, native skill sync, help text, focused tests, registry manifests, current binary versions, and current git status in both repositories.
- Relevant SWE manual sections: Master Doctrine principles and Appendix C/C7A, Security F13 agent-system guidance, Infrastructure H1/H4/H5, and the build-order phase gates.
- Current vendor sources: official Claude Code CLI/model docs, the current OpenAI Codex manual and latest-model resolver, and official Gemini CLI/Antigravity CLI docs.
- Baseline facts: Claude, Codex, and Gemini CLI binaries are installed; Claude and Codex can already call the RUDI MCP router; consumer Google OAuth is no longer supported by Gemini CLI, so subscription-backed Google execution belongs to Antigravity CLI while Gemini CLI remains supported for API key, Vertex AI, and enterprise Code Assist auth.
- Risks and invariants: RUDI owns installation, router integration, and native skill projection; each host owns execution and sessions; do not add a new RUDI runner or use legacy run-group routes; never print credentials; validate raw argv at the boundary; unrestricted smoke tests use isolated temporary workspaces only.
- Exit criteria: current behavior, versions, vendor contracts, and repository state are recorded before source edits. Completed.

## Phase 1: Scope Lock And Interfaces

- In scope: update Claude and Codex model/capability contracts; add Google host contracts; add validated raw-argument pass-through; add Antigravity MCP integration and native skill sync; correct CLI help and agent auth commands; add or update Registry agent manifests; update local binaries/configuration; run live headless proof across the three vendors.
- Non-goals: build a cross-provider orchestration broker; make RUDI own canonical agent sessions; modify Service Desk state or inbox behavior; automatically provision Google API billing or enterprise credentials; invent compatibility for vendor features absent from a host.
- Launch contract: each provider declares binary/auth checks, prompt delivery, workspace controls, JSON/streaming output, resume/session controls, model aliases, permissions/sandboxing, MCP/tools, skills, subagents, images, and raw argv support where the native CLI provides them.
- Failure behavior: unknown providers, unknown permission modes, malformed `extraArgs`, and unsupported auth routes fail before process launch with actionable messages; Google subscription auth points to Antigravity rather than silently retrying Gemini CLI OAuth.
- Files allowed to change: focused provider JSON/index/tests, native skill sync/tests, MCP agent config/tests, integration/help/docs, related Registry agent manifests/policy tests, and these compliance records.
- Exit criteria: interfaces and non-goals are explicit before tests or implementation. Completed.

## Phase 2: Red Tests

- Observable behavior to prove: current Claude and Codex aliases/capabilities resolve correctly; Google provider contracts expose headless prompt/JSON/resume/workspace controls; `extraArgs` are preserved only when they are a valid string array; Antigravity has an MCP config target; Gemini and Antigravity receive portable skill wrappers; Registry accepts the official system-installed Antigravity host and exposes corrected auth metadata.
- Red commands: focused Node tests for provider models, skill sync, and MCP agents; focused Registry resolver/schema/catalog tests.
- Expected failures: current models/capabilities are stale, Google provider contracts and Antigravity integration do not exist, skill sync rejects Google targets, malformed raw argv is not validated, and Registry policy rejects a system-installed agent.
- Exit criteria: each new behavior fails for the expected missing behavior before implementation.
- Evidence: the focused CLI provider/skill/MCP tests failed on stale aliases, absent Google contracts, missing raw-argv validation, and absent Antigravity configuration; the manifest-generator test failed because Registry-v2 npm/system sources were misclassified; the installer test failed because a system `agent` bypassed system registration. Each test subsequently passed unchanged after its focused implementation.

## Phase 3: Minimal Implementation

- Implementation rules: prefer declarative contracts and native vendor CLIs; do not add dependencies; keep auth state in vendor-owned stores; preserve compatibility fields where they remain truthful; include validated raw argv to avoid freezing the launch surface to a point-in-time flag inventory.
- Validation: `extraArgs` must be an array of non-empty strings without NUL bytes; provider/config identifiers remain allowlisted; generated skill paths remain normalized under the target root.
- Observability: JSON/headless event modes remain the default provider contract where supported; user-facing help distinguishes Gemini CLI credential modes from Antigravity subscription auth.
- Exit criteria: unchanged red tests pass with the smallest source changes.
- Completed implementation: current Claude/Codex model aliases and launch controls; Gemini and Antigravity provider contracts; validated `globalExtraArgs`/`extraArgs`; Google native skill projection; Antigravity MCP configuration; Registry-v2 manifest source mapping; and generic system-package registration for both `binary` and `agent` kinds.

## Phase 4: Local Installation And Configuration

- Update the RUDI-managed stable Claude, Codex, and Gemini CLI packages to current releases.
- Install Antigravity through Google's official installer after inspecting the fetched installer; do not persist installer output containing tokens.
- Configure the RUDI router for Claude, Codex, Gemini CLI, and Antigravity; sync installed RUDI skills to all four native skill roots.
- Authentication boundary: reuse existing vendor sessions where supported; if an interactive Google browser confirmation is required, stop at that explicit user-owned authorization step.
- Exit criteria: binaries resolve, versions are current, config files contain the RUDI router without secrets, and native skill discovery roots are populated.
- Completed versions: Claude Code `2.1.220` at `/Users/hoff/.local/bin/claude`; Codex CLI `0.146.0` in the RUDI Node runtime; Gemini CLI `0.53.1` in the RUDI Node runtime; Antigravity CLI `1.1.9` at `/Users/hoff/.local/bin/agy`.
- Completed registration: Claude and Antigravity are recorded as vendor-managed system agents; Codex and Gemini are recorded as RUDI-managed npm agents; all four shims point to live executables.
- Completed projection: the RUDI router is configured for all four hosts, 25 installed portable skills are projected to every host, and the rebuilt router index contains 26 stacks and 378 tools with zero failed stacks.

## Phase 5: Verification

- Targeted tests: provider, skill-sync, MCP integration, Registry policy/schema/catalog, and CLI help tests affected by the change.
- Full checks: CLI full test suite and build; Registry validate, index consistency, full tests, build, pack, and hygiene checks; syntax/type checks; `git diff --check`.
- JS/TS debt scan: run the nearest policy-aware runner for edited JS/TS files in each repository.
- Live smoke matrix: version/auth status; prompt argument; prompt/stdin path where native; workspace selection; JSON/stream JSON; structured schema where native; resume; RUDI MCP stack call; native skill discovery; native subagent use; image input or image generation where supported. Use minimal read-only prompts and temporary workspaces; do not print secrets.
- Exit criteria: all checks pass or every gap is explicitly classified as auth-, subscription-, platform-, or vendor-capability-limited.
- Red/green commands: focused `node --test` suites for providers, skills, MCP targets, manifest generation, and installer state; focused `vitest` suites for Registry resolution/schema/catalog. The final system-agent installer suite passed 6/6.
- CLI gates: `npm test` passed 1,039/1,039 tests; `npm run build` passed; `npm pack --dry-run` passed; policy-aware JS/TS debt scan reported zero findings; `git diff --check` passed.
- Registry gates: `npm run indexes:check`, `npm run validate`, `npm test` (123 passed, one intentional skip), `npm run catalog:clean:check`, `npm run build`, and `npm pack --dry-run` passed. Public-readiness validation against a temporary index including the new manifest reported 100 referenced packages, zero errors, and zero warnings. The structural JS/TS debt scan reported zero findings when the real compile/validate/catalog entrypoints were supplied.
- Live subscription-host proof: Claude, Codex, and Antigravity each completed a prompt argument, JSON output, isolated workspace, resume, projected RUDI skill invocation, RUDI MCP tool call, and native subagent delegation. Claude and Codex also passed stdin prompt delivery; Antigravity correctly uses `--print` rather than arbitrary stdin.
- Media proof: Codex and Antigravity each generated and saved a PNG through their native image tools; Claude successfully invoked the RUDI image-generator stack.
- Credential boundary: Claude is logged in through `claude.ai`, Codex through ChatGPT, and Antigravity through Google subscription auth. Gemini CLI remains installed for API-key/Vertex/enterprise credentials; its retired consumer OAuth path is intentionally not treated as a working subscription route.

## Phase 6: Docs And Closure

- Document the recommended commands and the Google auth split: `claude`, `codex exec`, `agy -p` for consumer subscription-backed Google, and `gemini -p` for API key/Vertex/enterprise.
- Record exact versions, red/green commands, full verification, live smoke evidence, touched files, and accepted residual debt in this file.
- Definition of Done: all three frontier vendors have a current, native, headless launch path with RUDI stacks and skills; unsupported distinctions are explicit; no unrelated worktree changes are overwritten.
- Closure: the command matrix is published in `docs/frontier-agent-hosts.md`. Native host execution/session ownership remains separate from RUDI capability installation. Existing unrelated Registry OpenCounter changes were preserved.
- Accepted boundary: native subagents can use their host's configured tools and projected RUDI capabilities. Automatic cross-provider Claude/Codex/Google delegation is not part of this change and still requires a separately governed broker.
