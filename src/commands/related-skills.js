function normalizeSkillId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('skill:')
    ? trimmed
    : trimmed.startsWith('prompt:')
      ? trimmed.replace(/^prompt:/, 'skill:')
      : trimmed.includes(':')
        ? null
        : `skill:${trimmed}`;
}

export function getOperatorSkillId(pkg) {
  return normalizeSkillId(pkg?.related?.operatorSkill);
}

export function formatOperatorSkillLine(pkg, options = {}) {
  const { label = 'Operator skill' } = options;
  const id = getOperatorSkillId(pkg);
  if (!id) return null;
  return `${label}: ${id}`;
}

export function getRelatedSkillIds(pkg) {
  const skills = Array.isArray(pkg?.related?.skills) ? pkg.related.skills : [];
  const ids = [];
  const seen = new Set();

  for (const value of skills) {
    const id = normalizeSkillId(value);

    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

export function buildRelatedSkillUpdatePlan(resolved, installedPackages = []) {
  const installedById = new Map(
    (Array.isArray(installedPackages) ? installedPackages : [])
      .filter((pkg) => (
        typeof pkg?.id === 'string'
        && pkg.kind === 'skill'
        && pkg.source === 'rudi'
      ))
      .map((pkg) => [pkg.id, pkg]),
  );
  const relatedSkills = Array.isArray(resolved?.relatedSkills)
    ? resolved.relatedSkills
    : [];
  const selected = [];
  const notInstalled = [];
  const seen = new Set();

  for (const relatedSkill of relatedSkills) {
    const id = normalizeSkillId(relatedSkill?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const installed = installedById.get(id);
    if (installed) {
      selected.push(installed);
    } else {
      notInstalled.push(id);
    }
  }

  return {
    selected,
    notInstalled,
  };
}

export function formatRelatedSkillsLine(pkg, options = {}) {
  const { label = 'Related skills' } = options;
  const operatorSkill = getOperatorSkillId(pkg);
  const ids = getRelatedSkillIds(pkg).filter((id) => id !== operatorSkill);
  if (ids.length === 0) return null;
  return `${label}: ${ids.join(', ')}`;
}
