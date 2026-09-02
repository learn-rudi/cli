import { createHash } from 'node:crypto';

export const PORTABLE_TOOL_NAME_MAX_LENGTH = 54;
const PORTABLE_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,54}$/;

export function isPortableToolName(value) {
  return typeof value === 'string' && PORTABLE_TOOL_NAME_PATTERN.test(value);
}

function portableBase(canonicalName) {
  return canonicalName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'tool';
}

function portableHash(canonicalName) {
  return createHash('sha256').update(canonicalName).digest('hex').slice(0, 8);
}

function hashedAlias(base, canonicalName) {
  const suffix = `_${portableHash(canonicalName)}`;
  return `${base.slice(0, PORTABLE_TOOL_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
}

export function buildPortableToolNameMap(canonicalNames) {
  const uniqueNames = [...new Set(canonicalNames)];
  const groupedByBase = new Map();

  for (const canonicalName of uniqueNames) {
    const base = portableBase(canonicalName);
    const group = groupedByBase.get(base) || [];
    group.push(canonicalName);
    groupedByBase.set(base, group);
  }

  const canonicalToPortable = new Map();
  const portableToCanonical = new Map();
  for (const canonicalName of uniqueNames) {
    const base = portableBase(canonicalName);
    const collides = groupedByBase.get(base).length > 1;
    const alias = collides || !isPortableToolName(base)
      ? hashedAlias(base, canonicalName)
      : base;
    canonicalToPortable.set(canonicalName, alias);
    portableToCanonical.set(alias, canonicalName);
  }
  return { canonicalToPortable, portableToCanonical };
}
