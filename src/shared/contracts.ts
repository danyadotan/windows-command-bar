export type ProviderId = 'openai' | 'anthropic' | 'zai' | 'devin';

export type Risk = 'read' | 'change' | 'admin';

export interface ProposedAction {
  id: string;
  title: string;
  explanation: string;
  risk: Risk;
  command?: string;
  requiresApproval: boolean;
}

export interface CommandRequest {
  text: string;
  provider: ProviderId;
  previewOnly: boolean;
}

export interface CommandResponse {
  kind: 'answer' | 'plan';
  message: string;
  actions: ProposedAction[];
}

export type SavedItemKind = 'link' | 'note' | 'screenshot' | 'inspiration';

export interface SavedItem {
  id: string;
  kind: SavedItemKind;
  title: string;
  content: string;
  source?: string;
  tags: string[];
  collection: string;
  createdAt: string;
}

export interface SaveItemRequest {
  content: string;
  title?: string;
  kind?: SavedItemKind;
}

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  configured: boolean;
  mode: 'chat' | 'agent';
}

export interface ConfigureProviderRequest {
  id: ProviderId;
  apiKey: string;
  organizationId?: string;
}

export interface DevinSession {
  id: string;
  url: string;
  status: string;
}

export interface WindowsToolResult {
  action: 'winget-search' | 'winget-install' | 'update-scan';
  output: string;
  exitCode: number;
}

export interface FormProfile {
  id: string;
  label: string;
  fullName: string;
  email: string;
  phone: string;
  signature: string;
}

export interface FormSnippet {
  id: string;
  trigger: string;
  label: string;
  value: string;
  kind: 'text' | 'search' | 'signature';
}

export interface FormDraft {
  id: string;
  title: string;
  url: string;
  reminderAt?: string;
  createdAt: string;
}

export interface FormAssistantData {
  profiles: FormProfile[];
  snippets: FormSnippet[];
  drafts: FormDraft[];
}

export type TaskComplexity = 'simple' | 'medium' | 'complex';
export type ExecutionTier = 'on-device' | 'cloud-fast' | 'cloud-reasoning' | 'privacy-hold';

export interface RoutingDecision {
  tier: ExecutionTier;
  model: string;
  complexity: TaskComplexity;
  reason: string;
  containsPrivateData: boolean;
  estimatedInputTokens: number;
}

export interface UsageEvent {
  id: string;
  createdAt: string;
  taskLabel: string;
  provider: string;
  model: string;
  tier: ExecutionTier;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
}

export interface RuntimeSummary {
  totalTokens: number;
  localTokens: number;
  cloudTokens: number;
  estimatedCloudTokensSaved: number;
  events: UsageEvent[];
}

export interface ProviderGeneration {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LocalRuntimeStatus {
  configured: boolean;
  endpoint?: string;
  model?: string;
  transport: 'microsoft-local-sdk' | 'mcp-loopback' | 'none';
  message: string;
}
