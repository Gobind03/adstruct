import { TestBed } from '@angular/core/testing';
import { AdminStore } from './admin.store';

describe('AdminStore', () => {
  let store: AdminStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AdminStore] });
    store = TestBed.inject(AdminStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should select an org and persist to localStorage', () => {
    store.selectOrg('org-123');
    TestBed.flushEffects();
    expect(store.selectedOrgId()).toBe('org-123');
    expect(localStorage.getItem('ms_selected_org')).toBe('org-123');
  });

  it('should select a workspace and persist to localStorage', () => {
    store.selectWorkspace('ws-456');
    TestBed.flushEffects();
    expect(store.selectedWorkspaceId()).toBe('ws-456');
    expect(localStorage.getItem('ms_selected_ws')).toBe('ws-456');
  });

  it('should clear workspace when org changes', () => {
    store.selectOrg('org-1');
    store.selectWorkspace('ws-1');
    TestBed.flushEffects();
    expect(store.selectedWorkspaceId()).toBe('ws-1');

    store.selectOrg('org-2');
    TestBed.flushEffects();
    expect(store.selectedWorkspaceId()).toBeNull();
  });

  it('should compute selectedOrg from orgs signal', () => {
    store.setOrgs([
      { id: 'org-1', name: 'Org One', timezone: 'UTC', currency: 'USD', status: 'ACTIVE', workspaceCount: 1, memberCount: 2, createdAt: '', updatedAt: '' },
      { id: 'org-2', name: 'Org Two', timezone: 'UTC', currency: 'EUR', status: 'ACTIVE', workspaceCount: 0, memberCount: 1, createdAt: '', updatedAt: '' },
    ]);
    store.selectOrg('org-2');
    expect(store.selectedOrg()?.name).toBe('Org Two');
  });

  it('should check role from user profile', () => {
    store.setUserProfile({
      id: 'u1',
      email: 'a@b.com',
      fullName: 'Admin',
      status: 'ACTIVE',
      memberships: [
        { id: 'm1', userId: 'u1', orgId: 'org-1', workspaceId: null, role: 'ORG_ADMIN', createdAt: '' },
      ],
      createdAt: '',
      updatedAt: '',
    });
    expect(store.isOrgAdmin('org-1')).toBeTrue();
    expect(store.isOrgAdmin('org-2')).toBeFalse();
    expect(store.canManageMembers('org-1')).toBeTrue();
  });
});
