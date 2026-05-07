import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { IntegrationProvidersApiService } from '../services/integration-providers-api.service';
import { OauthApiService } from '../services/oauth-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { IntegrationProviderResponse } from '@shared/models/api.models';
import { ConnectDialogComponent, ConnectDialogData } from '../components/connect-dialog.component';
import { PlatformLogoComponent } from '@shared/components/platform-logo.component';

@Component({
  selector: 'app-providers-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PlatformLogoComponent,
  ],
  template: `
    <!-- Breadcrumb flow indicator -->
    <div class="flow-breadcrumb">
      <a routerLink="/integrations"><mat-icon>dashboard</mat-icon> Overview</a>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <span class="bc-current">Providers</span>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <a routerLink="/integrations/accounts">Accounts</a>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <a routerLink="/integrations/sync-jobs">Sync Jobs</a>
    </div>

    <div class="page-header">
      <div>
        <h2>Integration Providers</h2>
        <p class="page-sub">Browse available platforms and connect them to start syncing data. Each provider requires specific credentials — hover over the auth badge for details.</p>
      </div>
      <a mat-stroked-button routerLink="/integrations/accounts">
        <mat-icon>hub</mat-icon>
        View connected accounts
      </a>
    </div>

    <!-- How it works banner -->
    <div class="info-banner">
      <mat-icon>info</mat-icon>
      <div>
        <strong>How connecting works:</strong>
        Click <strong>Connect</strong> on any provider below.
        <strong>OAuth2</strong> platforms will redirect you to authorize access in a new tab.
        <strong>API Key</strong> and <strong>Service Account</strong> platforms will open a form where you paste your credentials.
        Once connected, manage your accounts in the
        <a routerLink="/integrations/accounts">Accounts</a> page.
      </div>
    </div>

    <div class="toolbar">
      <mat-form-field appearance="outline" class="search">
        <mat-label>Search providers</mat-label>
        <input matInput [value]="search()" (input)="search.set($any($event.target).value)" placeholder="e.g. Google Ads, Meta, Shopify..." />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <div class="chips">
        <span class="muted">Category</span>
        <mat-chip-listbox>
          <mat-chip-option [selected]="!category()" (click)="category.set(null)">All</mat-chip-option>
          @for (c of categories(); track c) {
            <mat-chip-option [selected]="category() === c" (click)="category.set(c)">{{ c }}</mat-chip-option>
          }
        </mat-chip-listbox>
      </div>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (!orgId()) {
      <div class="empty-state">
        <mat-icon class="empty-icon">domain</mat-icon>
        <div class="empty-title">Select an organization first</div>
        <div class="empty-desc">Choose an organization from the sidebar to browse available integration providers.</div>
      </div>
    } @else if (filteredProviders().length === 0 && (search() || category())) {
      <div class="empty-state">
        <mat-icon class="empty-icon">search_off</mat-icon>
        <div class="empty-title">No providers match your search</div>
        <div class="empty-desc">Try a different keyword or clear the category filter.</div>
        <button mat-stroked-button (click)="search.set(''); category.set(null)">Clear filters</button>
      </div>
    } @else {
      <div class="grid">
        @for (p of filteredProviders(); track p.id) {
          <mat-card class="card">
            <div class="card-top">
              <app-platform-logo [platformType]="p.platformType" [size]="36" />
              <div class="card-info">
                <div class="card-name">{{ p.displayName }}</div>
                <div class="card-sub">
                  {{ p.category }}
                  <span class="auth-badge" [matTooltip]="authTooltip(p.authType)">
                    <mat-icon inline>{{ authIcon(p.authType) }}</mat-icon>
                    {{ authLabel(p.authType) }}
                  </span>
                </div>
              </div>
              <button mat-raised-button color="primary" class="connect-btn" (click)="connect(p)">
                Connect
              </button>
            </div>
            @if (capabilitiesOf(p).length || p.docsUrl) {
              <div class="card-bottom">
                <div class="caps">
                  @for (cap of capabilitiesOf(p); track cap) {
                    <mat-chip>{{ cap }}</mat-chip>
                  }
                </div>
                @if (p.docsUrl) {
                  <a [href]="p.docsUrl" target="_blank" rel="noopener" class="docs">
                    <mat-icon inline>open_in_new</mat-icon> Docs
                  </a>
                }
              </div>
            }
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    /* Flow breadcrumb */
    .flow-breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .flow-breadcrumb a {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 500;
      transition: color var(--transition-fast);
    }
    .flow-breadcrumb a:hover { color: var(--color-primary); }
    .flow-breadcrumb a .mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .bc-sep { font-size: 16px; width: 16px; height: 16px; color: var(--text-disabled); }
    .bc-current { font-weight: 600; color: var(--text-primary); }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    h2 { margin: 0; font-size: 22px; font-weight: 600; }
    .page-sub { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; max-width: 560px; line-height: 1.5; }
    .toolbar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .search { width: 100%; max-width: 420px; }
    .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .muted { color: var(--mat-sys-on-surface-variant, rgba(0,0,0,.6)); font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 10px; }
    .card {
      overflow: hidden;
      padding: 14px 16px !important;
    }
    :host ::ng-deep .card .mat-mdc-card-content,
    :host ::ng-deep .card .mat-mdc-card-header,
    :host ::ng-deep .card .mat-mdc-card-actions { display: none; }
    .card-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .card-info {
      flex: 1;
      min-width: 0;
    }
    .card-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 1px;
    }
    .connect-btn {
      flex-shrink: 0;
      font-size: 13px !important;
      padding: 0 14px !important;
      min-width: 0 !important;
      height: 32px !important;
      line-height: 32px !important;
    }
    .card-bottom {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border-default);
    }
    .caps { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
    :host ::ng-deep .caps .mat-mdc-chip { font-size: 11px; height: 24px; }
    .docs {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      text-decoration: none;
      color: var(--text-muted);
      flex-shrink: 0;
      transition: color var(--transition-fast);
    }
    .docs:hover { color: var(--color-primary); }
    .docs .mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .loading { display: flex; justify-content: center; padding: 48px; }

    /* Info banner */
    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
      border-radius: var(--radius-md);
      background: #f0f7ff;
      border: 1px solid #bdd7ff;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    .info-banner .mat-icon { color: #1976d2; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
    .info-banner strong { color: var(--text-primary); }
    .info-banner a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .info-banner a:hover { text-decoration: underline; }

    /* Auth badge */
    .auth-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: help;
      border-bottom: 1px dotted var(--text-disabled);
      margin-left: 6px;
    }
    .auth-badge .mat-icon { font-size: 13px; width: 13px; height: 13px; }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 24px;
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-disabled); margin-bottom: 16px; }
    .empty-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); max-width: 360px; line-height: 1.5; margin-bottom: 12px; }
  `],
})
export class ProvidersListComponent implements OnInit {
  private providersApi = inject(IntegrationProvidersApiService);
  private oauthApi = inject(OauthApiService);
  private admin = inject(AdminStore);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  readonly orgId = this.admin.selectedOrgId;
  search = signal('');
  category = signal<string | null>(null);
  loading = signal(false);
  private all = signal<IntegrationProviderResponse[]>([]);

  categories = computed(() => {
    const set = new Set<string>();
    for (const p of this.all()) {
      if (p.category) set.add(p.category);
    }
    return [...set].sort();
  });

  filteredProviders = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    return this.all().filter((p) => {
      if (cat && p.category !== cat) return false;
      if (!q) return true;
      const caps = this.capabilitiesOf(p).join(' ');
      const blob = [p.displayName, p.platformType, p.category, p.authType, caps].join(' ').toLowerCase();
      return blob.includes(q);
    });
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.providersApi.list().subscribe({
      next: (rows) => {
        this.all.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load providers');
      },
    });
  }

  capabilitiesOf(p: IntegrationProviderResponse): string[] {
    try {
      const parsed = JSON.parse(p.capabilitiesJson || '[]') as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  authTooltip(authType: string): string {
    switch (authType) {
      case 'OAUTH2': return 'OAuth2 — You\'ll be redirected to the platform to authorize access. No credentials to copy.';
      case 'API_KEY': return 'API Key — You\'ll need an API key from the platform\'s developer settings.';
      case 'BASIC': return 'Basic Auth — Requires a username and password from the platform.';
      case 'SERVICE_ACCOUNT': return 'Service Account — Paste the JSON key file from the platform\'s admin console.';
      default: return authType;
    }
  }

  authIcon(authType: string): string {
    switch (authType) {
      case 'OAUTH2': return 'open_in_new';
      case 'API_KEY': return 'vpn_key';
      case 'BASIC': return 'password';
      case 'SERVICE_ACCOUNT': return 'description';
      default: return 'lock';
    }
  }

  authLabel(authType: string): string {
    switch (authType) {
      case 'OAUTH2': return 'OAuth2';
      case 'API_KEY': return 'API Key';
      case 'BASIC': return 'Username/Password';
      case 'SERVICE_ACCOUNT': return 'Service Account';
      default: return authType;
    }
  }

  connect(p: IntegrationProviderResponse): void {
    const oid = this.orgId();
    if (!oid) {
      this.notify.error('Select an organization first');
      return;
    }
    if (p.authType === 'OAUTH2') {
      this.oauthApi.authorize(p.platformType, oid, p.displayName).subscribe({
        next: (res) => {
          if (res.authUrl) {
            window.open(res.authUrl, '_blank', 'noopener');
          }
          this.notify.success('Opening OAuth authorization');
        },
        error: () => this.notify.error('Could not start OAuth flow'),
      });
    } else {
      const dialogData: ConnectDialogData = {
        orgId: oid,
        platformType: p.platformType,
        displayName: p.displayName,
        authType: p.authType,
      };
      this.dialog.open(ConnectDialogComponent, { data: dialogData, width: '480px' });
    }
  }
}
