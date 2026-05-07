import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkspaceIntegrationsApiService } from '../services/workspace-integrations-api.service';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { IntegrationResourcesApiService } from '../services/integration-resources-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import {
  WorkspaceIntegrationResponse,
  IntegrationAccountResponse,
  IntegrationResourceResponse,
} from '@shared/models/api.models';

@Component({
  selector: 'app-workspace-mappings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  template: `
    <!-- Breadcrumb -->
    <div class="flow-breadcrumb">
      <a routerLink="/integrations"><mat-icon>dashboard</mat-icon> Overview</a>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <a routerLink="/integrations/accounts">Accounts</a>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <span class="bc-current">Workspace Mappings</span>
      <mat-icon class="bc-sep">chevron_right</mat-icon>
      <a routerLink="/integrations/sync-jobs">Sync Jobs</a>
    </div>

    <div class="page-header">
      <div>
        <h2>Workspace Mappings</h2>
        <p class="page-sub">Link connected integration accounts and their resources to specific workspaces. This controls which data flows into which workspace.</p>
      </div>
    </div>

    <!-- Explainer banner -->
    <div class="info-banner">
      <mat-icon>info</mat-icon>
      <div>
        <strong>Why map accounts to workspaces?</strong>
        Each workspace in AdstructAI represents a team or project. By mapping integration accounts and resources here,
        you control exactly which platform data (campaigns, ad accounts, analytics) is available in each workspace.
        This keeps data organized and ensures teams only see what's relevant to them.
      </div>
    </div>

    @if (!workspaceId()) {
      <div class="empty-state">
        <mat-icon class="empty-icon">workspaces</mat-icon>
        <div class="empty-title">Select a workspace to get started</div>
        <div class="empty-desc">
          Choose a workspace from the sidebar header to view and manage its integration mappings.
          If you haven't created workspaces yet, set them up in
          <a routerLink="/admin">Organization Settings</a> first.
        </div>
      </div>
    } @else {

      <!-- How it works steps -->
      <div class="how-it-works">
        <div class="hiw-step">
          <div class="hiw-num">1</div>
          <div>
            <strong>Pick an account</strong>
            <div class="hiw-desc">Select a connected integration account from the dropdown. Don't have any? <a routerLink="/integrations/providers">Connect one first</a>.</div>
          </div>
        </div>
        <mat-icon class="hiw-arrow">arrow_forward</mat-icon>
        <div class="hiw-step">
          <div class="hiw-num">2</div>
          <div>
            <strong>Choose a resource</strong>
            <div class="hiw-desc">Pick a specific resource (ad account, campaign, etc.) discovered from that account. No resources? <a routerLink="/integrations/accounts">Discover them</a> in account details.</div>
          </div>
        </div>
        <mat-icon class="hiw-arrow">arrow_forward</mat-icon>
        <div class="hiw-step">
          <div class="hiw-num">3</div>
          <div>
            <strong>Add the mapping</strong>
            <div class="hiw-desc">Click Add to link the resource to this workspace. You can toggle it on/off or set a default.</div>
          </div>
        </div>
      </div>

      <!-- Add mapping form -->
      <mat-card class="add-card">
        <mat-card-title>Add a new mapping</mat-card-title>
        <mat-card-content>
          @if (accounts().length === 0) {
            <div class="no-accounts-hint">
              <mat-icon>info</mat-icon>
              <span>
                No connected accounts found. <a routerLink="/integrations/providers">Browse providers</a> and connect a platform first,
                then return here to map it to this workspace.
              </span>
            </div>
          } @else {
            <div class="add-row">
              <mat-form-field appearance="outline">
                <mat-label>Integration Account</mat-label>
                <mat-select [(ngModel)]="pickAccountId" (selectionChange)="onAccountPicked()">
                  <mat-option [value]="''">— Select an account —</mat-option>
                  @for (a of accounts(); track a.id) {
                    <mat-option [value]="a.id">{{ a.displayName }} ({{ a.platformType }})</mat-option>
                  }
                </mat-select>
                <mat-hint>The connected platform account to pull data from</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Resource</mat-label>
                <mat-select [(ngModel)]="pickResourceId" [disabled]="!pickAccountId">
                  <mat-option [value]="''">— Select a resource —</mat-option>
                  @for (r of resources(); track r.id) {
                    <mat-option [value]="r.id">{{ r.displayName }} · {{ r.resourceType }}</mat-option>
                  }
                </mat-select>
                <mat-hint>{{ !pickAccountId ? 'Select an account first to see its resources' : resources().length === 0 ? 'No resources found — discover them in account details' : 'A specific object (ad account, campaign, etc.) from the platform' }}</mat-hint>
              </mat-form-field>
              <div class="toggle-wrap">
                <mat-slide-toggle [(ngModel)]="pickEnabled">Enabled</mat-slide-toggle>
                <span class="toggle-hint">When enabled, data syncs automatically for this mapping</span>
              </div>
              <button mat-raised-button color="primary" (click)="addMapping()" [disabled]="!canAdd()">
                <mat-icon>add</mat-icon>
                Add mapping
              </button>
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loading"><mat-spinner diameter="40" /></div>
      } @else if (rows.length === 0) {
        <div class="empty-table">
          <mat-icon class="empty-icon-sm">link_off</mat-icon>
          <div class="empty-table-title">No mappings for this workspace yet</div>
          <div class="empty-table-desc">
            Use the form above to link an integration account and resource to this workspace.
            Once mapped, data from that resource will flow into this workspace during sync jobs.
          </div>
        </div>
      } @else {
        <div class="table-header">
          <h3 class="section-title">Current mappings</h3>
          <span class="mapping-count">{{ rows.length }} mapping{{ rows.length !== 1 ? 's' : '' }}</span>
        </div>
        <table mat-table [dataSource]="rows" class="mat-elevation-z1 full-width">
          <ng-container matColumnDef="account">
            <th mat-header-cell *matHeaderCellDef>Account</th>
            <td mat-cell *matCellDef="let row">{{ row.accountDisplayName }}</td>
          </ng-container>
          <ng-container matColumnDef="resource">
            <th mat-header-cell *matHeaderCellDef>Resource</th>
            <td mat-cell *matCellDef="let row">{{ row.resourceDisplayName }}</td>
          </ng-container>
          <ng-container matColumnDef="enabled">
            <th mat-header-cell *matHeaderCellDef>
              <span matTooltip="When enabled, this mapping is active and data will be synced during jobs">Enabled</span>
            </th>
            <td mat-cell *matCellDef="let row">
              <mat-icon [class]="row.enabled ? 'status-on' : 'status-off'">
                {{ row.enabled ? 'check_circle' : 'cancel' }}
              </mat-icon>
            </td>
          </ng-container>
          <ng-container matColumnDef="isDefault">
            <th mat-header-cell *matHeaderCellDef>
              <span matTooltip="The default mapping is used when no specific resource is specified during a sync">Default</span>
            </th>
            <td mat-cell *matCellDef="let row">
              <mat-icon [class]="row.isDefault ? 'status-default' : 'status-off'">
                {{ row.isDefault ? 'star' : 'star_border' }}
              </mat-icon>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button (click)="setDefault(row)" matTooltip="Make this the default mapping — used when no specific resource is specified during sync">
                <mat-icon>star</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="remove(row)" matTooltip="Remove this mapping — the account stays connected, only the workspace link is removed">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>

        <!-- Next steps after having mappings -->
        <div class="next-steps-card">
          <div class="nsc-title">
            <mat-icon>tips_and_updates</mat-icon>
            <strong>What to do next</strong>
          </div>
          <div class="nsc-items">
            <div class="nsc-item">
              <mat-icon>sync</mat-icon>
              <a routerLink="/integrations/sync-jobs">Create a sync job</a>
              <span class="nsc-desc">— Schedule automatic data imports using these mapped resources</span>
            </div>
            <div class="nsc-item">
              <mat-icon>bar_chart</mat-icon>
              <a routerLink="/integrations/campaign-reports">View campaign reports</a>
              <span class="nsc-desc">— See synced performance data once sync jobs have run</span>
            </div>
            <div class="nsc-item">
              <mat-icon>device_hub</mat-icon>
              <a routerLink="/integrations/entity-mappings">Configure entity mappings</a>
              <span class="nsc-desc">— Map external platform entities to internal records for unified reporting</span>
            </div>
          </div>
        </div>
      }
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
    .page-sub { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; max-width: 540px; line-height: 1.5; }

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

    /* How it works */
    .how-it-works {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 20px;
    }
    .hiw-step {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 14px;
    }
    .hiw-num {
      width: 24px;
      height: 24px;
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
    .hiw-step strong { font-size: 13px; color: var(--text-primary); }
    .hiw-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-top: 2px; }
    .hiw-desc a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .hiw-desc a:hover { text-decoration: underline; }
    .hiw-arrow { color: var(--text-disabled); font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 20px; }

    /* Add card */
    .add-card { margin-bottom: 20px; }
    .add-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
    .add-row mat-form-field { min-width: 240px; flex: 1; }
    .toggle-wrap { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
    .toggle-hint { font-size: 11px; color: var(--text-muted); }

    .no-accounts-hint {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background: #fffbe6;
      border: 1px solid #ffe58f;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .no-accounts-hint .mat-icon { color: #d48806; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    .no-accounts-hint a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .no-accounts-hint a:hover { text-decoration: underline; }

    /* Empty states */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 24px;
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-disabled); margin-bottom: 16px; }
    .empty-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); max-width: 420px; line-height: 1.5; }
    .empty-desc a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .empty-desc a:hover { text-decoration: underline; }

    .empty-table {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 36px 24px;
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-md);
    }
    .empty-icon-sm { font-size: 36px; width: 36px; height: 36px; color: var(--text-disabled); margin-bottom: 12px; }
    .empty-table-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
    .empty-table-desc { font-size: 12px; color: var(--text-muted); max-width: 400px; line-height: 1.5; }

    /* Table */
    .full-width { width: 100%; }
    .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .section-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .mapping-count { font-size: 12px; color: var(--text-muted); }
    .status-on { color: #4caf50; font-size: 20px; width: 20px; height: 20px; }
    .status-off { color: var(--text-disabled); font-size: 20px; width: 20px; height: 20px; }
    .status-default { color: #f59e0b; font-size: 20px; width: 20px; height: 20px; }

    .loading { display: flex; justify-content: center; padding: 40px; }

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

    @media (max-width: 768px) {
      .how-it-works { flex-direction: column; }
      .hiw-arrow { display: none; }
    }
  `],
})
export class WorkspaceMappingsComponent implements OnInit {
  private mappingsApi = inject(WorkspaceIntegrationsApiService);
  private accountsApi = inject(IntegrationAccountsApiService);
  private resourcesApi = inject(IntegrationResourcesApiService);
  admin = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly workspaceId = this.admin.selectedWorkspaceId;
  loading = signal(false);
  rows: WorkspaceIntegrationResponse[] = [];
  displayedColumns = ['account', 'resource', 'enabled', 'isDefault', 'actions'];

  accounts = signal<IntegrationAccountResponse[]>([]);
  resources = signal<IntegrationResourceResponse[]>([]);

  pickAccountId = '';
  pickResourceId = '';
  pickEnabled = true;

  ngOnInit(): void {
    const oid = this.admin.selectedOrgId();
    if (oid) {
      this.accountsApi.list(oid).subscribe({
        next: (a) => this.accounts.set(a),
        error: () => this.notify.error('Failed to load accounts'),
      });
    }
    this.reload();
  }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.rows = [];
      return;
    }
    this.loading.set(true);
    this.mappingsApi.list(ws).subscribe({
      next: (data) => {
        this.rows = data;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load mappings');
      },
    });
  }

  onAccountPicked(): void {
    this.pickResourceId = '';
    const aid = this.pickAccountId;
    const oid = this.admin.selectedOrgId();
    if (!aid || !oid) {
      this.resources.set([]);
      return;
    }
    this.resourcesApi.list(oid, aid).subscribe({
      next: (r) => this.resources.set(r),
      error: () => this.notify.error('Failed to load resources'),
    });
  }

  canAdd(): boolean {
    return !!(this.workspaceId() && this.pickAccountId && this.pickResourceId);
  }

  addMapping(): void {
    const ws = this.workspaceId();
    if (!ws || !this.pickAccountId || !this.pickResourceId) return;
    this.mappingsApi
      .create(ws, {
        accountId: this.pickAccountId,
        resourceId: this.pickResourceId,
        enabled: this.pickEnabled,
      })
      .subscribe({
        next: () => {
          this.notify.success('Mapping created');
          this.pickResourceId = '';
          this.reload();
        },
        error: (err) => {
          const detail = err?.error?.detail || 'Create failed';
          this.notify.error(err?.status === 409 ? 'This mapping already exists' : detail);
        },
      });
  }

  setDefault(row: WorkspaceIntegrationResponse): void {
    const ws = this.workspaceId();
    if (!ws) return;
    this.mappingsApi.setDefault(ws, row.id).subscribe({
      next: () => {
        this.notify.success('Default updated');
        this.reload();
      },
      error: () => this.notify.error('Update failed'),
    });
  }

  remove(row: WorkspaceIntegrationResponse): void {
    if (!window.confirm('Delete this mapping?')) return;
    const ws = this.workspaceId();
    if (!ws) return;
    this.mappingsApi.remove(ws, row.id).subscribe({
      next: () => {
        this.notify.success('Deleted');
        this.reload();
      },
      error: () => this.notify.error('Delete failed'),
    });
  }
}
