# Frontier Agent Hosts

RUDI discovers vendor-installed Agent Hosts and projects capabilities into
them; it does not install those hosts or own their model execution, updates,
authentication, or session state. The current frontier set is:

| Vendor | Subscription-backed host | Other supported host | Current frontier models |
| --- | --- | --- | --- |
| Anthropic | `claude` | Anthropic API/Console auth in the same CLI | Claude Fable 5, Opus 5, Sonnet 5, Haiku 4.5 |
| OpenAI | `codex` | OpenAI API-key auth in the same CLI | GPT-5.6 Sol, Terra, Luna |
| Google | `agy` (Antigravity) | `gemini` for API key, Vertex AI, or enterprise Code Assist | Gemini 3.1 Pro and Gemini 3.6/3.5 Flash profiles |

Personal Google AI Pro/Ultra subscriptions use Antigravity CLI for headless work. Gemini CLI's old consumer Code Assist client is no longer eligible; its headless path remains valid with a Gemini API key, Vertex AI, cached eligible credentials, or enterprise Code Assist.

## RUDI Agent Host workflow

The supported headless surface is provider-neutral while keeping native
capability differences explicit:

```bash
rudi agent hosts
rudi agent models claude
rudi agent models codex
rudi agent models antigravity # `google` remains an accepted alias
rudi agent models gemini

rudi agent launch claude --workspace . --prompt "Fix the failing tests"
rudi agent launch codex --workspace . --read-only --prompt-file task.md
printf '%s' "Explain this repository" | rudi agent launch google --workspace . --read-only --json

rudi agent resume <launch-id> --prompt "Continue"
rudi agent list --json
rudi agent status <launch-id> --json
rudi agent launch codex --workspace . --prompt-file task.md --detach
rudi agent attach <launch-id>
rudi agent diff <launch-id>
rudi agent promote <launch-id>   # or: discard

rudi agent group launch \
  --workspace . \
  --task claude:security-review.md \
  --task codex:implementation.md \
  --task google:ux-review.md \
  --detach
```

Use `--` to pass validated native argv after RUDI's modeled arguments. The
foreground workflow does not require the daemon. Writable Git launches
use a new worktree; writable non-Git launches use an isolated copy; read-only
launches use the project directly. Isolation failures are terminal and never
fall back to shared writes.

Each provider still owns its complete transcript. RUDI stores a minimal launch
projection in `~/.rudi/state/agent-hosts.db` and normalized reconnect events plus
workspace artifacts under `~/.rudi/artifacts/agent-launches/`; raw provider
events and prompts are not copied into the launch database or reconnect log.

Detached launches run in dedicated RUDI workers. The background service only
dispatches and controls those workers, so jobs survive the invoking terminal
and service restarts. The versioned `/agent-host/v1` API is backed by the same
core the CLI calls directly. Groups are projections over
independent child launches, preserving each provider's native session and each
launch's own workspace, events, diff, promotion, and discard lifecycle.

## Private automation profile

`private-automation-v1` is the narrow inference-only surface for approved
private data such as email classification. It is deliberately separate from
normal Agent Host launches:

```bash
private-input-producer | rudi agent launch codex \
  --private-automation \
  --model gpt-5.6-luna \
  --output-schema ./classification.schema.json \
  --timeout-ms 130000 \
  --json

private-input-producer | rudi agent launch claude \
  --private-automation \
  --model claude-sonnet-5 \
  --output-schema ./classification.schema.json \
  --timeout-ms 130000 \
  --json
```

Do not put the private prompt in the producer's argv or shell history. The
profile accepts the prompt only from non-TTY stdin, and the provider receives
it only through child stdin. It requires a canonical configured model ID and a
self-contained, closed JSON object schema. Model defaults, aliases, fallback
models, prompt files, detach/resume/groups, workspace selection, images,
permission overrides, and native passthrough argv are rejected.

Each launch gets a fresh empty workspace with no write bits. Codex and Claude
run without tools, MCP, browser, shell, project instructions, plugins, skills,
or session persistence. The profile has a 165-second hard maximum (160 seconds
by default), a 2-MiB raw provider-stream ceiling, and a 64-KiB final structured
result ceiling. Provider stderr is suppressed, native session IDs are not
stored, and launch artifacts receive only event/usage/status metadata. The one
structured result is returned transiently on stdout to the invoking process
only after the provider-specific exact-model contract succeeds. Codex is
command-pinned with `-m`, ignores user configuration, exposes no fallback-model
input in this profile, and rejects any contradictory model field if one appears
in its JSONL stream; Codex JSONL does not otherwise echo the selected model.
Claude must report terminal model usage containing only the requested exact
model. Missing or different Claude model identity fails closed.

Claude structured output is enforced by RUDI after the provider returns JSON.
RUDI accepts either plain JSON or exactly one JSON Markdown fence, rejects any
surrounding prose, and validates the parsed object against the caller's closed
schema. The private profile deliberately does not pass Claude `--json-schema`,
because that CLI surface materializes a provider `StructuredOutput` tool. The
launcher disables all Claude tools and nonessential/auxiliary model traffic,
pins classifier and subagent model variables to the requested model, and
rejects terminal model-usage metadata unless it names only that exact model.
Claude `thinking_tokens` progress and synthetic provider-control events are
accepted only as closed, bounded shapes; their content, session identifiers,
and token estimates are not persisted.

Private use still requires an organization-approved provider/model egress
contract and a synthetic no-tool launch for each exact installed provider and
model. Use this same command with a fixed benign prompt and a closed probe
schema while the empty workspace and metadata-only artifacts are inspected;
flag/help discovery alone is not activation evidence. The profile never
chooses a provider or model and never falls back to another one.

Codex private automation currently requires Codex CLI `0.147.0` or newer. The
launcher checks that version, executes an empty-stdin strict-config sentinel to
prove the no-web configuration and `view_image` feature disable are accepted,
verifies all named feature controls, and checks the required `exec` flags before
it creates a workspace or delivers the real stdin. Claude is similarly
capability-probed with an exact
empty-stdin flag-parse sentinel after normal installation/authentication
preflight.

## Install and update

All Agent Host CLIs are installed, updated, and authenticated through their
vendors. RUDI discovers those executables and wires its MCP router and skills
into them; it does not install an Agent Host into `~/.rudi`, its Node runtime,
or its Python runtime.

```bash
# Anthropic native install/update
curl -fsSL https://claude.ai/install.sh | bash
claude install latest

# OpenAI native install/update
curl -fsSL https://chatgpt.com/codex/install.sh | sh

# Google API/Vertex/enterprise host: follow the supported Gemini CLI installer
# at https://geminicli.com/docs/

# Google personal subscription host
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Check the exact executables that a login shell will run:

```bash
command -v claude && claude --version
command -v codex && codex --version
command -v gemini && gemini --version
command -v agy && agy --version
rudi agent hosts --json
```

RUDI's own Node and Python runtimes remain supported infrastructure for the
CLI, router, tools, and MCP stacks. They are intentionally not Agent Host
installation prefixes. `rudi install agent:*` fails closed with vendor-install
guidance, and missing hosts never trigger a different provider as a fallback.
When RUDI launches a provider CLI, it makes the provider executable's directory
available on `PATH` but does not inject RUDI's Node or Python runtime directory
into the Agent Host environment.

## RUDI setup

```bash
rudi index --json

rudi integrate claude
rudi integrate codex
rudi integrate gemini
rudi integrate antigravity

# Reconcile the whole inventory without replacing drifted/unmanaged conflicts.
rudi skills sync claude --all
rudi skills sync codex --all
rudi skills sync gemini --all
rudi skills sync antigravity --all
```

`~/.rudi/skills` remains canonical. Host directories are complete derived
projections whose ownership receipts live under
`~/.rudi/state/native-skills/<host>/<skill>.json`. Receipts bind the source,
complete canonical package, and rendered-tree digests to the exact host target. Missing trees are created,
identical legacy trees are adopted, and unchanged managed trees update
automatically. Drifted or unmanaged trees are preserved; replace one only after
review with `rudi skills sync <host> skill:<id> --force`. Complete replacement
prunes stale resources. Projection changes require restarting active native
sessions and never imply hot reload.

Each host then discovers the same `rudi` MCP router and the installed portable RUDI skills. Google clients receive stable portable tool aliases because their MCP implementation rejects the namespace punctuation accepted by Claude and Codex; the router maps those aliases back to the same canonical stack tools. Native subagents run inside their owning host. This does not create an automatic Claude-to-Codex-to-Google delegation mesh; cross-provider dispatch uses `rudi agent group launch` and still preserves each host's native session boundary.

The verified local versions on 2026-08-01 are Claude Code `2.1.220`, Codex CLI `0.146.0`, Gemini CLI `0.53.1`, and Antigravity CLI `1.1.9`.

## Claude Code

```bash
# Headless prompt and streaming JSON
claude --print "Explain this repository" --output-format stream-json

# Prompt plus piped input
cat build.log | claude --print "Diagnose the failure" --output-format json

# Current models
claude --print "Hard task" --model fable
claude --print "Complex coding task" --model opus
claude --print "Balanced task" --model sonnet
claude --print "Fast task" --model haiku

# Resume, continue, and fork
claude --resume <session-id> --print "Continue"
claude --continue --print "Continue the latest session"
claude --resume <session-id> --fork-session --print "Try another path"

# Workspace and structured output
claude --print "Work here" --add-dir ../shared --json-schema '{"type":"object"}'
claude --worktree feature-name "Implement this in an isolated worktree"

# Native agents/plugins and bounded automation
claude --agents '{"reviewer":{"description":"Review code","prompt":"Review only"}}' --print "Delegate a review"
claude --plugin-dir ./plugin --print "Use the plugin"
claude --permission-mode plan --print "Plan only"
claude --dangerously-skip-permissions --print "Run autonomously"  # isolated environments only
```

Useful controls also include `--tools`, `--allowedTools`, `--disallowedTools`, `--mcp-config`, `--strict-mcp-config`, `--max-turns`, `--max-budget-usd`, `--effort`, `--settings`, `--system-prompt[-file]`, `--append-system-prompt[-file]`, `--input-format stream-json`, and `--include-partial-messages`.

## OpenAI Codex

Codex global flags must precede the `exec` subcommand. Flags shown by `codex exec --help` may follow it.

```bash
# Headless prompt and JSONL events
codex exec "Explain this repository" --json

# Prompt from stdin
printf '%s' "Inspect the current workspace" | codex exec - --json

# Current models
codex exec "Hard task" --model gpt-5.6-sol --json
codex exec "Balanced task" --model gpt-5.6-terra --json
codex exec "Fast task" --model gpt-5.6-luna --json

# Workspace, approval, sandbox, and live web search
codex --cd /path/to/workspace --ask-for-approval never --sandbox workspace-write exec "Implement the task" --json
codex --search exec "Research the current answer" --json

# Resume and fork
codex exec resume <thread-id> "Continue" --json
codex fork <thread-id>

# Structured final output and files
codex exec "Return the requested object" --output-schema ./result.schema.json --json
codex exec "Inspect these images" --image ./one.png --image ./two.png --json

# Plugins, MCP, and image generation
codex plugin list
codex mcp list
codex --enable image_generation exec "Use the native image generation tool and save the result" --json
```

Codex currently enables stable `multi_agent`, `plugins`, `hooks`, `image_generation`, browser/computer use, skill search, and MCP capabilities. Use `codex features list` to inspect the exact installed feature set.

## Google Antigravity CLI

```bash
# Subscription-backed headless prompt
agy --print "Explain this repository" --output-format stream-json

# Current model profiles reported by the installed CLI
agy models
agy --print "Hard task" --model gemini-3.1-pro-high --output-format json
agy --print "Fast task" --model gemini-3.6-flash-low --output-format json

# Resume and continue
agy --conversation <conversation-id> --print "Continue" --output-format json
agy --continue --print "Continue the latest conversation" --output-format json

# Workspace, structured output, and permissions
agy --add-dir ../shared --print "Use both workspaces"
agy --project <project-id> --print "Work in this project"
agy --new-project --print "Start a new project"
agy --json-schema '{"type":"object"}' --print "Return structured data" --output-format json
agy --mode plan --print "Plan only"
agy --dangerously-skip-permissions --print "Run autonomously"  # isolated environments only

# Plugins, native subagents, and image generation are prompt-driven
agy plugin list
agy --print "Delegate independent checks to subagents"
agy --print "Use generate_image with Nano Banana 2 and save the image"
```

Antigravity 1.1.9 accepts the prompt as the `--print`/`-p` value. It does not consume arbitrary piped stdin as prompt context; pass that content in the prompt or a readable workspace file.

## Gemini CLI

```bash
# Headless prompt with supported non-consumer credentials
GEMINI_API_KEY=... gemini --prompt "Explain this repository" --output-format stream-json

# Current model selection
gemini --prompt "Hard task" --model gemini-3.1-pro-preview --output-format json
gemini --prompt "Fast task" --model gemini-3.6-flash --output-format json

# Resume, workspace, plan, and policy controls
gemini --resume latest --prompt "Continue" --output-format json
gemini --include-directories ../shared --prompt "Use both workspaces"
gemini --approval-mode plan --prompt "Plan only"
gemini --policy ./policy.toml --prompt "Follow this policy"
```

Gemini CLI supports `text`, `json`, and `stream-json` output, stdin appended to a `--prompt`, project-scoped sessions, worktrees, sandboxing, policy files, MCP servers, skills, extensions, hooks, ACP, and native subagents. Authentication determines which models and quotas are available.

Agent Host launches inject only the provider credential names declared by the
Gemini contract from RUDI's managed secret store. When a managed
`GEMINI_API_KEY` is available, RUDI selects API-key auth for that launch with a
launch-local settings artifact; it does not rewrite the user's Gemini login
preference or copy the key into that artifact.

## Raw vendor arguments

RUDI's declarative provider builder models common flags and validates two escape hatches:

- `globalExtraArgs`: argv inserted before the native subcommand, needed for Codex global flags.
- `extraArgs`: argv appended after modeled provider arguments.

Both must be arrays of non-empty strings without NUL bytes. Native CLIs remain the source of truth; check `claude --help`, `codex --help`, `codex exec --help`, `agy --help`, and `gemini --help` after upgrades.

## Sources

- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-usage)
- [Claude model overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [OpenAI Codex documentation](https://developers.openai.com/codex/)
- [Gemini CLI documentation](https://geminicli.com/docs/)
- [Gemini API models](https://ai.google.dev/gemini-api/docs/models)
