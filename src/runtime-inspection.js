import fs from 'node:fs';
import path from 'node:path';

import { getPackagePath } from '@learnrudi/env';

function isWithinRoot(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function declaredRuntimeBins(manifest) {
  if (Array.isArray(manifest?.bins)) {
    return manifest.bins.map(name => ({ name, relativePath: path.join('bin', name) }));
  }

  if (manifest?.bins && typeof manifest.bins === 'object') {
    return Object.entries(manifest.bins).map(([name, descriptor]) => ({
      name,
      relativePath: descriptor?.path || path.join('bin', name),
    }));
  }

  return [];
}

export function inspectRuntimeInstall(packageId) {
  const installRoot = getPackagePath(packageId);
  const manifestPath = path.join(installRoot, 'manifest.json');
  const rootExists = fs.existsSync(installRoot);
  const resolvedInstallRoot = rootExists ? fs.realpathSync(installRoot) : installRoot;
  const manifestPresent = fs.existsSync(manifestPath);

  if (!manifestPresent) {
    return {
      binaries: [],
      error: rootExists ? 'Installed runtime manifest is missing' : null,
      installRoot,
      installed: false,
      manifest: null,
      manifestPresent: false,
      rootExists,
    };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.id !== packageId) {
      const actualId = Object.hasOwn(manifest, 'id') ? JSON.stringify(manifest.id) : '(missing)';
      throw new Error(`Installed runtime manifest ID mismatch: expected ${packageId}, got ${actualId}`);
    }

    const binaries = declaredRuntimeBins(manifest).map(({ name, relativePath }) => {
      if (typeof name !== 'string' || !name || typeof relativePath !== 'string' || !relativePath) {
        throw new Error('Installed runtime manifest contains an invalid binary declaration');
      }

      const binaryPath = path.resolve(installRoot, relativePath);
      if (!isWithinRoot(installRoot, binaryPath)) {
        throw new Error(`Installed runtime binary escapes its package root: ${name}`);
      }
      if (!fs.existsSync(binaryPath)) {
        throw new Error(`Installed runtime binary is missing: ${name}`);
      }

      const resolvedPath = fs.realpathSync(binaryPath);
      if (!isWithinRoot(resolvedInstallRoot, resolvedPath)) {
        throw new Error(`Installed runtime binary resolves outside its package root: ${name}`);
      }
      if (!fs.statSync(resolvedPath).isFile()) {
        throw new Error(`Installed runtime binary is not a regular file: ${name}`);
      }
      fs.accessSync(resolvedPath, fs.constants.X_OK);

      return { name, path: binaryPath, resolvedPath };
    });

    if (binaries.length === 0) {
      throw new Error('Installed runtime manifest declares no binaries');
    }

    return {
      binaries,
      error: null,
      installRoot,
      installed: true,
      manifest,
      manifestPresent: true,
      primaryBinary: binaries[0],
      rootExists: true,
    };
  } catch (error) {
    return {
      binaries: [],
      error: error.message,
      installRoot,
      installed: false,
      manifest: null,
      manifestPresent: true,
      rootExists: true,
    };
  }
}
