#!/usr/bin/env node

// Vendored from the RUDI SWE Operating Manual capability tools for portable CI.

/**
 * agent-debt-scan.js
 *
 * Two-layer architecture:
 *   1. buildGraph(repoRoot, graphRoot, config)
 *   2. runChecks(graph, query)
 *
 * Design rules:
 * - Build the graph from a full, explicit root.
 * - Report only inside the selected scope.
 * - Keep strict checks deterministic.
 * - Keep noisy heuristics opt-in.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { createRequire } = require("module");

const argv = process.argv.slice(2);

function hasFlag(name) {
  return argv.includes(name);
}

function readFlagValues(name) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === name && index < argv.length - 1) {
      values.push(argv[index + 1]);
      index += 1;
    }
  }
  return values;
}

function readFlagValue(name) {
  const values = readFlagValues(name);
  return values.length > 0 ? values[values.length - 1] : null;
}

function parseInteger(raw, label) {
  if (raw === null || raw === undefined) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function parseArgs() {
  const provided = new Set(argv.filter((arg) => arg.startsWith("--")));
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      const previous = index > 0 ? argv[index - 1] : null;
      if (!previous || !previous.startsWith("--")) {
        positional.push(arg);
      }
    }
  }

  return {
    provided,
    json: hasFlag("--json"),
    verbose: hasFlag("--verbose"),
    heuristics: hasFlag("--heuristics"),
    initConfig: hasFlag("--init-config"),
    help: hasFlag("--help"),
    repo: readFlagValue("--repo") || positional[0] || null,
    graphRoot: readFlagValue("--graph-root"),
    scope: readFlagValue("--scope"),
    profile: readFlagValue("--profile"),
    config: readFlagValue("--config"),
    layer: readFlagValue("--layer"),
    ask: readFlagValue("--ask"),
    include: readFlagValues("--include"),
    exclude: readFlagValues("--exclude"),
    ignore: readFlagValues("--ignore"),
    checks: readFlagValues("--check").flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean),
    entrypoints: readFlagValues("--entrypoint"),
    files: readFlagValue("--files")
      ? readFlagValue("--files").split(",").map((value) => value.trim()).filter(Boolean)
      : null,
    changedSince: readFlagValue("--changed-since"),
    severity: readFlagValue("--severity") || "info",
    maxLines: parseInteger(readFlagValue("--max-lines"), "--max-lines"),
    maxImports: parseInteger(readFlagValue("--max-imports"), "--max-imports"),
    maxFunctions: parseInteger(readFlagValue("--max-functions"), "--max-functions"),
    maxDeps: parseInteger(readFlagValue("--max-deps"), "--max-deps"),
    deprecatedImports: readFlagValues("--deprecated-import"),
    canonicalImports: Object.fromEntries(
      readFlagValues("--canonical-import").flatMap((pair) => {
        const separator = pair.indexOf("=");
        if (separator <= 0) return [];
        return [[pair.slice(0, separator), pair.slice(separator + 1)]];
      })
    ),
  };
}

function printHelpAndExit() {
  console.log(`Usage:
  node agent-debt-scan.js --repo /path/to/repo [options]

Core options:
  --repo <path>                 Repository root
  --graph-root <path>           Root for graph construction (default: "src")
  --scope <path>                Report scope (default: graph root)
  --profile <name>              Named profile from config
  --config <path>               Config path (default: agent-debt.config.json or .debt-scan.json in repo root)
  --check <name[,name...]>      Repeatable check selector
  --include <regex>             Repeatable include filter
  --exclude <regex>             Repeatable exclude filter
  --layer <name>                Restrict results to one classified layer
  --entrypoint <path|glob>      Repeatable reachability root
  --changed-since <git-ref>     Restrict reporting to changed files and direct importers
  --files <comma,list>          Restrict reporting to explicit files
  --ask <question>              Alias over structured checks

Thresholds:
  --max-lines <n>
  --max-imports <n>
  --max-functions <n>
  --max-deps <n>

Output:
  --severity <info|warning|error>
  --json
  --heuristics
  --verbose
  --init-config`);
  process.exit(0);
}

function defaultConfig() {
  return {
    entrypoints: ["src/index.ts", "src/app.ts", "index.ts", "server.ts", "main.ts"],
    testPatterns: [".test.", ".spec.", "__tests__", "__mocks__"],
    fixturePatterns: ["__fixtures__", "fixtures"],
    ignore: ["node_modules", ".git", "dist", "build"],
    allowedShims: [],
    publicAPI: [],
    layerMatchers: {
      routes: "(^|/)routes?/",
      controllers: "(^|/)controllers?/",
      services: "(^|/)services?/",
      repositories: "(^|/)repositor(y|ies)/",
      adapters: "(^|/)adapters?/",
      clients: "(^|/)clients?/",
      middleware: "(^|/)middleware/",
      tools: "(^|/)tools?/",
      models: "(^|/)models?/",
      utils: "(^|/)(utils?|helpers?|lib)/",
      config: "(^|/)config/",
      types: "(^|/)types?/",
      test: "\\.(test|spec)\\.|(^|/)(__tests__|__mocks__)/"
    },
    layerOrder: {
      routes: 6,
      controllers: 5,
      middleware: 5,
      services: 4,
      adapters: 3,
      clients: 3,
      repositories: 2,
      models: 1,
      utils: 1,
      config: 1,
      types: 0,
      tools: 4,
      test: -1,
      unknown: 0
    },
    boundaryRules: [
      ["routes", "controllers"],
      ["routes", "services"],
      ["controllers", "services"],
      ["services", "repositories"],
      ["services", "adapters"],
      ["services", "clients"],
      ["adapters", "clients"]
    ],
    deprecatedImports: [],
    canonicalImports: {},
    thresholds: {
      maxLines: null,
      maxImports: null,
      maxFunctions: null,
      maxDeps: null
    },
    loggingPatterns: ["console.log(", "console.debug(", "console.warn(", "console.error("],
    dbAccessPatterns: ["pool.query(", "client.query("],
    dbAccessAllowlist: [],
    routeValidationIndicators: ["zod", "validate(", "validateRequest", "validateParams", "validateQuery", "validateBody"],
    routeValidationLayers: ["routes", "controllers"],
    legacyExportPatterns: ["legacy", "compat", "deprecated"],
    allowlists: {
      orphans: { paths: [] },
      logging: { paths: [] },
      largeFiles: { paths: [] },
      directDb: { paths: [] }
    },
    profiles: {}
  };
}

function loadJsonWithComments(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const cleaned = raw
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(cleaned);
}

function deepMerge(base, override) {
  if (!override) return base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function loadConfig(repoRoot, explicitPath) {
  const candidates = explicitPath
    ? [path.resolve(explicitPath)]
    : [
        path.join(repoRoot, "agent-debt.config.json"),
        path.join(repoRoot, ".debt-scan.json"),
        path.join(repoRoot, ".debt-scan.jsonc"),
      ];

  let config = defaultConfig();
  let configPath = null;

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const loaded = loadJsonWithComments(candidate);
    if (!loaded) continue;

    let merged = loaded;
    if (loaded.extends) {
      const basePath = path.resolve(path.dirname(candidate), loaded.extends);
      const baseConfig = loadJsonWithComments(basePath);
      if (baseConfig) {
        const { extends: _ignored, ...local } = loaded;
        merged = deepMerge(baseConfig, local);
      }
    }

    config = deepMerge(config, merged);
    configPath = candidate;
    break;
  }

  return { config, configPath };
}

function compileRegexes(values, label) {
  return values.map((value) => {
    try {
      return new RegExp(value);
    } catch (error) {
      throw new Error(`${label} contains invalid regex "${value}": ${error.message}`);
    }
  });
}

function relativePath(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function pathGlobToRegex(pattern) {
  const normalized = pattern.replace(/\\/g, "/");
  const escaped = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§§DOUBLESTAR§§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§DOUBLESTAR§§/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesPathPattern(repoRoot, filePath, pattern, graphRoot) {
  const relative = relativePath(repoRoot, filePath);
  const graphRelative = relativePath(graphRoot, filePath);
  if (pattern.includes("*")) {
    const regex = pathGlobToRegex(pattern);
    return regex.test(relative) || regex.test(graphRelative);
  }

  if (pattern.includes("/")) {
    return relative === pattern || graphRelative === pattern;
  }

  const basename = path.basename(filePath);
  if (basename !== pattern) return false;
  const parent = path.dirname(graphRelative);
  return parent === "." || parent === "";
}

function resolveRepoPath(repoRoot, rawPath, fallback = null) {
  const chosen = rawPath || fallback;
  if (!chosen) return null;
  return path.resolve(repoRoot, chosen);
}

function resolveAsk(question) {
  if (!question) return { checks: [], scope: null, description: null };
  const normalized = question.toLowerCase();
  const rules = [
    { patterns: ["oversized", "large file", "large files", "too big"], checks: ["large-files"] },
    { patterns: ["deprecated import", "legacy import"], checks: ["deprecated-imports", "canonical-imports"] },
    { patterns: ["canonical import", "canonical path"], checks: ["canonical-imports"] },
    { patterns: ["orphan", "unused", "dead code"], checks: ["orphans"] },
    { patterns: ["boundary", "layer violation", "bypass"], checks: ["boundaries", "direct-db-access"] },
    { patterns: ["console", "logging", "debug log"], checks: ["logging"] },
    { patterns: ["validation", "missing validation", "unvalidated"], checks: ["missing-validation"] },
    { patterns: ["barrel", "re-export"], checks: ["barrel-legacy-exports"] },
  ];

  const scopeMatch = normalized.match(/(?:in|inside|within|under)\s+([a-z0-9_./-]+)/i);
  const scope = scopeMatch ? scopeMatch[1] : null;

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => normalized.includes(pattern))) {
      return { checks: rule.checks, scope, description: rule.patterns[0] };
    }
  }

  return { checks: [], scope, description: "all" };
}

function resolveEffectiveOptions(parsedArgs, config) {
  const profile = parsedArgs.profile ? config.profiles?.[parsedArgs.profile] || null : null;
  if (parsedArgs.profile && !profile) {
    throw new Error(`Unknown profile "${parsedArgs.profile}".`);
  }

  const ask = resolveAsk(parsedArgs.ask);

  function choose(flagName, fallbackValue) {
    return parsedArgs.provided.has(flagName) ? parsedArgs[flagName.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] : fallbackValue;
  }

  const graphRoot = parsedArgs.provided.has("--graph-root")
    ? parsedArgs.graphRoot
    : profile?.graphRoot || "src";
  const scope = parsedArgs.provided.has("--scope")
    ? parsedArgs.scope
    : parsedArgs.scope || ask.scope || profile?.scope || graphRoot;
  const layer = parsedArgs.provided.has("--layer")
    ? parsedArgs.layer
    : profile?.layer || null;

  const checks = parsedArgs.checks.length > 0
    ? parsedArgs.checks
    : ask.checks.length > 0
      ? ask.checks
      : profile?.checks || ["orphans", "shims", "boundaries", "deprecated-imports", "canonical-imports"];

  const include = parsedArgs.include.length > 0
    ? parsedArgs.include
    : profile?.include || [];
  const exclude = parsedArgs.exclude.length > 0
    ? parsedArgs.exclude
    : profile?.exclude || [];
  const ignore = parsedArgs.ignore.length > 0
    ? parsedArgs.ignore
    : profile?.ignore || [];

  const thresholds = {
    maxLines: parsedArgs.maxLines !== null ? parsedArgs.maxLines : profile?.thresholds?.maxLines ?? config.thresholds?.maxLines ?? null,
    maxImports: parsedArgs.maxImports !== null ? parsedArgs.maxImports : profile?.thresholds?.maxImports ?? config.thresholds?.maxImports ?? null,
    maxFunctions: parsedArgs.maxFunctions !== null ? parsedArgs.maxFunctions : profile?.thresholds?.maxFunctions ?? config.thresholds?.maxFunctions ?? null,
    maxDeps: parsedArgs.maxDeps !== null ? parsedArgs.maxDeps : profile?.thresholds?.maxDeps ?? config.thresholds?.maxDeps ?? null,
  };

  return {
    graphRoot,
    scope,
    layer,
    checks,
    include,
    exclude,
    ignore,
    entrypoints: parsedArgs.entrypoints.length > 0 ? parsedArgs.entrypoints : profile?.entrypoints || [],
    deprecatedImports: [...new Set([...(config.deprecatedImports || []), ...(profile?.deprecatedImports || []), ...parsedArgs.deprecatedImports])],
    canonicalImports: { ...(config.canonicalImports || {}), ...(profile?.canonicalImports || {}), ...parsedArgs.canonicalImports },
    severity: parsedArgs.severity,
    thresholds,
    files: parsedArgs.files,
    changedSince: parsedArgs.changedSince,
    heuristics: parsedArgs.heuristics,
    verbose: parsedArgs.verbose,
    json: parsedArgs.json,
  };
}

function isMissingModuleError(error, moduleName) {
  return (
    error &&
    error.code === "MODULE_NOT_FOUND" &&
    typeof error.message === "string" &&
    error.message.includes(`'${moduleName}'`)
  );
}

function loadTypeScript(repoRoot) {
  const candidates = [
    {
      label: "target repo",
      require: createRequire(path.join(repoRoot, "package.json")),
    },
    {
      label: "dev-help workspace",
      require: createRequire(__filename),
    },
  ];
  const failures = [];

  for (const candidate of candidates) {
    try {
      return candidate.require("typescript");
    } catch (error) {
      if (!isMissingModuleError(error, "typescript")) {
        throw error;
      }
      failures.push(candidate.label);
    }
  }

  throw new Error(
    `Unable to load "typescript" for scan target ${repoRoot}. ` +
      `Install it in the target repo or run "npm install" in ${path.dirname(__filename)}. ` +
      `Attempted resolution from: ${failures.join(", ")}.`
  );
}

function loadCompilerOptions(ts, repoRoot) {
  const configPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) return {};
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) return {};
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configPath));
  return parsed.options || {};
}

function discoverFiles(dir, excludeRegexes) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (excludeRegexes.some((regex) => regex.test(fullPath))) continue;

    if (entry.isDirectory()) {
      results.push(...discoverFiles(fullPath, excludeRegexes));
      continue;
    }

    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

function classifyLayer(filePath, layerMatchers) {
  const normalized = filePath.replace(/\\/g, "/");
  for (const [layer, pattern] of Object.entries(layerMatchers)) {
    if (new RegExp(pattern, "i").test(normalized)) {
      return layer;
    }
  }
  return "unknown";
}

function parseFileInfo(ts, filePath, layerMatchers) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const imports = [];
  const exportPaths = [];
  const functions = [];
  const runtimeExports = [];
  const typeExports = [];
  let hasRuntimeDeclaration = false;

  function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      exportPaths.push(node.moduleSpecifier.text);
    }
    if (ts.isExportAssignment(node)) {
      runtimeExports.push("default");
      hasRuntimeDeclaration = true;
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      functions.push(node.name.text);
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        runtimeExports.push(node.name.text);
      }
      hasRuntimeDeclaration = true;
    }
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        const name = declaration.name && declaration.name.text ? declaration.name.text : null;
        if (!name || !declaration.initializer) continue;
        if (
          ts.isArrowFunction(declaration.initializer) ||
          ts.isFunctionExpression(declaration.initializer)
        ) {
          functions.push(name);
          hasRuntimeDeclaration = true;
          if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
            runtimeExports.push(name);
          }
        }
      }
    }
    if (ts.isMethodDeclaration(node) && node.name && node.name.getText) {
      functions.push(node.name.getText(source));
      hasRuntimeDeclaration = true;
    }
    if (ts.isClassDeclaration(node) && node.name) {
      hasRuntimeDeclaration = true;
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        runtimeExports.push(node.name.text);
      }
    }
    if (ts.isEnumDeclaration(node) && node.name) {
      hasRuntimeDeclaration = true;
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        runtimeExports.push(node.name.text);
      }
    }
    if (ts.isInterfaceDeclaration(node) && node.name) {
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        typeExports.push(node.name.text);
      }
    }
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        typeExports.push(node.name.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);

  return {
    filePath,
    content,
    imports,
    exportPaths,
    functions: [...new Set(functions)],
    runtimeExports: [...new Set(runtimeExports)],
    typeExports: [...new Set(typeExports)],
    hasRuntimeDeclaration,
    lineCount: content.split(/\r?\n/).length,
    importCount: imports.length,
    dependencyCount: new Set(imports).size,
    layer: classifyLayer(filePath, layerMatchers),
  };
}

function resolveImport(ts, compilerOptions, importPath, fromFile) {
  const resolutionHost = ts.sys;
  const resolved = ts.resolveModuleName(importPath, fromFile, compilerOptions, resolutionHost).resolvedModule;
  return resolved?.resolvedFileName || null;
}

function buildGraph(repoRoot, graphRoot, config, ts) {
  const graphDir = path.resolve(repoRoot, graphRoot);
  const excludeRegexes = compileRegexes([
    ...(config.ignore || []),
  ], "ignore");

  const compilerOptions = loadCompilerOptions(ts, repoRoot);
  const allFiles = discoverFiles(graphDir, excludeRegexes);
  const fileInfoMap = new Map();
  const importGraph = new Map();
  const reverseGraph = new Map();

  for (const filePath of allFiles) {
    const info = parseFileInfo(ts, filePath, config.layerMatchers || {});
    if (!info) continue;
    fileInfoMap.set(filePath, info);
    importGraph.set(filePath, []);
    reverseGraph.set(filePath, []);
  }

  for (const [filePath, info] of fileInfoMap) {
    for (const imp of info.imports) {
      const resolved = resolveImport(ts, compilerOptions, imp, filePath);
      if (!resolved || !fileInfoMap.has(resolved)) continue;
      importGraph.get(filePath).push(resolved);
      reverseGraph.get(resolved).push(filePath);
    }
  }

  return {
    repoRoot,
    graphDir,
    fileInfoMap,
    importGraph,
    reverseGraph,
    compilerOptions,
  };
}

function matchesScope(filePath, scopeDir) {
  const relative = path.relative(scopeDir, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function buildPathFilters(repoRoot, effective) {
  const includeRegexes = compileRegexes(effective.include, "--include");
  const excludeRegexes = compileRegexes(effective.exclude, "--exclude");
  const changedFiles = effective.changedSince ? getChangedFiles(repoRoot, effective.changedSince) : null;
  const explicitFiles = effective.files
    ? new Set(effective.files.map((filePath) => path.resolve(repoRoot, filePath)))
    : null;

  return {
    includeRegexes,
    excludeRegexes,
    changedFiles,
    explicitFiles,
  };
}

function isReportedFile(graph, effective, filters, filePath) {
  const scopeDir = path.resolve(graph.repoRoot, effective.scope);
  if (!matchesScope(filePath, scopeDir)) return false;

  const relative = relativePath(graph.repoRoot, filePath);
  if (filters.includeRegexes.length > 0 && !filters.includeRegexes.some((regex) => regex.test(relative))) {
    return false;
  }
  if (filters.excludeRegexes.some((regex) => regex.test(relative))) {
    return false;
  }
  if (effective.layer) {
    const layer = graph.fileInfoMap.get(filePath)?.layer || "unknown";
    if (layer !== effective.layer) return false;
  }
  if (filters.explicitFiles && !filters.explicitFiles.has(filePath)) {
    return false;
  }
  return true;
}

function resolveEntrypointFiles(graph, config, effective) {
  const patterns = [...(effective.entrypoints || []), ...(config.publicAPI || []), ...(config.entrypoints || [])];
  const files = new Set();
  for (const filePath of graph.fileInfoMap.keys()) {
    if (patterns.some((pattern) => matchesPathPattern(graph.repoRoot, filePath, pattern, graph.graphDir))) {
      files.add(filePath);
    }
  }
  return files;
}

function computeReachableFiles(graph, rootFiles) {
  const reachable = new Set();
  const stack = [...rootFiles];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    for (const target of graph.importGraph.get(current) || []) {
      if (!reachable.has(target)) stack.push(target);
    }
  }

  return reachable;
}

function getChangedFiles(repoRoot, ref) {
  const result = spawnSync("git", ["diff", "--name-only", ref], {
    cwd: repoRoot,
    encoding: "utf-8",
    timeout: 10000,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `git diff failed for ref ${ref}`);
  }

  return new Set(
    result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => path.resolve(repoRoot, line))
  );
}

const SEVERITY_LEVELS = { info: 0, low: 0, warning: 1, medium: 1, error: 2, high: 2 };

function findLine(content, needle) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].includes(needle)) return index + 1;
  }
  return null;
}

function ownerArea(repoRoot, filePath) {
  return path.posix.dirname(relativePath(repoRoot, filePath));
}

function createFinding(repoRoot, fields) {
  return {
    check: fields.check,
    severity: fields.severity,
    file: relativePath(repoRoot, fields.file),
    line: fields.line ?? null,
    summary: fields.summary,
    why_it_matters: fields.why_it_matters,
    suggested_fix: fields.suggested_fix,
    owner_area: fields.owner_area || ownerArea(repoRoot, fields.file),
    details: fields.details || undefined,
  };
}

function allowlisted(filePath, patterns, repoRoot) {
  return (patterns || []).some((pattern) => matchesPathPattern(repoRoot, filePath, pattern, repoRoot));
}

function scanOrphans(graph, context) {
  return context.reportedFiles
    .filter((filePath) => {
      const info = graph.fileInfoMap.get(filePath);
      if (!info) return false;
      if (info.layer === "test") return false;
      if ((context.config.fixturePatterns || []).some((pattern) => filePath.includes(pattern))) return false;
      if (allowlisted(filePath, context.config.allowlists?.orphans?.paths, graph.repoRoot)) return false;
      if (matchesPathPattern(graph.repoRoot, filePath, "index.ts", graph.graphDir) && context.reachableFiles.has(filePath)) return false;
      return !context.reachableFiles.has(filePath);
    })
    .map((filePath) =>
      createFinding(graph.repoRoot, {
        check: "orphans",
        severity: "warning",
        file: filePath,
        summary: "File is not reachable from configured entrypoints.",
        why_it_matters: "Unreachable files usually indicate dead code, abandoned migrations, or missing explicit ownership.",
        suggested_fix: "Delete the file, add it to public API/entrypoint allowlists, or wire it into a real reachable path.",
      })
    );
}

function scanShims(graph, context) {
  return context.reportedFiles
    .filter((filePath) => {
      const info = graph.fileInfoMap.get(filePath);
      if (!info) return false;
      if (allowlisted(filePath, context.config.allowedShims, graph.repoRoot)) return false;
      if (allowlisted(filePath, context.config.publicAPI, graph.repoRoot)) return false;
      return info.runtimeExports.length > 0 && !info.hasRuntimeDeclaration;
    })
    .map((filePath) =>
      createFinding(graph.repoRoot, {
        check: "shims",
        severity: "info",
        file: filePath,
        summary: "Runtime-free export file looks like a compatibility shim.",
        why_it_matters: "Shims are transitional by nature and should be explicitly justified or removed.",
        suggested_fix: "Allowlist the shim, collapse it into the owning module, or delete it if no longer needed.",
      })
    );
}

function scanBoundaries(graph, context) {
  const allowed = new Set((context.config.boundaryRules || []).map(([from, to]) => `${from}->${to}`));
  const neutralLayers = new Set(["types", "utils", "config", "models"]);
  const allowlistedPaths = context.config.allowlists?.boundaries?.paths || [];

  return context.reportedFiles.flatMap((filePath) => {
    if (allowlisted(filePath, allowlistedPaths, graph.repoRoot)) return [];
    const info = graph.fileInfoMap.get(filePath);
    if (!info || info.layer === "unknown") return [];

    return (graph.importGraph.get(filePath) || []).flatMap((target) => {
      const targetInfo = graph.fileInfoMap.get(target);
      if (!targetInfo || targetInfo.layer === "unknown" || targetInfo.layer === info.layer) return [];
      if (neutralLayers.has(targetInfo.layer)) return [];
      if (info.layer === "routes" && targetInfo.layer === "middleware") return [];
      if (info.layer === "controllers" && targetInfo.layer === "middleware") return [];
      if (allowed.has(`${info.layer}->${targetInfo.layer}`)) return [];

      return [
        createFinding(graph.repoRoot, {
          check: "boundaries",
          severity: "error",
          file: filePath,
          line: findLine(info.content, relativePath(path.dirname(filePath), target)),
          summary: `${info.layer} imports ${targetInfo.layer}.`,
          why_it_matters: "Layer boundary violations hide ownership and make failures harder to localize.",
          suggested_fix: "Move the dependency behind an allowed boundary or update the declared architecture if the design intentionally changed.",
          details: {
            from_layer: info.layer,
            to_layer: targetInfo.layer,
            target: relativePath(graph.repoRoot, target),
          },
        }),
      ];
    });
  });
}

function scanDeprecatedImports(graph, context) {
  const deprecated = context.effective.deprecatedImports || [];
  return context.reportedFiles.flatMap((filePath) => {
    const info = graph.fileInfoMap.get(filePath);
    if (!info) return [];
    return info.imports.flatMap((imp) =>
      deprecated
        .filter((pattern) => imp.includes(pattern))
        .map((pattern) =>
          createFinding(graph.repoRoot, {
            check: "deprecated-imports",
            severity: "warning",
            file: filePath,
            line: findLine(info.content, imp),
            summary: `Import uses deprecated path ${imp}.`,
            why_it_matters: "Deprecated imports keep migration seams alive and block consolidation.",
            suggested_fix: "Replace the import with the configured canonical module path.",
            details: { import: imp, deprecated_pattern: pattern },
          })
        )
    );
  });
}

function scanCanonicalImports(graph, context) {
  const canonical = context.effective.canonicalImports || {};
  return context.reportedFiles.flatMap((filePath) => {
    const info = graph.fileInfoMap.get(filePath);
    if (!info) return [];
    return info.imports.flatMap((imp) => {
      if (!canonical[imp]) return [];
      return [
        createFinding(graph.repoRoot, {
          check: "canonical-imports",
          severity: "warning",
          file: filePath,
          line: findLine(info.content, imp),
          summary: `Import ${imp} has a canonical replacement.`,
          why_it_matters: "Non-canonical imports create duplicate dependency seams.",
          suggested_fix: `Replace ${imp} with ${canonical[imp]}.`,
          details: { import: imp, canonical: canonical[imp] },
        }),
      ];
    });
  });
}

function scanLogging(graph, context) {
  const patterns = context.config.loggingPatterns || [];
  return context.reportedFiles.flatMap((filePath) => {
    if (allowlisted(filePath, context.config.allowlists?.logging?.paths, graph.repoRoot)) return [];
    const info = graph.fileInfoMap.get(filePath);
    if (!info || info.layer === "test") return [];

    return patterns
      .filter((pattern) => info.content.includes(pattern))
      .map((pattern) =>
        createFinding(graph.repoRoot, {
          check: "logging",
          severity: "info",
          file: filePath,
          line: findLine(info.content, pattern),
          summary: `File uses ${pattern.replace("(", "")}.`,
          why_it_matters: "Bare console logging bypasses structured observability and log-level control.",
          suggested_fix: "Replace console output with the repo logger or explicitly allowlist this path if it is a CLI-only surface.",
          details: { match: pattern.trim() },
        })
      );
  });
}

function scanLargeFiles(graph, context) {
  const findings = [];
  for (const filePath of context.reportedFiles) {
    if (allowlisted(filePath, context.config.allowlists?.largeFiles?.paths, graph.repoRoot)) continue;
    const info = graph.fileInfoMap.get(filePath);
    if (!info) continue;

    const checks = [
      ["line_count", context.effective.thresholds.maxLines, info.lineCount, "lines"],
      ["import_count", context.effective.thresholds.maxImports, info.importCount, "imports"],
      ["function_count", context.effective.thresholds.maxFunctions, info.functions.length, "functions"],
      ["dependency_count", context.effective.thresholds.maxDeps, info.dependencyCount, "dependencies"],
    ];

    for (const [metric, threshold, actual, label] of checks) {
      if (threshold === null || actual <= threshold) continue;
      findings.push(
        createFinding(graph.repoRoot, {
          check: "large-files",
          severity: "warning",
          file: filePath,
          summary: `File has ${actual} ${label}, above threshold ${threshold}.`,
          why_it_matters: "Oversized modules hide mixed responsibilities and increase change risk.",
          suggested_fix: "Split the file along existing seams or extract focused helper modules.",
          details: { metric, actual, threshold },
        })
      );
    }
  }
  return findings;
}

function scanDirectDb(graph, context) {
  const patterns = context.config.dbAccessPatterns || [];
  return context.reportedFiles.flatMap((filePath) => {
    if (allowlisted(filePath, context.config.dbAccessAllowlist, graph.repoRoot)) return [];
    if (allowlisted(filePath, context.config.allowlists?.directDb?.paths, graph.repoRoot)) return [];
    const info = graph.fileInfoMap.get(filePath);
    if (!info || info.layer === "repositories" || info.layer === "test") return [];

    return patterns
      .filter((pattern) => info.content.includes(pattern))
      .map((pattern) =>
        createFinding(graph.repoRoot, {
          check: "direct-db-access",
          severity: "error",
          file: filePath,
          line: findLine(info.content, pattern),
          summary: `Direct database access found via ${pattern.trim()}.`,
          why_it_matters: "Direct DB access outside approved layers bypasses explicit data access boundaries.",
          suggested_fix: "Move the query behind the repository/service boundary or allowlist this file intentionally.",
          details: { match: pattern.trim() },
        })
      );
  });
}

function scanMissingValidation(graph, context) {
  const routeLayers = new Set(context.config.routeValidationLayers || []);
  const indicators = context.config.routeValidationIndicators || [];
  const allowlistedPaths = context.config.allowlists?.missingValidation?.paths || [];
  return context.reportedFiles.flatMap((filePath) => {
    if (allowlisted(filePath, allowlistedPaths, graph.repoRoot)) return [];
    const info = graph.fileInfoMap.get(filePath);
    if (!info || !routeLayers.has(info.layer)) return [];

    const looksLikeRoute =
      info.content.includes("router.") ||
      info.content.includes("app.") ||
      info.content.includes("Hono") ||
      info.content.includes(".get(") ||
      info.content.includes(".post(") ||
      info.content.includes(".put(") ||
      info.content.includes(".patch(") ||
      info.content.includes(".delete(");

    if (!looksLikeRoute) return [];
    if (indicators.some((indicator) => info.content.includes(indicator))) return [];

    return [
      createFinding(graph.repoRoot, {
        check: "missing-validation",
        severity: "warning",
        file: filePath,
        summary: "Route-like file has no configured validation indicator.",
        why_it_matters: "Boundary inputs should be validated explicitly so failure behavior is designed instead of discovered.",
        suggested_fix: "Add route-level request validation or extend the configured indicators if this repo uses a different validation wrapper.",
      }),
    ];
  });
}

function scanBarrelLegacyExports(graph, context) {
  const patterns = (context.config.legacyExportPatterns || []).map((value) => value.toLowerCase());
  return context.reportedFiles.flatMap((filePath) => {
    if (path.basename(filePath) !== "index.ts") return [];
    const info = graph.fileInfoMap.get(filePath);
    if (!info) return [];

    return info.exportPaths.flatMap((exportPath) => {
      const lowered = exportPath.toLowerCase();
      const matched = patterns.find((pattern) => lowered.includes(pattern));
      if (!matched) return [];
      return [
        createFinding(graph.repoRoot, {
          check: "barrel-legacy-exports",
          severity: "warning",
          file: filePath,
          line: findLine(info.content, exportPath),
          summary: `Barrel re-exports legacy-looking path ${exportPath}.`,
          why_it_matters: "Barrels can extend the life of deprecated surfaces even after local call sites are cleaned up.",
          suggested_fix: "Remove the legacy re-export or isolate it behind an explicitly documented compatibility barrel.",
          details: { export_path: exportPath, matched_pattern: matched },
        }),
      ];
    });
  });
}

function scanImportDrift(graph, context) {
  const occurrences = new Map();
  for (const filePath of context.reportedFiles) {
    const info = graph.fileInfoMap.get(filePath);
    if (!info) continue;
    for (const imp of info.imports) {
      if (!occurrences.has(imp)) occurrences.set(imp, []);
      occurrences.get(imp).push(relativePath(graph.repoRoot, filePath));
    }
  }

  return [...occurrences.entries()]
    .filter(([_, files]) => files.length > 3)
    .map(([imp, files]) => ({
      check: "import-drift",
      severity: "info",
      file: null,
      line: null,
      summary: `Import ${imp} appears in many files.`,
      why_it_matters: "Repeated imports can indicate a seam worth centralizing, but this is heuristic-only.",
      suggested_fix: "Review whether the dependency belongs behind a narrower façade.",
      owner_area: null,
      details: { import: imp, files },
    }));
}

function scanNamingDrift(graph, context) {
  const stems = new Map();
  for (const filePath of context.reportedFiles) {
    const info = graph.fileInfoMap.get(filePath);
    if (!info) continue;
    for (const fn of info.functions) {
      const stem = fn.replace(/^(get|fetch|load|create|update|delete)/, "");
      if (!stems.has(stem)) stems.set(stem, new Set());
      stems.get(stem).add(fn);
    }
  }

  return [...stems.entries()]
    .filter(([_, values]) => values.size > 1)
    .map(([stem, values]) => ({
      check: "naming-drift",
      severity: "info",
      file: null,
      line: null,
      summary: `Multiple function prefixes share stem ${stem}.`,
      why_it_matters: "Naming drift can indicate overlapping concepts, but this is heuristic-only.",
      suggested_fix: "Review whether these functions represent genuinely distinct responsibilities.",
      owner_area: null,
      details: { functions: [...values] },
    }));
}

const DETERMINISTIC_CHECKS = {
  "orphans": scanOrphans,
  "shims": scanShims,
  "boundaries": scanBoundaries,
  "deprecated-imports": scanDeprecatedImports,
  "canonical-imports": scanCanonicalImports,
  "logging": scanLogging,
  "large-files": scanLargeFiles,
  "direct-db-access": scanDirectDb,
  "missing-validation": scanMissingValidation,
  "barrel-legacy-exports": scanBarrelLegacyExports,
};

const HEURISTIC_CHECKS = {
  "import-drift": scanImportDrift,
  "naming-drift": scanNamingDrift,
};

function runChecks(graph, config, effective) {
  const filters = buildPathFilters(graph.repoRoot, effective);
  const reportedFiles = [...graph.fileInfoMap.keys()].filter((filePath) => {
    if (!isReportedFile(graph, effective, filters, filePath)) return false;

    if (filters.changedFiles) {
      const directImporters = new Set(graph.reverseGraph.get(filePath) || []);
      if (!filters.changedFiles.has(filePath) && ![...directImporters].some((importer) => filters.changedFiles.has(importer))) {
        return false;
      }
    }

    return true;
  });

  const rootFiles = resolveEntrypointFiles(graph, config, effective);
  const reachableFiles = computeReachableFiles(graph, rootFiles);

  const context = {
    config,
    effective,
    filters,
    reportedFiles,
    rootFiles,
    reachableFiles,
  };

  const checksToRun = effective.checks.includes("all")
    ? Object.keys(DETERMINISTIC_CHECKS)
    : effective.checks;

  const findings = [];
  for (const check of checksToRun) {
    const handler = DETERMINISTIC_CHECKS[check];
    if (!handler) {
      throw new Error(`Unknown check "${check}".`);
    }
    findings.push(...handler(graph, context));
  }

  if (effective.heuristics) {
    for (const handler of Object.values(HEURISTIC_CHECKS)) {
      findings.push(...handler(graph, context));
    }
  }

  const minLevel = SEVERITY_LEVELS[effective.severity] ?? 0;
  const filtered = findings.filter((finding) => (SEVERITY_LEVELS[finding.severity] ?? 0) >= minLevel);

  return {
    meta: {
      repo: graph.repoRoot,
      graphRoot: relativePath(graph.repoRoot, graph.graphDir),
      scope: effective.scope,
      checksRun: checksToRun,
      heuristics: effective.heuristics,
      filesInGraph: graph.fileInfoMap.size,
      filesReported: reportedFiles.length,
      entrypoints: [...rootFiles].map((filePath) => relativePath(graph.repoRoot, filePath)),
      findings: filtered.length,
      bySeverity: {
        error: filtered.filter((finding) => finding.severity === "error").length,
        warning: filtered.filter((finding) => finding.severity === "warning").length,
        info: filtered.filter((finding) => finding.severity === "info").length,
      },
    },
    findings: filtered,
  };
}

function formatText(results) {
  const lines = [];
  lines.push("Agent Debt Scan");
  lines.push(`Repo: ${results.meta.repo}`);
  lines.push(`Graph root: ${results.meta.graphRoot}`);
  lines.push(`Scope: ${results.meta.scope}`);
  lines.push(`Checks: ${results.meta.checksRun.join(", ")}`);
  lines.push(`Files in graph: ${results.meta.filesInGraph}`);
  lines.push(`Files reported: ${results.meta.filesReported}`);
  lines.push(`Findings: ${results.meta.findings} (${results.meta.bySeverity.error} error, ${results.meta.bySeverity.warning} warning, ${results.meta.bySeverity.info} info)`);
  lines.push("");

  const byCheck = new Map();
  for (const finding of results.findings) {
    if (!byCheck.has(finding.check)) byCheck.set(finding.check, []);
    byCheck.get(finding.check).push(finding);
  }

  for (const [check, items] of byCheck.entries()) {
    lines.push(`${check}: ${items.length}`);
    for (const item of items) {
      const location = item.file ? `${item.file}${item.line ? `:${item.line}` : ""}` : "(global)";
      lines.push(`  [${item.severity}] ${location}`);
      lines.push(`  ${item.summary}`);
      if (item.why_it_matters) lines.push(`  Why: ${item.why_it_matters}`);
      if (item.suggested_fix) lines.push(`  Fix: ${item.suggested_fix}`);
    }
    lines.push("");
  }

  if (results.findings.length === 0) {
    lines.push("No findings.");
  }

  return lines.join("\n");
}

function main() {
  const parsed = parseArgs();

  if (parsed.help) {
    printHelpAndExit();
  }

  if (parsed.initConfig) {
    console.log(JSON.stringify(defaultConfig(), null, 2));
    process.exit(0);
  }

  if (!parsed.repo) {
    console.error("Usage: agent-debt-scan.js --repo <path> [options]");
    process.exit(1);
  }

  const repoRoot = path.resolve(parsed.repo);
  if (!fs.existsSync(repoRoot)) {
    console.error(`Repo does not exist: ${repoRoot}`);
    process.exit(1);
  }

  const { config, configPath } = loadConfig(repoRoot, parsed.config);
  const effective = resolveEffectiveOptions(parsed, config);

  const ts = loadTypeScript(repoRoot);
  const graph = buildGraph(repoRoot, effective.graphRoot, config, ts);

  const results = runChecks(graph, config, effective);
  results.meta.configPath = configPath;

  if (effective.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(formatText(results));
  }

  process.exit(results.meta.bySeverity.error > 0 ? 1 : 0);
}

module.exports = {
  buildGraph,
  defaultConfig,
  formatText,
  loadConfig,
  loadTypeScript,
  main,
  parseArgs,
  resolveEffectiveOptions,
  runChecks,
};

if (require.main === module) {
  main();
}
