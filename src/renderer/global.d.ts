import type { CommandRequest, CommandResponse, ConfigureProviderRequest, DevinSession, FormAssistantData, FormDraft, FormProfile, FormSnippet, LocalRuntimeStatus, ProviderId, ProviderStatus, RoutingDecision, RuntimeSummary, SaveItemRequest, SavedItem } from '../shared/contracts';
declare global { interface Window { winpilot: {
  plan(request: CommandRequest): Promise<CommandResponse>;
  listSaved(): Promise<SavedItem[]>;
  save(request: SaveItemRequest): Promise<SavedItem>;
  saveScreenshot(): Promise<SavedItem>;
  providerStatuses(): Promise<ProviderStatus[]>;
  configureProvider(request: ConfigureProviderRequest): Promise<void>;
  removeProvider(id: ProviderId): Promise<void>;
  getFormData(): Promise<FormAssistantData>;
  saveFormProfile(profile: Omit<FormProfile, 'id'> & { id?: string }): Promise<FormProfile>;
  saveFormSnippet(snippet: Omit<FormSnippet, 'id'>): Promise<FormSnippet>;
  saveFormDraft(draft: Omit<FormDraft, 'id' | 'createdAt'>): Promise<FormDraft>;
  openForm(url: string): Promise<void>;
  runtimeSummary(): Promise<RuntimeSummary>;
  routePreview(request: CommandRequest): Promise<RoutingDecision>;
  localRuntimeStatus(): Promise<LocalRuntimeStatus>;
  createDevinSession(prompt: string, confirmed: boolean): Promise<DevinSession>;
} } }
export {};
