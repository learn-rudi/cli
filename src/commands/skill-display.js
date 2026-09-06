export function printSkillDetails(pkg, indent = '    ') {
  if (!['skill', 'stack'].includes(pkg.kind)) return;
  if (pkg.category) console.log(`${indent}Category: ${pkg.category}`);
  if (pkg.kind === 'skill') {
    console.log(`${indent}Role: ${pkg.skillRole || 'unknown'}`);
    if (pkg.operatorFor?.length) console.log(`${indent}Operator for: ${pkg.operatorFor.join(', ')}`);
  }
  for (const [field, label] of [['capabilities', 'Capabilities'], ['domains', 'Domains'], ['providers', 'Providers']]) {
    if (pkg.facets?.[field]?.length) console.log(`${indent}${label}: ${pkg.facets[field].join(', ')}`);
  }
  if (pkg.conflictingPaths?.length) console.log(`${indent}Source conflict: ${pkg.conflictingPaths.join(', ')}`);
}
