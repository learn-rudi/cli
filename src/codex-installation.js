import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCommand as defaultRunCommand } from './utils/subprocess.js';

export const CODEX_STANDALONE_INSTALL_COMMAND =
  'curl -fsSL https://chatgpt.com/codex/install.sh | sh';

function isPathWithin(rootPath, candidatePath) {
  const delta = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
  return delta === '' || (!delta.startsWith('..') && !path.isAbsolute(delta));
}

function pathEntry(id, entryPath, type) {
  try {
    fs.lstatSync(entryPath);
  } catch {
    return null;
  }

  let canonicalPath = entryPath;
  try {
    canonicalPath = fs.realpathSync(entryPath);
  } catch {
    // Keep the lexical path for unreadable or transient entries.
  }

  return { id, path: entryPath, canonicalPath, type };
}

function isSystemCodexRegistration(entryPath) {
  const manifestPath = path.join(entryPath, 'manifest.json');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return manifest.id === 'agent:codex' &&
      manifest.installType === 'system' &&
      manifest.managed === false &&
      manifest.source?.type === 'system';
  } catch {
    return false;
  }
}

export function getCodexInstallationPaths(options = {}) {
  const home = options.home || os.homedir();
  const rudiHome = options.rudiHome || process.env.RUDI_HOME || path.join(home, '.rudi');
  const nodeRuntimeRoot = path.join(rudiHome, 'runtimes', 'node');
  const platform = options.platform || process.platform;
  const arch = options.arch || process.arch;
  const executableName = platform === 'win32' ? 'codex.exe' : 'codex';
  const nodeBinDir = platform === 'win32' ? 'Scripts' : 'bin';
  const npmName = platform === 'win32' ? 'npm.cmd' : 'npm';
  const npmCandidates = [
    path.join(nodeRuntimeRoot, arch, nodeBinDir, npmName),
    path.join(nodeRuntimeRoot, nodeBinDir, npmName),
  ];

  return {
    home,
    rudiHome,
    standalone: path.join(home, '.local', 'bin', executableName),
    externalDuplicates: [
      path.join('/usr', 'local', 'bin', executableName),
    ],
    nodeRuntimeRoot,
    npm: npmCandidates.find(candidate => fs.existsSync(candidate)) || npmCandidates.at(-1),
    runtimePackage: path.join(
      nodeRuntimeRoot,
      'lib',
      'node_modules',
      '@openai',
      'codex'
    ),
    legacy: [
      { id: 'rudi-bin-shim', path: path.join(rudiHome, 'bins', executableName), type: 'shim' },
      { id: 'rudi-shim', path: path.join(rudiHome, 'shims', executableName), type: 'shim' },
      { id: 'rudi-runtime-bin', path: path.join(nodeRuntimeRoot, nodeBinDir, executableName), type: 'runtime-bin' },
      { id: 'rudi-runtime-arch-bin', path: path.join(nodeRuntimeRoot, arch, nodeBinDir, executableName), type: 'runtime-bin' },
      { id: 'rudi-runtime-package', path: path.join(nodeRuntimeRoot, 'lib', 'node_modules', '@openai', 'codex'), type: 'npm-package' },
      { id: 'rudi-agent-metadata', path: path.join(rudiHome, 'agents', 'codex'), type: 'agent-metadata' },
    ],
  };
}

function defaultProbeVersion(executablePath, options = {}) {
  const runCommand = options.runCommand || defaultRunCommand;
  fs.accessSync(executablePath, fs.constants.X_OK);
  const output = runCommand(executablePath, ['--version'], {
    encoding: 'utf8',
    timeout: 5000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const version = String(output || '').trim().split(/\r?\n/, 1)[0];
  return version || null;
}

export function inspectCodexInstallation(options = {}) {
  const paths = getCodexInstallationPaths(options);
  const probeVersion = options.probeVersion || ((candidate) => (
    defaultProbeVersion(candidate, options)
  ));
  let standaloneVersion = null;
  let standaloneReason = 'not installed';

  if (fs.existsSync(paths.standalone)) {
    let canonicalPath = paths.standalone;
    try {
      canonicalPath = fs.realpathSync(paths.standalone);
    } catch {
      // The version probe below will provide the actionable failure state.
    }

    if (isPathWithin(paths.rudiHome, canonicalPath)) {
      standaloneReason = 'standalone path resolves into RUDI home';
    } else {
      try {
        standaloneVersion = probeVersion(paths.standalone);
        standaloneReason = standaloneVersion ? null : 'version probe returned no version';
      } catch (error) {
        standaloneReason = error.message || 'version probe failed';
      }
    }
  }

  const legacy = paths.legacy
    .map(entry => (
      entry.type === 'agent-metadata' && isSystemCodexRegistration(entry.path)
        ? null
        : pathEntry(entry.id, entry.path, entry.type)
    ))
    .filter(Boolean);
  const externalDuplicates = paths.externalDuplicates
    .map((entryPath, index) => pathEntry(`external-duplicate-${index + 1}`, entryPath, 'external'))
    .filter(entry => entry && entry.canonicalPath !== paths.standalone);

  return {
    standalone: {
      path: paths.standalone,
      verified: Boolean(standaloneVersion),
      version: standaloneVersion,
      reason: standaloneReason,
    },
    legacy,
    externalDuplicates,
    paths,
  };
}

export function assessCodexOwnership(inspection) {
  const hasLegacy = inspection.legacy.length > 0;
  const hasExternalDuplicates = inspection.externalDuplicates.length > 0;
  const standaloneVerified = inspection.standalone.verified;

  if (hasLegacy) {
    return {
      status: standaloneVerified ? 'migration-ready' : 'legacy-only',
      issue: true,
      fixable: standaloneVerified,
      hint: standaloneVerified
        ? 'Run rudi doctor --fix to remove only the legacy RUDI-owned Codex files.'
        : `Install standalone Codex first: ${CODEX_STANDALONE_INSTALL_COMMAND}`,
    };
  }

  if (hasExternalDuplicates) {
    return {
      status: 'external-duplicates',
      issue: true,
      fixable: false,
      hint: 'Remove the extra externally managed Codex installation manually.',
    };
  }

  if (standaloneVerified) {
    return { status: 'healthy', issue: false, fixable: false, hint: null };
  }

  return {
    status: 'not-installed',
    issue: false,
    fixable: false,
    hint: `Optional install: ${CODEX_STANDALONE_INSTALL_COMMAND}`,
  };
}

export function migrateLegacyCodexInstallation(options = {}) {
  const inspection = inspectCodexInstallation(options);

  if (!inspection.standalone.verified) {
    return {
      success: false,
      changed: false,
      error: `Standalone Codex is not verified. Run: ${CODEX_STANDALONE_INSTALL_COMMAND}`,
      inspection,
    };
  }

  if (inspection.legacy.length === 0) {
    return { success: true, changed: false, removed: [], inspection };
  }

  const runCommand = options.runCommand || defaultRunCommand;
  const removed = [];

  try {
    const npmPackage = inspection.legacy.find(entry => entry.type === 'npm-package');
    if (npmPackage) {
      if (!fs.existsSync(inspection.paths.npm)) {
        throw new Error(`RUDI Node npm was not found at ${inspection.paths.npm}`);
      }

      runCommand(inspection.paths.npm, [
        'uninstall',
        '--global',
        '--prefix',
        inspection.paths.nodeRuntimeRoot,
        '@openai/codex',
        '--no-audit',
        '--no-fund',
      ], {
        encoding: 'utf8',
        timeout: 120000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (fs.existsSync(npmPackage.path)) {
        throw new Error(`npm left the legacy package in place at ${npmPackage.path}`);
      }
      removed.push(npmPackage.path);
    }

    const afterNpm = inspectCodexInstallation(options);
    for (const entry of afterNpm.legacy) {
      if (!isPathWithin(afterNpm.paths.rudiHome, entry.path)) {
        throw new Error(`Refusing to remove a path outside RUDI home: ${entry.path}`);
      }
      if (entry.type === 'npm-package') {
        throw new Error(`Legacy npm package still exists at ${entry.path}`);
      }

      const stat = fs.lstatSync(entry.path);
      if (entry.type === 'agent-metadata') {
        if (!stat.isDirectory()) {
          throw new Error(`Expected Codex agent metadata directory at ${entry.path}`);
        }
        fs.rmSync(entry.path, { recursive: true });
      } else {
        if (!stat.isFile() && !stat.isSymbolicLink()) {
          throw new Error(`Expected Codex executable or shim at ${entry.path}`);
        }
        fs.unlinkSync(entry.path);
      }
      removed.push(entry.path);
    }
  } catch (error) {
    return {
      success: false,
      changed: removed.length > 0,
      removed,
      error: `Legacy Codex cleanup failed: ${error.message}`,
      inspection: inspectCodexInstallation(options),
    };
  }

  const after = inspectCodexInstallation(options);
  if (after.legacy.length > 0) {
    return {
      success: false,
      changed: removed.length > 0,
      removed,
      error: 'Legacy Codex cleanup did not remove every RUDI-owned path',
      inspection: after,
    };
  }

  return {
    success: true,
    changed: removed.length > 0,
    removed,
    inspection: after,
  };
}
