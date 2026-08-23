import {
  listProviders,
  loadProviderConfig,
  resolveProviderBinary,
} from './catalog.js';

import { buildAntigravityPlan } from './antigravity.js';
import { buildClaudePlan } from './claude.js';
import { buildCodexPlan } from './codex.js';
import { buildGeminiPlan } from './gemini.js';

const PUBLIC_PROVIDERS = Object.freeze(['claude', 'codex', 'antigravity', 'gemini']);
const PROVIDER_ALIASES = Object.freeze({ google: 'antigravity' });
const BUILDERS = Object.freeze({
  antigravity: buildAntigravityPlan,
  claude: buildClaudePlan,
  codex: buildCodexPlan,
  gemini: buildGeminiPlan,
});

export function listAgentProviders() {
  return [...PUBLIC_PROVIDERS];
}

export function resolveAgentProviderId(provider) {
  if (typeof provider !== 'string' || provider.trim() === '') {
    throw new Error(`Agent provider is required. Available: ${PUBLIC_PROVIDERS.join(', ')} (google aliases antigravity)`);
  }
  const normalized = provider.trim().toLowerCase();
  const canonical = PROVIDER_ALIASES[normalized] || normalized;
  if (!listProviders().includes(canonical)) {
    throw new Error(`Unknown agent provider: ${provider}. Available: ${PUBLIC_PROVIDERS.join(', ')} (google aliases antigravity)`);
  }
  return canonical;
}

export function getAgentProviderConfig(provider) {
  return loadProviderConfig(resolveAgentProviderId(provider));
}

export function resolveAgentProviderBinary(provider) {
  return resolveProviderBinary(getAgentProviderConfig(provider));
}

export function getMissingAgentProviderMessage(provider) {
  const config = getAgentProviderConfig(provider);
  return `Vendor-managed ${config.name} CLI was not found. Install it with the provider's supported installer, then verify discovery with: rudi agent hosts --json`;
}

export function buildProviderProcessPlan(options) {
  const provider = resolveAgentProviderId(options?.provider);
  return BUILDERS[provider]({ ...options, provider });
}
