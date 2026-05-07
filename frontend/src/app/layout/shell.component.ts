import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../core/services/auth.service';
import {
  WorkspaceService,
  Organization,
  Workspace,
} from '../core/services/workspace.service';
import { AdminStore } from '../features/admin/store/admin.store';
import { OrgApiService } from '../features/admin/services/org-api.service';
import { WorkspaceApiService } from '../features/admin/services/workspace-api.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { UserProfile } from '../features/admin/models/admin.models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="sidenav-header">
          <div class="brand">
            <div class="brand-icon">M</div>
            <span class="brand-name">AdstructAI</span>
          </div>
        </div>

        @if (organizations.length > 0) {
          <div class="workspace-selector">
            <mat-form-field appearance="outline" class="full-width compact-field">
              <mat-label>Organization</mat-label>
              <mat-select
                [value]="adminStore.selectedOrgId()"
                (selectionChange)="onOrgChange($event.value)">
                @for (org of organizations; track org.id) {
                  <mat-option [value]="org.id">{{ org.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (workspaces.length > 0) {
              <mat-form-field appearance="outline" class="full-width compact-field">
                <mat-label>Workspace</mat-label>
                <mat-select
                  [value]="adminStore.selectedWorkspaceId()"
                  (selectionChange)="onWorkspaceChange($event.value)">
                  <mat-option [value]="null">All workspaces</mat-option>
                  @for (ws of workspaces; track ws.id) {
                    <mat-option [value]="ws.id">{{ ws.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
          </div>
        }

        <mat-nav-list class="nav-list">
          <a mat-list-item routerLink="/home" routerLinkActive="active">
            <mat-icon matListItemIcon>home</mat-icon>
            <span matListItemTitle>Home</span>
          </a>

          <div class="nav-group-label">Integrations Hub</div>

          <a mat-list-item routerLink="/integrations" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: true }">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Overview</span>
          </a>

          <a mat-list-item routerLink="/integrations/providers" routerLinkActive="active">
            <mat-icon matListItemIcon>extension</mat-icon>
            <span matListItemTitle>Providers</span>
          </a>

          <a mat-list-item routerLink="/integrations/accounts" routerLinkActive="active">
            <mat-icon matListItemIcon>hub</mat-icon>
            <span matListItemTitle>Accounts</span>
          </a>

          <a mat-list-item routerLink="/integrations/workspace-mappings" routerLinkActive="active">
            <mat-icon matListItemIcon>link</mat-icon>
            <span matListItemTitle>Workspace Mappings</span>
          </a>

          <a mat-list-item routerLink="/integrations/sync-jobs" routerLinkActive="active">
            <mat-icon matListItemIcon>sync</mat-icon>
            <span matListItemTitle>Sync Jobs</span>
          </a>

          <a mat-list-item routerLink="/integrations/campaign-reports" routerLinkActive="active">
            <mat-icon matListItemIcon>bar_chart</mat-icon>
            <span matListItemTitle>Campaign Reports</span>
          </a>

          <a mat-list-item routerLink="/integrations/webhooks" routerLinkActive="active">
            <mat-icon matListItemIcon>webhook</mat-icon>
            <span matListItemTitle>Webhooks</span>
          </a>

          <a mat-list-item routerLink="/integrations/entity-mappings" routerLinkActive="active">
            <mat-icon matListItemIcon>device_hub</mat-icon>
            <span matListItemTitle>Entity Mappings</span>
          </a>

          <a mat-list-item routerLink="/integrations/health" routerLinkActive="active">
            <mat-icon matListItemIcon>monitor_heart</mat-icon>
            <span matListItemTitle>Health</span>
          </a>

          <div class="nav-group-label">Conversational Ads</div>

          <a mat-list-item routerLink="/campaigns" routerLinkActive="active">
            <mat-icon matListItemIcon>campaign</mat-icon>
            <span matListItemTitle>Campaigns</span>
          </a>

          <a mat-list-item routerLink="/creatives" routerLinkActive="active">
            <mat-icon matListItemIcon>ad_units</mat-icon>
            <span matListItemTitle>Creatives</span>
          </a>

          <a mat-list-item routerLink="/approvals" routerLinkActive="active">
            <mat-icon matListItemIcon>approval</mat-icon>
            <span matListItemTitle>Approvals</span>
          </a>

          <a mat-list-item routerLink="/events" routerLinkActive="active">
            <mat-icon matListItemIcon>analytics</mat-icon>
            <span matListItemTitle>Analytics</span>
          </a>

          <div class="nav-group-label">Brand & Governance</div>

          <a mat-list-item routerLink="/governance/profile" routerLinkActive="active">
            <mat-icon matListItemIcon>palette</mat-icon>
            <span matListItemTitle>Brand Profile</span>
          </a>

          <a mat-list-item routerLink="/governance/assets" routerLinkActive="active">
            <mat-icon matListItemIcon>image</mat-icon>
            <span matListItemTitle>Brand Assets</span>
          </a>

          <a mat-list-item routerLink="/governance/rulesets" routerLinkActive="active">
            <mat-icon matListItemIcon>gavel</mat-icon>
            <span matListItemTitle>Rule Sets</span>
          </a>

          <a mat-list-item routerLink="/governance/disclaimers" routerLinkActive="active">
            <mat-icon matListItemIcon>description</mat-icon>
            <span matListItemTitle>Disclaimers</span>
          </a>

          <a mat-list-item routerLink="/governance/templates" routerLinkActive="active">
            <mat-icon matListItemIcon>article</mat-icon>
            <span matListItemTitle>Templates</span>
          </a>

          <a mat-list-item routerLink="/governance/checks" routerLinkActive="active">
            <mat-icon matListItemIcon>verified</mat-icon>
            <span matListItemTitle>Governance Checks</span>
          </a>

          <a mat-list-item routerLink="/governance/platform-constraints" routerLinkActive="active">
            <mat-icon matListItemIcon>tune</mat-icon>
            <span matListItemTitle>Platform Constraints</span>
          </a>

          <div class="nav-group-label">Creative Studio</div>

          <a mat-list-item routerLink="/creative/assets" routerLinkActive="active">
            <mat-icon matListItemIcon>photo_library</mat-icon>
            <span matListItemTitle>Assets Library</span>
          </a>

          <a mat-list-item routerLink="/creative/copy" routerLinkActive="active">
            <mat-icon matListItemIcon>edit_note</mat-icon>
            <span matListItemTitle>Copy Library</span>
          </a>

          <a mat-list-item routerLink="/creative/variants" routerLinkActive="active">
            <mat-icon matListItemIcon>view_carousel</mat-icon>
            <span matListItemTitle>Variant Sets</span>
          </a>

          <a mat-list-item routerLink="/creative/usage" routerLinkActive="active">
            <mat-icon matListItemIcon>share</mat-icon>
            <span matListItemTitle>Usage & Links</span>
          </a>

          <a mat-list-item routerLink="/creative/ai" routerLinkActive="active">
            <mat-icon matListItemIcon>auto_awesome</mat-icon>
            <span matListItemTitle>AI Generator</span>
          </a>

          <a mat-list-item routerLink="/creative/folders" routerLinkActive="active">
            <mat-icon matListItemIcon>folder</mat-icon>
            <span matListItemTitle>Folders</span>
          </a>

          <div class="nav-group-label">Research & Intelligence</div>

          <a mat-list-item routerLink="/research/overview" routerLinkActive="active">
            <mat-icon matListItemIcon>explore</mat-icon>
            <span matListItemTitle>Overview</span>
          </a>
          <a mat-list-item routerLink="/research/competitors" routerLinkActive="active">
            <mat-icon matListItemIcon>business</mat-icon>
            <span matListItemTitle>Competitors</span>
          </a>
          <a mat-list-item routerLink="/research/sources" routerLinkActive="active">
            <mat-icon matListItemIcon>source</mat-icon>
            <span matListItemTitle>Sources</span>
          </a>
          <a mat-list-item routerLink="/research/insights" routerLinkActive="active">
            <mat-icon matListItemIcon>lightbulb</mat-icon>
            <span matListItemTitle>Insights</span>
          </a>
          <a mat-list-item routerLink="/research/keyword-clusters" routerLinkActive="active">
            <mat-icon matListItemIcon>hub</mat-icon>
            <span matListItemTitle>Keywords</span>
          </a>
          <a mat-list-item routerLink="/research/personas" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>Personas</span>
          </a>
          <a mat-list-item routerLink="/research/watchlists" routerLinkActive="active">
            <mat-icon matListItemIcon>visibility</mat-icon>
            <span matListItemTitle>Watchlists</span>
          </a>
          <a mat-list-item routerLink="/research/jobs" routerLinkActive="active">
            <mat-icon matListItemIcon>work_history</mat-icon>
            <span matListItemTitle>Jobs</span>
          </a>
          <a mat-list-item routerLink="/research/links" routerLinkActive="active">
            <mat-icon matListItemIcon>link</mat-icon>
            <span matListItemTitle>Links</span>
          </a>
          <a mat-list-item routerLink="/research/digests" routerLinkActive="active">
            <mat-icon matListItemIcon>summarize</mat-icon>
            <span matListItemTitle>Digests</span>
          </a>

          <div class="nav-group-label">AI Agents</div>

          <a mat-list-item routerLink="/ai/chat" routerLinkActive="active">
            <mat-icon matListItemIcon>smart_toy</mat-icon>
            <span matListItemTitle>Chat</span>
          </a>

          <a mat-list-item routerLink="/ai/prompts" routerLinkActive="active">
            <mat-icon matListItemIcon>auto_fix_high</mat-icon>
            <span matListItemTitle>Prompt Library</span>
          </a>

          <a mat-list-item routerLink="/ai/workflows" routerLinkActive="active">
            <mat-icon matListItemIcon>account_tree</mat-icon>
            <span matListItemTitle>Workflows</span>
          </a>

          <a mat-list-item routerLink="/ai/proposals" routerLinkActive="active">
            <mat-icon matListItemIcon>task_alt</mat-icon>
            <span matListItemTitle>Action Proposals</span>
          </a>

          <a mat-list-item routerLink="/ai/tools" routerLinkActive="active">
            <mat-icon matListItemIcon>build</mat-icon>
            <span matListItemTitle>Tools Catalog</span>
          </a>

          <div class="nav-group-label">AI Settings</div>

          <a mat-list-item routerLink="/ai/providers" routerLinkActive="active">
            <mat-icon matListItemIcon>vpn_key</mat-icon>
            <span matListItemTitle>Provider Keys</span>
          </a>

          <a mat-list-item routerLink="/ai/preferences" routerLinkActive="active">
            <mat-icon matListItemIcon>tune</mat-icon>
            <span matListItemTitle>Workspace AI Prefs</span>
          </a>

          <a mat-list-item routerLink="/ai/safety" routerLinkActive="active">
            <mat-icon matListItemIcon>shield</mat-icon>
            <span matListItemTitle>Safety & Redaction</span>
          </a>

          <div class="nav-group-label">Admin</div>

          <a mat-list-item routerLink="/admin/orgs" routerLinkActive="active">
            <mat-icon matListItemIcon>business</mat-icon>
            <span matListItemTitle>Organizations</span>
          </a>

          <a mat-list-item routerLink="/admin/workspaces" routerLinkActive="active">
            <mat-icon matListItemIcon>workspaces</mat-icon>
            <span matListItemTitle>Workspaces</span>
          </a>

          <a mat-list-item routerLink="/admin/members" routerLinkActive="active">
            <mat-icon matListItemIcon>group</mat-icon>
            <span matListItemTitle>Members & Roles</span>
          </a>

          <a mat-list-item routerLink="/admin/teams" routerLinkActive="active">
            <mat-icon matListItemIcon>groups</mat-icon>
            <span matListItemTitle>Teams</span>
          </a>

          <a mat-list-item routerLink="/admin/invites" routerLinkActive="active">
            <mat-icon matListItemIcon>mail</mat-icon>
            <span matListItemTitle>Invites</span>
          </a>

          <a mat-list-item routerLink="/admin/audit" routerLinkActive="active">
            <mat-icon matListItemIcon>history</mat-icon>
            <span matListItemTitle>Audit Log</span>
          </a>

          <a mat-list-item routerLink="/integrations/oauth-configs" routerLinkActive="active">
            <mat-icon matListItemIcon>key</mat-icon>
            <span matListItemTitle>OAuth Configs</span>
          </a>
        </mat-nav-list>

        <div class="sidenav-footer">
          <div class="user-info" [matMenuTriggerFor]="userMenu">
            <div class="user-avatar">
              {{ (authService.currentUser()?.fullName || 'U')[0] }}
            </div>
            <span class="user-name">{{ authService.currentUser()?.fullName }}</span>
            <mat-icon class="expand-icon">unfold_more</mat-icon>
          </div>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item (click)="authService.logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <div class="topbar">
          <h1 class="page-title">{{ getPageTitle() }}</h1>
          <span class="spacer"></span>
        </div>

        <main class="page-container">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell-container { height: 100vh; }
    .sidenav { width: var(--sidebar-width); display: flex; flex-direction: column; }
    .sidenav-header { padding: 20px 16px 8px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 32px; height: 32px; border-radius: var(--radius-md);
      background: var(--color-primary); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px;
    }
    .brand-name {
      font-size: 16px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.01em;
    }
    .workspace-selector { padding: 8px 16px 0; }
    .full-width { width: 100%; }
    .compact-field { margin-bottom: -8px; }
    .nav-list { flex: 1; padding: 0 8px; overflow-y: auto; }
    .nav-group-label {
      padding: 20px 16px 6px; font-size: 11px; font-weight: 600;
      color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
    }
    :host ::ng-deep .nav-list .mat-mdc-list-item {
      border-radius: var(--radius-md); margin-bottom: 2px; height: 38px;
      color: var(--text-secondary); transition: all var(--transition-fast);
      .mat-icon { color: var(--text-muted); font-size: 20px; width: 20px; height: 20px; margin-right: 10px; }
      &:hover {
        background: var(--bg-surface-hover) !important; color: var(--text-primary);
        .mat-icon { color: var(--text-secondary); }
      }
      &.active {
        background: var(--color-primary-muted) !important; color: var(--color-primary) !important;
        .mat-icon { color: var(--color-primary) !important; }
      }
    }
    .sidenav-footer { padding: 12px; border-top: 1px solid var(--border-default); }
    .user-info {
      display: flex; align-items: center; gap: 10px; padding: 8px;
      border-radius: var(--radius-md); cursor: pointer;
      transition: background var(--transition-fast);
      &:hover { background: var(--bg-surface-hover); }
    }
    .user-avatar {
      width: 28px; height: 28px; border-radius: var(--radius-full);
      background: var(--color-primary-muted); color: var(--color-primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 12px; flex-shrink: 0;
    }
    .user-name {
      font-size: 13px; font-weight: 500; color: var(--text-primary);
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .expand-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); }
    .topbar {
      display: flex; align-items: center; padding: 12px 32px;
      border-bottom: 1px solid var(--border-default); background: var(--bg-surface);
      position: sticky; top: 0; z-index: 10;
    }
    .page-title { font-size: 15px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.01em; }
    .spacer { flex: 1 1 auto; }
    .page-container { padding: 28px 32px; }
  `],
})
export class ShellComponent implements OnInit {
  organizations: Organization[] = [];
  workspaces: Workspace[] = [];

  constructor(
    public authService: AuthService,
    public workspaceService: WorkspaceService,
    public adminStore: AdminStore,
    private orgApi: OrgApiService,
    private wsApi: WorkspaceApiService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.http.get<UserProfile>(`${environment.apiUrl}/users/me`).subscribe({
      next: (profile) => this.adminStore.setUserProfile(profile),
    });

    this.orgApi.list().subscribe((orgs) => {
      this.organizations = orgs;
      this.adminStore.setOrgs(orgs as any);

      const savedOrgId = this.adminStore.selectedOrgId();
      const selectedOrg = savedOrgId ? orgs.find((o) => o.id === savedOrgId) : orgs[0];
      if (selectedOrg) {
        this.adminStore.selectOrg(selectedOrg.id);
        this.workspaceService.selectOrg(selectedOrg as any);
        this.loadWorkspaces(selectedOrg.id);
      }
    });
  }

  onOrgChange(orgId: string): void {
    this.adminStore.selectOrg(orgId);
    const org = this.organizations.find((o) => o.id === orgId);
    if (org) this.workspaceService.selectOrg(org as any);
    this.loadWorkspaces(orgId);
  }

  onWorkspaceChange(wsId: string | null): void {
    if (wsId) {
      this.adminStore.selectWorkspace(wsId);
      const ws = this.workspaces.find((w) => w.id === wsId);
      if (ws) this.workspaceService.selectWorkspace(ws as any);
    } else {
      this.adminStore.selectWorkspace(null as any);
    }
  }

  getPageTitle(): string {
    return 'AdstructAI';
  }

  private loadWorkspaces(orgId: string): void {
    this.wsApi.list(orgId).subscribe((wss) => {
      this.workspaces = wss as any[];
      this.adminStore.setWorkspaces(wss as any);
      const savedWsId = this.adminStore.selectedWorkspaceId();
      const selectedWs = savedWsId ? wss.find((w) => w.id === savedWsId) : wss[0];
      if (selectedWs) {
        this.adminStore.selectWorkspace(selectedWs.id);
        this.workspaceService.selectWorkspace(selectedWs as any);
      }
    });
  }
}
