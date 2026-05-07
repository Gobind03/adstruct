import { TestBed } from '@angular/core/testing';
import { AiStore } from './ai.store';
import type { AiConversation, AiMessage } from '../models/ai.models';

describe('AiStore', () => {
  let store: AiStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AiStore);
    store.resetAll();
  });

  it('should create', () => {
    expect(store).toBeTruthy();
  });

  it('should set conversations', () => {
    const list: AiConversation[] = [
      {
        id: 'c1',
        workspaceId: 'w1',
        title: 'Test',
        status: 'ACTIVE',
        agentMode: 'CHAT_ONLY',
        providerConfigId: null,
        model: null,
        contextJson: null,
        createdByUserId: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    store.setConversations(list);
    expect(store.conversations()).toEqual(list);
  });

  it('should add message', () => {
    const conv: AiConversation = {
      id: 'c1',
      workspaceId: 'w1',
      title: 'T',
      status: 'ACTIVE',
      agentMode: 'TOOL_ASSISTED',
      providerConfigId: null,
      model: null,
      contextJson: null,
      createdByUserId: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    store.setActiveConversation(conv);
    const msg: AiMessage = {
      id: 'm1',
      conversationId: 'c1',
      role: 'USER',
      content: 'hello',
      contentJson: null,
      createdByUserId: null,
      createdAt: '2026-01-01T00:00:01Z',
      citations: [],
    };
    store.addMessage(msg);
    expect(store.activeMessages().length).toBe(1);
    expect(store.activeMessages()[0].content).toBe('hello');
  });

  it('should set active conversation', () => {
    const conv: AiConversation = {
      id: 'c2',
      workspaceId: 'w1',
      title: 'Active',
      status: 'ACTIVE',
      agentMode: 'CHAT_ONLY',
      providerConfigId: null,
      model: 'gpt-4o-mini',
      contextJson: null,
      createdByUserId: 'u1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    store.setActiveConversation(conv);
    expect(store.activeConversation()).toEqual(conv);
  });

  it('should set loading', () => {
    store.setLoading(true);
    expect(store.loading()).toBe(true);
    store.setLoading(false);
    expect(store.loading()).toBe(false);
  });
});
