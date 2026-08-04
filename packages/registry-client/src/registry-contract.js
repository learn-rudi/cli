const PACKAGE_KINDS = new Set([
  'stack',
  'skill',
  'prompt',
  'workflow',
  'runtime',
  'binary',
  'agent',
]);

export class RegistryContractError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RegistryContractError';
    this.details = details;
  }
}

function asObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RegistryContractError(`${label} must be an object`);
  }
  return value;
}

function requirePackageIdentity(pkg, kindHint) {
  if (typeof pkg.id !== 'string' || !pkg.id.includes(':')) {
    throw new RegistryContractError('Registry package requires a canonical id');
  }

  const inferredKind = pkg.id.split(':', 1)[0];
  const kind = pkg.kind || kindHint || inferredKind;
  if (!PACKAGE_KINDS.has(kind)) {
    throw new RegistryContractError(`Unsupported registry package kind: ${kind}`, {
      packageId: pkg.id,
    });
  }
  if (inferredKind !== kind) {
    throw new RegistryContractError(
      `Registry package id/kind mismatch: ${pkg.id} is not ${kind}`,
      { packageId: pkg.id }
    );
  }
  if (typeof pkg.name !== 'string' || pkg.name.trim() === '') {
    throw new RegistryContractError(`Registry package ${pkg.id} requires a name`, {
      packageId: pkg.id,
    });
  }
  if (typeof pkg.version !== 'string' || pkg.version.trim() === '') {
    throw new RegistryContractError(`Registry package ${pkg.id} requires a version`, {
      packageId: pkg.id,
    });
  }

  return kind;
}

function normalizeSecrets(requires) {
  if (!requires || !Array.isArray(requires.secrets)) return requires;
  return {
    ...requires,
    secrets: requires.secrets.map((secret) => {
      if (!secret || typeof secret !== 'object') return secret;
      const key = secret.key || secret.name;
      return {
        ...secret,
        ...(key ? { key, name: key } : {}),
        ...(secret.helpUrl && !secret.link ? { link: secret.helpUrl } : {}),
      };
    }),
  };
}

const PACKAGE_ID_PATTERN = /^(runtime|binary|agent|stack|skill|prompt):[a-z0-9][a-z0-9-_]*$/;
const PACKAGE_MATURITY = new Set(['experimental', 'stable']);
const PACKAGE_SUPPORT = new Set(['supported', 'maintenance', 'unsupported']);

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizePackageLifecycle(value, packageId) {
  if (value === undefined) return undefined;
  const lifecycle = asObject(value, `Registry package ${packageId} lifecycle`);
  const lifecycleKeys = new Set(['maturity', 'support', 'deprecation']);
  const unknownLifecycleKey = Object.keys(lifecycle).find((key) => !lifecycleKeys.has(key));
  if (unknownLifecycleKey) {
    throw new RegistryContractError(
      `Registry package ${packageId} lifecycle contains unsupported field: ${unknownLifecycleKey}`,
      { packageId }
    );
  }
  if (!PACKAGE_MATURITY.has(lifecycle.maturity)) {
    throw new RegistryContractError(
      `Registry package ${packageId} lifecycle.maturity is invalid`,
      { packageId }
    );
  }
  if (!PACKAGE_SUPPORT.has(lifecycle.support)) {
    throw new RegistryContractError(
      `Registry package ${packageId} lifecycle.support is invalid`,
      { packageId }
    );
  }

  let deprecation;
  if (lifecycle.deprecation !== undefined) {
    deprecation = asObject(
      lifecycle.deprecation,
      `Registry package ${packageId} lifecycle.deprecation`
    );
    const deprecationKeys = new Set([
      'announcedAt',
      'message',
      'replacementId',
      'removalAfter',
    ]);
    const unknownDeprecationKey = Object.keys(deprecation)
      .find((key) => !deprecationKeys.has(key));
    if (unknownDeprecationKey) {
      throw new RegistryContractError(
        `Registry package ${packageId} lifecycle.deprecation contains unsupported field: ${unknownDeprecationKey}`,
        { packageId }
      );
    }
    if (!isCalendarDate(deprecation.announcedAt)) {
      throw new RegistryContractError(
        `Registry package ${packageId} lifecycle.deprecation.announcedAt is invalid`,
        { packageId }
      );
    }
    if (typeof deprecation.message !== 'string' || deprecation.message.trim() === '') {
      throw new RegistryContractError(
        `Registry package ${packageId} lifecycle.deprecation.message is required`,
        { packageId }
      );
    }
    if (
      deprecation.replacementId !== undefined &&
      !PACKAGE_ID_PATTERN.test(deprecation.replacementId)
    ) {
      throw new RegistryContractError(
        `Registry package ${packageId} lifecycle.deprecation.replacementId is invalid`,
        { packageId }
      );
    }
    if (
      deprecation.removalAfter !== undefined &&
      !isCalendarDate(deprecation.removalAfter)
    ) {
      throw new RegistryContractError(
        `Registry package ${packageId} lifecycle.deprecation.removalAfter is invalid`,
        { packageId }
      );
    }
    if (
      deprecation.removalAfter !== undefined &&
      deprecation.removalAfter < deprecation.announcedAt
    ) {
      throw new RegistryContractError(
        `Registry package ${packageId} lifecycle.deprecation.removalAfter precedes announcedAt`,
        { packageId }
      );
    }
  }
  if (lifecycle.support === 'unsupported' && deprecation === undefined) {
    throw new RegistryContractError(
      `Registry package ${packageId} with unsupported lifecycle support requires deprecation guidance`,
      { packageId }
    );
  }

  return {
    maturity: lifecycle.maturity,
    support: lifecycle.support,
    ...(deprecation ? { deprecation: { ...deprecation } } : {}),
  };
}

function legacyInstallType(source) {
  if (source === 'download') return 'binary';
  if (source === 'npm' || source === 'pip' || source === 'system') return source;
  return undefined;
}

export function normalizeRegistryPackage(value, kindHint) {
  const pkg = asObject(value, 'Registry package');
  const kind = requirePackageIdentity(pkg, kindHint);
  const meta = pkg.meta && typeof pkg.meta === 'object' && !Array.isArray(pkg.meta)
    ? pkg.meta
    : {};
  const install = pkg.install && typeof pkg.install === 'object' && !Array.isArray(pkg.install)
    ? pkg.install
    : undefined;
  const isV2Package = Boolean(pkg.delivery && install?.source);

  if (!isV2Package) {
    return { ...pkg, kind };
  }

  const command = pkg.mcp?.command
    ? [pkg.mcp.command, ...(Array.isArray(pkg.mcp.args) ? pkg.mcp.args : [])]
    : pkg.command;
  const source = install.source;

  return {
    ...pkg,
    kind,
    path: pkg.path || install.path,
    description: pkg.description || meta.description,
    category: pkg.category || meta.category,
    ...(pkg.lifecycle === undefined
      ? {}
      : { lifecycle: normalizePackageLifecycle(pkg.lifecycle, pkg.id) }),
    tags: pkg.tags || meta.tags,
    icon: pkg.icon || meta.icon,
    author: pkg.author || meta.author,
    requires: normalizeSecrets(pkg.requires),
    command,
    installType: legacyInstallType(source) || pkg.installType,
    npmPackage: pkg.npmPackage || (source === 'npm' ? install.package : undefined),
    pipPackage: pkg.pipPackage || (source === 'pip' ? install.package : undefined),
    checkCommand: pkg.checkCommand || pkg.detect?.command,
    requiresAuth: pkg.requiresAuth ?? pkg.auth?.required,
    authCommand: pkg.authCommand || pkg.auth?.command,
    authInstructions: pkg.authInstructions || pkg.auth?.instructions,
  };
}

export function resolveRegistryPackageForPlatform(value, platformArch) {
  if (typeof platformArch !== 'string' || !/^(darwin|linux|win32)-(arm64|x64)$/.test(platformArch)) {
    throw new RegistryContractError(`Unsupported registry platform: ${platformArch}`);
  }

  const pkg = normalizeRegistryPackage(value);
  if (!pkg.delivery || !pkg.install?.source) {
    return pkg;
  }

  const os = platformArch.slice(0, platformArch.lastIndexOf('-'));
  const platforms = pkg.install.platforms || {};
  const platformKey = [platformArch, os, 'default'].find((key) => platforms[key]);
  const platform = platformKey ? platforms[platformKey] : undefined;
  const install = {
    ...pkg.install,
    ...(platform || {}),
  };
  const resolved = normalizeRegistryPackage({
    ...pkg,
    delivery: platform?.delivery || pkg.delivery,
    install,
    detect: platform?.detect || pkg.detect,
    installHints: platform?.installHints || pkg.installHints,
    _resolved: {
      platform,
      platformKey,
      keysTried: [platformArch, os, 'default'],
    },
  });

  if (install.source === 'download') {
    if (!platform && !install.url) {
      throw new RegistryContractError(
        `[${pkg.id}] does not support platform ${platformArch}`,
        { packageId: pkg.id, platformArch }
      );
    }
    if (typeof install.url !== 'string') {
      throw new RegistryContractError(`[${pkg.id}] download requires url`, { packageId: pkg.id });
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(install.url);
    } catch {
      throw new RegistryContractError(`[${pkg.id}] download URL is invalid`, { packageId: pkg.id });
    }
    if (parsedUrl.protocol !== 'https:') {
      throw new RegistryContractError(`[${pkg.id}] download URL must use https`, { packageId: pkg.id });
    }
    if (install.checksum?.algo !== 'sha256' || !/^[a-f0-9]{64}$/i.test(install.checksum?.value || '')) {
      throw new RegistryContractError(`[${pkg.id}] download requires a valid sha256 checksum`, {
        packageId: pkg.id,
      });
    }
    if (!['zip', 'tar.gz', 'tar.xz', 'raw'].includes(install.extract?.type)) {
      throw new RegistryContractError(`[${pkg.id}] download requires a supported extract type`, {
        packageId: pkg.id,
      });
    }
  }

  if ((install.source === 'npm' || install.source === 'pip') && !install.package) {
    throw new RegistryContractError(`[${pkg.id}] ${install.source} install requires package`, {
      packageId: pkg.id,
    });
  }
  if ((install.source === 'system' || resolved.delivery === 'system') && !resolved.detect?.command) {
    throw new RegistryContractError(`[${pkg.id}] system install requires detect.command`, {
      packageId: pkg.id,
    });
  }
  if (install.source === 'catalog' && !install.path) {
    throw new RegistryContractError(`[${pkg.id}] catalog install requires path`, {
      packageId: pkg.id,
    });
  }

  return resolved;
}

export function detectRegistrySchema(value) {
  const index = asObject(value, 'Registry index');
  asObject(index.packages, 'Registry index packages');

  const schemaVersion = index.schemaVersion === undefined || index.schemaVersion === null
    ? 'missing'
    : String(index.schemaVersion);
  if (schemaVersion === '2') return schemaVersion;
  throw new RegistryContractError(`Unsupported registry schema version: ${schemaVersion}`);
}

function v2Packages(index, kind) {
  const packages = asObject(index.packages, 'Registry index packages');
  const matches = [];

  for (const [id, value] of Object.entries(packages)) {
    const pkg = asObject(value, `Registry package ${id}`);
    if (pkg.id !== id) {
      throw new RegistryContractError(
        `Registry package key/id mismatch: ${id} != ${pkg.id || '(missing)'}`,
        { packageId: id }
      );
    }
    if (pkg.kind === kind) matches.push(pkg);
  }

  return matches;
}

export function listRegistryPackages(value, kind) {
  const index = asObject(value, 'Registry index');
  detectRegistrySchema(index);
  const packages = v2Packages(index, kind);

  return packages.map((pkg) => normalizeRegistryPackage(pkg, kind));
}

export function getRegistryPackage(value, id, kinds) {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new RegistryContractError('Registry package lookup requires an id');
  }

  const [explicitKind, shortName] = id.includes(':') ? id.split(':', 2) : [null, id];
  const searchKinds = explicitKind ? [explicitKind] : kinds;

  for (const kind of searchKinds) {
    for (const pkg of listRegistryPackages(value, kind)) {
      const pkgShortId = pkg.id.split(':', 2)[1];
      if (pkg.id === id || pkgShortId === shortName) return pkg;
    }
  }

  return null;
}
