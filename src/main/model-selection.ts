import type { CloudExecutionTier, ProviderId } from '../shared/contracts';

const DEFAULT_MODELS: Record<ProviderId, Record<CloudExecutionTier, string>> = {
  openai: { 'cloud-fast': 'gpt-6-luna', 'cloud-reasoning': 'gpt-6-astra' },
  anthropic: { 'cloud-fast': 'claude-haiku-5-5', 'cloud-reasoning': 'claude-fable-5-1' },
  zai: { 'cloud-fast': 'glm-5.3-flash', 'cloud-reasoning': 'glm-5.3' },
  devin: { 'cloud-fast': 'devin-agent', 'cloud-reasoning': 'devin-agent' }
};

const ENV_PREFIX: Record<ProviderId, string> = {
  openai: 'OPENAI', anthropic: 'ANTHROPIC', zai: 'ZAI', devin: 'DEVIN'
};

export function selectCloudModel(provider: ProviderId, tier: CloudExecutionTier): string {
  const prefix = ENV_PREFIX[provider];
  const tierName = tier === 'cloud-reasoning' ? 'REASONING' : 'FAST';
  return process.env[`WINPILOT_${prefix}_${tierName}_MODEL`]?.trim()
    || process.env[`WINPILOT_${prefix}_MODEL`]?.trim()
    || DEFAULT_MODELS[provider][tier];
}
