// Catalog tags remain authored data; primary operator roles come from stack relationships.
const FACET_KEYS = { capability: 'capabilities', domain: 'domains', provider: 'providers' };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function describePackage(pkg, index, { catalogIdentity = true } = {}) {
  if (!['skill', 'stack'].includes(pkg.kind)) return pkg;
  const tags = Array.isArray(pkg.tags) ? pkg.tags : Array.isArray(pkg.meta?.tags) ? pkg.meta.tags : [];
  const facets = { capabilities: [], domains: [], providers: [] };
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const [namespace, value, extra] = tag.split(':');
    if (Object.hasOwn(FACET_KEYS, namespace) && SLUG.test(value || '') && extra === undefined) {
      facets[FACET_KEYS[namespace]].push(value);
    }
  }
  for (const key of Object.values(FACET_KEYS)) facets[key] = [...new Set(facets[key])].sort();
  const described = { ...pkg, category: pkg.category || pkg.meta?.category, tags, facets };
  if (pkg.kind === 'stack') return described;
  const registered = catalogIdentity && index?.packages?.[pkg.id]?.kind === 'skill'
    && index.packages[pkg.id].id === pkg.id;
  const operatorFor = registered ? Object.entries(index.packages)
    .filter(([id, value]) => id.startsWith('stack:') && value?.id === id && value.kind === 'stack'
      && value.related?.operatorSkill === pkg.id)
    .map(([id]) => id).sort() : [];
  return {
    ...described,
    skillRole: registered ? (operatorFor.length > 0 ? 'operator' : 'workflow') : 'unknown',
    operatorFor,
  };
}

// Retain the public name used by earlier registry-client consumers.
export const describeSkill = describePackage;

export function normalizeSkillFilters(options = {}) {
  const filters = {};
  for (const key of ['category', 'role', ...Object.keys(FACET_KEYS)]) {
    if (options[key] === undefined) continue;
    if (typeof options[key] !== 'string' || !SLUG.test(options[key])) {
      throw new Error(`--${key} requires a lowercase category or facet name`);
    }
    if (key === 'role' && !['operator', 'workflow', 'unknown'].includes(options[key])) {
      throw new Error('--role must be operator, workflow, or unknown');
    }
    filters[key] = options[key];
  }
  return filters;
}

export function matchesSkillFilters(pkg, filters) {
  if (filters.category && (pkg.category || pkg.meta?.category) !== filters.category) return false;
  if (filters.role && pkg.skillRole !== filters.role) return false;
  for (const [filter, facet] of Object.entries(FACET_KEYS)) {
    if (filters[filter] && !pkg.facets?.[facet]?.includes(filters[filter])) return false;
  }
  return true;
}
