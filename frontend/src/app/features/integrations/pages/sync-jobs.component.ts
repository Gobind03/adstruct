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
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SyncJobsApiService } from '../services/sync-jobs-api.service';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { SyncJobResponse, IntegrationAccountResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-sync-jobs',
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
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h2>Sync Jobs</h2>
        <p class="subtitle">Fetch campaign performance data from your connected ad platforms</p>
      </div>
      <a mat-stroked-button routerLink="/integrations/campaign-reports">
        <mat-icon>bar_chart</mat-icon>
        View Reports
      </a>
    </div>

    <mat-card class="guide-card">
      <mat-card-content>
        <div class="guide-steps">
          <div class="guide-step">
            <div class="step-number">1</div>
            <div class="step-text">
              <strong>Select an account</strong> from your
              <a routerLink="/integrations/accounts">connected platforms</a>
            </div>
          </div>
          <mat-icon class="step-arrow">arrow_forward</mat-icon>
          <div class="guide-step">
            <div class="step-number">2</div>
            <div class="step-text"><strong>Create & run</strong> a sync job to fetch data</div>
          </div>
          <mat-icon class="step-arrow">arrow_forward</mat-icon>
          <div class="guide-step">
            <div class="step-number">3</div>
            <div class="step-text">
              <strong>View results</strong> in
              <a routerLink="/integrations/campaign-reports">Campaign Reports</a>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>

    @if (accounts().length === 0 && !loading()) {
      <mat-card class="hint-card">
        <mat-card-content class="hint-content">
          <mat-icon>info</mat-icon>
          <span>
            No accounts found.
            <a routerLink="/integrations/accounts">Connect an ad platform</a>
            first to start syncing data.
          </span>
        </mat-card-content>
      </mat-card>
    }

    <mat-card class="create">
      <mat-card-title>Create sync job</mat-card-title>
      <mat-card-content class="row">
        <mat-form-field appearance="outline">
          <mat-label>Account</mat-label>
          <mat-select [(ngModel)]="newAccountId">
            <mat-option [value]="''">-- Select account --</mat-option>
            @for (a of accounts(); track a.id) {
              <mat-option [value]="a.id">{{ a.displayName }} ({{ a.platformType }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Mode</mat-label>
          <mat-select [(ngModel)]="newMode">
            @for (m of modes; track m) {
              <mat-option [value]="m">{{ m }}</mat-option>
            }
          </mat-select>
          <mat-hint>FULL re-fetches all data; INCREMENTAL fetches only new data</mat-hint>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="create()" [disabled]="!newAccountId || loading()">
          <mat-icon>add</mat-icon>
          Create & queue
        </button>
      </mat-card-content>
    </mat-card>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (!orgId()) {
      <p class="muted">Select an organization.</p>
    } @else if (rows.length === 0) {
      <mat-card class="empty-state">
        <mat-card-content>
          <mat-icon class="empty-icon">sync</mat-icon>
          <h3>No sync jobs yet</h3>
          <p>Create your first sync job above to start fetching campaign data from your ad platforms.</p>
        </mat-card-content>
      </mat-card>
    } @else {
      <table mat-table [dataSource]="rows" class="mat-elevation-z1 full-width">
        <ng-container matColumnDef="account">
          <th mat-header-cell *matHeaderCellDef>Account</th>
          <td mat-cell *matCellDef="let row">{{ accountLabel(row.integrationAccountId) }}</td>
        </ng-container>
        <ng-container matColumnDef="mode">
          <th mat-header-cell *matHeaderCellDef>Mode</th>
          <td mat-cell *matCellDef="let row">{{ row.syncMode }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let row">
            <mat-chip [class]="'status-' + row.status.toLowerCase()">{{ row.status }}</mat-chip>
          </td>
        </ng-container>
        <ng-container matColumnDef="startedAt">
          <th mat-header-cell *matHeaderCellDef>Started</th>
          <td mat-cell *matCellDef="let row">{{ row.startedAt | date: 'medium' }}</td>
        </ng-container>
        <ng-container matColumnDef="finishedAt">
          <th mat-header-cell *matHeaderCellDef>Finished</th>
          <td mat-cell *matCellDef="let row">{{ row.finishedAt | date: 'medium' }}</td>
        </ng-container>
        <ng-container matColumnDef="stats">
          <th mat-header-cell *matHeaderCellDef>Stats</th>
          <td mat-cell *matCellDef="let row">
            @if (parseStats(row.statsJson); as stats) {
              <span class="stats-parsed">
                <span matTooltip="Rows fetched from platform">{{ stats.fetched }} fetched</span>
                <span class="stats-sep">/</span>
                <span matTooltip="Rows written to database">{{ stats.upserted }} saved</span>
                @if (stats.errors > 0) {
                  <span class="stats-sep">/</span>
                  <span class="stats-error" matTooltip="Rows that failed to save">{{ stats.errors }} errors</span>
                }
              </span>
            } @else {
              <span class="stats-empty">--</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let row">
            <div class="action-buttons">
              @if (row.status === 'QUEUED' || row.status === 'SUCCESS' || row.status === 'FAILED') {
                <button mat-icon-button (click)="run(row)" matTooltip="Run this sync job">
                  <mat-icon>play_arrow</mat-icon>
                </button>
              }
              @if (row.status === 'SUCCESS') {
                <a mat-icon-button routerLink="/integrations/campaign-reports"
                   matTooltip="View synced data in Campaign Reports">
                  <mat-icon>bar_chart</mat-icon>
                </a>
              }
            </div>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      <div class="table-footer">
        <mat-icon>lightbulb</mat-icon>
        <span>
          After a successful sync, view and map your data in
          <a routerLink="/integrations/campaign-reports">Campaign Reports</a>.
          Need to manage campaign links manually? Use
          <a routerLink="/integrations/entity-mappings">Entity Mappings</a>.
        </span>
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    h2 { font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 14px; color: var(--text-secondary); margin: 4px 0 0; }

    .guide-card { margin-bottom: 16px; background: var(--color-primary-muted); }
    .guide-steps {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .guide-step {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .step-text { font-size: 13px; color: var(--text-primary); }
    .step-text a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .step-text a:hover { text-decoration: underline; }
    .step-arrow { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }

    .hint-card { margin-bottom: 16px; border-left: 3px solid #1976d2; }
    .hint-content {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .hint-content .mat-icon { color: #1976d2; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .hint-content a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .hint-content a:hover { text-decoration: underline; }

    .create { margin-bottom: 20px; }
    .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .full-width { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .muted { color: var(--mat-sys-on-surface-variant, rgba(0,0,0,.6)); }

    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 12px; }
    .empty-state h3 { font-size: 18px; font-weight: 600; margin: 8px 0; }
    .empty-state p { color: var(--text-secondary); font-size: 14px; max-width: 400px; margin: 0 auto; }

    mat-chip.status-success { --mdc-chip-container-color: #e8f5e9; color: #1b5e20; }
    mat-chip.status-running { --mdc-chip-container-color: #e3f2fd; color: #0d47a1; }
    mat-chip.status-failed { --mdc-chip-container-color: #ffebee; color: #b71c1c; }
    mat-chip.status-queued { --mdc-chip-container-color: #fff3e0; color: #e65100; }

    .stats-parsed { font-size: 12px; font-variant-numeric: tabular-nums; }
    .stats-sep { color: var(--text-muted); margin: 0 2px; }
    .stats-error { color: #b71c1c; }
    .stats-empty { color: var(--text-muted); }

    .action-buttons { display: flex; gap: 0; }
    .table-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: var(--text-secondary);
      border-top: 1px solid var(--border-default);
    }
    .table-footer .mat-icon { color: #f9a825; font-size: 18px; width: 18px; height: 18px; }
    .table-footer a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .table-footer a:hover { text-decoration: underline; }
  `],
})
export class SyncJobsComponent implements OnInit {
  private jobsApi = inject(SyncJobsApiService);
  private accountsApi = inject(IntegrationAccountsApiService);
  admin = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly orgId = this.admin.selectedOrgId;
  loading = signal(false);
  rows: SyncJobResponse[] = [];
  displayedColumns = ['account', 'mode', 'status', 'startedAt', 'finishedAt', 'stats', 'actions'];

  accounts = signal<IntegrationAccountResponse[]>([]);
  accountMap = signal<Record<string, string>>({});
  newAccountId = '';
  newMode = 'FULL';
  modes = ['FULL', 'INCREMENTAL'];

  ngOnInit(): void {
    const oid = this.orgId();
    if (oid) {
      this.accountsApi.list(oid).subscribe({
        next: (a) => {
          this.accounts.set(a);
          const map: Record<string, string> = {};
          for (const x of a) {
            map[x.id] = x.displayName;
          }
          this.accountMap.set(map);
        },
        error: () => this.notify.error('Failed to load accounts'),
      });
    }
    this.reload();
  }

  accountLabel(id: string): string {
    return this.accountMap()[id] ?? id;
  }

  reload(): void {
    const oid = this.orgId();
    if (!oid) {
      this.rows = [];
      return;
    }
    this.loading.set(true);
    this.jobsApi.list(oid).subscribe({
      next: (data) => {
        this.rows = data;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load jobs');
      },
    });
  }

  create(): void {
    const oid = this.orgId();
    if (!oid) return;
    this.jobsApi
      .create(oid, {
        accountId: this.newAccountId,
        mode: this.newMode,
      })
      .subscribe({
        next: () => {
          this.notify.success('Job created');
          this.reload();
        },
        error: (err) => this.notify.error(err?.error?.detail || 'Create failed'),
      });
  }

  run(row: SyncJobResponse): void {
    const oid = this.orgId();
    if (!oid) return;
    this.jobsApi.run(oid, row.id).subscribe({
      next: (result) => {
        if (result.status === 'SUCCESS') {
          this.notify.success('Sync complete! View results in Campaign Reports.');
        } else {
          this.notify.success('Job started');
        }
        this.reload();
      },
      error: () => this.notify.error('Run failed'),
    });
  }

  parseStats(json: string): { fetched: number; upserted: number; errors: number } | null {
    if (!json || json === '{}') return null;
    try {
      const parsed = JSON.parse(json);
      if (parsed.fetched !== undefined) return parsed;
      return null;
    } catch {
      return null;
    }
  }
}
