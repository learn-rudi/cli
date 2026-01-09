/**
 * Platform-specific manifest resolver
 * Implements schema v2 platform resolution and merge rules
 */

import { getPlatformArch } from '@learnrudi/env';

/**
 * Resolve install config for current platform
 * Resolution order: exact platform → OS-only → default
 * Merge: top-level install fields → platform override wins
 *
 * @param {Object} manifest - Full package manifest
 * @param {Object} options - Resolution options
 * @param {string} [options.platformKey] - Override platform (for testing)
 * @returns {Object} Resolved install config
 */
export function resolveInstall(manifest, options = {}) {
  const platformKey = options.platformKey || getPlatformArch();
  const [os, arch] = platformKey.split('-');

  // Extract top-level defaults
  const topLevel = {
    source: manifest.install?.source || manifest.delivery,
    delivery: manifest.delivery,
    ...manifest.install
  };

  // Remove platforms key from top-level (don't merge it)
  delete topLevel.platforms;

  const platforms = manifest.install?.platforms || {};

  // Resolution order: exact → OS-only → default (top-level)
  let platformConfig = null;

  // 1. Try exact platform match (e.g., darwin-arm64)
  if (platforms[platformKey]) {
    platformConfig = platforms[platformKey];
  }
  // 2. Try OS-only match (e.g., darwin)
  else if (platforms[os]) {
    platformConfig = platforms[os];
  }
  // 3. Use top-level defaults
  else {
    platformConfig = {};
  }

  // Merge: top-level → platform override wins
  const resolved = {
    ...topLevel,
    ...platformConfig
  };

  // Preserve original platform key for debugging
  resolved._platformKey = platformKey;
  resolved._matchedKey = platforms[platformKey] ? platformKey : (platforms[os] ? os : 'default');

  return resolved;
}

/**
 * Validate resolved install config based on source type
 *
 * @param {Object} resolved - Resolved install config from resolveInstall
 * @param {Object} manifest - Original manifest for context
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateResolvedInstall(resolved, manifest) {
  const errors = [];
  const warnings = [];
  const source = resolved.source;

  // Source-specific validation
  switch (source) {
    case 'download':
      // Require URL
      if (!resolved.url) {
        errors.push('Download source requires "url" field');
      }

      // Require checksum
      if (!resolved.checksum || !resolved.checksum.algo || !resolved.checksum.value) {
        errors.push('Download source requires "checksum" with "algo" and "value"');
      }

      // Warn on "latest" version
      if (manifest.version === 'latest') {
        warnings.push('Download source with version="latest" is not reproducible. Pin to specific version.');
      }
      break;

    case 'system':
      // Require detect.command (check resolved config OR top-level manifest)
      if (!resolved.detect?.command && !manifest.detect?.command) {
        errors.push('System source requires "detect.command" field');
      }
      break;

    case 'npm':
      // Require package field
      if (!resolved.package && !manifest.install?.package) {
        errors.push('NPM source requires "package" field');
      }

      // Warn on "latest" version
      if (manifest.version === 'latest') {
        warnings.push('NPM source with version="latest" may cause inconsistent installs. Consider pinning version.');
      }
      break;

    case 'pip':
      // Require package field
      if (!resolved.package && !manifest.install?.package) {
        errors.push('Pip source requires "package" field');
      }

      // Warn on "latest" version
      if (manifest.version === 'latest') {
        warnings.push('Pip source with version="latest" may cause inconsistent installs. Consider pinning version.');
      }
      break;
  }

  // Kind-specific validation
  if (['runtime', 'binary', 'agent'].includes(manifest.kind)) {
    if (!manifest.bins || manifest.bins.length === 0) {
      errors.push(`Kind "${manifest.kind}" requires "bins" field with at least one binary name`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get all supported platforms from manifest
 *
 * @param {Object} manifest - Package manifest
 * @returns {string[]} List of platform keys
 */
export function getSupportedPlatforms(manifest) {
  const platforms = manifest.install?.platforms || {};
  return Object.keys(platforms);
}

/**
 * Check if manifest supports current platform
 *
 * @param {Object} manifest - Package manifest
 * @param {string} [platformKey] - Override platform (for testing)
 * @returns {boolean}
 */
export function isPlatformSupported(manifest, platformKey) {
  const resolved = resolveInstall(manifest, { platformKey });

  // If we got a platform-specific config (not just top-level defaults), it's supported
  return resolved._matchedKey !== 'default' || getSupportedPlatforms(manifest).length === 0;
}
