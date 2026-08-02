# Frontier Agent Hosts

RUDI installs and projects capabilities into native agent hosts; it does not own their model execution or session state. The current frontier set is:

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
rudi agent models google
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
foreground workflow does not require Lite or the daemon. Writable Git launches
use a new worktree; writable non-Git launches use an isolated copy; read-only
launches use the project directly. Isolation failures are terminal and never
fall back to shared writes.

Each provider still owns its complete transcript. RUDI stores a minimal launch
projection in `~/.rudi/state/agent-hosts.db` and normalized reconnect events plus
workspace artifacts under `~/.rudi/artifacts/agent-launches/`; raw provider
events and prompts are not copied into the launch database or reconnect log.

Detached launches run in dedicated RUDI workers. The background service only
dispatches and controls those workers, so jobs survive the invoking terminal,
Lite closing, and service restarts. Lite is an optional client of the
versioned `/agent-host/v1` API backed by the same core the CLI calls directly.
Groups are projections over
independent child launches, preserving each provider's native session and each
launch's own workspace, events, diff, promotion, and discard lifecycle.

## Install and update

Claude and Antigravity use their vendors' native installers and update mechanisms. RUDI detects and registers those executables. Codex and Gemini CLI are RUDI-managed npm agents.

```bash
# Anthropic native install/update
curl -fsSL https://claude.ai/install.sh | bash
claude install latest
rudi install agent:claude --force --with-shims

# OpenAI managed install/update
rudi install agent:codex --force --with-shims

# Google API/Vertex/enterprise host
rudi install agent:gemini --force --with-shims

# Google personal subscription host
curl -fsSL https://antigravity.google/cli/install.sh | bash
rudi install agent:antigravity --force --with-shims
```

Check the exact executables that a login shell will run:

```bash
command -v claude && claude --version
command -v codex && codex --version
command -v gemini && gemini --version
command -v agy && agy --version
rudi list agents --json
```

## RUDI setup

```bash
rudi index --json

rudi integrate claude
rudi integrate codex
rudi integrate gemini
rudi integrate antigravity

rudi skills sync claude --force
rudi skills sync codex --force
rudi skills sync gemini --force
rudi skills sync antigravity --force
```

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
