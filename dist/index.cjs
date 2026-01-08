#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.js
var import_args2 = require("@learnrudi/utils/args");
var import_help = require("@learnrudi/utils/help");

// src/commands/search.js
var import_core = require("@learnrudi/core");
function pluralizeKind(kind) {
  if (!kind) return "packages";
  return kind === "binary" ? "binaries" : `${kind}s`;
}
function headingForKind(kind) {
  return kind === "binary" ? "BINARIES" : `${kind.toUpperCase()}S`;
}
async function cmdSearch(args, flags) {
  const query = args[0];
  if (flags.all || flags.a) {
    return listAllPackages(flags);
  }
  if (!query) {
    console.error("Usage: rudi search <query>");
    console.error("       rudi search --all            List all available packages");
    console.error("       rudi search --all -s   List all stacks");
    console.error("       rudi search --all --runtimes List all runtimes");
    console.error("       rudi search --all --binaries List all binaries");
    console.error("       rudi search --all --agents   List all agents");
    console.error("Example: rudi search pdf");
    process.exit(1);
  }
  const binariesFlag = flags.binaries || flags.tools;
  const kind = flags.stacks ? "stack" : flags.prompts ? "prompt" : flags.runtimes ? "runtime" : binariesFlag ? "binary" : flags.agents ? "agent" : null;
  console.log(`Searching for "${query}"...`);
  try {
    const results = await (0, import_core.searchPackages)(query, { kind });
    if (results.length === 0) {
      console.log("No packages found matching your query.");
      return;
    }
    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    console.log(`
Found ${results.length} package(s):
`);
    const grouped = {
      stack: results.filter((r) => r.kind === "stack"),
      prompt: results.filter((r) => r.kind === "prompt"),
      runtime: results.filter((r) => r.kind === "runtime"),
      binary: results.filter((r) => r.kind === "binary"),
      agent: results.filter((r) => r.kind === "agent")
    };
    for (const [kind2, packages] of Object.entries(grouped)) {
      if (packages.length === 0) continue;
      console.log(`${kind2.toUpperCase()}S:`);
      for (const pkg of packages) {
        const id = pkg.id || `${kind2}:${pkg.name}`;
        console.log(`  ${id}`);
        console.log(`    ${pkg.description || "No description"}`);
        if (pkg.version) {
          console.log(`    v${pkg.version}`);
        }
        console.log();
      }
    }
    console.log(`Install with: rudi install <package-id>`);
  } catch (error) {
    console.error(`Search failed: ${error.message}`);
    process.exit(1);
  }
}
async function listAllPackages(flags) {
  const binariesFlag = flags.binaries || flags.tools;
  const kind = flags.stacks ? "stack" : flags.prompts ? "prompt" : flags.runtimes ? "runtime" : binariesFlag ? "binary" : flags.agents ? "agent" : null;
  try {
    const kinds = kind ? [kind] : ["stack", "prompt", "runtime", "binary", "agent"];
    const allPackages = {};
    let totalCount = 0;
    for (const k of kinds) {
      const packages = await (0, import_core.listPackages)(k);
      allPackages[k] = packages;
      totalCount += packages.length;
    }
    if (flags.json) {
      console.log(JSON.stringify(allPackages, null, 2));
      return;
    }
    console.log(kind ? `Listing all ${pluralizeKind(kind)}...` : "Listing all available packages...");
    for (const k of kinds) {
      const packages = allPackages[k];
      if (packages.length === 0) continue;
      console.log(`
${headingForKind(k)} (${packages.length}):`);
      console.log("\u2500".repeat(50));
      for (const pkg of packages) {
        const id = pkg.id || `${k}:${pkg.name}`;
        const runtime = pkg.runtime ? ` [${pkg.runtime.replace("runtime:", "")}]` : "";
        console.log(`  ${id}${runtime}`);
        console.log(`    ${pkg.description || "No description"}`);
      }
    }
    console.log(`
Total: ${totalCount} package(s) available`);
    console.log(`Install with: rudi install <package-id>`);
  } catch (error) {
    console.error(`Failed to list packages: ${error.message}`);
    process.exit(1);
  }
}

// src/commands/install.js
var fs = __toESM(require("fs/promises"), 1);
var path = __toESM(require("path"), 1);
var import_child_process = require("child_process");
var import_core2 = require("@learnrudi/core");
var import_secrets = require("@learnrudi/secrets");
var import_mcp = require("@learnrudi/mcp");
async function loadManifest(installPath) {
  const manifestPath = path.join(installPath, "manifest.json");
  try {
    const content = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function getBundledBinary(runtime, binary) {
  const platform = process.platform;
  const rudiHome = process.env.RUDI_HOME || path.join(process.env.HOME || process.env.USERPROFILE, ".rudi");
  if (runtime === "node") {
    const npmPath = platform === "win32" ? path.join(rudiHome, "runtimes", "node", "npm.cmd") : path.join(rudiHome, "runtimes", "node", "bin", "npm");
    if (require("fs").existsSync(npmPath)) {
      return npmPath;
    }
  }
  if (runtime === "python") {
    const pipPath = platform === "win32" ? path.join(rudiHome, "runtimes", "python", "Scripts", "pip.exe") : path.join(rudiHome, "runtimes", "python", "bin", "pip3");
    if (require("fs").existsSync(pipPath)) {
      return pipPath;
    }
  }
  return binary;
}
async function installDependencies(stackPath, manifest) {
  const runtime = manifest?.runtime || manifest?.mcp?.runtime || "node";
  try {
    if (runtime === "node") {
      const packageJsonPath = path.join(stackPath, "package.json");
      try {
        await fs.access(packageJsonPath);
      } catch {
        return { installed: false, reason: "No package.json" };
      }
      const nodeModulesPath = path.join(stackPath, "node_modules");
      try {
        await fs.access(nodeModulesPath);
        return { installed: false, reason: "Dependencies already installed" };
      } catch {
      }
      const npmCmd = getBundledBinary("node", "npm");
      console.log(`  Installing npm dependencies...`);
      (0, import_child_process.execSync)(`"${npmCmd}" install --production`, {
        cwd: stackPath,
        stdio: "pipe"
      });
      return { installed: true };
    } else if (runtime === "python") {
      let requirementsPath = path.join(stackPath, "python", "requirements.txt");
      let reqCwd = path.join(stackPath, "python");
      try {
        await fs.access(requirementsPath);
      } catch {
        requirementsPath = path.join(stackPath, "requirements.txt");
        reqCwd = stackPath;
        try {
          await fs.access(requirementsPath);
        } catch {
          return { installed: false, reason: "No requirements.txt" };
        }
      }
      const pipCmd = getBundledBinary("python", "pip");
      console.log(`  Installing pip dependencies...`);
      try {
        (0, import_child_process.execSync)(`"${pipCmd}" install -r requirements.txt`, {
          cwd: reqCwd,
          stdio: "pipe"
        });
      } catch (pipError) {
        const stderr = pipError.stderr?.toString() || "";
        const stdout = pipError.stdout?.toString() || "";
        const output = stderr || stdout || pipError.message;
        return { installed: false, error: `pip install failed:
${output}` };
      }
      return { installed: true };
    }
    return { installed: false, reason: `Unknown runtime: ${runtime}` };
  } catch (error) {
    return { installed: false, error: error.message };
  }
}
function getManifestSecrets(manifest) {
  return manifest?.requires?.secrets || manifest?.secrets || [];
}
function getSecretName(secret) {
  if (typeof secret === "string") return secret;
  return secret.name || secret.key;
}
function getSecretLink(secret) {
  if (typeof secret !== "object" || !secret) return null;
  return secret.link || secret.helpUrl || null;
}
function validateStackEntryPoint(stackPath, manifest) {
  let command = manifest.command;
  if (!command || command.length === 0) {
    if (manifest.mcp?.command) {
      const mcpCmd = manifest.mcp.command;
      const mcpArgs = manifest.mcp.args || [];
      command = [mcpCmd, ...mcpArgs];
    }
  }
  if (!command || command.length === 0) {
    return { valid: false, error: "No command defined in manifest" };
  }
  const skipCommands = [
    "node",
    "python",
    "python3",
    "npx",
    "deno",
    "bun",
    "tsx",
    "ts-node",
    "tsm",
    "esno",
    "esbuild-register",
    // TypeScript runners
    "-y",
    "--yes"
    // npx flags
  ];
  const fileExtensions = [".js", ".ts", ".mjs", ".cjs", ".py", ".mts", ".cts"];
  for (const arg of command) {
    if (skipCommands.includes(arg)) continue;
    if (arg.startsWith("-")) continue;
    const looksLikeFile = fileExtensions.some((ext) => arg.endsWith(ext)) || arg.includes("/");
    if (!looksLikeFile) continue;
    const entryPath = require("path").join(stackPath, arg);
    if (!require("fs").existsSync(entryPath)) {
      return { valid: false, error: `Entry point not found: ${arg}` };
    }
    return { valid: true };
  }
  return { valid: true };
}
async function checkSecrets(manifest) {
  const secrets = getManifestSecrets(manifest);
  const found = [];
  const missing = [];
  for (const secret of secrets) {
    const key = getSecretName(secret);
    const isRequired = typeof secret === "object" ? secret.required !== false : true;
    const exists = await (0, import_secrets.hasSecret)(key);
    if (exists) {
      found.push(key);
    } else if (isRequired) {
      missing.push(key);
    }
  }
  return { found, missing };
}
async function parseEnvExample(installPath) {
  const examplePath = path.join(installPath, ".env.example");
  try {
    const content = await fs.readFile(examplePath, "utf-8");
    const keys = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=/);
      if (match) {
        keys.push(match[1]);
      }
    }
    return keys;
  } catch {
    return [];
  }
}
async function cmdInstall(args, flags) {
  const pkgId = args[0];
  if (!pkgId) {
    console.error("Usage: rudi install <package>");
    console.error("Example: rudi install slack");
    console.error("");
    console.error("After installing, run:");
    console.error("  rudi secrets set <KEY>    # Configure required secrets");
    console.error("  rudi integrate all        # Wire up your agents");
    process.exit(1);
  }
  const force = flags.force || false;
  console.log(`Resolving ${pkgId}...`);
  try {
    const resolved = await (0, import_core2.resolvePackage)(pkgId);
    console.log(`
Package: ${resolved.name} (${resolved.id})`);
    console.log(`Version: ${resolved.version}`);
    if (resolved.description) {
      console.log(`Description: ${resolved.description}`);
    }
    if (resolved.installed && !force) {
      console.log(`
Already installed. Use --force to reinstall.`);
      return;
    }
    if (resolved.dependencies?.length > 0) {
      console.log(`
Dependencies:`);
      for (const dep of resolved.dependencies) {
        const status = dep.installed ? "(installed)" : "(will install)";
        console.log(`  - ${dep.id} ${status}`);
      }
    }
    console.log(`
Dependency check:`);
    const depCheck = (0, import_core2.checkAllDependencies)(resolved);
    if (depCheck.results.length > 0) {
      for (const line of (0, import_core2.formatDependencyResults)(depCheck.results)) {
        console.log(line);
      }
    }
    const secretsCheck = { found: [], missing: [] };
    if (resolved.requires?.secrets?.length > 0) {
      for (const secret of resolved.requires.secrets) {
        const name = typeof secret === "string" ? secret : secret.name;
        const isRequired = typeof secret === "object" ? secret.required !== false : true;
        const exists = await (0, import_secrets.hasSecret)(name);
        if (exists) {
          secretsCheck.found.push(name);
          console.log(`  \u2713 ${name} (from secrets store)`);
        } else if (isRequired) {
          secretsCheck.missing.push(name);
          console.log(`  \u25CB ${name} - not configured`);
        } else {
          console.log(`  \u25CB ${name} (optional)`);
        }
      }
    }
    if (!depCheck.satisfied && !force) {
      console.error(`
\u2717 Missing required dependencies. Install them first:`);
      for (const r of depCheck.results.filter((r2) => !r2.available)) {
        console.error(`    rudi install ${r.type}:${r.name}`);
      }
      console.error(`
Or use --force to install anyway.`);
      process.exit(1);
    }
    console.log(`
Installing...`);
    const result = await (0, import_core2.installPackage)(pkgId, {
      force,
      onProgress: (progress) => {
        if (progress.phase === "installing") {
          console.log(`  Installing ${progress.package}...`);
        }
      }
    });
    if (result.success) {
      console.log(`
\u2713 Installed ${result.id}`);
      console.log(`  Path: ${result.path}`);
      if (result.installed?.length > 0) {
        console.log(`
  Also installed:`);
        for (const id of result.installed) {
          console.log(`    - ${id}`);
        }
      }
      if (resolved.kind === "stack") {
        const manifest = await loadManifest(result.path);
        if (manifest) {
          const validation = validateStackEntryPoint(result.path, manifest);
          if (!validation.valid) {
            console.error(`
\u2717 Stack validation failed: ${validation.error}`);
            console.error(`  The stack may be incomplete or misconfigured.`);
            process.exit(1);
          }
          const depResult = await installDependencies(result.path, manifest);
          if (depResult.installed) {
            console.log(`  \u2713 Dependencies installed`);
          } else if (depResult.error) {
            console.error(`
\u2717 Failed to install dependencies:`);
            console.error(`  ${depResult.error}`);
            console.error(`
  Stack installed but may not work. Fix dependencies and run:`);
            console.error(`  rudi install ${result.id}`);
            process.exit(1);
          }
          try {
            (0, import_core2.addStack)(result.id, {
              path: result.path,
              runtime: manifest.runtime || manifest.mcp?.runtime || "node",
              command: manifest.command || (manifest.mcp?.command ? [manifest.mcp.command, ...manifest.mcp.args || []] : null),
              secrets: getManifestSecrets(manifest),
              version: manifest.version
            });
            console.log(`  \u2713 Updated rudi.json`);
          } catch (err) {
            console.log(`  \u26A0 Failed to update rudi.json: ${err.message}`);
          }
          const { found, missing } = await checkSecrets(manifest);
          const envExampleKeys = await parseEnvExample(result.path);
          for (const key of envExampleKeys) {
            if (!found.includes(key) && !missing.includes(key)) {
              const exists = await (0, import_secrets.hasSecret)(key);
              if (!exists) {
                missing.push(key);
              } else {
                found.push(key);
              }
            }
          }
          if (missing.length > 0) {
            for (const key of missing) {
              const existing = await (0, import_secrets.getSecret)(key);
              if (existing === null) {
                await (0, import_secrets.setSecret)(key, "");
              }
              try {
                (0, import_core2.updateSecretStatus)(key, false);
              } catch {
              }
            }
          }
          for (const key of found) {
            try {
              (0, import_core2.updateSecretStatus)(key, true);
            } catch {
            }
          }
          console.log(`
Next steps:`);
          if (missing.length > 0) {
            console.log(`
  1. Configure secrets (${missing.length} pending):`);
            for (const key of missing) {
              const secret = getManifestSecrets(manifest).find(
                (s) => (typeof s === "string" ? s : s.name) === key
              );
              const helpUrl = getSecretLink(secret);
              console.log(`     rudi secrets set ${key} "<your-value>"`);
              if (helpUrl) {
                console.log(`     # Get yours: ${helpUrl}`);
              }
            }
            console.log(`
     Check status: rudi secrets list`);
          } else if (found.length > 0) {
            console.log(`
  1. Secrets: \u2713 ${found.length} configured`);
          } else {
            console.log(`
  1. Secrets: \u2713 None required`);
          }
          const agents = (0, import_mcp.getInstalledAgents)();
          if (agents.length > 0) {
            console.log(`
  2. Wire up your agents:`);
            console.log(`     rudi integrate all`);
            console.log(`     # Detected: ${agents.map((a) => a.name).join(", ")}`);
          }
          console.log(`
  3. Restart your agent to use the stack`);
          return;
        }
      }
      console.log(`
\u2713 Installed successfully.`);
    } else {
      console.error(`
\u2717 Installation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Installation failed: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// src/commands/run.js
var import_core3 = require("@learnrudi/core");
var import_runner = require("@learnrudi/runner");
var import_manifest = require("@learnrudi/manifest");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
async function cmdRun(args, flags) {
  const stackId = args[0];
  if (!stackId) {
    console.error("Usage: rudi run <stack> [options]");
    console.error("Example: rudi run pdf-creator");
    process.exit(1);
  }
  const fullId = stackId.includes(":") ? stackId : `stack:${stackId}`;
  if (!(0, import_core3.isPackageInstalled)(fullId)) {
    console.error(`Stack not installed: ${stackId}`);
    console.error(`Install with: rudi install ${stackId}`);
    process.exit(1);
  }
  const packagePath = (0, import_core3.getPackagePath)(fullId);
  let manifest;
  try {
    const manifestPath = (0, import_manifest.findStackManifest)(packagePath);
    if (manifestPath) {
      manifest = (0, import_manifest.parseStackManifest)(manifestPath);
    } else {
      const jsonPath = import_path.default.join(packagePath, "manifest.json");
      if (import_fs.default.existsSync(jsonPath)) {
        manifest = JSON.parse(import_fs.default.readFileSync(jsonPath, "utf-8"));
      }
    }
  } catch (error) {
    console.error(`Failed to read manifest: ${error.message}`);
    process.exit(1);
  }
  if (!manifest) {
    console.error(`No manifest found for ${stackId}`);
    process.exit(1);
  }
  console.log(`Running: ${manifest.name || stackId}`);
  const requiredSecrets = manifest.requires?.secrets || [];
  if (requiredSecrets.length > 0) {
    const { satisfied, missing } = (0, import_runner.checkSecrets)(requiredSecrets);
    if (!satisfied) {
      console.error(`
Missing required secrets:`);
      for (const name of missing) {
        console.error(`  - ${name}`);
      }
      console.error(`
Set with: rudi secrets set <name>`);
      process.exit(1);
    }
  }
  let inputs = {};
  if (flags.input) {
    try {
      inputs = JSON.parse(flags.input);
    } catch {
      console.error("Invalid --input JSON");
      process.exit(1);
    }
  }
  const startTime = Date.now();
  try {
    const result = await (0, import_runner.runStack)(fullId, {
      inputs,
      cwd: flags.cwd || process.cwd(),
      onStdout: (data) => process.stdout.write(data),
      onStderr: (data) => process.stderr.write(data)
    });
    const duration = Date.now() - startTime;
    console.log();
    if (result.exitCode === 0) {
      console.log(`\u2713 Completed in ${formatDuration(duration)}`);
    } else {
      console.log(`\u2717 Exited with code ${result.exitCode}`);
      process.exit(result.exitCode);
    }
  } catch (error) {
    console.error(`
Run failed: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
function formatDuration(ms) {
  if (ms < 1e3) return `${ms}ms`;
  if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
  const mins = Math.floor(ms / 6e4);
  const secs = Math.floor(ms % 6e4 / 1e3);
  return `${mins}m ${secs}s`;
}

// src/commands/list.js
var import_core4 = require("@learnrudi/core");
var import_mcp2 = require("@learnrudi/mcp");
function pluralizeKind2(kind) {
  if (!kind) return "packages";
  return kind === "binary" ? "binaries" : `${kind}s`;
}
function headingForKind2(kind) {
  return kind === "binary" ? "BINARIES" : `${kind.toUpperCase()}S`;
}
async function cmdList(args, flags) {
  let kind = args[0];
  if (kind) {
    if (kind === "stacks") kind = "stack";
    if (kind === "prompts") kind = "prompt";
    if (kind === "runtimes") kind = "runtime";
    if (kind === "binaries") kind = "binary";
    if (kind === "tools") kind = "binary";
    if (kind === "agents") kind = "agent";
    if (!["stack", "prompt", "runtime", "binary", "agent"].includes(kind)) {
      console.error(`Invalid kind: ${kind}`);
      console.error(`Valid kinds: stack, prompt, runtime, binary, agent`);
      process.exit(1);
    }
  }
  if (flags.detected && kind === "agent") {
    const installedAgents = (0, import_mcp2.getInstalledAgents)();
    const summary = (0, import_mcp2.getMcpServerSummary)();
    if (flags.json) {
      console.log(JSON.stringify({ installedAgents, summary }, null, 2));
      return;
    }
    console.log(`
DETECTED AI AGENTS (${installedAgents.length}/${import_mcp2.AGENT_CONFIGS.length}):`);
    console.log("\u2500".repeat(50));
    for (const agent of import_mcp2.AGENT_CONFIGS) {
      const installed = installedAgents.find((a) => a.id === agent.id);
      const serverCount = summary[agent.id]?.serverCount || 0;
      if (installed) {
        console.log(`  \u2713 ${agent.name}`);
        console.log(`    ${serverCount} MCP server(s)`);
        console.log(`    ${installed.configFile}`);
      } else {
        console.log(`  \u25CB ${agent.name} (not installed)`);
      }
    }
    console.log(`
Installed: ${installedAgents.length} of ${import_mcp2.AGENT_CONFIGS.length} agents`);
    return;
  }
  if (flags.detected && kind === "stack") {
    const servers = (0, import_mcp2.detectAllMcpServers)();
    if (flags.json) {
      console.log(JSON.stringify(servers, null, 2));
      return;
    }
    if (servers.length === 0) {
      console.log("No MCP servers detected in agent configs.");
      console.log("\nChecked these agents:");
      for (const agent of import_mcp2.AGENT_CONFIGS) {
        console.log(`  - ${agent.name}`);
      }
      return;
    }
    const byAgent = {};
    for (const server of servers) {
      if (!byAgent[server.agent]) byAgent[server.agent] = [];
      byAgent[server.agent].push(server);
    }
    console.log(`
DETECTED MCP SERVERS (${servers.length}):`);
    console.log("\u2500".repeat(50));
    for (const [agentId, agentServers] of Object.entries(byAgent)) {
      const agentName = agentServers[0]?.agentName || agentId;
      console.log(`
  ${agentName.toUpperCase()} (${agentServers.length}):`);
      for (const server of agentServers) {
        console.log(`    \u{1F4E6} ${server.name}`);
        console.log(`       ${server.command} ${server.cwd ? `(${server.cwd})` : ""}`);
      }
    }
    console.log(`
Total: ${servers.length} MCP server(s) configured`);
    return;
  }
  try {
    let packages = await (0, import_core4.listInstalled)(kind);
    const categoryFilter = flags.category;
    if (categoryFilter) {
      packages = packages.filter((p) => p.category === categoryFilter);
    }
    if (flags.json) {
      console.log(JSON.stringify(packages, null, 2));
      return;
    }
    if (packages.length === 0) {
      if (categoryFilter) {
        console.log(`No ${pluralizeKind2(kind)} found in category: ${categoryFilter}`);
      } else if (kind) {
        console.log(`No ${pluralizeKind2(kind)} installed.`);
      } else {
        console.log("No packages installed.");
      }
      console.log(`
Install with: rudi install <package>`);
      return;
    }
    if (kind === "prompt" && !categoryFilter) {
      const byCategory = {};
      for (const pkg of packages) {
        const cat = pkg.category || "general";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(pkg);
      }
      console.log(`
PROMPTS (${packages.length}):`);
      console.log("\u2500".repeat(50));
      for (const [category, prompts] of Object.entries(byCategory).sort()) {
        console.log(`
  ${category.toUpperCase()} (${prompts.length}):`);
        for (const pkg of prompts) {
          const icon = pkg.icon ? `${pkg.icon} ` : "";
          console.log(`    ${icon}${pkg.id || `prompt:${pkg.name}`}`);
          if (pkg.description) {
            console.log(`      ${pkg.description}`);
          }
          if (pkg.tags && pkg.tags.length > 0) {
            console.log(`      Tags: ${pkg.tags.join(", ")}`);
          }
        }
      }
      console.log(`
Total: ${packages.length} prompt(s)`);
      console.log(`
Filter by category: rudi list prompts --category=coding`);
      return;
    }
    const grouped = {
      stack: packages.filter((p) => p.kind === "stack"),
      prompt: packages.filter((p) => p.kind === "prompt"),
      runtime: packages.filter((p) => p.kind === "runtime"),
      binary: packages.filter((p) => p.kind === "binary"),
      agent: packages.filter((p) => p.kind === "agent")
    };
    let total = 0;
    for (const [pkgKind, pkgs] of Object.entries(grouped)) {
      if (pkgs.length === 0) continue;
      if (kind && kind !== pkgKind) continue;
      console.log(`
${headingForKind2(pkgKind)} (${pkgs.length}):`);
      console.log("\u2500".repeat(50));
      for (const pkg of pkgs) {
        const icon = pkg.icon ? `${pkg.icon} ` : "";
        console.log(`  ${icon}${pkg.id || `${pkgKind}:${pkg.name}`}`);
        console.log(`    Version: ${pkg.version || "unknown"}`);
        if (pkg.description) {
          console.log(`    ${pkg.description}`);
        }
        if (pkg.category) {
          console.log(`    Category: ${pkg.category}`);
        }
        if (pkg.tags && pkg.tags.length > 0) {
          console.log(`    Tags: ${pkg.tags.join(", ")}`);
        }
        if (pkg.installedAt) {
          console.log(`    Installed: ${new Date(pkg.installedAt).toLocaleDateString()}`);
        }
        total++;
      }
    }
    console.log(`
Total: ${total} package(s)`);
  } catch (error) {
    console.error(`Failed to list packages: ${error.message}`);
    process.exit(1);
  }
}

// src/commands/remove.js
var import_core5 = require("@learnrudi/core");
var import_mcp3 = require("@learnrudi/mcp");
function pluralizeKind3(kind) {
  if (!kind) return "packages";
  return kind === "binary" ? "binaries" : `${kind}s`;
}
async function cmdRemove(args, flags) {
  if (flags.all) {
    return await removeBulk(args[0], flags);
  }
  const pkgId = args[0];
  if (!pkgId) {
    console.error("Usage: rudi remove <package>");
    console.error("       rudi remove --all                           (remove all packages)");
    console.error("       rudi remove stacks --all                    (remove all stacks)");
    console.error("       rudi remove <package> --agent=claude        (unregister from Claude only)");
    console.error("       rudi remove <package> --agent=claude,codex  (unregister from specific agents)");
    console.error("Example: rudi remove pdf-creator");
    process.exit(1);
  }
  let targetAgents = null;
  if (flags.agent) {
    const validAgents = ["claude", "codex", "gemini"];
    targetAgents = flags.agent.split(",").map((a) => a.trim()).filter((a) => validAgents.includes(a));
    if (targetAgents.length === 0) {
      console.error(`Invalid --agent value. Valid agents: ${validAgents.join(", ")}`);
      process.exit(1);
    }
  }
  const fullId = pkgId.includes(":") ? pkgId : `stack:${pkgId}`;
  if (!(0, import_core5.isPackageInstalled)(fullId)) {
    console.error(`Package not installed: ${pkgId}`);
    process.exit(1);
  }
  if (!flags.force && !flags.y) {
    console.log(`This will remove: ${fullId}`);
    console.log(`Run with --force to confirm.`);
    process.exit(0);
  }
  console.log(`Removing ${fullId}...`);
  try {
    const result = await (0, import_core5.uninstallPackage)(fullId);
    if (result.success) {
      const stackId = fullId.replace(/^stack:/, "");
      await (0, import_mcp3.unregisterMcpAll)(stackId, targetAgents);
      console.log(`\u2713 Removed ${fullId}`);
    } else {
      console.error(`\u2717 Failed to remove: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Remove failed: ${error.message}`);
    process.exit(1);
  }
}
async function removeBulk(kind, flags) {
  let targetAgents = null;
  if (flags.agent) {
    const validAgents = ["claude", "codex", "gemini"];
    targetAgents = flags.agent.split(",").map((a) => a.trim()).filter((a) => validAgents.includes(a));
    if (targetAgents.length === 0) {
      console.error(`Invalid --agent value. Valid agents: ${validAgents.join(", ")}`);
      process.exit(1);
    }
  }
  if (kind) {
    if (kind === "stacks") kind = "stack";
    if (kind === "prompts") kind = "prompt";
    if (kind === "runtimes") kind = "runtime";
    if (kind === "binaries") kind = "binary";
    if (kind === "tools") kind = "binary";
    if (kind === "agents") kind = "agent";
    if (!["stack", "prompt", "runtime", "binary", "agent"].includes(kind)) {
      console.error(`Invalid kind: ${kind}`);
      console.error(`Valid kinds: stack, prompt, runtime, binary, agent`);
      process.exit(1);
    }
  }
  try {
    const packages = await (0, import_core5.listInstalled)(kind);
    if (packages.length === 0) {
      console.log(kind ? `No ${pluralizeKind3(kind)} installed.` : "No packages installed.");
      return;
    }
    console.log(kind ? `
Found ${packages.length} ${pluralizeKind3(kind)} to remove:` : `
Found ${packages.length} package(s) to remove:`);
    for (const pkg of packages) {
      console.log(`  - ${pkg.id}`);
    }
    if (!flags.force && !flags.y) {
      console.log(`
Run with --force to confirm removal.`);
      process.exit(0);
    }
    console.log(`
Removing packages...`);
    let succeeded = 0;
    let failed = 0;
    for (const pkg of packages) {
      try {
        const result = await (0, import_core5.uninstallPackage)(pkg.id);
        if (result.success) {
          if (pkg.kind === "stack") {
            const stackId = pkg.id.replace(/^stack:/, "");
            await (0, import_mcp3.unregisterMcpAll)(stackId, targetAgents);
          }
          console.log(`  \u2713 Removed ${pkg.id}`);
          succeeded++;
        } else {
          console.error(`  \u2717 Failed to remove ${pkg.id}: ${result.error}`);
          failed++;
        }
      } catch (error) {
        console.error(`  \u2717 Failed to remove ${pkg.id}: ${error.message}`);
        failed++;
      }
    }
    console.log(`
Removal complete: ${succeeded} succeeded, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`Bulk removal failed: ${error.message}`);
    process.exit(1);
  }
}

// src/commands/secrets.js
var import_readline = __toESM(require("readline"), 1);
var import_secrets2 = require("@learnrudi/secrets");
async function cmdSecrets(args, flags) {
  const subcommand = args[0];
  switch (subcommand) {
    case "set":
      await secretsSet(args.slice(1), flags);
      break;
    case "get":
      await secretsGet(args.slice(1), flags);
      break;
    case "list":
    case "ls":
      await secretsList(flags);
      break;
    case "remove":
    case "rm":
    case "delete":
      await secretsRemove(args.slice(1), flags);
      break;
    case "info":
      secretsInfo();
      break;
    default:
      console.log(`
rudi secrets - Manage secrets (stored in ${(0, import_secrets2.getStorageInfo)().backend})

COMMANDS
  set <name>       Set a secret (prompts for value securely)
  get <name>       Get a secret value (for scripts)
  list             List configured secrets (values masked)
  remove <name>    Remove a secret
  info             Show storage backend info

EXAMPLES
  rudi secrets set SLACK_BOT_TOKEN
  rudi secrets list
  rudi secrets remove GITHUB_TOKEN

SECURITY
  Secrets are stored in macOS Keychain when available.
  Fallback uses encrypted JSON at ~/.rudi/secrets.json
`);
  }
}
async function secretsSet(args, flags) {
  const name = args[0];
  const valueArg = args[1];
  if (!name) {
    console.error("Usage: rudi secrets set <name> [value]");
    console.error("");
    console.error("Examples:");
    console.error("  rudi secrets set SLACK_BOT_TOKEN              # Interactive prompt");
    console.error('  rudi secrets set SLACK_BOT_TOKEN "xoxb-..."   # Direct value');
    process.exit(1);
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    console.error("Secret name should be UPPER_SNAKE_CASE");
    console.error("Example: SLACK_BOT_TOKEN, GITHUB_API_KEY");
    process.exit(1);
  }
  const exists = await (0, import_secrets2.hasSecret)(name);
  if (exists && !flags.force) {
    console.log(`Secret ${name} already exists.`);
    console.log("Use --force to overwrite.");
    process.exit(0);
  }
  let value = valueArg;
  if (!value) {
    if (process.stdin.isTTY) {
      value = await promptSecret(`Enter value for ${name}: `);
    } else {
      console.error("No value provided.");
      console.error("Usage: rudi secrets set <name> <value>");
      process.exit(1);
    }
  }
  if (!value) {
    console.error("No value provided");
    process.exit(1);
  }
  await (0, import_secrets2.setSecret)(name, value);
  const info = (0, import_secrets2.getStorageInfo)();
  console.log(`\u2713 Secret ${name} saved (${info.backend})`);
}
async function secretsGet(args, flags) {
  const name = args[0];
  if (!name) {
    console.error("Usage: rudi secrets get <name>");
    process.exit(1);
  }
  const value = await (0, import_secrets2.getSecret)(name);
  if (value) {
    process.stdout.write(value);
  } else {
    process.exit(1);
  }
}
async function secretsList(flags) {
  const names = await (0, import_secrets2.listSecrets)();
  if (names.length === 0) {
    console.log("No secrets configured.");
    console.log("\nSet with: rudi secrets set <name>");
    return;
  }
  if (flags.json) {
    const masked2 = await (0, import_secrets2.getMaskedSecrets)();
    console.log(JSON.stringify(masked2, null, 2));
    return;
  }
  const masked = await (0, import_secrets2.getMaskedSecrets)();
  const info = (0, import_secrets2.getStorageInfo)();
  const pending = Object.values(masked).filter((v) => v === "(pending)").length;
  const configured = names.length - pending;
  console.log(`
Secrets (${info.backend}):`);
  console.log("\u2500".repeat(50));
  for (const name of names) {
    const status = masked[name] === "(pending)" ? "\u25CB" : "\u2713";
    console.log(`  ${status} ${name.padEnd(28)} ${masked[name]}`);
  }
  console.log("\u2500".repeat(50));
  if (pending > 0) {
    console.log(`  ${configured} configured, ${pending} pending`);
    console.log(`
  Set pending: rudi secrets set <name> "<value>"`);
  } else {
    console.log(`  ${configured} configured`);
  }
}
async function secretsRemove(args, flags) {
  const name = args[0];
  if (!name) {
    console.error("Usage: rudi secrets remove <name>");
    process.exit(1);
  }
  const allNames = await (0, import_secrets2.listSecrets)();
  if (!allNames.includes(name)) {
    console.error(`Secret not found: ${name}`);
    process.exit(1);
  }
  if (!flags.force && !flags.y) {
    console.log(`This will remove secret: ${name}`);
    console.log("Run with --force to confirm.");
    process.exit(0);
  }
  await (0, import_secrets2.removeSecret)(name);
  console.log(`\u2713 Secret ${name} removed`);
}
function secretsInfo() {
  const info = (0, import_secrets2.getStorageInfo)();
  console.log("\nSecrets Storage:");
  console.log("\u2500".repeat(50));
  console.log(`  Backend: ${info.backend}`);
  console.log(`  File: ${info.file}`);
  console.log(`  Permissions: ${info.permissions}`);
  console.log("");
  console.log("  Security: File permissions (0600) protect secrets.");
  console.log("  Same approach as AWS CLI, SSH, GitHub CLI.");
}
function promptSecret(prompt) {
  return new Promise((resolve) => {
    const rl = import_readline.default.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    process.stdout.write(prompt);
    let input = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (char) => {
      if (char === "\n" || char === "\r") {
        process.stdin.setRawMode(false);
        process.stdin.removeListener("data", onData);
        console.log();
        rl.close();
        resolve(input);
      } else if (char === "") {
        process.exit(0);
      } else if (char === "\x7F") {
        if (input.length > 0) {
          input = input.slice(0, -1);
        }
      } else {
        input += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

// src/commands/db.js
var import_fs2 = require("fs");
var import_path2 = require("path");
var import_db = require("@learnrudi/db");
var import_args = require("@learnrudi/utils/args");
async function cmdDb(args, flags) {
  const subcommand = args[0];
  switch (subcommand) {
    case "stats":
      dbStats(flags);
      break;
    case "search":
      dbSearch(args.slice(1), flags);
      break;
    case "init":
      dbInit(flags);
      break;
    case "path":
      console.log((0, import_db.getDbPath)());
      break;
    case "reset":
      await dbReset(flags);
      break;
    case "vacuum":
      dbVacuum(flags);
      break;
    case "backup":
      dbBackup(args.slice(1), flags);
      break;
    case "prune":
      dbPrune(args.slice(1), flags);
      break;
    case "tables":
      dbTables(flags);
      break;
    default:
      console.log(`
rudi db - Database operations

COMMANDS
  stats              Show usage statistics
  search <query>     Search conversation history
  init               Initialize or migrate database
  path               Show database file path
  reset              Delete all data (requires --force)
  vacuum             Compact database and reclaim space
  backup [file]      Create database backup
  prune [days]       Delete sessions older than N days (default: 90)
  tables             Show table row counts

OPTIONS
  --force            Required for destructive operations
  --dry-run          Preview without making changes

EXAMPLES
  rudi db stats
  rudi db search "authentication bug"
  rudi db init
  rudi db reset --force
  rudi db vacuum
  rudi db backup ~/backups/rudi-backup.db
  rudi db prune 30 --dry-run
`);
  }
}
function dbStats(flags) {
  if (!(0, import_db.isDatabaseInitialized)()) {
    console.log("Database not initialized.");
    console.log("Run: rudi db init");
    return;
  }
  try {
    const stats = (0, import_db.getStats)();
    if (flags.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }
    console.log("\nDatabase Statistics");
    console.log("\u2550".repeat(50));
    console.log("\nOVERVIEW");
    console.log("\u2500".repeat(30));
    console.log(`  Total Sessions:     ${stats.totalSessions}`);
    console.log(`  Total Turns:        ${stats.totalTurns}`);
    console.log(`  Total Cost:         $${(stats.totalCost || 0).toFixed(4)}`);
    console.log(`  Total Tokens:       ${formatNumber(stats.totalInputTokens + stats.totalOutputTokens)}`);
    if (stats.totalDurationMs > 0) {
      console.log(`  Total Time:         ${(0, import_args.formatDuration)(stats.totalDurationMs)}`);
    }
    if (Object.keys(stats.byProvider).length > 0) {
      console.log("\nBY PROVIDER");
      console.log("\u2500".repeat(30));
      for (const [provider, data] of Object.entries(stats.byProvider)) {
        console.log(`  ${provider}:`);
        console.log(`    Sessions: ${data.sessions}, Turns: ${data.turns}, Cost: $${(data.cost || 0).toFixed(4)}`);
      }
    }
    if (stats.byModel?.length > 0) {
      console.log("\nTOP MODELS");
      console.log("\u2500".repeat(30));
      for (const model of stats.byModel.slice(0, 5)) {
        console.log(`  ${model.model || "unknown"}: ${model.turns} turns, $${(model.cost || 0).toFixed(4)}`);
      }
    }
    const dbSize = (0, import_db.getDbSize)();
    if (dbSize) {
      console.log("\nDATABASE");
      console.log("\u2500".repeat(30));
      console.log(`  Size: ${(0, import_args.formatBytes)(dbSize)}`);
      console.log(`  Path: ${(0, import_db.getDbPath)()}`);
    }
  } catch (error) {
    console.error(`Failed to get stats: ${error.message}`);
    process.exit(1);
  }
}
function dbSearch(args, flags) {
  const query = args.join(" ");
  if (!query) {
    console.error("Usage: rudi db search <query>");
    process.exit(1);
  }
  if (!(0, import_db.isDatabaseInitialized)()) {
    console.log("Database not initialized.");
    return;
  }
  try {
    const results = (0, import_db.search)(query, {
      limit: flags.limit ? parseInt(flags.limit) : 20,
      provider: flags.provider
    });
    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    if (results.length === 0) {
      console.log("No results found.");
      return;
    }
    console.log(`
Found ${results.length} result(s):
`);
    for (const result of results) {
      console.log(`\u2500`.repeat(60));
      console.log(`Session: ${result.session_title || result.session_id}`);
      console.log(`Turn #${result.turn_number} | ${result.provider} | ${result.ts}`);
      if (result.user_highlighted) {
        console.log(`
User: ${truncate(stripHighlight(result.user_highlighted), 200)}`);
      }
      if (result.assistant_highlighted) {
        console.log(`
Assistant: ${truncate(stripHighlight(result.assistant_highlighted), 200)}`);
      }
      console.log();
    }
  } catch (error) {
    console.error(`Search failed: ${error.message}`);
    process.exit(1);
  }
}
function dbInit(flags) {
  console.log("Initializing database...");
  try {
    const result = (0, import_db.initSchema)();
    if (result.migrated) {
      console.log(`\u2713 Migrated from v${result.from} to v${result.version}`);
    } else {
      console.log(`\u2713 Database at v${result.version}`);
    }
    console.log(`  Path: ${(0, import_db.getDbPath)()}`);
  } catch (error) {
    console.error(`Failed to initialize: ${error.message}`);
    process.exit(1);
  }
}
function formatNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function truncate(str, len) {
  if (!str) return "";
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}
function stripHighlight(str) {
  return str.replace(/>>>/g, "").replace(/<<</g, "");
}
async function dbReset(flags) {
  if (!(0, import_db.isDatabaseInitialized)()) {
    console.log("Database not initialized.");
    return;
  }
  if (!flags.force) {
    console.error("This will delete ALL data from the database.");
    console.error("Use --force to confirm.");
    process.exit(1);
  }
  const db = (0, import_db.getDb)();
  const dbPath = (0, import_db.getDbPath)();
  const tables = ["sessions", "turns", "tool_calls", "projects"];
  const counts = {};
  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      counts[table] = row.count;
    } catch (e) {
      counts[table] = 0;
    }
  }
  console.log("Deleting all data...");
  console.log("\u2500".repeat(40));
  const deleteOrder = ["tool_calls", "turns", "sessions", "projects"];
  for (const table of deleteOrder) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
      console.log(`  ${table}: ${counts[table]} rows deleted`);
    } catch (e) {
    }
  }
  try {
    db.prepare("DELETE FROM turns_fts").run();
    console.log("  turns_fts: cleared");
  } catch (e) {
  }
  console.log("\u2500".repeat(40));
  console.log("Database reset complete.");
  console.log(`Path: ${dbPath}`);
}
function dbVacuum(flags) {
  if (!(0, import_db.isDatabaseInitialized)()) {
    console.log("Database not initialized.");
    return;
  }
  const dbPath = (0, import_db.getDbPath)();
  const sizeBefore = (0, import_db.getDbSize)();
  console.log("Compacting database...");
  console.log(`  Before: ${(0, import_args.formatBytes)(sizeBefore)}`);
  const db = (0, import_db.getDb)();
  db.exec("VACUUM");
  const sizeAfter = (0, import_db.getDbSize)();
  const saved = sizeBefore - sizeAfter;
  console.log(`  After:  ${(0, import_args.formatBytes)(sizeAfter)}`);
  if (saved > 0) {
    console.log(`  Saved:  ${(0, import_args.formatBytes)(saved)} (${(saved / sizeBefore * 100).toFixed(1)}%)`);
  } else {
    console.log("  No space reclaimed.");
  }
}
function dbBackup(args, flags) {
  if (!(0, import_db.isDatabaseInitialized)()) {
    console.log("Database not initialized.");
    return;
  }
  const dbPath = (0, import_db.getDbPath)();
  let backupPath = args[0];
  if (!backupPath) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    backupPath = (0, import_path2.join)((0, import_path2.dirname)(dbPath), `rudi-backup-${timestamp}.db`);
  }
  if (backupPath.startsWith("~")) {
    backupPath = (0, import_path2.join)(process.env.HOME || "", backupPath.slice(1));
  }
  if ((0, import_fs2.existsSync)(backupPath) && !flags.force) {
    console.error(`Backup file already exists: ${backupPath}`);
    console.error("Use --force to overwrite.");
    process.exit(1);
  }
  console.log("Creating backup...");
  console.log(`  Source: ${dbPath}`);
  console.log(`  Dest:   ${backupPath}`);
  try {
    const db = (0, import_db.getDb)();
    db.exec("VACUUM INTO ?", [backupPath]);
  } catch (e) {
    (0, import_fs2.copyFileSync)(dbPath, backupPath);
  }
  const size = (0, import_db.getDbSize)();
  console.log(`  Size:   ${(0, import_args.formatBytes)(size)}`);
  console.log("Backup complete.");
}
function dbPrune(args, flags) {
  if (!(0, import_db.isDatabaseInitialized)()) {
    console.log("Database not initialized.");
    return;
  }
  const days = parseInt(args[0]) || 90;
  const dryRun = flags["dry-run"] || flags.dryRun;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString();
  const db = (0, import_db.getDb)();
  const toDelete = db.prepare(`
    SELECT COUNT(*) as count FROM sessions
    WHERE last_active_at < ? OR (last_active_at IS NULL AND created_at < ?)
  `).get(cutoffDate, cutoffDate);
  const total = db.prepare("SELECT COUNT(*) as count FROM sessions").get();
  console.log(`Sessions older than ${days} days: ${toDelete.count}`);
  console.log(`Total sessions: ${total.count}`);
  console.log(`Cutoff date: ${cutoffDate.slice(0, 10)}`);
  if (toDelete.count === 0) {
    console.log("\nNo sessions to prune.");
    return;
  }
  if (dryRun) {
    console.log("\n(Dry run - no changes made)");
    return;
  }
  if (!flags.force) {
    console.error(`
This will delete ${toDelete.count} sessions and their turns.`);
    console.error("Use --force to confirm, or --dry-run to preview.");
    process.exit(1);
  }
  console.log("\nDeleting old sessions...");
  const sessionIds = db.prepare(`
    SELECT id FROM sessions
    WHERE last_active_at < ? OR (last_active_at IS NULL AND created_at < ?)
  `).all(cutoffDate, cutoffDate).map((r) => r.id);
  let turnsDeleted = 0;
  let toolCallsDeleted = 0;
  for (const sessionId of sessionIds) {
    const turnIds = db.prepare("SELECT id FROM turns WHERE session_id = ?").all(sessionId).map((r) => r.id);
    for (const turnId of turnIds) {
      const result = db.prepare("DELETE FROM tool_calls WHERE turn_id = ?").run(turnId);
      toolCallsDeleted += result.changes;
    }
    const turnResult = db.prepare("DELETE FROM turns WHERE session_id = ?").run(sessionId);
    turnsDeleted += turnResult.changes;
  }
  const sessionResult = db.prepare(`
    DELETE FROM sessions
    WHERE last_active_at < ? OR (last_active_at IS NULL AND created_at < ?)
  `).run(cutoffDate, cutoffDate);
  console.log(`  Sessions deleted: ${sessionResult.changes}`);
  console.log(`  Turns deleted: ${turnsDeleted}`);
  console.log(`  Tool calls deleted: ${toolCallsDeleted}`);
  console.log('\nPrune complete. Run "rudi db vacuum" to reclaim disk space.');
}
function dbTables(flags) {
  if (!(0, import_db.isDatabaseInitialized)()) {
    console.log("Database not initialized.");
    return;
  }
  const db = (0, import_db.getDb)();
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  if (flags.json) {
    const result = {};
    for (const { name } of tables) {
      try {
        const row = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get();
        result[name] = row.count;
      } catch (e) {
        result[name] = -1;
      }
    }
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log("\nDatabase Tables");
  console.log("\u2550".repeat(40));
  let totalRows = 0;
  for (const { name } of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get();
      console.log(`  ${name.padEnd(25)} ${row.count.toLocaleString().padStart(10)}`);
      totalRows += row.count;
    } catch (e) {
      console.log(`  ${name.padEnd(25)} ${"error".padStart(10)}`);
    }
  }
  console.log("\u2500".repeat(40));
  console.log(`  ${"Total".padEnd(25)} ${totalRows.toLocaleString().padStart(10)}`);
  console.log(`
  Size: ${(0, import_args.formatBytes)((0, import_db.getDbSize)())}`);
}

// src/commands/import.js
var import_fs3 = require("fs");
var import_path3 = require("path");
var import_os = require("os");
var import_crypto = require("crypto");
var import_db2 = require("@learnrudi/db");
var PROVIDERS = {
  claude: {
    name: "Claude Code",
    baseDir: (0, import_path3.join)((0, import_os.homedir)(), ".claude", "projects"),
    pattern: /\.jsonl$/
  },
  codex: {
    name: "Codex",
    baseDir: (0, import_path3.join)((0, import_os.homedir)(), ".codex", "sessions"),
    pattern: /\.jsonl$/
  },
  gemini: {
    name: "Gemini",
    baseDir: (0, import_path3.join)((0, import_os.homedir)(), ".gemini", "sessions"),
    pattern: /\.jsonl$/
  }
};
async function cmdImport(args, flags) {
  const subcommand = args[0];
  switch (subcommand) {
    case "sessions":
      await importSessions(args.slice(1), flags);
      break;
    case "status":
      showImportStatus(flags);
      break;
    default:
      console.log(`
rudi import - Import data from AI agent providers

COMMANDS
  sessions [provider]  Import sessions from provider (claude, codex, gemini, or all)
  status               Show import status for all providers

OPTIONS
  --dry-run            Show what would be imported without making changes
  --max-age=DAYS       Only import sessions newer than N days
  --verbose            Show detailed progress

EXAMPLES
  rudi import sessions              # Import from all providers
  rudi import sessions claude       # Import only Claude sessions
  rudi import sessions --dry-run    # Preview without importing
  rudi import status                # Check what's available to import
`);
  }
}
async function importSessions(args, flags) {
  const providerArg = args[0] || "all";
  const dryRun = flags["dry-run"] || flags.dryRun;
  const verbose = flags.verbose;
  const maxAgeDays = flags["max-age"] ? parseInt(flags["max-age"]) : null;
  if (!(0, import_db2.isDatabaseInitialized)()) {
    console.log("Initializing database...");
    (0, import_db2.initSchema)();
  }
  const db = (0, import_db2.getDb)();
  const providers = providerArg === "all" ? Object.keys(PROVIDERS) : [providerArg];
  for (const p of providers) {
    if (!PROVIDERS[p]) {
      console.error(`Unknown provider: ${p}`);
      console.error(`Available: ${Object.keys(PROVIDERS).join(", ")}`);
      process.exit(1);
    }
  }
  console.log("\u2550".repeat(60));
  console.log("RUDI Session Import");
  console.log("\u2550".repeat(60));
  console.log(`Providers:  ${providers.join(", ")}`);
  console.log(`Database:   ${(0, import_db2.getDbPath)()}`);
  console.log(`Max age:    ${maxAgeDays ? `${maxAgeDays} days` : "all"}`);
  console.log(`Dry run:    ${dryRun ? "yes" : "no"}`);
  console.log("\u2550".repeat(60));
  let totalImported = 0;
  let totalSkipped = 0;
  for (const providerKey of providers) {
    const provider = PROVIDERS[providerKey];
    console.log(`
\u25B6 ${provider.name}`);
    console.log(`  Source: ${provider.baseDir}`);
    if (!(0, import_fs3.existsSync)(provider.baseDir)) {
      console.log(`  \u26A0 Directory not found, skipping`);
      continue;
    }
    const existingIds = /* @__PURE__ */ new Set();
    try {
      const rows = db.prepare(
        "SELECT provider_session_id FROM sessions WHERE provider = ? AND provider_session_id IS NOT NULL"
      ).all(providerKey);
      for (const row of rows) {
        existingIds.add(row.provider_session_id);
      }
    } catch (e) {
    }
    console.log(`  Existing: ${existingIds.size} sessions`);
    const files = findSessionFiles(provider.baseDir, provider.pattern);
    console.log(`  Found: ${files.length} session files`);
    const insertStmt = db.prepare(`
      INSERT INTO sessions (
        id, provider, provider_session_id, project_id,
        origin, origin_imported_at, origin_native_file,
        title, snippet, status, model,
        inherit_project_prompt,
        cwd, dir_scope, native_storage_path,
        created_at, last_active_at,
        turn_count, total_cost, total_input_tokens, total_output_tokens, total_duration_ms,
        is_warmup, parent_session_id, agent_id, is_sidechain, session_type, version, user_type
      ) VALUES (
        ?, ?, ?, NULL,
        'provider-import', ?, ?,
        ?, '', 'active', ?,
        1,
        ?, 'project', ?,
        ?, ?,
        0, 0, 0, 0, 0,
        0, ?, ?, ?, ?, '2.0.76', 'external'
      )
    `);
    let imported = 0;
    let skipped = { existing: 0, empty: 0, old: 0, error: 0 };
    const now = Date.now();
    const maxAgeMs = maxAgeDays ? maxAgeDays * 24 * 60 * 60 * 1e3 : null;
    for (const filepath of files) {
      const sessionId = (0, import_path3.basename)(filepath, ".jsonl");
      if (existingIds.has(sessionId)) {
        skipped.existing++;
        continue;
      }
      let stat;
      try {
        stat = (0, import_fs3.statSync)(filepath);
      } catch (e) {
        skipped.error++;
        continue;
      }
      if (stat.size === 0) {
        skipped.empty++;
        continue;
      }
      if (maxAgeMs && now - stat.mtimeMs > maxAgeMs) {
        skipped.old++;
        continue;
      }
      const session = parseSessionFile(filepath, providerKey);
      if (!session) {
        skipped.error++;
        continue;
      }
      if (dryRun) {
        if (verbose || imported < 5) {
          console.log(`  [would import] ${sessionId}: ${session.title.slice(0, 40)}`);
        }
        imported++;
        continue;
      }
      try {
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        insertStmt.run(
          (0, import_crypto.randomUUID)(),
          providerKey,
          sessionId,
          nowIso,
          filepath,
          session.title,
          session.model || "unknown",
          session.cwd,
          filepath,
          session.createdAt,
          session.lastActiveAt,
          session.parentSessionId,
          session.agentId,
          session.isAgent ? 1 : 0,
          session.sessionType
        );
        imported++;
        if (verbose) {
          console.log(`  \u2713 ${sessionId}: ${session.title.slice(0, 40)}`);
        } else if (imported % 100 === 0) {
          console.log(`  Imported ${imported}...`);
        }
      } catch (e) {
        skipped.error++;
        if (verbose) {
          console.log(`  \u2717 ${sessionId}: ${e.message}`);
        }
      }
    }
    console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
    console.log(`  Imported: ${imported}`);
    console.log(`  Skipped:  ${skipped.existing} existing, ${skipped.empty} empty, ${skipped.old} old, ${skipped.error} errors`);
    totalImported += imported;
    totalSkipped += skipped.existing + skipped.empty + skipped.old + skipped.error;
  }
  console.log("\n" + "\u2550".repeat(60));
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped:  ${totalSkipped}`);
  console.log("\u2550".repeat(60));
  if (dryRun) {
    console.log("\n(Dry run - no changes made)");
  }
  if (!dryRun && totalImported > 0) {
    const count = db.prepare("SELECT COUNT(*) as count FROM sessions").get();
    console.log(`
Total sessions in database: ${count.count}`);
  }
}
function showImportStatus(flags) {
  console.log("\u2550".repeat(60));
  console.log("Import Status");
  console.log("\u2550".repeat(60));
  if (!(0, import_db2.isDatabaseInitialized)()) {
    console.log("\nDatabase: Not initialized");
    console.log("Run: rudi db init");
  } else {
    const db = (0, import_db2.getDb)();
    const stats = db.prepare(`
      SELECT provider, COUNT(*) as count
      FROM sessions
      WHERE status = 'active'
      GROUP BY provider
    `).all();
    console.log("\nDatabase sessions:");
    for (const row of stats) {
      console.log(`  ${row.provider}: ${row.count}`);
    }
  }
  console.log("\nProvider directories:");
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    const exists = (0, import_fs3.existsSync)(provider.baseDir);
    let count = 0;
    if (exists) {
      const files = findSessionFiles(provider.baseDir, provider.pattern);
      count = files.length;
    }
    console.log(`  ${provider.name}:`);
    console.log(`    Path: ${provider.baseDir}`);
    console.log(`    Status: ${exists ? `${count} session files` : "not found"}`);
  }
  console.log("\n" + "\u2550".repeat(60));
  console.log("To import: rudi import sessions [provider]");
}
function findSessionFiles(dir, pattern, files = []) {
  if (!(0, import_fs3.existsSync)(dir)) return files;
  try {
    for (const entry of (0, import_fs3.readdirSync)(dir, { withFileTypes: true })) {
      const fullPath = (0, import_path3.join)(dir, entry.name);
      if (entry.isDirectory()) {
        findSessionFiles(fullPath, pattern, files);
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (e) {
  }
  return files;
}
function parseSessionFile(filepath, provider) {
  try {
    const stat = (0, import_fs3.statSync)(filepath);
    const content = (0, import_fs3.readFileSync)(filepath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return null;
    const sessionId = (0, import_path3.basename)(filepath, ".jsonl");
    const isAgent = sessionId.startsWith("agent-");
    let title = null;
    let cwd = null;
    let createdAt = null;
    let model = null;
    let parentSessionId = null;
    let agentId = isAgent ? sessionId.replace("agent-", "") : null;
    for (const line of lines.slice(0, 50)) {
      try {
        const data = JSON.parse(line);
        if (!cwd && data.cwd) cwd = data.cwd;
        if (!createdAt && data.timestamp) createdAt = data.timestamp;
        if (!model && data.model) model = data.model;
        if (!parentSessionId && (data.parentSessionId || data.parentUuid)) {
          parentSessionId = data.parentSessionId || data.parentUuid;
        }
        if (!agentId && data.agentId) agentId = data.agentId;
        if (!title) {
          const msg = data.message?.content || data.userMessage || (data.type === "user" ? data.message?.content : null);
          if (msg && msg.length > 2) {
            title = msg.split("\n")[0].slice(0, 50).trim();
          }
        }
      } catch (e) {
        continue;
      }
    }
    if (!title || title.length < 3) {
      title = isAgent ? "Agent Session" : "Imported Session";
    }
    if (!cwd) {
      const parentDir = (0, import_path3.basename)((0, import_path3.dirname)(filepath));
      if (parentDir.startsWith("-")) {
        cwd = parentDir.replace(/-/g, "/").replace(/^\//, "/");
      } else {
        cwd = (0, import_os.homedir)();
      }
    }
    return {
      title,
      cwd,
      createdAt: createdAt || stat.birthtime.toISOString(),
      lastActiveAt: stat.mtime.toISOString(),
      model,
      isAgent,
      agentId,
      parentSessionId,
      sessionType: isAgent ? "agent" : "main"
    };
  } catch (e) {
    return null;
  }
}

// src/commands/doctor.js
var import_core6 = require("@learnrudi/core");
var import_db3 = require("@learnrudi/db");
var import_runner2 = require("@learnrudi/runner");
var import_fs4 = __toESM(require("fs"), 1);
async function cmdDoctor(args, flags) {
  console.log("RUDI Health Check");
  console.log("\u2550".repeat(50));
  const issues = [];
  const fixes = [];
  console.log("\n\u{1F4C1} Directories");
  const dirs = [
    { path: import_core6.PATHS.home, name: "Home" },
    { path: import_core6.PATHS.stacks, name: "Stacks" },
    { path: import_core6.PATHS.prompts, name: "Prompts" },
    { path: import_core6.PATHS.runtimes, name: "Runtimes" },
    { path: import_core6.PATHS.binaries, name: "Binaries" },
    { path: import_core6.PATHS.agents, name: "Agents" },
    { path: import_core6.PATHS.db, name: "Database" },
    { path: import_core6.PATHS.cache, name: "Cache" }
  ];
  for (const dir of dirs) {
    const exists = import_fs4.default.existsSync(dir.path);
    const status = exists ? "\u2713" : "\u2717";
    console.log(`  ${status} ${dir.name}: ${dir.path}`);
    if (!exists) {
      issues.push(`Missing directory: ${dir.name}`);
      fixes.push(() => import_fs4.default.mkdirSync(dir.path, { recursive: true }));
    }
  }
  console.log("\n\u{1F4BE} Database");
  const dbInitialized = (0, import_db3.isDatabaseInitialized)();
  console.log(`  ${dbInitialized ? "\u2713" : "\u2717"} Initialized: ${dbInitialized}`);
  if (!dbInitialized) {
    issues.push("Database not initialized");
    fixes.push(() => (0, import_db3.initSchema)());
  }
  console.log("\n\u{1F4E6} Packages");
  try {
    const stacks = (0, import_core6.getInstalledPackages)("stack");
    const prompts = (0, import_core6.getInstalledPackages)("prompt");
    const runtimes = (0, import_core6.getInstalledPackages)("runtime");
    console.log(`  \u2713 Stacks: ${stacks.length}`);
    console.log(`  \u2713 Prompts: ${prompts.length}`);
    console.log(`  \u2713 Runtimes: ${runtimes.length}`);
  } catch (error) {
    console.log(`  \u2717 Error reading packages: ${error.message}`);
    issues.push("Cannot read packages");
  }
  console.log("\n\u{1F510} Secrets");
  try {
    const secrets = (0, import_runner2.listSecretNames)();
    console.log(`  \u2713 Configured: ${secrets.length}`);
    if (secrets.length > 0) {
      for (const name of secrets.slice(0, 5)) {
        console.log(`    - ${name}`);
      }
      if (secrets.length > 5) {
        console.log(`    ... and ${secrets.length - 5} more`);
      }
    }
  } catch (error) {
    console.log(`  \u2717 Error reading secrets: ${error.message}`);
  }
  console.log("\n\u2699\uFE0F  Runtimes");
  try {
    const { runtimes, binaries } = flags.all ? await (0, import_core6.getAllDepsFromRegistry)() : (0, import_core6.getAvailableDeps)();
    for (const rt of runtimes) {
      const icon = rt.available ? "\u2713" : "\u25CB";
      const version = rt.version ? `v${rt.version}` : "";
      const source = rt.available ? `(${rt.source})` : flags.all ? "available" : "not found";
      console.log(`  ${icon} ${rt.name}: ${version} ${source}`);
    }
    console.log("\n\u{1F527} Binaries");
    for (const bin of binaries) {
      const icon = bin.available ? "\u2713" : "\u25CB";
      const version = bin.version ? `v${bin.version}` : "";
      const managed = bin.managed === false ? " (external)" : "";
      const source = bin.available ? `(${bin.source})` : flags.all ? `available${managed}` : "not found";
      console.log(`  ${icon} ${bin.name}: ${version} ${source}`);
    }
    if (flags.all) {
      const availableRuntimes = runtimes.filter((r) => !r.available).length;
      const availableBinaries = binaries.filter((b) => !b.available && b.managed !== false).length;
      if (availableRuntimes + availableBinaries > 0) {
        console.log(`
  Install with: rudi install runtime:<name> or rudi install binary:<name>`);
      }
    }
  } catch (error) {
    console.log(`  \u2717 Error checking dependencies: ${error.message}`);
  }
  console.log("\n\u{1F4CD} Environment");
  const nodeVersion = process.version;
  const nodeOk = parseInt(nodeVersion.slice(1)) >= 18;
  console.log(`  ${nodeOk ? "\u2713" : "\u2717"} Node.js: ${nodeVersion} ${nodeOk ? "" : "(requires >=18)"}`);
  console.log(`  \u2713 Platform: ${process.platform}-${process.arch}`);
  console.log(`  \u2713 RUDI Home: ${import_core6.PATHS.home}`);
  if (!nodeOk) {
    issues.push("Node.js version too old (requires >=18)");
  }
  console.log("\n" + "\u2500".repeat(50));
  if (issues.length === 0) {
    console.log("\u2713 All checks passed!");
  } else {
    console.log(`Found ${issues.length} issue(s):
`);
    for (const issue of issues) {
      console.log(`  \u2022 ${issue}`);
    }
    if (flags.fix && fixes.length > 0) {
      console.log("\nAttempting fixes...");
      for (const fix of fixes) {
        try {
          fix();
        } catch (error) {
          console.error(`  Fix failed: ${error.message}`);
        }
      }
      console.log("Done. Run doctor again to verify.");
    } else if (fixes.length > 0) {
      console.log("\nRun with --fix to attempt automatic fixes.");
    }
  }
}

// src/commands/home.js
var import_fs5 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_core7 = require("@learnrudi/core");
var import_db4 = require("@learnrudi/db");
function formatBytes2(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function getDirSize(dir) {
  if (!import_fs5.default.existsSync(dir)) return 0;
  let size = 0;
  try {
    const entries = import_fs5.default.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = import_path4.default.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      } else {
        size += import_fs5.default.statSync(fullPath).size;
      }
    }
  } catch {
  }
  return size;
}
function countItems(dir) {
  if (!import_fs5.default.existsSync(dir)) return 0;
  try {
    return import_fs5.default.readdirSync(dir).filter((f) => !f.startsWith(".")).length;
  } catch {
    return 0;
  }
}
async function cmdHome(args, flags) {
  console.log("\u2550".repeat(60));
  console.log("RUDI Home: " + import_core7.PATHS.home);
  console.log("\u2550".repeat(60));
  if (flags.json) {
    const data = {
      home: import_core7.PATHS.home,
      directories: {},
      packages: {},
      database: {}
    };
    const dirs2 = [
      { key: "stacks", path: import_core7.PATHS.stacks },
      { key: "prompts", path: import_core7.PATHS.prompts },
      { key: "runtimes", path: import_core7.PATHS.runtimes },
      { key: "binaries", path: import_core7.PATHS.binaries },
      { key: "agents", path: import_core7.PATHS.agents },
      { key: "cache", path: import_core7.PATHS.cache }
    ];
    for (const dir of dirs2) {
      data.directories[dir.key] = {
        path: dir.path,
        exists: import_fs5.default.existsSync(dir.path),
        items: countItems(dir.path),
        size: getDirSize(dir.path)
      };
    }
    for (const kind of ["stack", "prompt", "runtime", "binary", "agent"]) {
      data.packages[kind] = (0, import_core7.getInstalledPackages)(kind).length;
    }
    data.database = {
      initialized: (0, import_db4.isDatabaseInitialized)(),
      size: (0, import_db4.getDbSize)() || 0
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log("\n\u{1F4C1} Directory Structure\n");
  const dirs = [
    { name: "stacks", path: import_core7.PATHS.stacks, icon: "\u{1F4E6}", desc: "MCP server stacks" },
    { name: "prompts", path: import_core7.PATHS.prompts, icon: "\u{1F4DD}", desc: "Prompt templates" },
    { name: "runtimes", path: import_core7.PATHS.runtimes, icon: "\u2699\uFE0F", desc: "Node, Python, Deno, Bun" },
    { name: "binaries", path: import_core7.PATHS.binaries, icon: "\u{1F527}", desc: "ffmpeg, ripgrep, etc." },
    { name: "agents", path: import_core7.PATHS.agents, icon: "\u{1F916}", desc: "Claude, Codex, Gemini CLIs" },
    { name: "cache", path: import_core7.PATHS.cache, icon: "\u{1F4BE}", desc: "Registry cache" }
  ];
  for (const dir of dirs) {
    const exists = import_fs5.default.existsSync(dir.path);
    const count = countItems(dir.path);
    const size = getDirSize(dir.path);
    console.log(`${dir.icon} ${dir.name}/`);
    console.log(`   ${dir.desc}`);
    if (exists) {
      console.log(`   ${count} items, ${formatBytes2(size)}`);
    } else {
      console.log(`   (not created)`);
    }
    console.log();
  }
  console.log("\u{1F4BE} Database");
  const dbPath = import_path4.default.join(import_core7.PATHS.home, "rudi.db");
  if (import_fs5.default.existsSync(dbPath)) {
    const dbSize = (0, import_db4.getDbSize)() || import_fs5.default.statSync(dbPath).size;
    console.log(`   ${formatBytes2(dbSize)}`);
    console.log(`   ${dbPath}`);
  } else {
    console.log(`   Not initialized`);
  }
  console.log();
  console.log("\u2550".repeat(60));
  console.log("Installed Packages");
  console.log("\u2550".repeat(60));
  const kinds = ["stack", "prompt", "runtime", "binary", "agent"];
  let total = 0;
  for (const kind of kinds) {
    const packages = (0, import_core7.getInstalledPackages)(kind);
    const label = kind === "binary" ? "Binaries" : `${kind.charAt(0).toUpperCase() + kind.slice(1)}s`;
    console.log(`  ${label.padEnd(12)} ${packages.length}`);
    if (packages.length > 0 && flags.verbose) {
      for (const pkg of packages.slice(0, 3)) {
        console.log(`    - ${pkg.name || pkg.id}`);
      }
      if (packages.length > 3) {
        console.log(`    ... and ${packages.length - 3} more`);
      }
    }
    total += packages.length;
  }
  console.log("\u2500".repeat(30));
  console.log(`  ${"Total".padEnd(12)} ${total}`);
  console.log("\n\u{1F4CB} Quick Commands");
  console.log("\u2500".repeat(30));
  console.log("  rudi list stacks      Show installed stacks");
  console.log("  rudi list runtimes    Show installed runtimes");
  console.log("  rudi list binaries    Show installed binaries");
  console.log("  rudi doctor --all     Check system dependencies");
  console.log("  rudi db stats         Database statistics");
}

// src/commands/init.js
var import_fs6 = __toESM(require("fs"), 1);
var import_path5 = __toESM(require("path"), 1);
var import_promises = require("stream/promises");
var import_fs7 = require("fs");
var import_child_process2 = require("child_process");
var import_env = require("@learnrudi/env");
var import_registry_client = require("@learnrudi/registry-client");
var import_db5 = require("@learnrudi/db");
var RELEASES_BASE = "https://github.com/learn-rudi/registry/releases/download/v1.0.0";
var BUNDLED_RUNTIMES = ["node", "python"];
var ESSENTIAL_BINARIES = ["sqlite", "ripgrep"];
async function cmdInit(args, flags) {
  const force = flags.force || false;
  const skipDownloads = flags["skip-downloads"] || false;
  const quiet = flags.quiet || false;
  if (!quiet) {
    console.log("\u2550".repeat(60));
    console.log("RUDI Initialization");
    console.log("\u2550".repeat(60));
    console.log(`Home: ${import_env.PATHS.home}`);
    console.log();
  }
  const actions = { created: [], skipped: [], failed: [] };
  if (!quiet) console.log("1. Checking directory structure...");
  (0, import_env.ensureDirectories)();
  const dirs = [
    import_env.PATHS.stacks,
    import_env.PATHS.prompts,
    import_env.PATHS.runtimes,
    import_env.PATHS.binaries,
    import_env.PATHS.agents,
    import_env.PATHS.cache,
    import_path5.default.join(import_env.PATHS.home, "shims")
  ];
  for (const dir of dirs) {
    const dirName = import_path5.default.basename(dir);
    if (!import_fs6.default.existsSync(dir)) {
      import_fs6.default.mkdirSync(dir, { recursive: true });
      actions.created.push(`dir:${dirName}`);
      if (!quiet) console.log(`   + ${dirName}/ (created)`);
    } else {
      actions.skipped.push(`dir:${dirName}`);
      if (!quiet) console.log(`   \u2713 ${dirName}/ (exists)`);
    }
  }
  if (!skipDownloads) {
    if (!quiet) console.log("\n2. Checking runtimes...");
    const index = await (0, import_registry_client.fetchIndex)();
    const platform = (0, import_env.getPlatformArch)();
    for (const runtimeName of BUNDLED_RUNTIMES) {
      const runtime = index.packages?.runtimes?.official?.find(
        (r) => r.id === `runtime:${runtimeName}` || r.id === runtimeName
      );
      if (!runtime) {
        actions.failed.push(`runtime:${runtimeName}`);
        if (!quiet) console.log(`   \u26A0 ${runtimeName}: not found in registry`);
        continue;
      }
      const destPath = import_path5.default.join(import_env.PATHS.runtimes, runtimeName);
      if (import_fs6.default.existsSync(destPath) && !force) {
        actions.skipped.push(`runtime:${runtimeName}`);
        if (!quiet) console.log(`   \u2713 ${runtimeName}: already installed`);
        continue;
      }
      try {
        await downloadRuntime(runtime, runtimeName, destPath, platform);
        actions.created.push(`runtime:${runtimeName}`);
        if (!quiet) console.log(`   + ${runtimeName}: installed`);
      } catch (error) {
        actions.failed.push(`runtime:${runtimeName}`);
        if (!quiet) console.log(`   \u2717 ${runtimeName}: ${error.message}`);
      }
    }
    if (!quiet) console.log("\n3. Checking essential binaries...");
    for (const binaryName of ESSENTIAL_BINARIES) {
      const binary = index.packages?.binaries?.official?.find(
        (b) => b.id === `binary:${binaryName}` || b.id === binaryName || b.name?.toLowerCase() === binaryName
      );
      if (!binary) {
        actions.failed.push(`binary:${binaryName}`);
        if (!quiet) console.log(`   \u26A0 ${binaryName}: not found in registry`);
        continue;
      }
      const destPath = import_path5.default.join(import_env.PATHS.binaries, binaryName);
      if (import_fs6.default.existsSync(destPath) && !force) {
        actions.skipped.push(`binary:${binaryName}`);
        if (!quiet) console.log(`   \u2713 ${binaryName}: already installed`);
        continue;
      }
      try {
        await downloadBinary(binary, binaryName, destPath, platform);
        actions.created.push(`binary:${binaryName}`);
        if (!quiet) console.log(`   + ${binaryName}: installed`);
      } catch (error) {
        actions.failed.push(`binary:${binaryName}`);
        if (!quiet) console.log(`   \u2717 ${binaryName}: ${error.message}`);
      }
    }
  } else {
    if (!quiet) console.log("\n2-3. Skipping downloads (--skip-downloads)");
  }
  if (!quiet) console.log("\n4. Updating shims...");
  const shimsDir = import_path5.default.join(import_env.PATHS.home, "shims");
  const shimCount = await createShims(shimsDir, quiet);
  if (shimCount > 0) {
    actions.created.push(`shims:${shimCount}`);
  }
  if (!quiet) console.log("\n5. Checking database...");
  const dbPath = import_path5.default.join(import_env.PATHS.home, "rudi.db");
  const dbExists = import_fs6.default.existsSync(dbPath);
  try {
    const result = (0, import_db5.initSchema)();
    if (dbExists) {
      actions.skipped.push("database");
      if (!quiet) console.log(`   \u2713 Database exists (v${result.version})`);
    } else {
      actions.created.push("database");
      if (!quiet) console.log(`   + Database created (v${result.version})`);
    }
  } catch (error) {
    actions.failed.push("database");
    if (!quiet) console.log(`   \u2717 Database error: ${error.message}`);
  }
  if (!quiet) console.log("\n6. Checking settings...");
  const settingsPath = import_path5.default.join(import_env.PATHS.home, "settings.json");
  if (!import_fs6.default.existsSync(settingsPath)) {
    const settings = {
      version: "1.0.0",
      initialized: (/* @__PURE__ */ new Date()).toISOString(),
      theme: "system"
    };
    import_fs6.default.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    actions.created.push("settings");
    if (!quiet) console.log("   + settings.json created");
  } else {
    actions.skipped.push("settings");
    if (!quiet) console.log("   \u2713 settings.json exists");
  }
  if (!quiet) {
    console.log("\n" + "\u2550".repeat(60));
    if (actions.created.length > 0) {
      console.log(`\u2713 RUDI initialized! (${actions.created.length} items created, ${actions.skipped.length} already existed)`);
    } else {
      console.log("\u2713 RUDI is up to date! (all items already existed)");
    }
    console.log("\u2550".repeat(60));
    if (actions.created.includes("settings")) {
      const shimsPath = import_path5.default.join(import_env.PATHS.home, "shims");
      console.log("\nAdd to your shell profile (~/.zshrc or ~/.bashrc):");
      console.log(`  export PATH="${shimsPath}:$PATH"`);
      console.log("\nThen run:");
      console.log("  rudi home     # View your setup");
      console.log("  rudi doctor   # Check health");
    }
  }
  return actions;
}
async function downloadRuntime(runtime, name, destPath, platform) {
  let url;
  if (runtime.upstream?.[platform]) {
    url = runtime.upstream[platform];
  } else if (runtime.download?.[platform]) {
    url = `${RELEASES_BASE}/${runtime.download[platform]}`;
  } else {
    throw new Error(`No download for ${platform}`);
  }
  await downloadAndExtract(url, destPath, name);
}
async function downloadBinary(binary, name, destPath, platform) {
  let url;
  if (binary.upstream?.[platform]) {
    url = binary.upstream[platform];
  } else if (binary.download?.[platform]) {
    url = `${RELEASES_BASE}/${binary.download[platform]}`;
  } else {
    throw new Error(`No download for ${platform}`);
  }
  await downloadAndExtract(url, destPath, name, binary.extract);
}
async function downloadAndExtract(url, destPath, name, extractConfig) {
  const tempFile = import_path5.default.join(import_env.PATHS.cache, `${name}-download.tar.gz`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (!import_fs6.default.existsSync(destPath)) {
    import_fs6.default.mkdirSync(destPath, { recursive: true });
  }
  const fileStream = (0, import_fs7.createWriteStream)(tempFile);
  await (0, import_promises.pipeline)(response.body, fileStream);
  try {
    (0, import_child_process2.execSync)(`tar -xzf "${tempFile}" -C "${destPath}" --strip-components=1`, {
      stdio: "pipe"
    });
  } catch {
    (0, import_child_process2.execSync)(`tar -xzf "${tempFile}" -C "${destPath}"`, { stdio: "pipe" });
  }
  import_fs6.default.unlinkSync(tempFile);
}
async function createShims(shimsDir, quiet = false) {
  const shims = [];
  const runtimeShims = {
    node: "runtimes/node/bin/node",
    npm: "runtimes/node/bin/npm",
    npx: "runtimes/node/bin/npx",
    python: "runtimes/python/bin/python3",
    python3: "runtimes/python/bin/python3",
    pip: "runtimes/python/bin/pip3",
    pip3: "runtimes/python/bin/pip3"
  };
  const binaryShims = {
    sqlite3: "binaries/sqlite/sqlite3",
    rg: "binaries/ripgrep/rg",
    ripgrep: "binaries/ripgrep/rg"
  };
  for (const [shimName, targetPath] of Object.entries(runtimeShims)) {
    const fullTarget = import_path5.default.join(import_env.PATHS.home, targetPath);
    const shimPath = import_path5.default.join(shimsDir, shimName);
    if (import_fs6.default.existsSync(fullTarget)) {
      createShim(shimPath, fullTarget);
      shims.push(shimName);
    }
  }
  for (const [shimName, targetPath] of Object.entries(binaryShims)) {
    const fullTarget = import_path5.default.join(import_env.PATHS.home, targetPath);
    const shimPath = import_path5.default.join(shimsDir, shimName);
    if (import_fs6.default.existsSync(fullTarget)) {
      createShim(shimPath, fullTarget);
      shims.push(shimName);
    }
  }
  if (!quiet) {
    if (shims.length > 0) {
      console.log(`   \u2713 ${shims.length} shims: ${shims.join(", ")}`);
    } else {
      console.log("   \u26A0 No shims (runtimes/binaries not installed)");
    }
  }
  return shims.length;
}
function createShim(shimPath, targetPath) {
  if (import_fs6.default.existsSync(shimPath)) {
    import_fs6.default.unlinkSync(shimPath);
  }
  import_fs6.default.symlinkSync(targetPath, shimPath);
}

// src/commands/update.js
var import_fs8 = __toESM(require("fs"), 1);
var import_path6 = __toESM(require("path"), 1);
var import_child_process3 = require("child_process");
var import_env2 = require("@learnrudi/env");
var import_registry_client2 = require("@learnrudi/registry-client");
async function cmdUpdate(args, flags) {
  const pkgId = args[0];
  if (!pkgId) {
    return updateAll(flags);
  }
  const fullId = pkgId.includes(":") ? pkgId : `runtime:${pkgId}`;
  try {
    const result = await updatePackage(fullId, flags);
    if (result.success) {
      console.log(`Updated ${fullId}${result.version ? ` to v${result.version}` : ""}`);
    } else {
      console.error(`Failed to update ${fullId}: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Update failed: ${error.message}`);
    process.exit(1);
  }
}
async function updatePackage(pkgId, flags) {
  const [kind, name] = (0, import_env2.parsePackageId)(pkgId);
  const installPath = (0, import_env2.getPackagePath)(pkgId);
  if (!import_fs8.default.existsSync(installPath)) {
    return { success: false, error: "Package not installed" };
  }
  const pkg = await (0, import_registry_client2.getPackage)(pkgId);
  if (!pkg) {
    return { success: false, error: "Package not found in registry" };
  }
  console.log(`Updating ${pkgId}...`);
  if (pkg.npmPackage) {
    try {
      (0, import_child_process3.execSync)(`npm install ${pkg.npmPackage}@latest`, {
        cwd: installPath,
        stdio: flags.verbose ? "inherit" : "pipe"
      });
      const version = getInstalledVersion(installPath, pkg.npmPackage);
      updateRuntimeMetadata(installPath, { version, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      return { success: true, version };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  if (pkg.pipPackage) {
    try {
      const venvPip = import_path6.default.join(installPath, "venv", "bin", "pip");
      (0, import_child_process3.execSync)(`"${venvPip}" install --upgrade ${pkg.pipPackage}`, {
        stdio: flags.verbose ? "inherit" : "pipe"
      });
      const versionOutput = (0, import_child_process3.execSync)(`"${venvPip}" show ${pkg.pipPackage} | grep Version`, {
        encoding: "utf-8"
      });
      const version = versionOutput.split(":")[1]?.trim();
      updateRuntimeMetadata(installPath, { version, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      return { success: true, version };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  if (kind === "runtime" && !pkg.npmPackage && !pkg.pipPackage) {
    try {
      const { downloadRuntime: downloadRuntime2 } = await import("@learnrudi/registry-client");
      import_fs8.default.rmSync(installPath, { recursive: true, force: true });
      await downloadRuntime2(name, pkg.version || "latest", installPath, {
        onProgress: (p) => {
          if (flags.verbose) console.log(`  ${p.phase}...`);
        }
      });
      return { success: true, version: pkg.version };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Unknown package type" };
}
async function updateAll(flags) {
  console.log("Checking for updates...");
  const kinds = ["runtime", "stack", "prompt"];
  let updated = 0;
  let failed = 0;
  for (const kind of kinds) {
    const dir = kind === "runtime" ? import_env2.PATHS.runtimes : kind === "stack" ? import_env2.PATHS.stacks : import_env2.PATHS.prompts;
    if (!import_fs8.default.existsSync(dir)) continue;
    const entries = import_fs8.default.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const pkgId = `${kind}:${entry.name}`;
      const result = await updatePackage(pkgId, flags);
      if (result.success) {
        console.log(`  \u2713 ${pkgId}${result.version ? ` \u2192 v${result.version}` : ""}`);
        updated++;
      } else if (result.error !== "Package not found in registry") {
        console.log(`  \u2717 ${pkgId}: ${result.error}`);
        failed++;
      }
    }
  }
  console.log(`
Updated ${updated} package(s)${failed > 0 ? `, ${failed} failed` : ""}`);
}
function getInstalledVersion(installPath, npmPackage) {
  try {
    const pkgJsonPath = import_path6.default.join(installPath, "node_modules", npmPackage.replace("@", "").split("/")[0], "package.json");
    if (import_fs8.default.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(import_fs8.default.readFileSync(pkgJsonPath, "utf-8"));
      return pkgJson.version;
    }
    const rootPkgPath = import_path6.default.join(installPath, "package.json");
    if (import_fs8.default.existsSync(rootPkgPath)) {
      const rootPkg = JSON.parse(import_fs8.default.readFileSync(rootPkgPath, "utf-8"));
      const dep = rootPkg.dependencies?.[npmPackage];
      if (dep) return dep.replace(/[\^~]/, "");
    }
  } catch {
  }
  return null;
}
function updateRuntimeMetadata(installPath, updates) {
  const metaPath = import_path6.default.join(installPath, "runtime.json");
  try {
    let meta = {};
    if (import_fs8.default.existsSync(metaPath)) {
      meta = JSON.parse(import_fs8.default.readFileSync(metaPath, "utf-8"));
    }
    meta = { ...meta, ...updates };
    import_fs8.default.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch {
  }
}

// src/commands/logs.js
var import_logs = require("@learnrudi/db/logs");
var import_fs9 = __toESM(require("fs"), 1);
function parseTimeAgo(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const [, num, unit] = match;
  const value = parseInt(num);
  const multipliers = {
    s: 1e3,
    m: 60 * 1e3,
    h: 60 * 60 * 1e3,
    d: 24 * 60 * 60 * 1e3
  };
  return value * multipliers[unit];
}
function parseTimestamp(str) {
  if (!str) return null;
  const relative = parseTimeAgo(str);
  if (relative) {
    return Date.now() - relative;
  }
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }
  return null;
}
function formatTimestamp(ts) {
  const date = new Date(ts);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
function formatLogEvent(event, options = {}) {
  const { verbose = false, json = false } = options;
  if (json) {
    const parsed2 = JSON.parse(event.data_json);
    return JSON.stringify({
      timestamp: event.timestamp,
      source: event.source,
      level: event.level,
      type: event.type,
      ...parsed2
    });
  }
  const time = formatTimestamp(event.timestamp);
  const source = event.source.padEnd(10);
  const level = event.level.toUpperCase().padEnd(5);
  const parsed = JSON.parse(event.data_json);
  const message = parsed.message || parsed.channel || event.type;
  let output = `\x1B[90m${time}\x1B[0m \x1B[36m[${source}]\x1B[0m ${message}`;
  if (event.duration_ms) {
    output += ` \x1B[33m(${event.duration_ms}ms)\x1B[0m`;
  }
  if (verbose) {
    output += `
  Type: ${event.type}`;
    if (event.provider) output += ` | Provider: ${event.provider}`;
    if (event.cid) output += ` | CID: ${event.cid}`;
  }
  return output;
}
function exportLogs(logs, filepath, format) {
  let content;
  switch (format) {
    case "ndjson":
      content = logs.map((e) => {
        const parsed = JSON.parse(e.data_json);
        return JSON.stringify({
          timestamp: e.timestamp,
          source: e.source,
          level: e.level,
          type: e.type,
          ...parsed
        });
      }).join("\n");
      break;
    case "csv":
      const headers = "timestamp,source,level,type,message,duration_ms\n";
      const rows = logs.map((e) => {
        const parsed = JSON.parse(e.data_json);
        const message = (parsed.message || parsed.channel || e.type).replace(/"/g, '""');
        return `${e.timestamp},${e.source},${e.level},${e.type},"${message}",${e.duration_ms || ""}`;
      }).join("\n");
      content = headers + rows;
      break;
    case "json":
    default:
      const formatted = logs.map((e) => {
        const parsed = JSON.parse(e.data_json);
        return {
          timestamp: e.timestamp,
          source: e.source,
          level: e.level,
          type: e.type,
          ...parsed
        };
      });
      content = JSON.stringify(formatted, null, 2);
  }
  import_fs9.default.writeFileSync(filepath, content, "utf-8");
  return filepath;
}
function printStats(stats) {
  console.log("\n\x1B[1mLog Statistics\x1B[0m\n");
  console.log(`Total events: ${stats.total}`);
  if (Object.keys(stats.bySource).length > 0) {
    console.log("\n\x1B[1mBy Source:\x1B[0m");
    Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
      console.log(`  ${source.padEnd(15)} ${count} events`);
    });
  }
  if (Object.keys(stats.byLevel).length > 0) {
    console.log("\n\x1B[1mBy Level:\x1B[0m");
    const levelColors = {
      error: "\x1B[31m",
      warn: "\x1B[33m",
      info: "\x1B[36m",
      debug: "\x1B[90m"
    };
    Object.entries(stats.byLevel).forEach(([level, count]) => {
      const color = levelColors[level] || "";
      console.log(`  ${color}${level.padEnd(8)}\x1B[0m ${count} events`);
    });
  }
  if (Object.keys(stats.byProvider).length > 0) {
    console.log("\n\x1B[1mBy Provider:\x1B[0m");
    Object.entries(stats.byProvider).sort((a, b) => b[1] - a[1]).forEach(([provider, count]) => {
      console.log(`  ${provider.padEnd(12)} ${count} events`);
    });
  }
  if (stats.slowest.length > 0) {
    console.log("\n\x1B[1mSlowest Operations:\x1B[0m");
    stats.slowest.forEach((op, i) => {
      console.log(`  ${i + 1}. ${op.operation.padEnd(30)} ${op.avgMs}ms avg (${op.count} calls, max: ${op.maxMs}ms)`);
    });
  }
  console.log("");
}
async function handleLogsCommand(args, flags) {
  const {
    limit,
    last,
    since,
    until,
    filter,
    source,
    level,
    type,
    provider,
    "session-id": sessionId,
    "terminal-id": terminalId,
    "slow-only": slowOnly,
    "slow-threshold": slowThreshold,
    "before-crash": beforeCrash,
    stats,
    export: exportPath,
    format = "json",
    verbose,
    json
  } = flags;
  if (stats) {
    const options2 = {};
    if (last) options2.since = Date.now() - parseTimeAgo(last);
    if (since) options2.since = parseTimestamp(since);
    if (until) options2.until = parseTimestamp(until);
    if (filter) options2.search = filter;
    const statsData = (0, import_logs.getLogStats)(options2);
    printStats(statsData);
    return;
  }
  const options = {
    limit: parseInt(limit) || 50,
    source,
    level,
    type,
    provider,
    sessionId,
    terminalId: terminalId ? parseInt(terminalId) : void 0,
    slowOnly: !!slowOnly,
    slowThreshold: slowThreshold ? parseInt(slowThreshold) : 1e3
  };
  if (beforeCrash) {
    const crashLogs = (0, import_logs.getBeforeCrashLogs)();
    console.log(`
\x1B[33mLast ${crashLogs.length} events before crash:\x1B[0m
`);
    crashLogs.forEach((e) => console.log(formatLogEvent(e, { verbose, json })));
    return;
  }
  if (last) {
    options.since = Date.now() - parseTimeAgo(last);
  }
  if (since) {
    options.since = parseTimestamp(since);
  }
  if (until) {
    options.until = parseTimestamp(until);
  }
  if (filter) {
    if (Array.isArray(filter)) {
      options.search = filter.join(" ");
    } else {
      options.search = filter;
    }
  }
  const logs = (0, import_logs.queryLogs)(options);
  if (exportPath) {
    const filepath = exportLogs(logs, exportPath, format);
    console.log(`
\u2705 Exported ${logs.length} logs to: ${filepath}
`);
    return;
  }
  if (logs.length === 0) {
    console.log("\nNo logs found matching filters.\n");
    return;
  }
  console.log(`
\x1B[90mShowing ${logs.length} logs:\x1B[0m
`);
  logs.forEach((e) => console.log(formatLogEvent(e, { verbose, json })));
  console.log("");
}

// src/commands/which.js
var fs8 = __toESM(require("fs/promises"), 1);
var path6 = __toESM(require("path"), 1);
var import_child_process4 = require("child_process");
var import_core8 = require("@learnrudi/core");
var import_env3 = require("@learnrudi/env");
async function cmdWhich(args, flags) {
  const stackId = args[0];
  if (!stackId) {
    console.error("Usage: rudi which <stack-id>");
    console.error("Example: rudi which google-workspace");
    process.exit(1);
  }
  try {
    const packages = await (0, import_core8.listInstalled)("stack");
    const stack = packages.find((p) => {
      const pId = p.id || "";
      const pName = p.name || "";
      if (pId === stackId || pId === `stack:${stackId}`) return true;
      if (pName === stackId || pName === `stack:${stackId}`) return true;
      if (pId.replace("stack:", "") === stackId) return true;
      return false;
    });
    if (!stack) {
      console.error(`Stack not found: ${stackId}`);
      console.error(`
Installed stacks:`);
      packages.forEach((p) => console.error(`  - ${p.id}`));
      process.exit(1);
    }
    const stackPath = stack.path;
    const runtimeInfo = await detectRuntime(stackPath);
    const authStatus = await checkAuth(stackPath, runtimeInfo.runtime);
    const isRunning = checkIfRunning(stack.name || stack.id.replace("stack:", ""));
    console.log("");
    console.log("\u2550".repeat(60));
    console.log(`  ${stack.name || stack.id}`);
    console.log("\u2550".repeat(60));
    console.log("");
    console.log(`Stack:      ${stack.id}`);
    console.log(`Version:    ${stack.version || "unknown"}`);
    if (stack.description) {
      console.log(`About:      ${stack.description}`);
    }
    console.log("");
    console.log(`Runtime:    ${runtimeInfo.runtime || "unknown"}`);
    console.log(`Path:       ${stackPath}`);
    if (runtimeInfo.entry) {
      console.log(`Entry:      ${runtimeInfo.entry}`);
    }
    console.log("");
    const authIcon = authStatus.configured ? "\u2713" : "\u2717";
    const authColor = authStatus.configured ? "\x1B[32m" : "\x1B[31m";
    const resetColor = "\x1B[0m";
    console.log(`Auth:       ${authColor}${authIcon}${resetColor} ${authStatus.message}`);
    if (authStatus.files.length > 0) {
      authStatus.files.forEach((file) => {
        console.log(`            - ${file}`);
      });
    }
    console.log("");
    const runIcon = isRunning ? "\u2713" : "\u25CB";
    const runColor = isRunning ? "\x1B[32m" : "\x1B[90m";
    const runStatus = isRunning ? "Running" : "Not running";
    console.log(`Status:     ${runColor}${runIcon}${resetColor} ${runStatus}`);
    console.log("");
    console.log("Commands:");
    console.log(`  rudi run ${stack.id}          Test the stack`);
    console.log(`  rudi secrets ${stack.id}      Configure secrets`);
    if (runtimeInfo.entry) {
      console.log("");
      console.log("Run MCP server directly:");
      const entryPath = path6.join(stackPath, runtimeInfo.entry);
      if (runtimeInfo.runtime === "node") {
        console.log(`  echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node ${entryPath}`);
      } else if (runtimeInfo.runtime === "python") {
        console.log(`  echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | python3 ${entryPath}`);
      }
    }
    console.log("");
  } catch (error) {
    console.error(`Failed to get stack info: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
async function detectRuntime(stackPath) {
  const runtimes = ["node", "python"];
  for (const runtime of runtimes) {
    const runtimePath = path6.join(stackPath, runtime);
    try {
      await fs8.access(runtimePath);
      if (runtime === "node") {
        const distEntry = path6.join(runtimePath, "dist", "index.js");
        const srcEntry = path6.join(runtimePath, "src", "index.ts");
        try {
          await fs8.access(distEntry);
          return { runtime: "node", entry: `${runtime}/dist/index.js` };
        } catch {
          try {
            await fs8.access(srcEntry);
            return { runtime: "node", entry: `${runtime}/src/index.ts` };
          } catch {
            return { runtime: "node", entry: null };
          }
        }
      } else if (runtime === "python") {
        const entry = path6.join(runtimePath, "src", "index.py");
        try {
          await fs8.access(entry);
          return { runtime: "python", entry: `${runtime}/src/index.py` };
        } catch {
          return { runtime: "python", entry: null };
        }
      }
    } catch {
      continue;
    }
  }
  return { runtime: null, entry: null };
}
async function checkAuth(stackPath, runtime) {
  const authFiles = [];
  let configured = false;
  if (runtime === "node" || runtime === "python") {
    const runtimePath = path6.join(stackPath, runtime);
    const tokenPath = path6.join(runtimePath, "token.json");
    try {
      await fs8.access(tokenPath);
      authFiles.push(`${runtime}/token.json`);
      configured = true;
    } catch {
      const accountsPath = path6.join(runtimePath, "accounts");
      try {
        const accounts = await fs8.readdir(accountsPath);
        for (const account of accounts) {
          if (account.startsWith(".")) continue;
          const accountTokenPath = path6.join(accountsPath, account, "token.json");
          try {
            await fs8.access(accountTokenPath);
            authFiles.push(`${runtime}/accounts/${account}/token.json`);
            configured = true;
          } catch {
          }
        }
      } catch {
      }
    }
  }
  const envPath = path6.join(stackPath, ".env");
  try {
    const envContent = await fs8.readFile(envPath, "utf-8");
    const hasValues = envContent.split("\n").some((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return false;
      const [key, value] = trimmed.split("=");
      return value && value.trim() && !value.includes("YOUR_") && !value.includes("your_");
    });
    if (hasValues) {
      authFiles.push(".env");
      configured = true;
    }
  } catch {
  }
  if (configured) {
    return {
      configured: true,
      message: "Configured",
      files: authFiles
    };
  } else {
    return {
      configured: false,
      message: "Not configured",
      files: []
    };
  }
}
function checkIfRunning(stackName) {
  try {
    const result = (0, import_child_process4.execSync)(`ps aux | grep "${stackName}" | grep -v grep || true`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"]
      // Suppress stderr
    });
    const lines = result.trim().split("\n").filter((line) => {
      return line && line.includes("index.ts") || line.includes("index.js") || line.includes("index.py");
    });
    return lines.length > 0;
  } catch {
    return false;
  }
}

// src/commands/auth.js
var fs9 = __toESM(require("fs/promises"), 1);
var path7 = __toESM(require("path"), 1);
var import_child_process5 = require("child_process");
var import_core9 = require("@learnrudi/core");
var import_env4 = require("@learnrudi/env");
var net = __toESM(require("net"), 1);
async function findAvailablePort(basePort = 3456) {
  for (let port = basePort; port < basePort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${basePort}-${basePort + 10}`);
}
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}
async function detectRuntime2(stackPath) {
  const runtimes = ["node", "python"];
  for (const runtime of runtimes) {
    const runtimePath = path7.join(stackPath, runtime);
    try {
      await fs9.access(runtimePath);
      if (runtime === "node") {
        const authTs = path7.join(runtimePath, "src", "auth.ts");
        const authJs = path7.join(runtimePath, "dist", "auth.js");
        try {
          await fs9.access(authTs);
          return { runtime: "node", authScript: authTs, useTsx: true };
        } catch {
          try {
            await fs9.access(authJs);
            return { runtime: "node", authScript: authJs, useTsx: false };
          } catch {
          }
        }
      } else if (runtime === "python") {
        const authPy = path7.join(runtimePath, "src", "auth.py");
        try {
          await fs9.access(authPy);
          return { runtime: "python", authScript: authPy, useTsx: false };
        } catch {
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}
async function cmdAuth(args, flags) {
  const stackId = args[0];
  const accountEmail = args[1];
  if (!stackId) {
    console.error("Usage: rudi auth <stack-id> [account-email]");
    console.error("Example: rudi auth google-workspace user@gmail.com");
    process.exit(1);
  }
  try {
    const packages = await (0, import_core9.listInstalled)("stack");
    const stack = packages.find((p) => {
      const pId = p.id || "";
      const pName = p.name || "";
      return pId === stackId || pId === `stack:${stackId}` || pName === stackId;
    });
    if (!stack) {
      console.error(`Stack not found: ${stackId}`);
      console.error(`
Installed stacks:`);
      packages.forEach((p) => console.error(`  - ${p.id}`));
      process.exit(1);
    }
    const stackPath = stack.path;
    const authInfo = await detectRuntime2(stackPath);
    if (!authInfo) {
      console.error(`No authentication script found for ${stackId}`);
      console.error(`This stack may not support OAuth authentication.`);
      process.exit(1);
    }
    console.log("");
    console.log("\u2550".repeat(60));
    console.log(`  Authenticating ${stack.name || stackId}`);
    console.log("\u2550".repeat(60));
    console.log("");
    console.log("Finding available port for OAuth callback...");
    const port = await findAvailablePort(3456);
    console.log(`Using port: ${port}`);
    console.log("");
    let cmd;
    const cwd = path7.dirname(authInfo.authScript);
    if (authInfo.runtime === "node") {
      const distAuth = path7.join(cwd, "..", "dist", "auth.js");
      let useBuiltInPort = false;
      let tempAuthScript = null;
      try {
        await fs9.access(distAuth);
        const distContent = await fs9.readFile(distAuth, "utf-8");
        if (distContent.includes("findAvailablePort")) {
          console.log("Using compiled authentication script...");
          cmd = `node ${distAuth}${accountEmail ? ` ${accountEmail}` : ""}`;
          useBuiltInPort = true;
        }
      } catch {
      }
      if (!useBuiltInPort) {
        const authContent = await fs9.readFile(authInfo.authScript, "utf-8");
        const tempExt = authInfo.useTsx ? ".ts" : ".mjs";
        tempAuthScript = path7.join(cwd, "..", `auth-temp${tempExt}`);
        const modifiedContent = authContent.replace(/localhost:3456/g, `localhost:${port}`).replace(/server\.listen\(3456/g, `server.listen(${port}`);
        await fs9.writeFile(tempAuthScript, modifiedContent);
        if (authInfo.useTsx) {
          cmd = `npx tsx ${tempAuthScript}${accountEmail ? ` ${accountEmail}` : ""}`;
        } else {
          cmd = `node ${tempAuthScript}${accountEmail ? ` ${accountEmail}` : ""}`;
        }
      }
      console.log("Starting OAuth flow...");
      console.log("");
      try {
        (0, import_child_process5.execSync)(cmd, {
          cwd,
          stdio: "inherit"
        });
        if (tempAuthScript) {
          await fs9.unlink(tempAuthScript);
        }
      } catch (error) {
        if (tempAuthScript) {
          try {
            await fs9.unlink(tempAuthScript);
          } catch {
          }
        }
        throw error;
      }
    } else if (authInfo.runtime === "python") {
      cmd = `python3 ${authInfo.authScript}${accountEmail ? ` ${accountEmail}` : ""}`;
      console.log("Starting OAuth flow...");
      console.log("");
      (0, import_child_process5.execSync)(cmd, {
        cwd,
        stdio: "inherit",
        env: {
          ...process.env,
          OAUTH_PORT: port.toString()
        }
      });
    }
    console.log("");
    console.log("\u2713 Authentication complete!");
    console.log("");
  } catch (error) {
    console.error(`Authentication failed: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// src/commands/mcp.js
var fs10 = __toESM(require("fs"), 1);
var path8 = __toESM(require("path"), 1);
var import_child_process6 = require("child_process");
var import_env5 = require("@learnrudi/env");
var import_secrets3 = require("@learnrudi/secrets");
function getBundledRuntime(runtime) {
  const platform = process.platform;
  if (runtime === "node") {
    const nodePath = platform === "win32" ? path8.join(import_env5.PATHS.runtimes, "node", "node.exe") : path8.join(import_env5.PATHS.runtimes, "node", "bin", "node");
    if (fs10.existsSync(nodePath)) {
      return nodePath;
    }
  }
  if (runtime === "python") {
    const pythonPath = platform === "win32" ? path8.join(import_env5.PATHS.runtimes, "python", "python.exe") : path8.join(import_env5.PATHS.runtimes, "python", "bin", "python3");
    if (fs10.existsSync(pythonPath)) {
      return pythonPath;
    }
  }
  return null;
}
function getBundledNpx() {
  const platform = process.platform;
  const npxPath = platform === "win32" ? path8.join(import_env5.PATHS.runtimes, "node", "npx.cmd") : path8.join(import_env5.PATHS.runtimes, "node", "bin", "npx");
  if (fs10.existsSync(npxPath)) {
    return npxPath;
  }
  return null;
}
function loadManifest2(stackPath) {
  const manifestPath = path8.join(stackPath, "manifest.json");
  if (!fs10.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs10.readFileSync(manifestPath, "utf-8"));
}
function getRequiredSecrets(manifest) {
  const secrets = manifest?.requires?.secrets || manifest?.secrets || [];
  return secrets.map((s) => ({
    name: typeof s === "string" ? s : s.name || s.key,
    required: typeof s === "object" ? s.required !== false : true
  }));
}
async function buildEnv(manifest) {
  const env = { ...process.env };
  const requiredSecrets = getRequiredSecrets(manifest);
  const missing = [];
  for (const secret of requiredSecrets) {
    const value = await (0, import_secrets3.getSecret)(secret.name);
    if (value) {
      env[secret.name] = value;
    } else if (secret.required) {
      missing.push(secret.name);
    }
  }
  return { env, missing };
}
async function cmdMcp(args, flags) {
  const stackName = args[0];
  if (!stackName) {
    console.error("Usage: rudi mcp <stack>");
    console.error("");
    console.error("This command is typically called by agent shims, not directly.");
    console.error("");
    console.error("Example: rudi mcp slack");
    process.exit(1);
  }
  const stackPath = path8.join(import_env5.PATHS.stacks, stackName);
  if (!fs10.existsSync(stackPath)) {
    console.error(`Stack not found: ${stackName}`);
    console.error(`Expected at: ${stackPath}`);
    console.error("");
    console.error(`Install with: rudi install ${stackName}`);
    process.exit(1);
  }
  const manifest = loadManifest2(stackPath);
  if (!manifest) {
    console.error(`No manifest.json found in stack: ${stackName}`);
    process.exit(1);
  }
  const { env, missing } = await buildEnv(manifest);
  if (missing.length > 0 && !flags.force) {
    console.error(`Missing required secrets for ${stackName}:`);
    for (const name of missing) {
      console.error(`  - ${name}`);
    }
    console.error("");
    console.error(`Set with: rudi secrets set ${missing[0]}`);
    process.exit(1);
  }
  let command = manifest.command;
  if (!command || command.length === 0) {
    if (manifest.mcp?.command) {
      const mcpCmd = manifest.mcp.command;
      const mcpArgs = manifest.mcp.args || [];
      command = [mcpCmd, ...mcpArgs];
    }
  }
  if (!command || command.length === 0) {
    console.error(`No command defined in manifest for: ${stackName}`);
    process.exit(1);
  }
  const runtime = manifest.runtime || manifest.mcp?.runtime || "node";
  const resolvedCommand = command.map((part, i) => {
    if (i === 0) {
      if (part === "node") {
        const bundledNode = getBundledRuntime("node");
        if (bundledNode) return bundledNode;
      } else if (part === "npx") {
        const bundledNpx = getBundledNpx();
        if (bundledNpx) return bundledNpx;
      } else if (part === "python" || part === "python3") {
        const bundledPython = getBundledRuntime("python");
        if (bundledPython) return bundledPython;
      }
      return part;
    }
    if (part.startsWith("./") || part.startsWith("../") || !path8.isAbsolute(part)) {
      const resolved = path8.join(stackPath, part);
      if (fs10.existsSync(resolved)) {
        return resolved;
      }
    }
    return part;
  });
  const [cmd, ...cmdArgs] = resolvedCommand;
  const bundledNodeBin = path8.join(import_env5.PATHS.runtimes, "node", "bin");
  const bundledPythonBin = path8.join(import_env5.PATHS.runtimes, "python", "bin");
  if (fs10.existsSync(bundledNodeBin) || fs10.existsSync(bundledPythonBin)) {
    const runtimePaths = [];
    if (fs10.existsSync(bundledNodeBin)) runtimePaths.push(bundledNodeBin);
    if (fs10.existsSync(bundledPythonBin)) runtimePaths.push(bundledPythonBin);
    env.PATH = runtimePaths.join(path8.delimiter) + path8.delimiter + (env.PATH || "");
  }
  if (flags.debug) {
    console.error(`[rudi mcp] Stack: ${stackName}`);
    console.error(`[rudi mcp] Path: ${stackPath}`);
    console.error(`[rudi mcp] Runtime: ${runtime}`);
    console.error(`[rudi mcp] Command: ${cmd} ${cmdArgs.join(" ")}`);
    console.error(`[rudi mcp] Secrets loaded: ${getRequiredSecrets(manifest).length - missing.length}`);
    if (getBundledRuntime(runtime)) {
      console.error(`[rudi mcp] Using bundled ${runtime} runtime`);
    } else {
      console.error(`[rudi mcp] Using system ${runtime} (no bundled runtime found)`);
    }
  }
  const child = (0, import_child_process6.spawn)(cmd, cmdArgs, {
    cwd: stackPath,
    env,
    stdio: "inherit"
    // MCP uses stdio for communication
  });
  child.on("error", (err) => {
    console.error(`Failed to start MCP server: ${err.message}`);
    process.exit(1);
  });
  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

// src/commands/integrate.js
var fs11 = __toESM(require("fs"), 1);
var path9 = __toESM(require("path"), 1);
var import_os2 = __toESM(require("os"), 1);
var import_env6 = require("@learnrudi/env");
var import_mcp4 = require("@learnrudi/mcp");
var HOME = import_os2.default.homedir();
var ROUTER_SHIM_PATH = path9.join(import_env6.PATHS.home, "shims", "rudi-router");
function checkRouterShim() {
  if (!fs11.existsSync(ROUTER_SHIM_PATH)) {
    throw new Error(
      `Router shim not found at ${ROUTER_SHIM_PATH}
Run: npm install -g @learnrudi/cli@latest`
    );
  }
  return ROUTER_SHIM_PATH;
}
function backupConfig(configPath) {
  if (!fs11.existsSync(configPath)) return null;
  const backupPath = configPath + ".backup." + Date.now();
  fs11.copyFileSync(configPath, backupPath);
  return backupPath;
}
function readJsonConfig(configPath) {
  if (!fs11.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs11.readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}
function writeJsonConfig(configPath, config) {
  const dir = path9.dirname(configPath);
  if (!fs11.existsSync(dir)) {
    fs11.mkdirSync(dir, { recursive: true });
  }
  fs11.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
function buildRouterEntry(agentId) {
  const base = {
    command: ROUTER_SHIM_PATH,
    args: []
  };
  if (agentId === "claude-desktop" || agentId === "claude-code") {
    return { type: "stdio", ...base };
  }
  return base;
}
async function integrateAgent(agentId, flags) {
  const agentConfig = import_mcp4.AGENT_CONFIGS.find((a) => a.id === agentId);
  if (!agentConfig) {
    console.error(`Unknown agent: ${agentId}`);
    return { success: false, error: "Unknown agent" };
  }
  const configPath = (0, import_mcp4.findAgentConfig)(agentConfig);
  const targetPath = configPath || path9.join(HOME, agentConfig.paths[process.platform]?.[0] || agentConfig.paths.darwin[0]);
  console.log(`
${agentConfig.name}:`);
  console.log(`  Config: ${targetPath}`);
  if (fs11.existsSync(targetPath)) {
    const backup = backupConfig(targetPath);
    if (backup && flags.verbose) {
      console.log(`  Backup: ${backup}`);
    }
  }
  const config = readJsonConfig(targetPath);
  const key = agentConfig.key;
  if (!config[key]) {
    config[key] = {};
  }
  const rudiMcpShimPath = path9.join(import_env6.PATHS.home, "shims", "rudi-mcp");
  const removedEntries = [];
  for (const [serverName, serverConfig] of Object.entries(config[key])) {
    if (serverConfig.command === rudiMcpShimPath) {
      delete config[key][serverName];
      removedEntries.push(serverName);
    }
  }
  if (removedEntries.length > 0) {
    console.log(`  Removed old entries: ${removedEntries.join(", ")}`);
  }
  const routerEntry = buildRouterEntry(agentId);
  const existing = config[key]["rudi"];
  let action = "none";
  if (!existing) {
    config[key]["rudi"] = routerEntry;
    action = "added";
  } else if (existing.command !== routerEntry.command || JSON.stringify(existing.args) !== JSON.stringify(routerEntry.args)) {
    config[key]["rudi"] = routerEntry;
    action = "updated";
  }
  if (action !== "none" || removedEntries.length > 0) {
    writeJsonConfig(targetPath, config);
    if (action !== "none") {
      console.log(`  ${action === "added" ? "\u2713 Added" : "\u2713 Updated"} rudi router`);
    }
  } else {
    console.log(`  \u2713 Already configured`);
  }
  return { success: true, action, removed: removedEntries };
}
async function cmdIntegrate(args, flags) {
  const target = args[0];
  if (flags.list || target === "list") {
    const installed = (0, import_mcp4.getInstalledAgents)();
    console.log("\nDetected agents:");
    for (const agent of installed) {
      console.log(`  \u2713 ${agent.name}`);
      console.log(`    ${agent.configFile}`);
    }
    if (installed.length === 0) {
      console.log("  (none detected)");
    }
    return;
  }
  if (!target) {
    console.log(`
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
  codex        OpenAI Codex CLI
  zed          Zed Editor

OPTIONS
  --verbose    Show detailed output
  --dry-run    Show what would be done without making changes

EXAMPLES
  rudi integrate claude
  rudi integrate all
`);
    return;
  }
  try {
    checkRouterShim();
  } catch (err) {
    console.error(err.message);
    return;
  }
  console.log(`
Wiring up RUDI router...`);
  let targetAgents = [];
  if (target === "all") {
    targetAgents = (0, import_mcp4.getInstalledAgents)().map((a) => a.id);
    if (targetAgents.length === 0) {
      console.log("No agents detected.");
      return;
    }
  } else if (target === "claude") {
    targetAgents = ["claude-desktop", "claude-code"].filter((id) => {
      const agent = import_mcp4.AGENT_CONFIGS.find((a) => a.id === id);
      return agent && (0, import_mcp4.findAgentConfig)(agent);
    });
    if (targetAgents.length === 0) {
      targetAgents = ["claude-code"];
    }
  } else {
    const idMap = {
      "cursor": "cursor",
      "windsurf": "windsurf",
      "vscode": "vscode",
      "gemini": "gemini",
      "codex": "codex",
      "zed": "zed",
      "cline": "cline"
    };
    const agentId = idMap[target] || target;
    targetAgents = [agentId];
  }
  if (flags["dry-run"]) {
    console.log("\nDry run - would add RUDI router to:");
    for (const agentId of targetAgents) {
      const agent = import_mcp4.AGENT_CONFIGS.find((a) => a.id === agentId);
      console.log(`  ${agent?.name || agentId}`);
    }
    return;
  }
  const results = [];
  for (const agentId of targetAgents) {
    const result = await integrateAgent(agentId, flags);
    results.push({ agent: agentId, ...result });
  }
  const successful = results.filter((r) => r.success);
  console.log(`
\u2713 Integrated with ${successful.length} agent(s)`);
  console.log("\nRestart your agent(s) to access all installed stacks.");
  console.log("\nManage stacks:");
  console.log("  rudi install <stack>   # Install a new stack");
  console.log("  rudi index             # Rebuild tool cache");
}

// src/commands/migrate.js
var fs12 = __toESM(require("fs"), 1);
var path10 = __toESM(require("path"), 1);
var import_os3 = __toESM(require("os"), 1);
var import_env7 = require("@learnrudi/env");
var import_mcp5 = require("@learnrudi/mcp");
var HOME2 = import_os3.default.homedir();
var OLD_PROMPT_STACK = path10.join(HOME2, ".prompt-stack");
var SHIM_PATH = path10.join(import_env7.PATHS.home, "shims", "rudi-mcp");
function getOldStacks() {
  const stacksDir = path10.join(OLD_PROMPT_STACK, "stacks");
  if (!fs12.existsSync(stacksDir)) return [];
  return fs12.readdirSync(stacksDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).filter((d) => {
    const hasManifest = fs12.existsSync(path10.join(stacksDir, d.name, "manifest.json"));
    const hasPackage = fs12.existsSync(path10.join(stacksDir, d.name, "package.json"));
    return hasManifest || hasPackage;
  }).map((d) => d.name);
}
function copyStack(stackName) {
  const oldPath = path10.join(OLD_PROMPT_STACK, "stacks", stackName);
  const newPath = path10.join(import_env7.PATHS.stacks, stackName);
  if (!fs12.existsSync(oldPath)) {
    return { success: false, error: "Source not found" };
  }
  if (fs12.existsSync(newPath)) {
    return { success: true, skipped: true, reason: "Already exists" };
  }
  if (!fs12.existsSync(import_env7.PATHS.stacks)) {
    fs12.mkdirSync(import_env7.PATHS.stacks, { recursive: true });
  }
  copyRecursive(oldPath, newPath);
  return { success: true, copied: true };
}
function copyRecursive(src, dest) {
  const stat = fs12.statSync(src);
  if (stat.isDirectory()) {
    fs12.mkdirSync(dest, { recursive: true });
    for (const child of fs12.readdirSync(src)) {
      copyRecursive(path10.join(src, child), path10.join(dest, child));
    }
  } else {
    fs12.copyFileSync(src, dest);
  }
}
function ensureShim() {
  const shimsDir = path10.dirname(SHIM_PATH);
  if (!fs12.existsSync(shimsDir)) {
    fs12.mkdirSync(shimsDir, { recursive: true });
  }
  const shimContent = `#!/usr/bin/env bash
set -euo pipefail
if command -v rudi &> /dev/null; then
  exec rudi mcp "$1"
else
  exec npx --yes @learnrudi/cli mcp "$1"
fi
`;
  fs12.writeFileSync(SHIM_PATH, shimContent, { mode: 493 });
}
function buildNewEntry(stackName, agentId) {
  const base = {
    command: SHIM_PATH,
    args: [stackName]
  };
  if (agentId === "claude-desktop" || agentId === "claude-code") {
    return { type: "stdio", ...base };
  }
  return base;
}
function isOldEntry(entry) {
  if (!entry) return false;
  const command = entry.command || "";
  const args = entry.args || [];
  const cwd = entry.cwd || "";
  return command.includes(".prompt-stack") || args.some((a) => typeof a === "string" && a.includes(".prompt-stack")) || cwd.includes(".prompt-stack");
}
function migrateAgentConfig(agentConfig, installedStacks, flags) {
  const configPath = (0, import_mcp5.findAgentConfig)(agentConfig);
  if (!configPath) return { skipped: true, reason: "Config not found" };
  let config;
  try {
    config = JSON.parse(fs12.readFileSync(configPath, "utf-8"));
  } catch {
    return { skipped: true, reason: "Could not parse config" };
  }
  const key = agentConfig.key;
  const mcpServers = config[key] || {};
  let updated = 0;
  let removed = 0;
  const changes = [];
  for (const [name, entry] of Object.entries(mcpServers)) {
    if (isOldEntry(entry)) {
      if (installedStacks.includes(name)) {
        const newEntry = buildNewEntry(name, agentConfig.id);
        mcpServers[name] = newEntry;
        updated++;
        changes.push({ name, action: "updated" });
      } else if (flags.removeOrphans) {
        delete mcpServers[name];
        removed++;
        changes.push({ name, action: "removed (not installed)" });
      } else {
        changes.push({ name, action: "skipped (not installed in .rudi)" });
      }
    }
  }
  if (updated > 0 || removed > 0) {
    const backupPath = configPath + ".backup." + Date.now();
    fs12.copyFileSync(configPath, backupPath);
    config[key] = mcpServers;
    fs12.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  return { updated, removed, changes };
}
async function cmdMigrate(args, flags) {
  const subcommand = args[0];
  if (!subcommand || subcommand === "help") {
    console.log(`
rudi migrate - Migrate from .prompt-stack to .rudi

USAGE
  rudi migrate status         Show what needs to be migrated
  rudi migrate stacks         Copy stacks from .prompt-stack to .rudi
  rudi migrate configs        Update agent configs to use new shim
  rudi migrate all            Do everything

OPTIONS
  --remove-orphans    Remove entries for stacks not installed in .rudi
  --dry-run           Show what would be done without making changes
`);
    return;
  }
  if (subcommand === "status") {
    await migrateStatus();
    return;
  }
  if (subcommand === "stacks") {
    await migrateStacks(flags);
    return;
  }
  if (subcommand === "configs") {
    await migrateConfigs(flags);
    return;
  }
  if (subcommand === "all") {
    await migrateStacks(flags);
    console.log("");
    await migrateConfigs(flags);
    return;
  }
  console.error(`Unknown subcommand: ${subcommand}`);
  console.error("Run: rudi migrate help");
}
async function migrateStatus() {
  console.log("\n=== Migration Status ===\n");
  const oldStacks = getOldStacks();
  console.log(`Old .prompt-stack stacks: ${oldStacks.length}`);
  if (oldStacks.length > 0) {
    for (const name of oldStacks) {
      const existsInRudi = fs12.existsSync(path10.join(import_env7.PATHS.stacks, name));
      const status = existsInRudi ? "\u2713 (already in .rudi)" : "\u25CB (needs migration)";
      console.log(`  ${status} ${name}`);
    }
  }
  const newStacksDir = import_env7.PATHS.stacks;
  let newStacks = [];
  if (fs12.existsSync(newStacksDir)) {
    newStacks = fs12.readdirSync(newStacksDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name);
  }
  console.log(`
New .rudi stacks: ${newStacks.length}`);
  if (newStacks.length > 0) {
    for (const name of newStacks) {
      console.log(`  \u2713 ${name}`);
    }
  }
  console.log("\n=== Agent Configs ===\n");
  for (const agentConfig of import_mcp5.AGENT_CONFIGS) {
    const configPath = (0, import_mcp5.findAgentConfig)(agentConfig);
    if (!configPath) continue;
    let config;
    try {
      config = JSON.parse(fs12.readFileSync(configPath, "utf-8"));
    } catch {
      continue;
    }
    const mcpServers = config[agentConfig.key] || {};
    const entries = Object.entries(mcpServers);
    const oldEntries = entries.filter(([_, e]) => isOldEntry(e));
    const newEntries = entries.filter(([_, e]) => !isOldEntry(e));
    if (entries.length === 0) continue;
    console.log(`${agentConfig.name}:`);
    console.log(`  Config: ${configPath}`);
    console.log(`  Old entries: ${oldEntries.length}`);
    console.log(`  New entries: ${newEntries.length}`);
    if (oldEntries.length > 0) {
      console.log("  Needs update:");
      for (const [name] of oldEntries) {
        const installed = newStacks.includes(name);
        const status = installed ? "(ready)" : "(not in .rudi)";
        console.log(`    - ${name} ${status}`);
      }
    }
    console.log("");
  }
  console.log("Run: rudi migrate all");
}
async function migrateStacks(flags) {
  console.log("=== Migrating Stacks ===\n");
  const oldStacks = getOldStacks();
  if (oldStacks.length === 0) {
    console.log("No stacks found in .prompt-stack");
    return;
  }
  console.log(`Found ${oldStacks.length} stack(s) in .prompt-stack
`);
  for (const name of oldStacks) {
    if (flags.dryRun) {
      const exists = fs12.existsSync(path10.join(import_env7.PATHS.stacks, name));
      console.log(`  [dry-run] ${name}: ${exists ? "would skip (exists)" : "would copy"}`);
    } else {
      const result = copyStack(name);
      if (result.skipped) {
        console.log(`  \u25CB ${name}: skipped (${result.reason})`);
      } else if (result.copied) {
        console.log(`  \u2713 ${name}: copied to .rudi/stacks/`);
      } else {
        console.log(`  \u2717 ${name}: ${result.error}`);
      }
    }
  }
  if (!flags.dryRun) {
    console.log(`
Stacks migrated to: ${import_env7.PATHS.stacks}`);
  }
}
async function migrateConfigs(flags) {
  console.log("=== Updating Agent Configs ===\n");
  if (!flags.dryRun) {
    ensureShim();
    console.log(`Shim ready: ${SHIM_PATH}
`);
  }
  let installedStacks = [];
  if (fs12.existsSync(import_env7.PATHS.stacks)) {
    installedStacks = fs12.readdirSync(import_env7.PATHS.stacks, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name);
  }
  for (const agentConfig of import_mcp5.AGENT_CONFIGS) {
    const configPath = (0, import_mcp5.findAgentConfig)(agentConfig);
    if (!configPath) continue;
    if (flags.dryRun) {
      console.log(`${agentConfig.name}:`);
      console.log(`  [dry-run] Would update entries using .prompt-stack paths`);
      continue;
    }
    const result = migrateAgentConfig(agentConfig, installedStacks, flags);
    if (result.skipped) {
      continue;
    }
    console.log(`${agentConfig.name}:`);
    console.log(`  Config: ${configPath}`);
    if (result.changes && result.changes.length > 0) {
      for (const change of result.changes) {
        console.log(`    ${change.action}: ${change.name}`);
      }
    }
    if (result.updated > 0 || result.removed > 0) {
      console.log(`  Updated: ${result.updated}, Removed: ${result.removed}`);
    } else {
      console.log(`  No changes needed`);
    }
    console.log("");
  }
  console.log("Restart your agents to use the updated configs.");
}

// src/commands/index-tools.js
var import_core10 = require("@learnrudi/core");
var import_core11 = require("@learnrudi/core");
async function cmdIndex(args, flags) {
  const stackFilter = args.length > 0 ? args : null;
  const forceReindex = flags.force || false;
  const jsonOutput = flags.json || false;
  const config = (0, import_core11.readRudiConfig)();
  if (!config) {
    console.error("Error: rudi.json not found. Run `rudi doctor` to check setup.");
    process.exit(1);
  }
  const installedStacks = Object.keys(config.stacks || {}).filter(
    (id) => config.stacks[id].installed
  );
  if (installedStacks.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ indexed: 0, failed: 0, stacks: [] }));
    } else {
      console.log("No installed stacks to index.");
      console.log("\nInstall stacks with: rudi install <stack>");
    }
    return;
  }
  const stacksToIndex = stackFilter ? stackFilter.filter((id) => {
    if (!installedStacks.includes(id)) {
      if (!jsonOutput) {
        console.log(`\u26A0 Stack not installed: ${id}`);
      }
      return false;
    }
    return true;
  }) : installedStacks;
  if (stacksToIndex.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ indexed: 0, failed: 0, stacks: [] }));
    } else {
      console.log("No valid stacks to index.");
    }
    return;
  }
  const existingIndex = (0, import_core10.readToolIndex)();
  if (existingIndex && !forceReindex && !stackFilter) {
    const allCached = stacksToIndex.every((id) => {
      const entry = existingIndex.byStack?.[id];
      return entry && entry.tools && entry.tools.length > 0 && !entry.error;
    });
    if (allCached) {
      const totalTools = stacksToIndex.reduce((sum, id) => {
        return sum + (existingIndex.byStack[id]?.tools?.length || 0);
      }, 0);
      if (jsonOutput) {
        console.log(JSON.stringify({
          indexed: stacksToIndex.length,
          failed: 0,
          cached: true,
          totalTools,
          stacks: stacksToIndex.map((id) => ({
            id,
            tools: existingIndex.byStack[id]?.tools?.length || 0,
            indexedAt: existingIndex.byStack[id]?.indexedAt
          }))
        }));
      } else {
        console.log(`Tool index is up to date (${totalTools} tools from ${stacksToIndex.length} stacks)`);
        console.log(`Last updated: ${existingIndex.updatedAt}`);
        console.log(`
Use --force to re-index.`);
      }
      return;
    }
  }
  if (!jsonOutput) {
    console.log(`Indexing ${stacksToIndex.length} stack(s)...
`);
  }
  const log = jsonOutput ? () => {
  } : console.log;
  try {
    const result = await (0, import_core10.indexAllStacks)({
      stacks: stacksToIndex,
      log,
      timeout: 2e4
      // 20s per stack
    });
    const totalTools = Object.values(result.index.byStack).reduce(
      (sum, entry) => sum + (entry.tools?.length || 0),
      0
    );
    if (jsonOutput) {
      console.log(JSON.stringify({
        indexed: result.indexed,
        failed: result.failed,
        totalTools,
        stacks: stacksToIndex.map((id) => ({
          id,
          tools: result.index.byStack[id]?.tools?.length || 0,
          error: result.index.byStack[id]?.error || null,
          missingSecrets: result.index.byStack[id]?.missingSecrets || null
        }))
      }, null, 2));
    } else {
      console.log(`
${"\u2500".repeat(50)}`);
      console.log(`Indexed: ${result.indexed}/${stacksToIndex.length} stacks`);
      console.log(`Tools discovered: ${totalTools}`);
      console.log(`Cache: ${import_core10.TOOL_INDEX_PATH}`);
      if (result.failed > 0) {
        console.log(`
\u26A0 ${result.failed} stack(s) failed to index.`);
        const missingSecretStacks = Object.entries(result.index.byStack).filter(([_, entry]) => entry.missingSecrets?.length > 0);
        if (missingSecretStacks.length > 0) {
          console.log(`
Missing secrets:`);
          for (const [stackId, entry] of missingSecretStacks) {
            for (const secret of entry.missingSecrets) {
              console.log(`  rudi secrets set ${secret}`);
            }
          }
          console.log(`
After configuring secrets, run: rudi index`);
        }
      }
    }
  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: error.message }));
    } else {
      console.error(`Index failed: ${error.message}`);
    }
    process.exit(1);
  }
}

// src/commands/status.js
var import_core12 = require("@learnrudi/core");
var import_child_process7 = require("child_process");
var import_fs10 = __toESM(require("fs"), 1);
var import_path7 = __toESM(require("path"), 1);
var import_os4 = __toESM(require("os"), 1);
var AGENTS = [
  {
    id: "claude",
    name: "Claude Code",
    npmPackage: "@anthropic-ai/claude-code",
    credentialType: "keychain",
    keychainService: "Claude Code-credentials"
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    npmPackage: "@openai/codex",
    credentialType: "file",
    credentialPath: "~/.codex/auth.json"
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    npmPackage: "@google/gemini-cli",
    credentialType: "file",
    credentialPath: "~/.gemini/google_accounts.json"
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    npmPackage: "@githubnext/github-copilot-cli",
    credentialType: "file",
    credentialPath: "~/.config/github-copilot/hosts.json"
  }
];
var RUNTIMES = [
  { id: "node", name: "Node.js", command: "node", versionFlag: "--version" },
  { id: "python", name: "Python", command: "python3", versionFlag: "--version" },
  { id: "deno", name: "Deno", command: "deno", versionFlag: "--version" },
  { id: "bun", name: "Bun", command: "bun", versionFlag: "--version" }
];
var BINARIES = [
  { id: "ffmpeg", name: "FFmpeg", command: "ffmpeg", versionFlag: "-version" },
  { id: "ripgrep", name: "ripgrep", command: "rg", versionFlag: "--version" },
  { id: "git", name: "Git", command: "git", versionFlag: "--version" },
  { id: "pandoc", name: "Pandoc", command: "pandoc", versionFlag: "--version" },
  { id: "jq", name: "jq", command: "jq", versionFlag: "--version" }
];
function fileExists(filePath) {
  const resolved = filePath.replace("~", import_os4.default.homedir());
  return import_fs10.default.existsSync(resolved);
}
function checkKeychain(service) {
  if (process.platform !== "darwin") return false;
  try {
    (0, import_child_process7.execSync)(`security find-generic-password -s "${service}"`, {
      stdio: ["pipe", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}
function getVersion(command, versionFlag) {
  try {
    const output = (0, import_child_process7.execSync)(`${command} ${versionFlag} 2>&1`, {
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const match = output.match(/(\d+\.\d+\.?\d*)/);
    return match ? match[1] : output.trim().split("\n")[0].slice(0, 50);
  } catch {
    return null;
  }
}
function findBinary(command, kind = "binary") {
  const rudiPaths = [
    import_path7.default.join(import_core12.PATHS.agents, command, "node_modules", ".bin", command),
    import_path7.default.join(import_core12.PATHS.runtimes, command, "bin", command),
    import_path7.default.join(import_core12.PATHS.binaries, command, command),
    import_path7.default.join(import_core12.PATHS.binaries, command)
  ];
  for (const p of rudiPaths) {
    if (import_fs10.default.existsSync(p)) {
      return { found: true, path: p, source: "rudi" };
    }
  }
  try {
    const output = (0, import_child_process7.execSync)(`which ${command} 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 3e3
    });
    const globalPath = output.trim();
    if (globalPath) {
      return { found: true, path: globalPath, source: "global" };
    }
  } catch {
  }
  return { found: false, path: null, source: null };
}
function getAgentStatus(agent) {
  const rudiPath = import_path7.default.join(import_core12.PATHS.agents, agent.id, "node_modules", ".bin", agent.id);
  const rudiInstalled = import_fs10.default.existsSync(rudiPath);
  let globalPath = null;
  let globalInstalled = false;
  if (!rudiInstalled) {
    try {
      const which = (0, import_child_process7.execSync)(`which ${agent.id} 2>/dev/null`, { encoding: "utf-8" }).trim();
      if (which && !which.includes(".rudi/bins") && !which.includes(".rudi/shims")) {
        globalPath = which;
        globalInstalled = true;
      }
    } catch {
    }
  }
  const installed = rudiInstalled || globalInstalled;
  const activePath = rudiInstalled ? rudiPath : globalPath;
  const source = rudiInstalled ? "rudi" : globalInstalled ? "global" : null;
  let authenticated = false;
  if (agent.credentialType === "keychain") {
    authenticated = checkKeychain(agent.keychainService);
  } else if (agent.credentialType === "file") {
    authenticated = fileExists(agent.credentialPath);
  }
  let version = null;
  if (installed && activePath) {
    version = getVersion(activePath, "--version");
  }
  return {
    id: agent.id,
    name: agent.name,
    installed,
    source,
    // 'rudi' | 'global' | null
    authenticated,
    version,
    path: activePath,
    ready: installed && authenticated
  };
}
function getRuntimeStatus(runtime) {
  const location = findBinary(runtime.command, "runtime");
  const version = location.found ? getVersion(location.path, runtime.versionFlag) : null;
  return {
    id: runtime.id,
    name: runtime.name,
    installed: location.found,
    version,
    path: location.path,
    source: location.source
  };
}
function getBinaryStatus(binary) {
  const location = findBinary(binary.command, "binary");
  const version = location.found ? getVersion(location.path, binary.versionFlag) : null;
  return {
    id: binary.id,
    name: binary.name,
    installed: location.found,
    version,
    path: location.path,
    source: location.source
  };
}
async function getFullStatus() {
  const agents = AGENTS.map(getAgentStatus);
  const runtimes = RUNTIMES.map(getRuntimeStatus);
  const binaries = BINARIES.map(getBinaryStatus);
  let stacks = [];
  let prompts = [];
  try {
    stacks = (0, import_core12.getInstalledPackages)("stack").map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version
    }));
    prompts = (0, import_core12.getInstalledPackages)("prompt").map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category
    }));
  } catch {
  }
  const directories = {
    home: { path: import_core12.PATHS.home, exists: import_fs10.default.existsSync(import_core12.PATHS.home) },
    stacks: { path: import_core12.PATHS.stacks, exists: import_fs10.default.existsSync(import_core12.PATHS.stacks) },
    agents: { path: import_core12.PATHS.agents, exists: import_fs10.default.existsSync(import_core12.PATHS.agents) },
    runtimes: { path: import_core12.PATHS.runtimes, exists: import_fs10.default.existsSync(import_core12.PATHS.runtimes) },
    binaries: { path: import_core12.PATHS.binaries, exists: import_fs10.default.existsSync(import_core12.PATHS.binaries) },
    db: { path: import_core12.PATHS.db, exists: import_fs10.default.existsSync(import_core12.PATHS.db) }
  };
  const summary = {
    agentsInstalled: agents.filter((a) => a.installed).length,
    agentsReady: agents.filter((a) => a.ready).length,
    agentsTotal: agents.length,
    runtimesInstalled: runtimes.filter((r) => r.installed).length,
    runtimesTotal: runtimes.length,
    binariesInstalled: binaries.filter((b) => b.installed).length,
    binariesTotal: binaries.length,
    stacksInstalled: stacks.length,
    promptsInstalled: prompts.length
  };
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    platform: `${process.platform}-${process.arch}`,
    rudiHome: import_core12.PATHS.home,
    summary,
    agents,
    runtimes,
    binaries,
    stacks,
    prompts,
    directories
  };
}
function printStatus(status, filter) {
  console.log("RUDI Status");
  console.log("=".repeat(50));
  console.log(`Platform: ${status.platform}`);
  console.log(`RUDI Home: ${status.rudiHome}`);
  console.log("");
  if (!filter || filter === "agents") {
    console.log(`AGENTS (${status.summary.agentsReady}/${status.summary.agentsTotal} ready)`);
    console.log("-".repeat(50));
    for (const agent of status.agents) {
      const installIcon = agent.installed ? "\x1B[32m\u2713\x1B[0m" : "\x1B[31m\u2717\x1B[0m";
      const version = agent.version ? `v${agent.version}` : "";
      const source = agent.source ? `(${agent.source})` : "";
      console.log(`  ${installIcon} ${agent.name} ${version} ${source}`);
      console.log(`    Installed: ${agent.installed ? "yes" : "no"}, Auth: ${agent.authenticated ? "yes" : "no"}, Ready: ${agent.ready ? "yes" : "no"}`);
    }
    console.log("");
  }
  if (!filter || filter === "runtimes") {
    console.log(`RUNTIMES (${status.summary.runtimesInstalled}/${status.summary.runtimesTotal})`);
    console.log("-".repeat(50));
    for (const rt of status.runtimes) {
      const icon = rt.installed ? "\x1B[32m\u2713\x1B[0m" : "\x1B[90m\u25CB\x1B[0m";
      const version = rt.version ? `v${rt.version}` : "";
      const source = rt.source ? `(${rt.source})` : "";
      console.log(`  ${icon} ${rt.name} ${version} ${source}`);
    }
    console.log("");
  }
  if (!filter || filter === "binaries") {
    console.log(`BINARIES (${status.summary.binariesInstalled}/${status.summary.binariesTotal})`);
    console.log("-".repeat(50));
    for (const bin of status.binaries) {
      const icon = bin.installed ? "\x1B[32m\u2713\x1B[0m" : "\x1B[90m\u25CB\x1B[0m";
      const version = bin.version ? `v${bin.version}` : "";
      const source = bin.source ? `(${bin.source})` : "";
      console.log(`  ${icon} ${bin.name} ${version} ${source}`);
    }
    console.log("");
  }
  if (!filter || filter === "stacks") {
    console.log(`STACKS (${status.summary.stacksInstalled})`);
    console.log("-".repeat(50));
    if (status.stacks.length === 0) {
      console.log("  No stacks installed");
    } else {
      for (const stack of status.stacks) {
        console.log(`  ${stack.id} v${stack.version || "?"}`);
      }
    }
    console.log("");
  }
  console.log("SUMMARY");
  console.log("-".repeat(50));
  console.log(`  Agents ready: ${status.summary.agentsReady}/${status.summary.agentsTotal}`);
  console.log(`  Runtimes: ${status.summary.runtimesInstalled}/${status.summary.runtimesTotal}`);
  console.log(`  Binaries: ${status.summary.binariesInstalled}/${status.summary.binariesTotal}`);
  console.log(`  Stacks: ${status.summary.stacksInstalled}`);
  console.log(`  Prompts: ${status.summary.promptsInstalled}`);
}
async function cmdStatus(args, flags) {
  const filter = args[0];
  const status = await getFullStatus();
  if (flags.json) {
    if (filter) {
      const filtered = {
        timestamp: status.timestamp,
        platform: status.platform,
        [filter]: status[filter]
      };
      console.log(JSON.stringify(filtered, null, 2));
    } else {
      console.log(JSON.stringify(status, null, 2));
    }
  } else {
    printStatus(status, filter);
  }
}

// src/commands/check.js
var import_core13 = require("@learnrudi/core");
var import_child_process8 = require("child_process");
var import_fs11 = __toESM(require("fs"), 1);
var import_path8 = __toESM(require("path"), 1);
var import_os5 = __toESM(require("os"), 1);
var AGENT_CREDENTIALS = {
  claude: { type: "keychain", service: "Claude Code-credentials" },
  codex: { type: "file", path: "~/.codex/auth.json" },
  gemini: { type: "file", path: "~/.gemini/google_accounts.json" },
  copilot: { type: "file", path: "~/.config/github-copilot/hosts.json" }
};
function fileExists2(filePath) {
  const resolved = filePath.replace("~", import_os5.default.homedir());
  return import_fs11.default.existsSync(resolved);
}
function checkKeychain2(service) {
  if (process.platform !== "darwin") return false;
  try {
    (0, import_child_process8.execSync)(`security find-generic-password -s "${service}"`, {
      stdio: ["pipe", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}
function getVersion2(binaryPath, versionFlag = "--version") {
  try {
    const output = (0, import_child_process8.execSync)(`"${binaryPath}" ${versionFlag} 2>&1`, {
      encoding: "utf-8",
      timeout: 5e3
    });
    const match = output.match(/(\d+\.\d+\.?\d*)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
function detectKindFromFilesystem(name) {
  const agentPath = import_path8.default.join(import_core13.PATHS.agents, name, "node_modules", ".bin", name);
  if (import_fs11.default.existsSync(agentPath)) return "agent";
  const runtimePath = import_path8.default.join(import_core13.PATHS.runtimes, name, "bin", name);
  if (import_fs11.default.existsSync(runtimePath)) return "runtime";
  const binaryPath = import_path8.default.join(import_core13.PATHS.binaries, name, name);
  const binaryPath2 = import_path8.default.join(import_core13.PATHS.binaries, name);
  if (import_fs11.default.existsSync(binaryPath) || import_fs11.default.existsSync(binaryPath2)) return "binary";
  const stackPath = import_path8.default.join(import_core13.PATHS.stacks, name);
  if (import_fs11.default.existsSync(stackPath)) return "stack";
  try {
    const globalPath = (0, import_child_process8.execSync)(`which ${name} 2>/dev/null`, { encoding: "utf-8" }).trim();
    if (globalPath) {
      if (globalPath.includes("/node") || globalPath.includes("/python") || globalPath.includes("/deno") || globalPath.includes("/bun")) {
        return "runtime";
      }
      return "binary";
    }
  } catch {
  }
  return "stack";
}
async function cmdCheck(args, flags) {
  const packageId = args[0];
  if (!packageId) {
    console.error("Usage: rudi check <package-id>");
    console.error("Examples:");
    console.error("  rudi check agent:claude");
    console.error("  rudi check runtime:python");
    console.error("  rudi check binary:ffmpeg");
    console.error("  rudi check stack:slack");
    process.exit(1);
  }
  let kind, name;
  if (packageId.includes(":")) {
    [kind, name] = packageId.split(":");
  } else {
    name = packageId;
    kind = detectKindFromFilesystem(name);
  }
  const result = {
    id: `${kind}:${name}`,
    kind,
    name,
    installed: false,
    source: null,
    // 'rudi' | 'global' | null
    authenticated: null,
    // Only for agents
    ready: false,
    path: null,
    version: null
  };
  switch (kind) {
    case "agent": {
      const rudiPath = import_path8.default.join(import_core13.PATHS.agents, name, "node_modules", ".bin", name);
      const rudiInstalled = import_fs11.default.existsSync(rudiPath);
      let globalPath = null;
      let globalInstalled = false;
      if (!rudiInstalled) {
        try {
          const which = (0, import_child_process8.execSync)(`which ${name} 2>/dev/null`, { encoding: "utf-8" }).trim();
          if (which && !which.includes(".rudi/bins") && !which.includes(".rudi/shims")) {
            globalPath = which;
            globalInstalled = true;
          }
        } catch {
        }
      }
      result.installed = rudiInstalled || globalInstalled;
      result.path = rudiInstalled ? rudiPath : globalPath;
      result.source = rudiInstalled ? "rudi" : globalInstalled ? "global" : null;
      if (result.installed && result.path) {
        result.version = getVersion2(result.path);
      }
      const cred = AGENT_CREDENTIALS[name];
      if (cred) {
        if (cred.type === "keychain") {
          result.authenticated = checkKeychain2(cred.service);
        } else if (cred.type === "file") {
          result.authenticated = fileExists2(cred.path);
        }
      }
      result.ready = result.installed && result.authenticated;
      break;
    }
    case "runtime": {
      const rudiPath = import_path8.default.join(import_core13.PATHS.runtimes, name, "bin", name);
      if (import_fs11.default.existsSync(rudiPath)) {
        result.installed = true;
        result.path = rudiPath;
        result.version = getVersion2(rudiPath);
      } else {
        try {
          const globalPath = (0, import_child_process8.execSync)(`which ${name} 2>/dev/null`, { encoding: "utf-8" }).trim();
          if (globalPath) {
            result.installed = true;
            result.path = globalPath;
            result.version = getVersion2(globalPath);
          }
        } catch {
        }
      }
      result.ready = result.installed;
      break;
    }
    case "binary": {
      const rudiPath = import_path8.default.join(import_core13.PATHS.binaries, name, name);
      if (import_fs11.default.existsSync(rudiPath)) {
        result.installed = true;
        result.path = rudiPath;
      } else {
        try {
          const globalPath = (0, import_child_process8.execSync)(`which ${name} 2>/dev/null`, { encoding: "utf-8" }).trim();
          if (globalPath) {
            result.installed = true;
            result.path = globalPath;
          }
        } catch {
        }
      }
      result.ready = result.installed;
      break;
    }
    case "stack": {
      result.installed = (0, import_core13.isPackageInstalled)(`stack:${name}`);
      if (result.installed) {
        result.path = (0, import_core13.getPackagePath)(`stack:${name}`);
      }
      result.ready = result.installed;
      break;
    }
    default:
      console.error(`Unknown package kind: ${kind}`);
      process.exit(1);
  }
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const installIcon = result.installed ? "\x1B[32m\u2713\x1B[0m" : "\x1B[31m\u2717\x1B[0m";
    const source = result.source ? `(${result.source})` : "";
    console.log(`${installIcon} ${result.id} ${source}`);
    console.log(`  Installed: ${result.installed}`);
    if (result.source) console.log(`  Source: ${result.source}`);
    if (result.path) console.log(`  Path: ${result.path}`);
    if (result.version) console.log(`  Version: ${result.version}`);
    if (result.authenticated !== null) {
      console.log(`  Authenticated: ${result.authenticated}`);
    }
    console.log(`  Ready: ${result.ready}`);
  }
  if (!result.installed) {
    process.exit(1);
  } else if (result.authenticated === false) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// src/index.js
var VERSION = "2.0.0";
async function main() {
  const { command, args, flags } = (0, import_args2.parseArgs)(process.argv.slice(2));
  if (flags.version || flags.v) {
    (0, import_help.printVersion)(VERSION);
    process.exit(0);
  }
  if (flags.help || flags.h) {
    (0, import_help.printHelp)();
    process.exit(0);
  }
  try {
    switch (command) {
      case "search":
        await cmdSearch(args, flags);
        break;
      case "install":
      case "i":
      case "add":
        await cmdInstall(args, flags);
        break;
      case "run":
      case "exec":
        await cmdRun(args, flags);
        break;
      case "list":
      case "ls":
        await cmdList(args, flags);
        break;
      case "remove":
      case "rm":
      case "uninstall":
        await cmdRemove(args, flags);
        break;
      case "secrets":
      case "secret":
        await cmdSecrets(args, flags);
        break;
      case "db":
      case "database":
        await cmdDb(args, flags);
        break;
      case "import":
        await cmdImport(args, flags);
        break;
      case "doctor":
        await cmdDoctor(args, flags);
        break;
      case "init":
      case "bootstrap":
      case "setup":
        await cmdInit(args, flags);
        break;
      case "update":
      case "upgrade":
        await cmdUpdate(args, flags);
        break;
      case "logs":
        await handleLogsCommand(args, flags);
        break;
      case "which":
      case "info":
      case "show":
        await cmdWhich(args, flags);
        break;
      case "auth":
      case "authenticate":
      case "login":
        await cmdAuth(args, flags);
        break;
      case "mcp":
        await cmdMcp(args, flags);
        break;
      case "integrate":
        await cmdIntegrate(args, flags);
        break;
      case "migrate":
        await cmdMigrate(args, flags);
        break;
      case "index":
        await cmdIndex(args, flags);
        break;
      case "home":
        await cmdHome(args, flags);
        break;
      case "status":
        await cmdStatus(args, flags);
        break;
      case "check":
        await cmdCheck(args, flags);
        break;
      // Shortcuts for listing specific package types
      case "stacks":
        await cmdList(["stacks"], flags);
        break;
      case "prompts":
        await cmdList(["prompts"], flags);
        break;
      case "runtimes":
        await cmdList(["runtimes"], flags);
        break;
      case "binaries":
      case "bins":
      case "tools":
        await cmdList(["binaries"], flags);
        break;
      case "agents":
        await cmdList(["agents"], flags);
        break;
      case "help":
        (0, import_help.printHelp)(args[0]);
        break;
      case "version":
        (0, import_help.printVersion)(VERSION);
        break;
      default:
        if (!command) {
          (0, import_help.printHelp)();
        } else {
          console.error(`Unknown command: ${command}`);
          console.error(`Run 'rudi help' for usage`);
          process.exit(1);
        }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
main();
