/**
 * Help and version display
 */

export function printVersion(version) {
  console.log(`rudi v${version}`);
}

export function printHelp(topic) {
  if (topic) {
    printCommandHelp(topic);
    return;
  }

  console.log(`
rudi - RUDI CLI

USAGE
  rudi <command> [options]

CORE COMMANDS
  init                  Bootstrap the local RUDI capability layer
  search <query>        Search registry for packages
  install <pkg>         Install a package
  remove <pkg>          Remove a package
  update <pkg>|--all    Update one package or the explicit whole inventory
  list [kind]           List installed packages
  skills                List skills or sync installed skills to native agents
  home                  Show ~/.rudi structure and status
  status                Show capability and integration status
  doctor                Check system health and dependencies
  run <stack>           Run an installed stack directly
  secrets <cmd>         Manage local secrets
  integrate <agent>     Wire up RUDI router (claude, gemini, antigravity, codex, all)
  instructions [agent]  Print or install RUDI agent instruction blocks
  index                 Rebuild the MCP router tool cache
  agent hosts           Inspect native hosts, auth, router, skills, and versions
  agent launch <host>   Launch provider-owned native agent work
  agent group <cmd>     Launch and manage cross-provider groups

ADVANCED COMMANDS
  auth <cmd>            Authenticate supported providers
  check <pkg>           Validate package installation state
  info <pkg>            Show package details
  local-llm <cmd>       Inspect local OpenAI-compatible LLM runtimes
  mcp <cmd>             Inspect MCP capability configuration
  runtime <cmd>         Inspect runtime registry entries and status
  daemon <cmd>          Manage the local background daemon
  shims <cmd>           Manage executable shims in ~/.rudi/bins
  studio <cmd>          Open or manage RUDI Studio
  which <cmd>           Resolve an installed stack command
  lanes <cmd>           Manage the local main/dev lane worktree layout
  leverage [preset]     Calculate human-attention leverage for agent workflows

INTERNAL COMMANDS
  serve                 Daemon process entrypoint; use rudi daemon for lifecycle

RETIRED LEGACY COMMANDS
  db, session, import   Session database/import architecture (removed)
  project, apply, logs  Session organization/visibility architecture (removed)
  parallel, run-group   RUDI-owned agent execution architecture (removed)

  Run rudi help <retired-command> for the migration notice. Existing
  ~/.rudi/rudi.db data is left untouched.

OPTIONS
  -h, --help           Show help
  -v, --version        Show version
  --verbose            Verbose output
  --json               Output as JSON

EXAMPLES
  rudi search --all              List all available packages
  rudi install slack             Install Slack stack
  rudi integrate claude          Wire up Claude Desktop/Code
  rudi instructions codex        Print Codex instruction block
  rudi skills sync codex         Create native Codex wrappers for RUDI skills
  rudi agent hosts               Inspect native agent host readiness
  rudi agent launch codex --workspace . --prompt "Review this repository"

PACKAGE TYPES
  stack:<name>         MCP server stack
  runtime:<name>       Node, Python, Deno, Bun
  binary:<name>        ffmpeg, ripgrep, etc.
  agent:<name>         External Agent Host metadata (not RUDI-installable)
  skill:<name>         Skill (prompt with optional stack requirements)
  workflow:<name>      Repeatable workflow definition
`);
}

function printCommandHelp(command) {
  const retired = {
    apply: 'Provider transcripts remain authoritative; organization-plan execution was removed.',
    database: 'Use Studio only if you still need the isolated compatibility database.',
    db: 'Use Studio only if you still need the isolated compatibility database.',
    import: 'Provider transcripts remain authoritative; RUDI no longer imports agent sessions.',
    logs: 'Use daemon logs under ~/.rudi/logs or provider-native diagnostics.',
    par: 'Use `rudi agent group` or native agent orchestration.',
    parallel: 'Use `rudi agent group` or native agent orchestration.',
    project: 'Provider-native workspaces replace session-project organization.',
    projects: 'Provider-native workspaces replace session-project organization.',
    'run-group': 'Use `rudi agent group` or native agent orchestration.',
    'run-groups': 'Use `rudi agent group` or native agent orchestration.',
    session: 'Use the provider-native transcript and `rudi agent` launch pointers.',
    sessions: 'Use the provider-native transcript and `rudi agent` launch pointers.',
  };

  if (retired[command]) {
    console.log(`
RETIRED LEGACY COMMAND
  rudi ${command} is no longer executable.

MIGRATION
  ${retired[command]}

DATA
  Existing ~/.rudi/rudi.db data is not modified or deleted.
`);
    return;
  }

  const help = {
    search: `
rudi search - Search the registry

USAGE
  rudi search <query> [options]

OPTIONS
  --stacks         Filter to stacks only
  --skills         Filter to skills only (alias: --prompts)
  --workflows      Filter to workflows only
  --runtimes       Filter to runtimes only
  --binaries       Filter to binaries only
  --agents         Filter to agents only
  --all            List all packages (no query needed)
  --fresh          Refresh registry cache before searching
  --no-cache       Alias for --fresh
  --json           Output as JSON

EXAMPLES
  rudi search pdf
  rudi search deploy --stacks
  rudi search ffmpeg --binaries
  rudi search --all --agents
`,
    install: `
rudi install - Install a package

USAGE
  rudi install <package> [options]

OPTIONS
  --force                  Force reinstall
  --with-related-skills    Include optional companion skills declared by a stack
  --no-related-skills      Install the required operator skill only

OUTPUT
  Install currently emits human progress output. Machine-readable JSON is
  available for planning and updates through: rudi update ... --dry-run --json

EXAMPLES
  rudi install pdf-creator
  rudi install stack:youtube-extractor
  rudi install runtime:python
  rudi install binary:ffmpeg
  rudi install workflow:daily-brief

AGENT HOSTS
  Claude, Codex, Gemini, and Antigravity are installed by their vendors.
  Inspect them with: rudi agent hosts --json
`,
    update: `
rudi update - Update installed packages

USAGE
  rudi update <package> [options]
  rudi update --all [options]

OPTIONS
  --all                         Explicitly select the whole installed inventory
  --with-related-skills         For a stack, also update installed Registry related.skills
  --sync-skills=<host[,host]>   Project only updated skills to codex, claude, gemini,
                                antigravity, or all
  --preserve-state              Preserve install-local state during package replacement
  --dry-run                     Resolve and report the plan without package, index, or
                                native-wrapper writes; Registry metadata may refresh
  --json                        Emit exactly one structured result document

SAFETY
  A package id or --all is required. Related skills that are not installed are
  reported and skipped; update never installs them.

EXAMPLES
  rudi update stack:swe-engineering
  rudi update stack:swe-engineering --with-related-skills
  rudi update stack:swe-engineering --with-related-skills --sync-skills=codex
  rudi update stack:swe-engineering --with-related-skills --sync-skills=codex --dry-run --json
  rudi update --all
`,
    run: `
rudi run - Execute a stack

USAGE
  rudi run <stack> [options]

OPTIONS
  --input <json>   Input parameters as JSON
  --cwd <path>     Working directory
  --verbose        Show detailed output

EXAMPLES
  rudi run pdf-creator
  rudi run pdf-creator --input '{"file": "doc.html"}'
`,
    agent: `
rudi agent - Run and inspect native headless agent hosts

USAGE
  rudi agent hosts [--json]
  rudi agent models <claude|codex|antigravity|gemini> [--json]
  rudi agent launch <provider> --prompt <text> [options] [-- <provider-args...>]
  rudi agent resume <launch-id> --prompt <text> [options] [-- <provider-args...>]
  rudi agent list [--status <status>] [--limit <n>] [--json]
  rudi agent status <launch-id> [--json]
  rudi agent attach <launch-id> [--json] [--no-follow]
  rudi agent stop <launch-id> [--json]
  rudi agent diff <launch-id> [--json]
  rudi agent promote <launch-id> [--json]
  rudi agent discard <launch-id> [--json]
  rudi agent group launch --workspace <path> --task <provider:file> --task <provider:file> --detach
  rudi agent group list [--limit <n>] [--json]
  rudi agent group status <group-id> [--json]
  rudi agent group stop <group-id> [--json]

WORKSPACE OPTIONS
  --workspace <path>           Project path (default: originating directory)
  --workspace-mode <mode>      auto, read-only, worktree, or isolated-copy
  --read-only                  Direct project access with read-only provider controls

PROMPT AND PROVIDER OPTIONS
  --prompt <text>              Prompt argument
  --prompt-file <path>         Read prompt from a file
  --model <model>              Model ID or declared alias
  --permission-mode <mode>     Provider-native permission profile
  --approval-mode <mode>       Codex approval policy
  --image <a,b>                Image or attachment paths where modeled
  --timeout-ms <ms>            Bounded runtime (maximum 24 hours)
  --json                       Emit normalized JSONL events
  --detach                     Dispatch through the local background service

EXAMPLES
  rudi agent hosts
  rudi agent models codex
  rudi agent launch claude --workspace . --prompt "Fix the failing tests"
  rudi agent launch codex --workspace . --prompt-file task.md --detach
  printf '%s' "Explain this repository" | rudi agent launch codex --workspace . --read-only
  rudi agent resume launch_abc123 --prompt "Continue with the next failure"
  rudi agent attach launch_abc123
  rudi agent group launch --workspace . --task claude:review.md --task codex:implement.md --detach

Foreground execution requires neither the daemon nor Lite. Detached workers are
service-dispatched, survive terminal/Lite closure and daemon restarts, and remain
controllable through attach, status, stop, diff, promote, and discard.
`,
    lanes: `
rudi lanes - Manage the local main/dev lane layout for solo-dev parallel work

USAGE
  rudi lanes <command> [options]

COMMANDS
  init                          Create or discover the dev worktree
  sync                          Fast-forward main and dev from upstreams

OPTIONS
  --cwd <path>                  Repository path
  --main <branch>               Main lane branch (default: main)
  --dev <branch>                Dev lane branch (default: dev)
  --dev-path <path>             Override sibling dev worktree path
  --json                        Output raw JSON

EXAMPLES
  rudi lanes init
  rudi lanes init --cwd /path/to/repo
  rudi lanes sync
`,
    leverage: `
rudi leverage - Calculate agent workflow leverage

USAGE
  rudi leverage [preset] [options]

PRESETS
  frontend                 8h design/engineer/QA workflow baseline

OPTIONS
  --solo <min>             Solo workflow minutes
  --budget <min>           Human attention budget (default: solo minutes)
  --spec <min>             Human spec/direction minutes
  --review <min>           Human final review/fix minutes
  --agents <n>             Number of agent roles/workstreams
  --agent-minutes <min>    Agent minutes per role
  --serial                 Agents run serially instead of in parallel
  --json                   Output JSON

EXAMPLES
  rudi leverage frontend
  rudi leverage --solo 480 --spec 60 --review 30 --agents 3 --agent-minutes 20
  rudi leverage --solo 480 --spec 60 --review 30 --agents 3 --agent-minutes 20 --serial
`,
    'local-llm': `
rudi local-llm - Inspect local OpenAI-compatible LLM runtimes

USAGE
  rudi local-llm status [runtime] [options]
  rudi local-llm models [runtime] [options]
  rudi local-llm env [consumer] [options]

OPTIONS
  --runtime <name>              Runtime name (default: ollama)
  --target <name>               Runtime target (default: mac_host)
  --consumer <name>             Consumer app for status resolution
  --consumer-context <name>     host_process or docker_container
  --model <tag>                 Model tag for env rendering
  --base-url <url>              Override resolved base URL
  --timeout <ms>                Health/model request timeout
  --json                        Output raw JSON

EXAMPLES
  rudi local-llm status
  rudi local-llm models
  rudi local-llm env content-engine --model llama3.2:3b
`,
    runtime: `
rudi runtime - Inspect runtime registry entries

USAGE
  rudi runtime list
  rudi runtime status <runtime>

OPTIONS
  --json                        Output raw JSON

EXAMPLES
  rudi runtime list
  rudi runtime status ollama
`,
    daemon: `
rudi daemon - Manage the local RUDI daemon

USAGE
  rudi daemon status [--json]
  rudi daemon start [--port <port>] [--json]
  rudi daemon stop [--json]
  rudi daemon restart [--port <port>] [--json]
  rudi daemon install [--port <port>] [--dry-run] [--json]
  rudi daemon uninstall [--dry-run] [--json]

NOTES
  Without a LaunchAgent, start/stop/restart control a detached local
  \`rudi serve\` process. After install, lifecycle uses the per-user macOS
  LaunchAgent at ~/Library/LaunchAgents/com.learnrudi.daemon.plist.

EXAMPLES
  rudi daemon status
  rudi daemon start
  rudi daemon install --dry-run
  rudi daemon install
  rudi daemon restart --port 8100
  rudi daemon uninstall
  rudi daemon stop
`,
    list: `
rudi list - List installed packages

USAGE
  rudi list [kind]

ARGUMENTS
  kind             Filter: stacks, skills, workflows, runtimes, binaries, agents

OPTIONS
  --json           Output as JSON
  --detected       Show MCP servers from agent configs (stacks only)
  --category=X     Filter skills by category

EXAMPLES
  rudi list
  rudi list stacks
  rudi list stacks --detected     Show MCP servers in Claude/Gemini/Codex
  rudi list binaries
  rudi list workflows
  rudi skills
  rudi list skills --category=coding
`,
    skills: `
rudi skills - List or sync installed RUDI skills

USAGE
  rudi skills
  rudi skills sync <codex|claude|gemini|antigravity> <skill:id>... [options]
  rudi skills sync <codex|claude|gemini|antigravity> [--all] [options]

COMMANDS
  sync codex       Create native ~/.codex/skills wrappers for installed RUDI skills
  sync claude      Create native ~/.claude/skills wrappers for installed RUDI skills
  sync gemini      Create native ~/.gemini/skills wrappers for installed RUDI skills
  sync antigravity Create native ~/.gemini/antigravity-cli/skills wrappers for installed RUDI skills

OPTIONS
  --all            Explicitly select the whole installed RUDI skill inventory
  --force          Overwrite existing native skill wrappers; whole-inventory force
                   requires --all
  --dry-run        Preview sync results without writing files
  --json           Output JSON

EXAMPLES
  rudi skills
  rudi skills sync codex
  rudi skills sync claude
  rudi skills sync gemini
  rudi skills sync antigravity
  rudi skills sync codex skill:rudi-change-map skill:rudi-engineering-gate --force
  rudi skills sync codex --all --force
`,
    secrets: `
rudi secrets - Manage secrets

USAGE
  rudi secrets <command> [args]

COMMANDS
  set <name>       Set a secret (prompts for value)
  get <name>       Get a secret value (prints raw value; use only in scripts)
  list             List configured secrets (values masked)
  remove <name>    Remove a secret

EXAMPLES
  rudi secrets set VERCEL_TOKEN
  API_TOKEN="$(rudi secrets get API_TOKEN)" command-that-needs-token
  rudi secrets list
  rudi secrets remove GITHUB_TOKEN

SECURITY
  get prints the raw secret value to stdout. Do not run it by itself in logs or
  paste the result into chats. Prefer non-echoing command substitution.
`,
    init: `
rudi init - Bootstrap RUDI environment

USAGE
  rudi init [options]

OPTIONS
  --force            Reinitialize even if already set up
  --skip-downloads   Skip downloading runtimes/binaries
  --with-shims       Create shims in ~/.rudi/bins/ (opt-in)
  --no-agent-instructions
                     Skip installing the Codex AGENTS.md RUDI block
  --quiet            Minimal output (for programmatic use)

WHAT IT DOES
  1. Creates ~/.rudi directory structure (if missing)
  2. Downloads bundled runtimes (Node.js, Python) if not installed
  3. Downloads essential binaries (sqlite3, ripgrep) if not installed
  4. Optionally creates shims in ~/.rudi/bins/ (use --with-shims)
  5. Creates settings.json (if missing)
  6. Installs/refreshes the managed Codex AGENTS.md RUDI block

NOTE: Retired session/database data in ~/.rudi/rudi.db is preserved but the CLI
does not open, migrate, or delete it.

NOTE: Safe to run multiple times - only creates what's missing.

EXAMPLES
  rudi init
  rudi init --force
  rudi init --with-shims
  rudi init --skip-downloads
  rudi init --no-agent-instructions
  rudi init --quiet
`,
    home: `
rudi home - Show ~/.rudi structure and status

USAGE
  rudi home [options]

OPTIONS
  --verbose        Show package details
  --json           Output as JSON

SHOWS
  - Directory structure with sizes
  - Installed package counts
  - Legacy session database status
  - Quick commands reference

EXAMPLES
  rudi home
  rudi home --verbose
  rudi home --json
`,
    doctor: `
rudi doctor - System health check

USAGE
  rudi doctor [options]

OPTIONS
  --fix            Attempt to fix issues
  --all            Show all available runtimes/binaries from registry

CHECKS
  - Directory structure
  - Installed packages
  - Available runtimes (node, python, deno, bun)
  - Available binaries (ffmpeg, ripgrep, etc.)
  - Secrets configuration

EXAMPLES
  rudi doctor
  rudi doctor --fix
  rudi doctor --all
`,
    integrate: `
rudi integrate - Wire RUDI router into agent configs

USAGE
  rudi integrate <agent>     Integrate with specific agent
  rudi integrate all         Integrate with all detected agents
  rudi integrate --list      Show detected agents

AGENTS
  claude       Claude Desktop + Claude Code
  cursor       Cursor IDE
  windsurf     Windsurf IDE
  vscode       VS Code / GitHub Copilot
  gemini       Gemini CLI
  antigravity  Antigravity CLI
  codex        OpenAI Codex CLI
  zed          Zed Editor

OPTIONS
  --verbose    Show detailed output
  --dry-run    Show what would be done without making changes

WHAT IT DOES
  1. Detects agent config files
  2. Creates backup before modifying
  3. Adds RUDI router entry (single MCP server for all stacks)
  4. Cleans up old direct stack entries

EXAMPLES
  rudi integrate claude
  rudi integrate all
  rudi integrate --list
`,
    instructions: `
rudi instructions - Print or install RUDI agent instructions

USAGE
  rudi instructions [agent]
  rudi instructions <agent> --install [--global|--project|--path <file>]
  rudi instructions <agent> --remove [--global|--project|--path <file>]

AGENTS
  claude       CLAUDE.md instructions
  codex        AGENTS.md instructions
  generic      Print a pasteable generic block

OPTIONS
  --install    Write or update a managed RUDI block
  --remove     Remove the managed RUDI block
  --project    Target ./CLAUDE.md or ./AGENTS.md in the current directory
  --global     Target the agent global instruction file (default)
  --path       Target an explicit instruction file
  --dry-run    Preview changes without writing
  --json       Output JSON

EXAMPLES
  rudi instructions claude
  rudi instructions codex --install
  rudi instructions claude --project --install
  rudi instructions codex --remove
`
  };

  if (help[command]) {
    console.log(help[command]);
  } else {
    console.log(`No help available for '${command}'`);
    console.log(`Run 'rudi help' for available commands`);
  }
}
