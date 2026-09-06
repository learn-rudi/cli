import { parse as parseYamlMetadata } from 'yaml';

export function parsePackageMetadata(content) {
  const parsed = parseYamlMetadata(content, { maxAliasCount: 50 });
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Package metadata must be a mapping');
  }
  const metadata = {};
  for (const field of ['name', 'description', 'version', 'category', 'icon']) {
    if (parsed[field] === undefined) continue;
    if (typeof parsed[field] !== 'string') {
      throw new Error(`Package metadata ${field} must be a string`);
    }
    metadata[field] = parsed[field];
  }
  const stringList = (value, field) => {
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
      throw new Error(`Package metadata ${field} must be a string list`);
    }
    return value;
  };
  if (parsed.tags !== undefined) metadata.tags = stringList(parsed.tags, 'tags');
  if (parsed.requires !== undefined) {
    if (!parsed.requires || typeof parsed.requires !== 'object' || Array.isArray(parsed.requires)) {
      throw new Error('Package metadata requires must be a mapping');
    }
    metadata.requires = {};
    for (const kind of ['stacks', 'skills']) {
      if (parsed.requires[kind] !== undefined) {
        metadata.requires[kind] = stringList(parsed.requires[kind], `requires.${kind}`);
      }
    }
  }
  return metadata;
}


/** Decode source metadata once for inventory and host projections. */
export function parseSkillDocument(content = '') {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { metadata: {}, body: content.trimStart() };
  return {
    metadata: parsePackageMetadata(match[1]),
    body: content.slice(match[0].length).trimStart(),
  };
}
