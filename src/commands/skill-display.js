export function printSkillDetails(pkg, indent = '    ') {
  if (pkg.kind !== 'skill') return;
  if (pkg.category) console.log(`${indent}Category: ${pkg.category}`);
  console.log(`${indent}Role: ${pkg.skillRole || 'unknown'}`);
  if (pkg.operatorFor?.length) console.log(`${indent}Operator for: ${pkg.operatorFor.join(', ')}`);
  for (const [field, label] of [['capabilities', 'Capabilities'], ['domains', 'Domains'], ['providers', 'Providers']]) {
    if (pkg.facets?.[field]?.length) console.log(`${indent}${label}: ${pkg.facets[field].join(', ')}`);
  }
  if (pkg.conflictingPaths?.length) console.log(`${indent}Source conflict: ${pkg.conflictingPaths.join(', ')}`);
}
