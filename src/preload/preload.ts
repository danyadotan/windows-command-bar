import { contextBridge, ipcRenderer } from 'electron';
import type { CommandRequest, CommandResponse, ConfigureProviderRequest, FormAssistantData, FormDraft, FormProfile, FormSnippet, LocalRuntimeStatus, ProviderId, ProviderStatus, RoutingDecision, RuntimeSummary, SaveItemRequest, SavedItem } from '../shared/contracts';

contextBridge.exposeInMainWorld('winpilot', {
  plan: (request: CommandRequest): Promise<CommandResponse> => ipcRenderer.invoke('command:plan', request),
  listSaved: (): Promise<SavedItem[]> => ipcRenderer.invoke('library:list'),
  save: (request: SaveItemRequest): Promise<SavedItem> => ipcRenderer.invoke('library:save', request),
  saveScreenshot: (): Promise<SavedItem> => ipcRenderer.invoke('library:save-screenshot'),
  providerStatuses: (): Promise<ProviderStatus[]> => ipcRenderer.invoke('provider:statuses'),
  configureProvider: (request: ConfigureProviderRequest): Promise<void> => ipcRenderer.invoke('provider:configure', request),
  removeProvider: (id: ProviderId): Promise<void> => ipcRenderer.invoke('provider:remove', id),
  getFormData: (): Promise<FormAssistantData> => ipcRenderer.invoke('forms:get'),
  saveFormProfile: (profile: Omit<FormProfile, 'id'> & { id?: string }): Promise<FormProfile> => ipcRenderer.invoke('forms:save-profile', profile),
  saveFormSnippet: (snippet: Omit<FormSnippet, 'id'>): Promise<FormSnippet> => ipcRenderer.invoke('forms:save-snippet', snippet),
  saveFormDraft: (draft: Omit<FormDraft, 'id' | 'createdAt'>): Promise<FormDraft> => ipcRenderer.invoke('forms:save-draft', draft),
  openForm: (url: string): Promise<void> => ipcRenderer.invoke('forms:open', url),
  runtimeSummary: (): Promise<RuntimeSummary> => ipcRenderer.invoke('runtime:summary'),
  routePreview: (request: CommandRequest): Promise<RoutingDecision> => ipcRenderer.invoke('runtime:route-preview', request),
  localRuntimeStatus: (): Promise<LocalRuntimeStatus> => ipcRenderer.invoke('runtime:local-status')
});
