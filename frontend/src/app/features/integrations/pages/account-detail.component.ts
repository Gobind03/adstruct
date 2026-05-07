import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { IntegrationResourcesApiService } from '../services/integration-resources-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { IntegrationAccountResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <!-- Breadcrumb -->
    <div class="flow-breadcrumb">
      <a routerLink="/integrations"><mat-icon>dashboard</mat-icon> Overview</a>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <a routerLink="/integrations/accounts">Accounts</a>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <span class="bc-current">{{ account()?.displayName || 'Detail' }}</span>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (account()) {
      <div class="page-header">
        <div>
          <h2>{{ account()!.displayName }}</h2>
          <p class="muted">{{ account()!.platformType }} · {{ account()!.status }}</p>
        </div>
        <div class="actions">
          <button mat-stroked-button (click)="validate()" matTooltip="Test the connection to verify your credentials are still valid and the platform is reachable">
            <mat-icon>verified</mat-icon>
            Validate
          </button>
          <button mat-stroked-button (click)="discover()" matTooltip="Scan the platform for available resources (ad accounts, campaigns, etc.) to import">
            <mat-icon>travel_explore</mat-icon>
            Discover resources
          </button>
          <button mat-stroked-button color="warn" (click)="disconnect()" matTooltip="Remove this connection — previously synced data will not be deleted">
            <mat-icon>link_off</mat-icon>
            Disconnect
          </button>
          <button mat-raised-button (click)="rotateSecret()" matTooltip="Generate new credentials for this connection — use if existing keys were compromised">
            <mat-icon>vpn_key</mat-icon>
            Rotate secret
          </button>
          <a mat-raised-button color="primary" [routerLink]="['/integrations/accounts', account()!.id, 'resources']" matTooltip="View and manage discovered platform resources like ad accounts and campaigns">
            <mat-icon>inventory_2</mat-icon>
            Resources
          </a>
        </div>
      </div>

      <mat-card class="block">
        <mat-card-title>Summary</mat-card-title>
        <mat-card-content>
          <div class="grid">
            <div><span class="label">Status</span><div>{{ account()!.status }}</div></div>
            <div><span class="label">Last validated</span><div>{{ account()!.lastValidatedAt ? (account()!.lastValidatedAt | date: 'medium') : 'Never — click Validate above to check' }}</div></div>
            <div><span class="label">Last sync</span><div>{{ account()!.lastSyncAt ? (account()!.lastSyncAt | date: 'medium') : 'No syncs yet — create a sync job to start' }}</div></div>
          </div>
          @if (account()!.errorMessage) {
            <mat-divider />
            <div class="error-box">
              <mat-icon color="warn">error_outline</mat-icon>
              <div>
                <div>{{ account()!.errorMessage }}</div>
                <div class="error-help">Try <strong>Validate</strong> to re-check. If the issue persists, <strong>Rotate secret</strong> with new credentials or re-connect from the <a routerLink="/integrations/providers">Providers</a> page.</div>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="block">
        <mat-card-title>Scopes</mat-card-title>
        <mat-card-content>
          @if (scopes().length === 0) {
            <p class="muted">No scopes recorded. Scopes define what data this connection can access. They are set during authorization and will appear here after validation.</p>
          } @else {
            <div class="scopes">
              @for (s of scopes(); track s) {
                <mat-chip>{{ s }}</mat-chip>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- What's next guidance -->
      <mat-card class="block whats-next-card">
        <mat-card-title>
          <mat-icon class="wn-icon">tips_and_updates</mat-icon>
          What's next?
        </mat-card-title>
        <mat-card-content>
          <div class="wn-steps">
            <div class="wn-step">
              <div class="wn-step-num">1</div>
              <div>
                <strong>Discover resources</strong> — Click "Discover resources" above to find ad accounts, campaigns, and other objects available through this connection.
              </div>
            </div>
            <div class="wn-step">
              <div class="wn-step-num">2</div>
              <div>
                <strong><a [routerLink]="['/integrations/accounts', account()!.id, 'resources']">View resources</a></strong> — Browse discovered resources and select which ones to sync.
              </div>
            </div>
            <div class="wn-step">
              <div class="wn-step-num">3</div>
              <div>
                <strong><a routerLink="/integrations/workspace-mappings">Map to workspaces</a></strong> — Assign this account to workspaces so its data routes to the right team.
              </div>
            </div>
            <div class="wn-step">
              <div class="wn-step-num">4</div>
              <div>
                <strong><a routerLink="/integrations/sync-jobs">Create a sync job</a></strong> — Schedule automatic data imports to keep your campaign data up to date.
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <div class="empty-state">
        <mat-icon class="empty-icon">search_off</mat-icon>
        <div class="empty-title">Account not found</div>
        <div class="empty-desc">This account may have been disconnected or doesn't exist. Go back to <a routerLink="/integrations/accounts">Accounts</a> to see all connections.</div>
      </div>
    }
  `,
  styles: [`
    /* Breadcrumb */
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

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin: 0 0 24px; }
    h2 { margin: 0; font-size: 22px; font-weight: 600; }
    .muted { color: var(--mat-sys-on-surface-variant, rgba(0,0,0,.6)); margin: 4px 0 0; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .block { margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--mat-sys-on-surface-variant, rgba(0,0,0,.6)); }
    .error-box { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; color: #b71c1c; }
    .error-help { font-size: 12px; color: rgba(0,0,0,.55); margin-top: 4px; }
    .error-help strong { color: rgba(0,0,0,.7); }
    .error-help a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .error-help a:hover { text-decoration: underline; }
    .scopes { display: flex; flex-wrap: wrap; gap: 8px; }
    .loading { display: flex; justify-content: center; padding: 48px; }

    /* What's next card */
    .whats-next-card {
      background: #f9fafb !important;
      border: 1px solid var(--border-default);
    }
    .wn-icon {
      color: #d48806;
      font-size: 20px;
      width: 20px;
      height: 20px;
      vertical-align: middle;
      margin-right: 6px;
    }
    .wn-steps { display: flex; flex-direction: column; gap: 12px; }
    .wn-step {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .wn-step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .wn-step strong { color: var(--text-primary); }
    .wn-step a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .wn-step a:hover { text-decoration: underline; }

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
    .empty-desc { font-size: 13px; color: var(--text-muted); max-width: 360px; line-height: 1.5; }
    .empty-desc a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .empty-desc a:hover { text-decoration: underline; }
  `],
})
export class AccountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private accountsApi = inject(IntegrationAccountsApiService);
  private resourcesApi = inject(IntegrationResourcesApiService);
  private admin = inject(AdminStore);
  private notify = inject(NotificationService);

  loading = signal(true);
  account = signal<IntegrationAccountResponse | null>(null);
  scopes = signal<string[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const oid = this.admin.selectedOrgId();
    if (!id || !oid) {
      this.loading.set(false);
      return;
    }
    this.accountsApi.getById(oid, id).subscribe({
      next: (a) => {
        this.account.set(a);
        this.scopes.set(this.parseScopes(a.scopesJson));
        this.loading.set(false);
      },
      error: () => {
        this.account.set(null);
        this.loading.set(false);
        this.notify.error('Failed to load account');
      },
    });
  }

  private parseScopes(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) return j.map(String);
    } catch {
      /* fall through */
    }
    return raw.split(/[,\s]+/).filter(Boolean);
  }

  validate(): void {
    const oid = this.admin.selectedOrgId();
    const id = this.account()?.id;
    if (!oid || !id) return;
    this.accountsApi.validate(oid, id).subscribe({
      next: () => {
        this.notify.success('Validated');
        this.refresh(oid, id);
      },
      error: () => this.notify.error('Validation failed'),
    });
  }

  discover(): void {
    const oid = this.admin.selectedOrgId();
    const id = this.account()?.id;
    if (!oid || !id) return;
    this.resourcesApi.discover(oid, id).subscribe({
      next: (rows) => this.notify.success(`Discovered ${rows.length} resources`),
      error: () => this.notify.error('Discover failed'),
    });
  }

  disconnect(): void {
    const oid = this.admin.selectedOrgId();
    const a = this.account();
    if (!oid || !a || !window.confirm(`Disconnect ${a.displayName}?`)) return;
    this.accountsApi.disconnect(oid, a.id).subscribe({
      next: () => {
        this.notify.success('Disconnected');
        void this.router.navigate(['/integrations/accounts']);
      },
      error: () => this.notify.error('Disconnect failed'),
    });
  }

  rotateSecret(): void {
    const oid = this.admin.selectedOrgId();
    const id = this.account()?.id;
    if (!oid || !id || !window.confirm('Rotate the integration secret? Existing tokens may stop working.')) return;
    this.accountsApi.rotateSecrets(oid, id, {}).subscribe({
      next: () => this.notify.success('Secret rotated'),
      error: () => this.notify.error('Rotate failed'),
    });
  }

  private refresh(orgId: string, accountId: string): void {
    this.accountsApi.getById(orgId, accountId).subscribe({
      next: (a) => {
        this.account.set(a);
        this.scopes.set(this.parseScopes(a.scopesJson));
      },
      error: () => this.notify.error('Refresh failed'),
    });
  }
}
