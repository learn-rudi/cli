export const PORTABLE_TOOL_NAME_MAX_LENGTH: number;
export function isPortableToolName(value: unknown): value is string;
export function buildPortableToolNameMap(canonicalNames: string[]): {
  canonicalToPortable: Map<string, string>;
  portableToCanonical: Map<string, string>;
};
