import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { IntegrationAccountResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <!-- Breadcrumb flow indicator -->
    <div class="flow-breadcrumb">
      <a routerLink="/integrations"><mat-icon>dashboard</mat-icon> Overview</a>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <a routerLink="/integrations/providers">Providers</a>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <span class="bc-current">Accounts</span>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <a routerLink="/integrations/sync-jobs">Sync Jobs</a>
    </div>

    <div class="page-header">
      <div>
        <h2>Integration Accounts</h2>
        <p class="page-sub">View and manage your connected platform accounts. Click any account for details, or validate credentials to check health.</p>
      </div>
      <button mat-raised-button color="primary" routerLink="/integrations/providers">
        <mat-icon>add_link</mat-icon>
        Connect new account
      </button>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="filter">
        <mat-label>Platform</mat-label>
        <mat-select [value]="platform()" (selectionChange)="platform.set($event.value); reload()">
          <mat-option [value]="''">All</mat-option>
          @for (p of platformOptions(); track p) {
            <mat-option [value]="p">{{ p }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter">
        <mat-label>Status</mat-label>
        <mat-select [value]="status()" (selectionChange)="status.set($event.value); reload()">
          <mat-option [value]="''">All</mat-option>
          @for (s of statusOptions(); track s) {
            <mat-option [value]="s">{{ s }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (!orgId()) {
      <div class="empty-state">
        <mat-icon class="empty-icon">domain</mat-icon>
        <div class="empty-title">Select an organization</div>
        <div class="empty-desc">Choose an organization from the sidebar to view your connected accounts.</div>
      </div>
    } @else if (rows.length === 0) {
      <div class="empty-state">
        <mat-icon class="empty-icon">hub</mat-icon>
        <div class="empty-title">No accounts connected yet</div>
        <div class="empty-desc">Connect your first integration to start syncing campaign data, analytics, and more from external platforms.</div>
        <div class="empty-steps">
          <div class="empty-step">
            <span class="empty-step-num">1</span>
            <a routerLink="/integrations/providers">Browse providers</a> to find your platform
          </div>
          <div class="empty-step">
            <span class="empty-step-num">2</span>
            Click <strong>Connect</strong> and enter your credentials
          </div>
          <div class="empty-step">
            <span class="empty-step-num">3</span>
            Your account will appear here for management
          </div>
        </div>
        <a mat-raised-button color="primary" routerLink="/integrations/providers" class="empty-cta">
          <mat-icon>extension</mat-icon> Browse providers
        </a>
      </div>
    } @else {
      <table mat-table [dataSource]="rows" class="mat-elevation-z1 full-width">
        <ng-container matColumnDef="displayName">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let row">
            <a [routerLink]="['/integrations/accounts', row.id]" class="row-link">{{ row.displayName }}</a>
          </td>
        </ng-container>
        <ng-container matColumnDef="platformType">
          <th mat-header-cell *matHeaderCellDef>Platform</th>
          <td mat-cell *matCellDef="let row">{{ row.platformType }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let row">
            <mat-chip [class]="chipClass(row.status)">{{ row.status }}</mat-chip>
          </td>
        </ng-container>
        <ng-container matColumnDef="lastValidatedAt">
          <th mat-header-cell *matHeaderCellDef>Last validated</th>
          <td mat-cell *matCellDef="let row">{{ row.lastValidatedAt | date: 'medium' }}</td>
        </ng-container>
        <ng-container matColumnDef="lastSyncAt">
          <th mat-header-cell *matHeaderCellDef>Last sync</th>
          <td mat-cell *matCellDef="let row">{{ row.lastSyncAt | date: 'medium' }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let row">
            <a mat-icon-button [routerLink]="['/integrations/accounts', row.id]" matTooltip="View details, resources, and manage this connection">
              <mat-icon>visibility</mat-icon>
            </a>
            <button mat-icon-button color="primary" (click)="validate(row)" matTooltip="Test the connection to verify credentials are still valid">
              <mat-icon>verified</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="disconnect(row)" matTooltip="Remove this connection — data already synced won't be deleted">
              <mat-icon>link_off</mat-icon>
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      <!-- Recommended next steps -->
      <div class="next-steps-card">
        <div class="nsc-title">
          <mat-icon>tips_and_updates</mat-icon>
          <strong>Recommended next steps</strong>
        </div>
        <div class="nsc-items">
          <div class="nsc-item">
            <mat-icon>link</mat-icon>
            <a routerLink="/integrations/workspace-mappings">Map accounts to workspaces</a>
            <span class="nsc-desc">— Assign accounts to specific workspaces so data stays organized</span>
          </div>
          <div class="nsc-item">
            <mat-icon>sync</mat-icon>
            <a routerLink="/integrations/sync-jobs">Create sync jobs</a>
            <span class="nsc-desc">— Schedule automatic data imports from your connected platforms</span>
          </div>
          <div class="nsc-item">
            <mat-icon>bar_chart</mat-icon>
            <a routerLink="/integrations/campaign-reports">View campaign reports</a>
            <span class="nsc-desc">— See synced performance data and map campaigns</span>
          </div>
          <div class="nsc-item">
            <mat-icon>monitor_heart</mat-icon>
            <a routerLink="/integrations/health">Check health</a>
            <span class="nsc-desc">— Monitor connection status and diagnose issues</span>
          </div>
        </div>
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

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    h2 { margin: 0; font-size: 22px; font-weight: 600; }
    .page-sub { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; max-width: 480px; line-height: 1.5; }
    .filters { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .filter { width: 200px; }
    .full-width { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .row-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .row-link:hover { text-decoration: underline; }
    mat-chip.status-ok, mat-chip.status-connected { --mdc-chip-container-color: #e8f5e9; color: #1b5e20; }
    mat-chip.status-warn, mat-chip.status-degraded { --mdc-chip-container-color: #fff3e0; color: #e65100; }
    mat-chip.status-err, mat-chip.status-error, mat-chip.status-disconnected {
      --mdc-chip-container-color: #ffebee; color: #b71c1c;
    }

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
    .empty-desc { font-size: 13px; color: var(--text-muted); max-width: 420px; line-height: 1.5; margin-bottom: 20px; }
    .empty-steps { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; text-align: left; }
    .empty-step {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .empty-step a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .empty-step a:hover { text-decoration: underline; }
    .empty-step-num {
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
    .empty-cta { margin-top: 4px; }

    /* Next steps card */
    .next-steps-card {
      margin-top: 16px;
      padding: 16px 20px;
      border-radius: var(--radius-md);
      background: #f9fafb;
      border: 1px solid var(--border-default);
    }
    .nsc-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-primary);
      margin-bottom: 12px;
    }
    .nsc-title .mat-icon { color: #d48806; font-size: 20px; width: 20px; height: 20px; }
    .nsc-items { display: flex; flex-direction: column; gap: 8px; }
    .nsc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .nsc-item .mat-icon {
      color: var(--color-primary);
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .nsc-item a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .nsc-item a:hover { text-decoration: underline; }
    .nsc-desc { color: var(--text-muted); }
  `],
})
export class AccountsListComponent implements OnInit {
  private accountsApi = inject(IntegrationAccountsApiService);
  admin = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly orgId = this.admin.selectedOrgId;
  platform = signal('');
  status = signal('');
  loading = signal(false);
  rows: IntegrationAccountResponse[] = [];
  displayedColumns = [
    'displayName',
    'platformType',
    'status',
    'lastValidatedAt',
    'lastSyncAt',
    'actions',
  ];

  platformOptions = signal<string[]>([]);
  statusOptions = signal<string[]>([]);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const oid = this.orgId();
    if (!oid) {
      this.rows = [];
      return;
    }
    this.loading.set(true);
    const pf = this.platform() || undefined;
    const st = this.status() || undefined;
    this.accountsApi
      .list(oid, {
        platformType: pf,
        status: st,
      })
      .subscribe({
        next: (data) => {
          this.rows = data;
          const ps = new Set<string>();
          const ss = new Set<string>();
          for (const r of data) {
            ps.add(r.platformType);
            ss.add(r.status);
          }
          this.platformOptions.set([...ps].sort());
          this.statusOptions.set([...ss].sort());
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notify.error('Failed to load accounts');
        },
      });
  }

  chipClass(statusVal: string): string {
    const s = statusVal.toLowerCase();
    if (s.includes('connect') && !s.includes('dis')) return 'status-connected';
    if (s.includes('ok') || s.includes('valid')) return 'status-ok';
    if (s.includes('error') || s.includes('fail') || s.includes('disconn')) return 'status-err';
    if (s.includes('degrad') || s.includes('warn')) return 'status-warn';
    return '';
  }

  validate(row: IntegrationAccountResponse): void {
    const oid = this.orgId();
    if (!oid) return;
    this.accountsApi.validate(oid, row.id).subscribe({
      next: () => {
        this.notify.success('Validation started');
        this.reload();
      },
      error: () => this.notify.error('Validation failed'),
    });
  }

  disconnect(row: IntegrationAccountResponse): void {
    const oid = this.orgId();
    if (!oid) return;
    if (!window.confirm(`Disconnect ${row.displayName}?`)) return;
    this.accountsApi.disconnect(oid, row.id).subscribe({
      next: () => {
        this.notify.success('Disconnected');
        this.reload();
      },
      error: () => this.notify.error('Disconnect failed'),
    });
  }
}
