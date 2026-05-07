import { Injectable, signal, computed } from '@angular/core';
import {
  AiActionProposal,
  AiConversation,
  AiMessage,
  AiPromptTemplate,
  AiProviderConfig,
  AiRedactionRule,
  AiSafetyPolicy,
  AiToolDefinition,
  AiWorkflowDefinition,
  AiWorkspacePreference,
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiStore {
  private _conversations = signal<AiConversation[]>([]);
  private _activeConversation = signal<AiConversation | null>(null);
  private _activeMessages = signal<AiMessage[]>([]);
  private _promptTemplates = signal<AiPromptTemplate[]>([]);
  private _proposals = signal<AiActionProposal[]>([]);
  private _tools = signal<AiToolDefinition[]>([]);
  private _providers = signal<AiProviderConfig[]>([]);
  private _preferences = signal<AiWorkspacePreference[]>([]);
  private _safetyPolicy = signal<AiSafetyPolicy | null>(null);
  private _redactionRules = signal<AiRedactionRule[]>([]);
  private _workflows = signal<AiWorkflowDefinition[]>([]);
  private _loading = signal<boolean>(false);

  readonly conversations = this._conversations.asReadonly();
  readonly activeConversation = this._activeConversation.asReadonly();
  readonly activeMessages = this._activeMessages.asReadonly();
  readonly promptTemplates = this._promptTemplates.asReadonly();
  readonly proposals = this._proposals.asReadonly();
  readonly tools = this._tools.asReadonly();
  readonly providers = this._providers.asReadonly();
  readonly preferences = this._preferences.asReadonly();
  readonly safetyPolicy = this._safetyPolicy.asReadonly();
  readonly redactionRules = this._redactionRules.asReadonly();
  readonly workflows = this._workflows.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly activeConversationMessages = computed(() => {
    const conv = this._activeConversation();
    const messages = this._activeMessages();
    if (!conv) {
      return [];
    }
    return messages.filter((m) => m.conversationId === conv.id);
  });

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setConversations(conversations: AiConversation[]): void {
    this._conversations.set(conversations);
  }

  upsertConversation(conversation: AiConversation): void {
    this._conversations.update((list) => {
      const i = list.findIndex((c) => c.id === conversation.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = conversation;
        return next;
      }
      return [conversation, ...list];
    });
  }

  removeConversation(conversationId: string): void {
    this._conversations.update((list) => list.filter((c) => c.id !== conversationId));
    if (this._activeConversation()?.id === conversationId) {
      this._activeConversation.set(null);
      this._activeMessages.set([]);
    }
  }

  setActiveConversation(conversation: AiConversation | null): void {
    this._activeConversation.set(conversation);
  }

  setActiveMessages(messages: AiMessage[]): void {
    this._activeMessages.set(messages);
  }

  addMessage(message: AiMessage): void {
    this._activeMessages.update((msgs) => [...msgs, message]);
  }

  replaceMessages(messages: AiMessage[]): void {
    this._activeMessages.set(messages);
  }

  setPromptTemplates(templates: AiPromptTemplate[]): void {
    this._promptTemplates.set(templates);
  }

  upsertPromptTemplate(template: AiPromptTemplate): void {
    this._promptTemplates.update((list) => {
      const i = list.findIndex((t) => t.id === template.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = template;
        return next;
      }
      return [...list, template];
    });
  }

  removePromptTemplate(promptId: string): void {
    this._promptTemplates.update((list) => list.filter((t) => t.id !== promptId));
  }

  setProposals(proposals: AiActionProposal[]): void {
    this._proposals.set(proposals);
  }

  upsertProposal(proposal: AiActionProposal): void {
    this._proposals.update((list) => {
      const i = list.findIndex((p) => p.id === proposal.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = proposal;
        return next;
      }
      return [...list, proposal];
    });
  }

  removeProposal(proposalId: string): void {
    this._proposals.update((list) => list.filter((p) => p.id !== proposalId));
  }

  setTools(tools: AiToolDefinition[]): void {
    this._tools.set(tools);
  }

  setProviders(providers: AiProviderConfig[]): void {
    this._providers.set(providers);
  }

  upsertProvider(config: AiProviderConfig): void {
    this._providers.update((list) => {
      const i = list.findIndex((p) => p.id === config.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = config;
        return next;
      }
      return [...list, config];
    });
  }

  removeProvider(configId: string): void {
    this._providers.update((list) => list.filter((p) => p.id !== configId));
  }

  setPreferences(preferences: AiWorkspacePreference[]): void {
    this._preferences.set(preferences);
  }

  upsertPreference(pref: AiWorkspacePreference): void {
    this._preferences.update((list) => {
      const i = list.findIndex((p) => p.id === pref.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = pref;
        return next;
      }
      return [...list, pref];
    });
  }

  removePreference(prefId: string): void {
    this._preferences.update((list) => list.filter((p) => p.id !== prefId));
  }

  setSafetyPolicy(policy: AiSafetyPolicy | null): void {
    this._safetyPolicy.set(policy);
  }

  setRedactionRules(rules: AiRedactionRule[]): void {
    this._redactionRules.set(rules);
  }

  upsertRedactionRule(rule: AiRedactionRule): void {
    this._redactionRules.update((list) => {
      const i = list.findIndex((r) => r.id === rule.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = rule;
        return next;
      }
      return [...list, rule];
    });
  }

  removeRedactionRule(ruleId: string): void {
    this._redactionRules.update((list) => list.filter((r) => r.id !== ruleId));
  }

  setWorkflows(workflows: AiWorkflowDefinition[]): void {
    this._workflows.set(workflows);
  }

  upsertWorkflow(workflow: AiWorkflowDefinition): void {
    this._workflows.update((list) => {
      const i = list.findIndex((w) => w.id === workflow.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = workflow;
        return next;
      }
      return [...list, workflow];
    });
  }

  removeWorkflow(workflowId: string): void {
    this._workflows.update((list) => list.filter((w) => w.id !== workflowId));
  }

  resetChatView(): void {
    this._activeConversation.set(null);
    this._activeMessages.set([]);
  }

  resetAll(): void {
    this._conversations.set([]);
    this._activeConversation.set(null);
    this._activeMessages.set([]);
    this._promptTemplates.set([]);
    this._proposals.set([]);
    this._tools.set([]);
    this._providers.set([]);
    this._preferences.set([]);
    this._safetyPolicy.set(null);
    this._redactionRules.set([]);
    this._workflows.set([]);
    this._loading.set(false);
  }
}
