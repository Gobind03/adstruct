import { Injectable, signal, computed, effect } from '@angular/core';
import { Organization, Workspace, MemberRole, Membership, UserProfile } from '../models/admin.models';

const ORG_KEY = 'ms_selected_org';
const WS_KEY = 'ms_selected_ws';

@Injectable({ providedIn: 'root' })
export class AdminStore {
  private _orgs = signal<Organization[]>([]);
  private _workspaces = signal<Workspace[]>([]);
  private _selectedOrgId = signal<string | null>(this.loadFromStorage(ORG_KEY));
  private _selectedWorkspaceId = signal<string | null>(this.loadFromStorage(WS_KEY));
  private _userProfile = signal<UserProfile | null>(null);

  readonly orgs = this._orgs.asReadonly();
  readonly workspaces = this._workspaces.asReadonly();
  readonly selectedOrgId = this._selectedOrgId.asReadonly();
  readonly selectedWorkspaceId = this._selectedWorkspaceId.asReadonly();
  readonly userProfile = this._userProfile.asReadonly();

  readonly selectedOrg = computed(() => {
    const id = this._selectedOrgId();
    return this._orgs().find((o) => o.id === id) ?? null;
  });

  readonly selectedWorkspace = computed(() => {
    const id = this._selectedWorkspaceId();
    return this._workspaces().find((w) => w.id === id) ?? null;
  });

  constructor() {
    effect(() => {
      const orgId = this._selectedOrgId();
      if (orgId) {
        localStorage.setItem(ORG_KEY, orgId);
      } else {
        localStorage.removeItem(ORG_KEY);
      }
    });
    effect(() => {
      const wsId = this._selectedWorkspaceId();
      if (wsId) {
        localStorage.setItem(WS_KEY, wsId);
      } else {
        localStorage.removeItem(WS_KEY);
      }
    });
  }

  setOrgs(orgs: Organization[]): void {
    this._orgs.set(orgs);
  }

  setWorkspaces(workspaces: Workspace[]): void {
    this._workspaces.set(workspaces);
  }

  selectOrg(orgId: string): void {
    this._selectedOrgId.set(orgId);
    this._selectedWorkspaceId.set(null);
  }

  selectWorkspace(wsId: string): void {
    this._selectedWorkspaceId.set(wsId);
  }

  setUserProfile(profile: UserProfile): void {
    this._userProfile.set(profile);
  }

  hasRole(role: MemberRole, orgId?: string, workspaceId?: string): boolean {
    const profile = this._userProfile();
    if (!profile) return false;
    return profile.memberships.some(
      (m: Membership) =>
        m.role === role &&
        (!orgId || m.orgId === orgId) &&
        (!workspaceId || m.workspaceId === workspaceId || m.workspaceId === null)
    );
  }

  isOrgAdmin(orgId?: string): boolean {
    return this.hasRole('ORG_ADMIN', orgId);
  }

  canManageMembers(orgId?: string): boolean {
    return this.isOrgAdmin(orgId) || this.hasRole('WORKSPACE_ADMIN', orgId);
  }

  private loadFromStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}
