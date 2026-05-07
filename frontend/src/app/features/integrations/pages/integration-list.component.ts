import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { IntegrationProvidersApiService } from '../services/integration-providers-api.service';
import { SyncJobsApiService } from '../services/sync-jobs-api.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  IntegrationAccountResponse,
  IntegrationProviderResponse,
  SyncJobResponse,
} from '@shared/models/api.models';
import { ConnectDialogComponent, ConnectDialogData } from '../components/connect-dialog.component';

interface QuickLink {
  icon: string;
  label: string;
  route: string;
  description: string;
}

@Component({
  selector: 'app-integration-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatDialogModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h2>Integrations Hub</h2>
        <p class="subtitle">Overview of your platform connections and data pipelines.</p>
      </div>
      <button mat-raised-button color="primary" (click)="openConnectDialog()">
        <mat-icon>add</mat-icon> Connect Platform
      </button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else {

      <!-- Getting Started guide when no accounts connected -->
      @if (accounts().length === 0) {
        <mat-card class="onboarding-card">
          <div class="onboarding-header">
            <mat-icon class="onboarding-icon">rocket_launch</mat-icon>
            <div>
              <div class="onboarding-title">Get started with Integrations</div>
              <div class="onboarding-sub">Connect your ad platforms in 3 simple steps to start syncing data.</div>
            </div>
          </div>
          <div class="steps-row">
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-content">
                <div class="step-label">Browse Providers</div>
                <div class="step-desc">Choose from {{ providers().length || 'available' }} supported platforms like Google Ads, Meta, ChatGPT Ads, and more.</div>
                <a mat-stroked-button color="primary" routerLink="/integrations/providers" class="step-action">
                  <mat-icon>extension</mat-icon> Browse providers
                </a>
              </div>
            </div>
            <mat-icon class="step-arrow">arrow_forward</mat-icon>
            <div class="step">
              <div class="step-num">2</div>
              <div class="step-content">
                <div class="step-label">Connect &amp; Authenticate</div>
                <div class="step-desc">Enter your API key, OAuth credentials, or service account JSON depending on the platform.</div>
              </div>
            </div>
            <mat-icon class="step-arrow">arrow_forward</mat-icon>
            <div class="step">
              <div class="step-num">3</div>
              <div class="step-content">
                <div class="step-label">Map &amp; Sync</div>
                <div class="step-desc">Link accounts to workspaces, create sync jobs, and start pulling campaign data automatically.</div>
              </div>
            </div>
          </div>
        </mat-card>
      }

      @if (accounts().length > 0) {
        <div class="stats-row">
          <mat-card class="stat-card">
            <div class="stat-icon-box"><mat-icon>hub</mat-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ accounts().length }}</div>
              <div class="stat-label">Accounts</div>
            </div>
          </mat-card>
          <mat-card class="stat-card">
            <div class="stat-icon-box active"><mat-icon>check_circle</mat-icon></div>
            <div class="stat-info">
              <div class="stat-value active">{{ activeCount() }}</div>
              <div class="stat-label">Active</div>
            </div>
          </mat-card>
          <mat-card class="stat-card">
            <div class="stat-icon-box warn"><mat-icon>error</mat-icon></div>
            <div class="stat-info">
              <div class="stat-value warn">{{ errorCount() }}</div>
              <div class="stat-label">Errors</div>
            </div>
          </mat-card>
          <mat-card class="stat-card">
            <div class="stat-icon-box"><mat-icon>extension</mat-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ providers().length }}</div>
              <div class="stat-label">Providers</div>
            </div>
          </mat-card>
          <mat-card class="stat-card">
            <div class="stat-icon-box"><mat-icon>sync</mat-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ syncJobs().length }}</div>
              <div class="stat-label">Sync Jobs</div>
            </div>
          </mat-card>
        </div>

        <h3 class="section-title">Connected Accounts</h3>
        <div class="accounts-grid">
          @for (account of accounts(); track account.id) {
            <mat-card class="account-card" [routerLink]="['/integrations/accounts', account.id]">
              <div class="account-header">
                <mat-chip [class]="'platform-chip ' + account.platformType.toLowerCase()">
                  {{ account.platformType }}
                </mat-chip>
                <mat-icon [class]="'account-status ' + account.status.toLowerCase()">
                  {{ account.status === 'ACTIVE' || account.status === 'CONNECTED' ? 'check_circle' : account.status === 'ERROR' ? 'error' : 'pending' }}
                </mat-icon>
              </div>
              <div class="account-name">{{ account.displayName }}</div>
              <div class="account-meta">{{ account.status | lowercase }}</div>
            </mat-card>
          }
        </div>

        <!-- Contextual next-steps hint -->
        @if (syncJobs().length === 0) {
          <div class="hint-banner">
            <mat-icon>tips_and_updates</mat-icon>
            <div>
              <strong>What's next?</strong> Your accounts are connected. Now
              <a routerLink="/integrations/workspace-mappings">link them to workspaces</a>, then
              <a routerLink="/integrations/sync-jobs">create a sync job</a> to start pulling campaign data.
            </div>
          </div>
        }
      }

      <h3 class="section-title">Manage Integrations</h3>
      <div class="links-grid">
        @for (link of quickLinks; track link.route) {
          <mat-card class="link-card" [routerLink]="link.route">
            <div class="link-icon-box"><mat-icon>{{ link.icon }}</mat-icon></div>
            <div class="link-text">
              <div class="link-label">{{ link.label }}</div>
              <div class="link-desc">{{ link.description }}</div>
            </div>
            <mat-icon class="link-arrow">chevron_right</mat-icon>
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .subtitle {
      color: rgba(0,0,0,0.55);
      font-size: 14px;
      margin: 0;
    }
    .loading { display: flex; justify-content: center; padding: 60px; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 10px;
      margin-bottom: 28px;
    }
    .stat-card {
      padding: 14px 16px !important;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stat-icon-box {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--color-primary-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon-box .mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--color-primary);
    }
    .stat-icon-box.active {
      background: var(--color-success-muted);
    }
    .stat-icon-box.active .mat-icon { color: var(--color-success); }
    .stat-icon-box.warn {
      background: var(--color-error-muted);
    }
    .stat-icon-box.warn .mat-icon { color: var(--color-error); }
    .stat-info { flex: 1; }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
      line-height: 1;
      color: var(--text-primary);
    }
    .stat-value.active { color: var(--color-success); }
    .stat-value.warn { color: var(--color-error); }
    .stat-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 3px;
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 12px;
      color: rgba(0,0,0,0.7);
    }

    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 28px;
    }
    .account-card {
      padding: 16px;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .account-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .account-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .account-name {
      font-size: 14px;
      font-weight: 600;
      color: rgba(0,0,0,0.85);
    }
    .account-meta {
      font-size: 12px;
      color: rgba(0,0,0,0.45);
      margin-top: 2px;
    }
    .account-status {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .account-status.active, .account-status.connected { color: #4caf50; }
    .account-status.error, .account-status.disconnected { color: #f44336; }
    .account-status.pending { color: #ff9800; }

    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 10px;
    }
    .link-card {
      padding: 14px 16px !important;
      cursor: pointer;
      transition: border-color var(--transition-fast);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .link-card:hover {
      border-color: var(--border-strong);
    }
    .link-icon-box {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--color-primary-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .link-icon-box .mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--color-primary);
    }
    .link-text { flex: 1; min-width: 0; }
    .link-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
    }
    .link-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 1px;
    }
    .link-arrow {
      color: var(--text-disabled);
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    /* Onboarding card */
    .onboarding-card {
      padding: 24px !important;
      margin-bottom: 28px;
      border: 1px dashed var(--color-primary);
      background: var(--color-primary-muted);
    }
    .onboarding-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 24px;
    }
    .onboarding-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .onboarding-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.3;
    }
    .onboarding-sub {
      font-size: 14px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .steps-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .step {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      padding: 16px;
      border: 1px solid var(--border-default);
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-content { flex: 1; }
    .step-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    .step-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .step-action {
      margin-top: 10px;
      font-size: 12px !important;
    }
    .step-arrow {
      color: var(--text-disabled);
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 28px;
    }

    /* Hint banner */
    .hint-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 18px;
      margin-bottom: 24px;
      border-radius: var(--radius-md);
      background: #fffbe6;
      border: 1px solid #ffe58f;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    .hint-banner .mat-icon {
      color: #d48806;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .hint-banner strong { color: var(--text-primary); }
    .hint-banner a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .hint-banner a:hover { text-decoration: underline; }

    @media (max-width: 768px) {
      .steps-row { flex-direction: column; }
      .step-arrow { display: none; }
    }
  `],
})
export class IntegrationListComponent implements OnInit {
  private accountsApi = inject(IntegrationAccountsApiService);
  private providersApi = inject(IntegrationProvidersApiService);
  private syncJobsApi = inject(SyncJobsApiService);
  private workspaceService = inject(WorkspaceService);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  loading = signal(true);
  accounts = signal<IntegrationAccountResponse[]>([]);
  providers = signal<IntegrationProviderResponse[]>([]);
  syncJobs = signal<SyncJobResponse[]>([]);

  activeCount = computed(() =>
    this.accounts().filter(a => a.status === 'ACTIVE' || a.status === 'CONNECTED').length
  );
  errorCount = computed(() =>
    this.accounts().filter(a => a.status === 'ERROR' || a.status === 'DISCONNECTED').length
  );

  quickLinks: QuickLink[] = [
    { icon: 'extension', label: 'Providers', route: '/integrations/providers', description: 'Step 1 — Browse and connect ad platforms, analytics, and CRM tools' },
    { icon: 'hub', label: 'Accounts', route: '/integrations/accounts', description: 'Step 2 — View and manage your connected platform credentials' },
    { icon: 'link', label: 'Workspace Mappings', route: '/integrations/workspace-mappings', description: 'Step 3 — Assign connected accounts to specific workspaces' },
    { icon: 'sync', label: 'Sync Jobs', route: '/integrations/sync-jobs', description: 'Step 4 — Schedule and run data imports from connected platforms' },
    { icon: 'bar_chart', label: 'Campaign Reports', route: '/integrations/campaign-reports', description: 'View synced performance data and map campaigns' },
    { icon: 'webhook', label: 'Webhooks', route: '/integrations/webhooks', description: 'Receive real-time event notifications from platforms' },
    { icon: 'device_hub', label: 'Entity Mappings', route: '/integrations/entity-mappings', description: 'Map external platform entities to internal records' },
    { icon: 'monitor_heart', label: 'Health', route: '/integrations/health', description: 'Monitor connection health and diagnose issues' },
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  openConnectDialog(): void {
    const org = this.workspaceService.currentOrg();
    if (!org) {
      this.notify.error('Select an organization first');
      return;
    }
    const data: ConnectDialogData = { orgId: org.id };
    const dialogRef = this.dialog.open(ConnectDialogComponent, { data, width: '500px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadDashboard();
    });
  }

  private loadDashboard(): void {
    const org = this.workspaceService.currentOrg();
    if (!org) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      accounts: this.accountsApi.list(org.id),
      providers: this.providersApi.list(),
      syncJobs: this.syncJobsApi.list(org.id),
    }).subscribe({
      next: ({ accounts, providers, syncJobs }) => {
        this.accounts.set(accounts);
        this.providers.set(providers);
        this.syncJobs.set(syncJobs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load integrations overview');
      },
    });
  }
}
