export function formatPackageLifecycleLines(pkg) {
  const lifecycle = pkg?.lifecycle;
  if (!lifecycle) return [];

  const lines = [`Lifecycle: ${lifecycle.maturity} · ${lifecycle.support}`];
  const deprecation = lifecycle.deprecation;
  if (!deprecation) return lines;

  lines.push(`Deprecated since ${deprecation.announcedAt}: ${deprecation.message}`);
  if (deprecation.replacementId) {
    lines.push(`Replacement: ${deprecation.replacementId}`);
  }
  if (deprecation.removalAfter) {
    lines.push(`Removal after: ${deprecation.removalAfter}`);
  }
  return lines;
}

export function printPackageLifecycle(pkg, indent = '') {
  for (const line of formatPackageLifecycleLines(pkg)) {
    console.log(`${indent}${line}`);
  }
}
